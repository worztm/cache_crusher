import { useRef, useEffect, useCallback } from 'react';
import { Player, Enemy, Bullet, Particle, GameState } from '../gameTypes';
import StartOverlay from './StartOverlay';

interface GameCanvasProps {
  gameState: GameState;
  onScoreUpdate: (mb: number) => void;
  onCrushFile: (path: string) => Promise<boolean>;
  onAmmoChange: (ammo: number) => void;
  isPlaying: boolean;
  onScanRequested: () => void;
}

const CANVAS_W = 800;
const CANVAS_H = 600;
const PLAYER_W = 40;
const PLAYER_H = 30;
const BULLET_W = 4;
const BULLET_H = 12;
const BULLET_SPEED = 8;

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

// Deterministic pseudo-random starfield so it looks the same each run.
function makeStars(count: number): Star[] {
  const stars: Star[] = [];
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * CANVAS_W,
      y: rand() * CANVAS_H,
      size: 0.5 + rand() * 1.8,
      speed: 0.15 + rand() * 0.5,
      alpha: 0.2 + rand() * 0.6,
    });
  }
  return stars;
}

export default function GameCanvas({ gameState, onScoreUpdate, onCrushFile, onAmmoChange, isPlaying, onScanRequested }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player>({ x: 400, y: 540, width: PLAYER_W, height: PLAYER_H, speed: 6, shieldsUp: false, shieldTimer: 0 });
  const mouseRef = useRef({ x: 400, y: 540 });
  const shootingRef = useRef(false);
  const animFrameRef = useRef(0);
  const lastShotRef = useRef(0);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const enemiesQueuedRef = useRef<Enemy[]>([]);
  const enemiesActiveRef = useRef<Enemy[]>([]);
  const spawnTimerRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const starsRef = useRef<Star[]>(makeStars(90));
  const exhaustTimerRef = useRef(0);

  const spawnExplosion = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }, []);

  // One shared AudioContext, created lazily. Browsers cap the number of
  // AudioContexts (~6), so creating a new one per sound was leaking them and
  // eventually threw errors / broke all audio.
  const getAudioCtx = useCallback(() => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
        audioCtxRef.current = ctx;
      }
      // Browsers start the context suspended until a user gesture; the first
      // click that triggers a shot counts as that gesture, so resume here.
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { /* ignore */ });
      }
      return ctx;
    } catch (_) {
      return null;
    }
  }, []);

  const playShootSound = useCallback(() => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) { /* audio not available */ }
  }, [getAudioCtx]);

  const playExplosionSound = useCallback(() => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      noise.start();
      noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    } catch (_) { /* audio not available */ }
  }, [getAudioCtx]);

  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const shoot = () => {
      const now = performance.now();
      if (now - lastShotRef.current < 250) return;
      lastShotRef.current = now;
      const p = playerRef.current;
      if (p.shieldsUp) return;
      playShootSound();
      bulletsRef.current.push({
        x: p.x - BULLET_W / 2,
        y: p.y - p.height / 2 - BULLET_H,
        width: BULLET_W,
        height: BULLET_H,
        speed: BULLET_SPEED,
      });
      onAmmoChange(bulletsRef.current.length);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      mouseRef.current = {
        x: Math.max(PLAYER_W / 2, Math.min(CANVAS_W - PLAYER_W / 2, (e.clientX - rect.left) * scaleX)),
        y: Math.max(PLAYER_H / 2, Math.min(CANVAS_H - PLAYER_H / 2, (e.clientY - rect.top) * scaleY)),
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        shootingRef.current = true;
        shoot();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) shootingRef.current = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    const gameLoop = () => {
      const p = playerRef.current;
      const dx = mouseRef.current.x - p.x;
      const dy = mouseRef.current.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;
      }

      if (p.shieldTimer > 0) {
        p.shieldTimer--;
        if (p.shieldTimer <= 0) p.shieldsUp = false;
      }

      if (shootingRef.current) {
        const now = performance.now();
        if (now - lastShotRef.current >= 250) {
          lastShotRef.current = now;
          if (!p.shieldsUp) {
            playShootSound();
            bulletsRef.current.push({
              x: p.x - BULLET_W / 2,
              y: p.y - p.height / 2 - BULLET_H,
              width: BULLET_W,
              height: BULLET_H,
              speed: BULLET_SPEED,
            });
            onAmmoChange(bulletsRef.current.length);
          }
        }
      }

      // Engine exhaust trail — spawn behind the ship every few frames
      exhaustTimerRef.current++;
      if (exhaustTimerRef.current % 3 === 0) {
        particlesRef.current.push({
          x: p.x + (Math.random() - 0.5) * 6,
          y: p.y + p.height / 2 + 2,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 1.5 + Math.random() * 1.5,
          life: 1,
          maxLife: 0.3 + Math.random() * 0.25,
          color: Math.random() > 0.5 ? '#66FCF1' : '#45A29E',
          size: 2 + Math.random() * 3,
        });
      }

      if (enemiesQueuedRef.current.length > 0 && enemiesActiveRef.current.length < 15) {
        spawnTimerRef.current++;
        if (spawnTimerRef.current > 20) {
          spawnTimerRef.current = 0;
          const enemy = enemiesQueuedRef.current.shift()!;
          enemiesActiveRef.current.push(enemy);
        }
      }

      for (let i = enemiesActiveRef.current.length - 1; i >= 0; i--) {
        const e = enemiesActiveRef.current[i];
        e.y += e.speed;
        e.wobble += 0.05;
        if (e.lockedTimer > 0) {
          e.lockedTimer--;
          if (e.lockedTimer <= 0) e.locked = false;
        }
        if (e.y > CANVAS_H + 50) {
          enemiesActiveRef.current.splice(i, 1);
        }
      }

      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        b.y -= b.speed;
        let hit = false;
        for (let j = enemiesActiveRef.current.length - 1; j >= 0; j--) {
          const e = enemiesActiveRef.current[j];
          const wobbleX = Math.sin(e.wobble) * 3;
          if (
            b.x < e.x + e.width / 2 + wobbleX &&
            b.x + b.width > e.x - e.width / 2 + wobbleX &&
            b.y < e.y + e.height / 2 &&
            b.y + b.height > e.y - e.height / 2
          ) {
            if (e.category === 'Dangerous') {
              playerRef.current.shieldsUp = true;
              playerRef.current.shieldTimer = 30;
              hit = true;
              break;
            }
            e.hp--;
            if (e.hp > 0) {
              // Hit flash — brief white overlay so hits feel crunchy
              e.locked = true;
              e.lockedTimer = 4;
            }
            if (e.hp <= 0) {
              spawnExplosion(e.x, e.y, e.color);
              playExplosionSound();
              scoreRef.current += e.sizeMB;
              onScoreUpdate(e.sizeMB);
              onCrushFile(e.path);
              enemiesActiveRef.current.splice(j, 1);
            }
            hit = true;
            break;
          }
        }
        if (hit || b.y + b.height < 0) {
          bulletsRef.current.splice(i, 1);
          onAmmoChange(bulletsRef.current.length);
        }
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.05;
        pt.life -= 1 / 60 / pt.maxLife;
        if (pt.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Deep space background with subtle nebula tint
      const bg = ctx.createRadialGradient(
        CANVAS_W / 2, CANVAS_H * 0.35, 60,
        CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.75
      );
      bg.addColorStop(0, '#101522');
      bg.addColorStop(0.55, '#0B0C10');
      bg.addColorStop(1, '#07080C');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Nebula accents
      ctx.globalAlpha = 0.05;
      const nebA = ctx.createRadialGradient(CANVAS_W * 0.2, CANVAS_H * 0.3, 10, CANVAS_W * 0.2, CANVAS_H * 0.3, 260);
      nebA.addColorStop(0, '#66FCF1');
      nebA.addColorStop(1, 'transparent');
      ctx.fillStyle = nebA;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      const nebB = ctx.createRadialGradient(CANVAS_W * 0.85, CANVAS_H * 0.75, 10, CANVAS_W * 0.85, CANVAS_H * 0.75, 300);
      nebB.addColorStop(0, '#45A29E');
      nebB.addColorStop(1, 'transparent');
      ctx.fillStyle = nebB;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;

      // Parallax starfield — slow drift downward for a sense of motion
      starsRef.current.forEach(s => {
        s.y += s.speed;
        if (s.y > CANVAS_H) {
          s.y = -2;
          s.x = Math.random() * CANVAS_W;
        }
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.size > 1.6 ? '#BFFCF8' : '#66FCF1';
        ctx.fillRect(s.x, s.y, s.size, s.size);
      });
      ctx.globalAlpha = 1;

      for (let i = 0; i < CANVAS_W; i += 25) {
        ctx.strokeStyle = 'rgba(102, 252, 241, 0.03)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS_H);
        ctx.stroke();
      }
      for (let i = 0; i < CANVAS_H; i += 25) {
        ctx.strokeStyle = 'rgba(102, 252, 241, 0.03)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_W, i);
        ctx.stroke();
      }

      const pDraw = playerRef.current;
      ctx.save();
      ctx.translate(pDraw.x, pDraw.y);

      // Animated engine flame flickering out the back of the ship
      const flameLen = 10 + Math.sin(performance.now() / 40) * 4 + Math.random() * 3;
      const flame = ctx.createLinearGradient(0, pDraw.height / 2, 0, pDraw.height / 2 + flameLen);
      flame.addColorStop(0, 'rgba(102, 252, 241, 0.95)');
      flame.addColorStop(0.6, 'rgba(69, 162, 158, 0.5)');
      flame.addColorStop(1, 'transparent');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(-4, pDraw.height / 2);
      ctx.lineTo(4, pDraw.height / 2);
      ctx.lineTo(0, pDraw.height / 2 + flameLen);
      ctx.closePath();
      ctx.fill();

      // Hull with gradient shading
      ctx.shadowColor = '#66FCF1';
      ctx.shadowBlur = 15;
      const hull = ctx.createLinearGradient(-pDraw.width / 2, 0, pDraw.width / 2, 0);
      hull.addColorStop(0, '#45A29E');
      hull.addColorStop(0.5, '#66FCF1');
      hull.addColorStop(1, '#45A29E');
      ctx.fillStyle = hull;
      ctx.beginPath();
      ctx.moveTo(0, -pDraw.height / 2);
      ctx.lineTo(-pDraw.width / 2, pDraw.height / 2);
      ctx.lineTo(-pDraw.width / 4, pDraw.height / 4);
      ctx.lineTo(0, pDraw.height / 2.5);
      ctx.lineTo(pDraw.width / 4, pDraw.height / 4);
      ctx.lineTo(pDraw.width / 2, pDraw.height / 2);
      ctx.closePath();
      ctx.fill();

      // Cockpit highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0B0C10';
      ctx.beginPath();
      ctx.arc(0, -pDraw.height / 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232, 234, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (pDraw.shieldsUp) {
        const pulse = 0.55 + Math.sin(performance.now() / 60) * 0.35;
        ctx.shadowColor = '#FF2E4D';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = `rgba(255, 46, 77, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pDraw.width / 2 + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      enemiesActiveRef.current.forEach(e => {
        const wobbleX = Math.sin(e.wobble) * 3;
        ctx.save();
        ctx.translate(e.x + wobbleX, e.y);

        // Enemies scale with the amount of junk they represent
        const sizeScale = Math.min(1.6, Math.max(0.8, 0.8 + e.sizeMB * 0.12));
        ctx.scale(sizeScale, sizeScale);

        ctx.shadowColor = e.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = e.color;

        if (e.category === 'Dangerous') {
          ctx.beginPath();
          const spikes = 6;
          for (let i = 0; i < spikes * 2; i++) {
            const angle = (Math.PI * i) / spikes - Math.PI / 2;
            const r = i % 2 === 0 ? e.width / 2 : e.width / 3;
            if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          const r = 4;
          const w = e.width;
          const h = e.height;
          ctx.beginPath();
          ctx.moveTo(-w / 2 + r, -h / 2);
          ctx.lineTo(w / 2 - r, -h / 2);
          ctx.arcTo(w / 2, -h / 2, w / 2, -h / 2 + r, r);
          ctx.lineTo(w / 2, h / 2 - r);
          ctx.arcTo(w / 2, h / 2, w / 2 - r, h / 2, r);
          ctx.lineTo(-w / 2 + r, h / 2);
          ctx.arcTo(-w / 2, h / 2, -w / 2, h / 2 - r, r);
          ctx.lineTo(-w / 2, -h / 2 + r);
          ctx.arcTo(-w / 2, -h / 2, -w / 2 + r, -h / 2, r);
          ctx.closePath();
          ctx.fill();
        }

        ctx.shadowBlur = 0;

        // Hit flash overlay
        if (e.locked && e.lockedTimer > 0 && e.category !== 'Dangerous') {
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(0, 0, e.width / 2 + 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Size label on a subtle pill for readability
        const label = e.sizeMB < 1 ? `${(e.sizeMB * 1024).toFixed(0)}KB` : `${e.sizeMB.toFixed(1)}MB`;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        const labelW = ctx.measureText(label).width + 8;
        ctx.fillStyle = 'rgba(11, 12, 16, 0.65)';
        ctx.beginPath();
        ctx.roundRect(-labelW / 2, e.height / 2 + 4, labelW, 12, 6);
        ctx.fill();
        ctx.strokeStyle = e.category === 'Dangerous' ? 'rgba(255, 46, 77, 0.5)' : 'rgba(102, 252, 241, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#E8EAFF';
        ctx.fillText(label, 0, e.height / 2 + 13);

        if (e.locked && e.lockedTimer > 8 && e.category === 'Dangerous') {
          ctx.fillStyle = '#FF2E4D';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('LOCKED', 0, -e.height / 2 - 6);
        }

        ctx.restore();
      });

      bulletsRef.current.forEach(b => {
        ctx.shadowColor = '#66FCF1';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#66FCF1';
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.shadowBlur = 0;
      });

      particlesRef.current.forEach(pt => {
        const alpha = Math.max(0, pt.life);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        ctx.globalAlpha = 1;
      });

      const grd = ctx.createLinearGradient(0, CANVAS_H - 40, 0, CANVAS_H);
      grd.addColorStop(0, 'transparent');
      grd.addColorStop(1, 'rgba(102, 252, 241, 0.07)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, CANVAS_H - 40, CANVAS_W, 40);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { /* ignore */ });
        audioCtxRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (gameState.enemies.length > 0) {
      const queued = gameState.enemies.map(e => ({
        ...e,
        x: 30 + Math.random() * (CANVAS_W - 60),
        y: -28,
      }));
      enemiesQueuedRef.current.push(...queued);
    }
  }, [gameState.enemies]);

  return (
    <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="game-canvas neon-border"
      />
      {!isPlaying && <StartOverlay isScanning={gameState.isScanning} onScan={onScanRequested} />}
    </div>
  );
}
