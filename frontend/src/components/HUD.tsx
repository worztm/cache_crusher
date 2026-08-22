import { GameState } from '../gameTypes';

interface HUDProps {
  gameState: GameState;
  onScan: () => void;
  isPlaying: boolean;
}

function formatBytes(mb: number): string {
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function healthTone(pct: number): string {
  if (pct >= 60) return '';
  if (pct >= 30) return 'warning';
  return 'critical';
}

export default function HUD({ gameState, onScan, isPlaying }: HUDProps) {
  const healthPercent = Math.max(0, Math.min(100, gameState.systemHealth));
  const tone = healthTone(healthPercent);
  const progress = gameState.enemies.length + (gameState.filesCrashed ?? 0);

  return (
    <div className="hud-panel px-5 py-6 flex flex-col gap-5" style={{ width: 300 }}>
      {/* Logo */}
      <div className="text-center float-in">
        <h1 className="arcade-text neon-text title-glow text-[#66FCF1] text-lg">CACHE</h1>
        <h1 className="arcade-text neon-text title-glow text-[#66FCF1] text-lg -mt-1">CRUSHERS</h1>
        <p className="stat-label mt-3" style={{ fontSize: 7 }}>
          Disk-cleaning arcade shooter
        </p>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className={`stat-card float-in ${tone === 'critical' ? 'danger' : ''}`} style={{ animationDelay: '0.05s' }}>
          <div className="flex justify-between items-center">
            <span className="stat-label">Space freed</span>
            <span className="stat-value">{formatBytes(gameState.totalFreed)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card float-in" style={{ animationDelay: '0.1s' }}>
            <div className="text-center">
              <div className="stat-label mb-2">Files</div>
              <div className="stat-value">{gameState.filesCrashed}</div>
            </div>
          </div>
          <div className="stat-card float-in" style={{ animationDelay: '0.15s' }}>
            <div className="text-center">
              <div className="stat-label mb-2">Targets</div>
              <div className="stat-value" style={{ color: '#FFB454', textShadow: '0 0 8px rgba(255,180,84,0.55)' }}>
                {gameState.enemies.length}
              </div>
            </div>
          </div>
        </div>

        {/* Health */}
        <div className={`stat-card float-in ${tone === 'critical' ? 'danger' : ''}`} style={{ animationDelay: '0.2s' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="stat-label">System health</span>
            <span
              className="arcade-text"
              style={{
                fontSize: 10,
                color: tone === '' ? '#6BFFA8' : tone === 'warning' ? '#FFB454' : '#FF2E4D',
              }}
            >
              {healthPercent.toFixed(0)}%
            </span>
          </div>
          <div className="status-bar">
            <div
              className={`status-bar-fill ${tone}`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        {/* Ammo */}
        <div className="stat-card float-in" style={{ animationDelay: '0.25s' }}>
          <div className="flex justify-between items-center">
            <span className="stat-label">Shots in flight</span>
            <span className="stat-value">{gameState.ammo}</span>
          </div>
        </div>
      </div>

      {/* Scan button */}
      <button
        className="scan-btn w-full text-center"
        onClick={onScan}
        disabled={gameState.isScanning}
      >
        {gameState.isScanning ? <span className="blink">SCANNING…</span> : isPlaying ? 'RESCAN' : 'SCAN'}
      </button>

      {isPlaying && progress > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="stat-label">Cleanup progress</span>
          </div>
          <div className="status-bar">
            <div
              className="status-bar-fill"
              style={{
                width: `${Math.min(100, (gameState.filesCrashed / Math.max(1, progress)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Controls legend */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glow)' }}
      >
        <div className="stat-label mb-2" style={{ fontSize: 7 }}>Controls</div>
        <div className="flex items-center gap-2 text-[11px] text-[#8A8D9A]">
          <kbd className="arcade-text" style={{ fontSize: 7, color: '#66FCF1' }}>MOUSE</kbd> move ship
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#8A8D9A]">
          <kbd className="arcade-text" style={{ fontSize: 7, color: '#66FCF1' }}>CLICK</kbd> shoot
        </div>
        <div className="border-t border-[#1F2833] my-2" />
        <div className="flex items-center gap-2 text-[11px]" style={{ color: '#FF2E4D' }}>
          <span className="inline-block w-2.5 h-2.5 rotate-45" style={{ background: '#FF2E4D', clipPath: 'polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%)' }} />
          system files — don't shoot!
        </div>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: '#66FCF1' }}>
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#66FCF1' }} />
          cache junk — crush it!
        </div>
      </div>

      <div className="text-[7px] text-[#4A4D5A] arcade-text text-center leading-relaxed">
        v1.0 · CRUSH RESPONSIBLY
      </div>
    </div>
  );
}
