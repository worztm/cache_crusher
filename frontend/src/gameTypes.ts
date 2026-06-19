export interface JunkFile {
  path: string;
  sizeMB: number;
  category: string;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  shieldsUp: boolean;
  shieldTimer: number;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  category: string;
  path: string;
  sizeMB: number;
  hp: number;
  locked: boolean;
  lockedTimer: number;
  wobble: number;
}

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  score: number;
  ammo: number;
  systemHealth: number;
  isScanning: boolean;
  isPlaying: boolean;
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  totalFreed: number;
  filesCrashed: number;
}
