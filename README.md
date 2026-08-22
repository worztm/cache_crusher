# 🎮 Cache Crushers

> A disk-cleaning arcade shooter. Turn the boring chore of clearing junk files into a neon space shooter — every enemy you blow up is a real temp/cache file deleted from your machine.

Cache Crushers wraps a genuine junk-file cleanup engine in a retro arcade-game shell. Scan your system, and your disposable cache files spawn as enemies. Shoot them down to reclaim disk space. Your score is measured in megabytes actually freed.

---

## ✨ Features

- **🎯 Real cleanup, gamified** — every enemy you destroy maps to a real junk file that gets deleted from disk. Your score is the actual space freed.
- **🛡️ Safety-first scanner** — only targets well-known disposable file types (`.tmp`, `.temp`, `.log`, `.cache`, `.bak`, `.old`, `.dmp`, `.chk`, etc.) in your temp directories. Critical system paths (`System32`, `Program Files`, `Windows`, ...) are detected, flagged as dangerous, and **refused at the backend delete layer** so they're never touched — even if the UI misbehaves.
- **🕹️ Arcade feel** — HTML5 Canvas renderer with deep-space nebula backdrop, parallax starfield, gradient-hulled ship with animated engine flame and exhaust trail, size-scaled enemies with hit flashes and pill labels, particle explosions, CRT scanline overlay, chiptune shoot/explosion SFX.
- **📊 Polished HUD** — animated stat cards, tiered health bar (green/amber/red), live cleanup-progress bar, styled controls legend, and a dedicated arcade title screen.
- **⚡ Native & fast** — built with Wails 3, so it's a small native desktop binary (Go backend + webview frontend), not a bloated Electron app.

## 🎯 How to play

| Action | Control |
| --- | --- |
| Move ship | Mouse |
| Shoot | Click / hold |

- **Cyan enemies** = cache/junk files. Shoot them to delete the file and bank the space.
- **Red spiky enemies** = protected/system paths. Don't shoot — hitting them just raises a shield.
- **Score** = total megabytes freed.
- **System Health** drops as you clear files — keep an eye on it.

Click **SCAN** to locate junk files, then blast away.

## 🧰 Tech stack

- **Backend:** Go 1.25, [Wails 3](https://v3.wails.io/)
- **Frontend:** React 18, TypeScript, Vite 8
- **Styling:** Tailwind CSS v4
- **Rendering:** HTML5 Canvas 2D

## ✅ Prerequisites

- [Go](https://go.dev/dl/) 1.25+
- [Node.js](https://nodejs.org/) 18+ and npm
- [Wails 3 CLI](https://v3.wails.io/): `go install github.com/wailsapp/wails/v3/cmd/wails3@latest`
- (optional) [Task](https://taskfile.dev/) — the repo ships a `Taskfile.yml`

## 🚀 Getting started

**Development** (hot-reload on both frontend and backend):

```bash
wails3 dev
```

or with Task:

```bash
task dev
```

**Production build** (drops a native executable in `bin/`):

```bash
wails3 build
# or
task build
```

The frontend lives in `frontend/` and can be worked on standalone:

```bash
cd frontend
npm install
npm run dev      # Vite dev server
npm run build    # type-check (tsc) + production bundle into dist/
```

## 📁 Project structure

```
.
├── main.go                # Wails app entry: window, services, embedded assets
├── cachecrusher.go        # Cleanup engine: scan + crush junk files safely
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # App shell, wires game + HUD, calls backend
│   │   ├── components/
│   │   │   ├── GameCanvas.tsx     # Canvas game loop, rendering, input, audio
│   │   │   └── HUD.tsx            # Score / health / ammo panel + SCAN button
│   │   ├── gameTypes.ts           # Shared TS types (Enemy, Bullet, GameState…)
│   │   └── index.css              # Tailwind entry + neon/CRT theme styles
│   ├── bindings/         # Auto-generated Wails bindings to the Go service
│   └── package.json
└── build/                # Per-platform packaging configs (win/mac/linux/ios/android)
```

## ⚠️ Safety note

Cache Crushers **deletes real files** — that's the whole point. The scanner is deliberately conservative:

- It only scans temp directories (`%TEMP%`, `%WINDIR%\Temp`, `%LOCALAPPDATA%\Temp`).
- It only targets recognized disposable extensions.
- It detects and avoids dangerous system paths.

That said, you run cleanup tools at your own risk. Close important apps before scanning, and review what's in your temp folders if you're unsure.

## 📄 License

MIT
