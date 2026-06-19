import { GameState } from '../gameTypes';

interface HUDProps {
  gameState: GameState;
  onScan: () => void;
  isPlaying: boolean;
}

export default function HUD({ gameState, onScan, isPlaying }: HUDProps) {
  const displayScore = gameState.totalFreed < 1
    ? `${(gameState.totalFreed * 1024).toFixed(0)} KB`
    : `${gameState.totalFreed.toFixed(1)} MB`;

  const healthPercent = Math.max(0, Math.min(100, gameState.systemHealth));

  return (
    <div className="hud-panel p-6 flex flex-col gap-6" style={{ width: 280 }}>
      <div className="text-center mb-2">
        <h1 className="arcade-text text-[#66FCF1] text-lg neon-text">CACHE</h1>
        <h1 className="arcade-text text-[#66FCF1] text-lg neon-text -mt-1">CRUSHERS</h1>
      </div>

      <div className="bg-[#1A1C26] rounded-lg p-4 space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="arcade-text text-[10px] text-[#8A8D9A]">SCORE</span>
            <span className="arcade-text text-xs text-[#66FCF1]">{displayScore}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="arcade-text text-[10px] text-[#8A8D9A]">FILES</span>
            <span className="arcade-text text-xs text-[#66FCF1]">{gameState.filesCrashed}</span>
          </div>
        </div>

        <div className="border-t border-[#1F2833] pt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="arcade-text text-[10px] text-[#8A8D9A]">AMMO</span>
            <span className="arcade-text text-xs text-[#66FCF1]">{gameState.ammo}</span>
          </div>
        </div>

        <div className="border-t border-[#1F2833] pt-3">
          <div className="flex justify-between items-center mb-2">
            <span className="arcade-text text-[10px] text-[#8A8D9A]">SYSTEM HEALTH</span>
            <span className="arcade-text text-[10px] text-[#66FCF1]">{healthPercent.toFixed(0)}%</span>
          </div>
          <div className="status-bar">
            <div
              className="status-bar-fill"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        <div className="border-t border-[#1F2833] pt-3">
          <div className="flex justify-between items-center">
            <span className="arcade-text text-[10px] text-[#8A8D9A]">ENEMIES</span>
            <span className="arcade-text text-xs text-[#C5001A]">{gameState.enemies.length}</span>
          </div>
        </div>
      </div>

      <button
        className="scan-btn w-full text-center"
        onClick={onScan}
        disabled={gameState.isScanning}
      >
        {gameState.isScanning ? 'SCANNING...' : 'SCAN'}
      </button>

      <div className="flex-1" />

      <div className="text-[8px] text-[#4A4D5A] arcade-text text-center leading-relaxed">
        <p>MOVE: MOUSE</p>
        <p>SHOOT: CLICK</p>
        <p>RED = SYSTEM FILES</p>
        <p>CYAN = CACHE FILES</p>
      </div>
    </div>
  );
}
