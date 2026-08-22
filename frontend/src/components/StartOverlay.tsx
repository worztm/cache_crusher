interface StartOverlayProps {
  isScanning: boolean;
  onScan: () => void;
}

export default function StartOverlay({ isScanning, onScan }: StartOverlayProps) {
  return (
    <div className="game-overlay">
      <div className="text-center px-8">
        {/* Decorative ship glyph */}
        <svg
          width="72"
          height="72"
          viewBox="0 0 48 48"
          className="mx-auto mb-6 float-in"
          style={{ filter: 'drop-shadow(0 0 14px rgba(102,252,241,0.7))' }}
        >
          <polygon
            points="24,4 10,40 17,32 24,38 31,32 38,40"
            fill="#66FCF1"
          />
          <circle cx="24" cy="18" r="3.5" fill="#0B0C10" />
        </svg>

        <h2 className="arcade-text neon-text title-glow text-[#66FCF1] text-2xl mb-2 float-in" style={{ animationDelay: '0.1s' }}>
          CACHE
        </h2>
        <h2 className="arcade-text neon-text title-glow text-[#66FCF1] text-2xl mb-6 -mt-1 float-in" style={{ animationDelay: '0.15s' }}>
          CRUSHERS
        </h2>

        <p className="arcade-text text-[#8A8D9A] mb-1 float-in" style={{ fontSize: 9, animationDelay: '0.2s' }}>
          Blast the junk. Free the disk.
        </p>
        <p className="text-[#4A4D5A] mb-8 float-in" style={{ fontSize: 12, animationDelay: '0.25s' }}>
          Scan your system for cache files, then shoot them out of orbit.
          <br />
          Avoid the red system files!
        </p>

        <button className="scan-btn float-in" onClick={onScan} disabled={isScanning} style={{ animationDelay: '0.3s' }}>
          {isScanning ? <span className="blink">SCANNING…</span> : '▶ SCAN & PLAY'}
        </button>

        <p className="stat-label mt-8 float-in" style={{ animationDelay: '0.35s', fontSize: 7 }}>
          Press SCAN to locate junk files
        </p>
      </div>
    </div>
  );
}
