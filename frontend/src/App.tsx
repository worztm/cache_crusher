import { useState, useCallback, useRef } from 'react';
import { CacheCrusherService } from '../bindings/github.com/cachecrusher/app';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import { GameState, Enemy } from './gameTypes';

function toEnemies(files: any[]): Enemy[] {
  return files
    .filter(f => f.category === 'Safe')
    .map(f => ({
      id: f.path,
      x: 0,
      y: 0,
      width: 36,
      height: 28,
      speed: 0.5 + Math.random() * 0.8,
      color: '#66FCF1',
      category: f.category,
      path: f.path,
      sizeMB: f.sizeMB,
      hp: 1,
      locked: false,
      lockedTimer: 0,
      wobble: Math.random() * Math.PI * 2,
    }));
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    ammo: 0,
    systemHealth: 100,
    isScanning: false,
    isPlaying: false,
    enemies: [],
    bullets: [],
    particles: [],
    totalFreed: 0,
    filesCrashed: 0,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const pendingCrushRef = useRef(0);

  const handleScan = useCallback(async () => {
    setGameState(prev => ({ ...prev, isScanning: true }));
    try {
      const files = await CacheCrusherService.ScanJunkFiles();
      const enemies = toEnemies(files);

      setGameState(prev => ({
        ...prev,
        isScanning: false,
        isPlaying: true,
        enemies,
        systemHealth: 100,
        score: 0,
        totalFreed: 0,
        filesCrashed: 0,
      }));
      setIsPlaying(true);
    } catch (err) {
      console.error('Scan failed:', err);
      setGameState(prev => ({ ...prev, isScanning: false }));
    }
  }, []);

  const handleScoreUpdate = useCallback((mb: number) => {
    setGameState(prev => {
      const newFreed = prev.totalFreed + mb;
      const newFiles = prev.filesCrashed + 1;
      const healthDecay = Math.min(5, mb * 0.5);
      const newHealth = Math.max(70, prev.systemHealth - healthDecay);
      return {
        ...prev,
        totalFreed: newFreed,
        filesCrashed: newFiles,
        systemHealth: newHealth,
        score: prev.score + mb,
      };
    });
  }, []);

  const handleCrushFile = useCallback(async (path: string): Promise<boolean> => {
    const id = ++pendingCrushRef.current;
    try {
      const success = await CacheCrusherService.CrushFile(path);
      if (!success && id === pendingCrushRef.current) {
        setGameState(prev => ({
          ...prev,
          systemHealth: Math.max(0, prev.systemHealth - 2),
        }));
      }
      return success;
    } catch {
      return false;
    }
  }, []);

  const handleAmmoChange = useCallback((ammo: number) => {
    setGameState(prev => ({ ...prev, ammo }));
  }, []);

  return (
    <div className="flex w-full h-full">
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0B0C10' }}>
        <GameCanvas
          gameState={gameState}
          onScoreUpdate={handleScoreUpdate}
          onCrushFile={handleCrushFile}
          onAmmoChange={handleAmmoChange}
          isPlaying={isPlaying}
        />
      </div>
      <HUD gameState={gameState} onScan={handleScan} isPlaying={isPlaying} />
    </div>
  );
}
