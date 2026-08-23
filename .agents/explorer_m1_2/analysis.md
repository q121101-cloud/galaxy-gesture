# Milestone 1 — Build Configuration, Tooling & UI Foundation Analysis

**Agent**: Explorer 2 (Build Configuration & Tooling Specialist)  
**Date**: 2026-08-23  
**Working Directory**: `/Users/quan/.gemini/antigravity/scratch/galaxy-gesture/.agents/explorer_m1_2`  
**Target Milestone**: Milestone 1 (Core Foundation & Shaders) — Build & UI Tooling Track  

---

## 1. Executive Summary

This report establishes the verified, production-grade build configuration and UI foundation for the **Interstellar Gesture Experience** (`galaxy-gesture`). 

The build pipeline is designed for high performance, strict type safety, zero build warnings, and seamless Vercel production deployment. It combines:
1. **TypeScript 5.3+** in strict ES2022 / ESNext mode with `moduleResolution: bundler` and `noEmit: true`.
2. **Vite 5.x** with custom Rollup code-splitting for Three.js (`three-vendor` chunk), sourcemaps, and esbuild minification.
3. **Vercel SPA Deployment** (`vercel.json`) with immutable 1-year asset caching and camera/audio `Permissions-Policy`.
4. **Cinematic Interstellar HTML5 Structure** (`index.html`) with clean DOM mounting points for WebGL2 canvas, webcam tracking preview, landmark overlay, contextual gesture cards, telemetry HUD, recording banner, and welcome modal.
5. **Glassmorphic Interstellar CSS Design System** (`src/style.css`) with responsive media queries, monospace telemetry typography, high-FPS hardware-accelerated animations, and TikTok 9:16 vertical frame guide.

---

## 2. Technical Investigation & Verification

### 2.1 Tooling & Environment Verification
- **Node.js**: v26.7.0 (Verified via `node -v`)
- **npm**: 11.19.0 (Verified via `npm -v`)
- **Three.js**: `three@^0.160.0` (Installed: `three@0.160.1`)
- **Type Definitions**: `@types/three@^0.160.0` needed for strict TypeScript compilation.
- **TypeScript Runner**: `tsx@^4.7.0` for executing automated TypeScript test suites (`test/test_runner.ts`) without intermediate compilation.

### 2.2 Dependency & Script Analysis (`package.json`)
The `package.json` configuration must fulfill the following contract:
- `"type": "module"` for native ES module loading.
- Scripts:
  - `"dev": "vite"`: Fast HMR development server on port 3000.
  - `"build": "tsc && vite build"`: Runs strict TypeScript typecheck before Rollup bundling into `dist/`. Exits with code 0 on clean code, non-zero on type errors.
  - `"preview": "vite preview"`: Local static server serving `dist/` on port 4173.
  - `"test": "tsx test/test_runner.ts"`: Executes the automated E2E test runner directly.

### 2.3 Compiler Options (`tsconfig.json`)
- `target`: `ES2022` ensures support for top-level await, class fields, and modern ES syntax.
- `module`: `ESNext` with `moduleResolution: "bundler"` ensures flawless Vite integration and modern package subpath export resolution.
- `strict`: `true` enforces `strictNullChecks`, `noImplicitAny`, and type safety across all Three.js, Web Audio, and MediaPipe bindings.
- `noEmit`: `true` ensures TypeScript operates as a pure typechecker while esbuild/Vite handles high-speed bundling.
- `skipLibCheck`: `true` avoids false positives in external library definitions.
- `isolatedModules`: `true` guarantees every module can be safely transpiled in isolation.

### 2.4 Bundling & Asset Strategy (`vite.config.ts`)
- Three.js (~600KB unminified) is segregated into a dedicated `three-vendor` chunk via `rollupOptions.output.manualChunks`. This prevents Three.js from being re-downloaded when application code changes, drastically improving cache hit ratios.
- Output chunk naming uses hashed filenames (`assets/[name]-[hash].js`) to enable immutable HTTP caching.
- Optimized dependency pre-bundling includes `three`.

### 2.5 Deployment Configuration (`vercel.json`)
- Configures Vite framework settings (`outputDirectory: "dist"`).
- SPA rewrite rule (`/(.*)` → `/index.html`).
- Long-term immutable caching headers (`Cache-Control: public, max-age=31536000, immutable`) for all files under `/assets/`.
- Security and permission headers including `Permissions-Policy: camera=*, microphone=*` to guarantee webcam access on Vercel deployment URLs.

### 2.6 DOM & HUD Architecture (`index.html`)
The DOM hierarchy provides clean separation between rendering, computer vision, telemetry, and user interaction:
- `#webgl-canvas`: Fullscreen WebGL2 canvas for Three.js scene rendering.
- `#cyber-scanlines`: Non-intrusive CRT/interstellar atmosphere overlay.
- `#hud-layer`: Absolute overlay with `pointer-events: none` containing interactive sub-panels (`pointer-events: auto`).
  - `.top-bar`: Brand card with active scene badge, live FPS counter, particle counter (>300,000), and latency readout; Top-right Neural Tracker corner inset with mirrored video, landmark canvas, and PiP minimize button.
  - `#gesture-hints`: Dynamic floating cards highlighting active gesture affordances (Clench/Open, Tilt/Pitch, Pinch Time Dilation, Swipe).
  - `#recording-indicator`: Top banner indicating active video recording and `[H]` clean mode status.
  - `.bottom-bar`: HUD controller panel with tracking state dot, finger status matrix (`[T] [I] [M] [R] [P]`), multi-axis telemetry chips (`OPEN`, `PITCH`, `ROLL`, `PINCH`, `TIME DILATION`), expansion gauge bar, scene switch buttons (`Gargantua`, `Wormhole`, `Tesseract`), and utility buttons (`Audio`, `Record`, `Clean HUD [H]`, `TikTok 9:16 Guide`, `Reset Camera`).
- `#tiktok-frame-guide`: 9:16 vertical overlay with dashed border for TikTok / Reels framing.
- `#prompt-overlay`: Cinematic welcome modal for camera permission and keyboard fallback.
- `<script type="module" src="/src/main.ts"></script>`: Modern TypeScript entry point.

### 2.7 Visual Design System (`src/style.css`)
- Deep space palette with theme accents for Christopher Nolan's *Interstellar*:
  - Gargantua: `#ff9d00` (Gold/Orange Accretion Disk), `#00e5ff` (Doppler Blueshift).
  - Wormhole: `#00f0ff` (Celestial Cyan), `#8a4fff` (Throat Purple).
  - Tesseract: `#00ffb3` (Quantum Lattice Emerald), `#bd00ff` (Timeline Violet).
- Glassmorphic panels with `backdrop-filter: blur(24px)`, subtle multi-stop linear gradient borders, and ambient glow shadows.
- Monospaced technical typography (`JetBrains Mono`, `Fira Code`, `SF Mono`).
- Fully responsive layout with mobile breakpoints (<768px and <480px) ensuring touch usability and non-obtrusive mini-cam scaling.

---

## 3. Drop-in File Specifications for Worker

### 3.1 `package.json`
```json
{
  "name": "galaxy-gesture",
  "version": "1.0.0",
  "description": "Interstellar Gesture Experience - Real-time WebGL space simulation inspired by Interstellar, controlled via MediaPipe hand gestures",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "tsx test/test_runner.ts"
  },
  "dependencies": {
    "three": "^0.160.0"
  },
  "devDependencies": {
    "@types/three": "^0.160.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.0",
    "tsx": "^4.7.0"
  }
}
```

---

### 3.2 `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "src/**/*",
    "test/**/*",
    "vite.config.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

---

### 3.3 `vite.config.ts`
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    host: true,
    open: false,
    cors: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/three')) {
            return 'three-vendor';
          }
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['three'],
  },
});
```

---

### 3.4 `vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=*, microphone=*"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

### 3.5 `index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="description" content="Interstellar Gesture Experience — Real-time WebGL space simulation inspired by Christopher Nolan's Interstellar, controlled via MediaPipe hand gestures">
  <meta name="theme-color" content="#030307">
  <title>INTERSTELLAR // Gesture Experience</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/style.css">

  <!-- MediaPipe Hands & Camera Utils CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" crossorigin="anonymous"></script>
</head>
<body>
  <!-- 3D WebGL2 Primary Canvas -->
  <canvas id="webgl-canvas"></canvas>

  <!-- 9:16 Vertical TikTok / Reels Framing Guide -->
  <div class="tiktok-frame-guide" id="tiktok-frame-guide">
    <div class="tiktok-guide-box">
      <div class="guide-tag">9:16 TIKTOK / REELS FRAME</div>
    </div>
  </div>

  <!-- Ambient Interstellar Scanlines & Atmosphere Overlay -->
  <div class="cyber-scanlines"></div>

  <!-- Screen Recording Status Indicator -->
  <div class="recording-indicator" id="recording-indicator">
    <span class="rec-dot"></span>
    <span class="rec-text">REC 00:00</span>
    <span class="rec-subtext">[H: Clean View | R: Stop]</span>
  </div>

  <!-- HUD Interface Layer -->
  <div class="hud-layer" id="hud-layer">
    <!-- TOP BAR -->
    <header class="top-bar">
      <!-- Brand & Telemetry Card -->
      <div class="brand-card interactive">
        <div class="brand-header-row">
          <div class="brand-badge-pulse"></div>
          <div class="brand-title">
            <span class="brand-square">■</span> INTERSTELLAR
          </div>
        </div>
        <div class="brand-subtitle">GESTURE EXPERIENCE // <span id="val-scene" class="scene-active-tag">GARGANTUA</span></div>
        <div class="stats-group">
          <div class="stat-item"><span class="stat-lbl">PARTICLES</span><span class="stat-val highlight-glow" id="val-particles">350,000</span></div>
          <div class="stat-divider">/</div>
          <div class="stat-item"><span class="stat-lbl">FPS</span><span class="stat-val" id="val-fps">60</span></div>
          <div class="stat-divider">/</div>
          <div class="stat-item"><span class="stat-lbl">LATENCY</span><span class="stat-val" id="val-latency">16.6 ms</span></div>
        </div>
      </div>

      <!-- TOP-RIGHT MINI-CAM: NEURAL TRACKER -->
      <div class="webcam-container interactive" id="webcam-container">
        <div class="hud-corner top-l"></div>
        <div class="hud-corner top-r"></div>
        <div class="hud-corner bot-l"></div>
        <div class="hud-corner bot-r"></div>
        <div class="cam-state-badge" id="cam-state-badge"></div>
        <div class="webcam-controls">
          <button class="icon-btn" id="btn-toggle-pip" title="Toggle Mini-Cam Size">⤢</button>
        </div>
        <video class="webcam-video" id="webcam-video" playsinline muted autoplay></video>
        <canvas class="landmark-canvas" id="landmark-canvas"></canvas>
        <div class="webcam-label">
          <span class="pulse-dot"></span> NEURAL TRACKER
        </div>
      </div>
    </header>

    <!-- FLOATING GESTURE HINT CARDS -->
    <div class="gesture-hints-container" id="gesture-hints-container">
      <div class="gesture-hint-card" id="hint-open-fist">
        <span class="hint-icon">✊ / 🖐️</span>
        <span class="hint-text"><b>Clench / Open</b>: Zoom / Singularity</span>
      </div>
      <div class="gesture-hint-card" id="hint-tilt">
        <span class="hint-icon">🖐️ ↺ / ↻</span>
        <span class="hint-text"><b>Tilt Hand</b>: 3D Orbit & Pitch</span>
      </div>
      <div class="gesture-hint-card" id="hint-pinch">
        <span class="hint-icon">🤏</span>
        <span class="hint-text"><b>Pinch</b>: Time Dilation (Slow-Mo)</span>
      </div>
      <div class="gesture-hint-card" id="hint-swipe">
        <span class="hint-icon">👈 / 👉</span>
        <span class="hint-text"><b>Wave / Swipe</b>: Switch Scene</span>
      </div>
    </div>

    <!-- BOTTOM HUD CONTROLLER -->
    <footer class="bottom-bar">
      <div class="hud-panel interactive">
        <!-- Status Pill & Telemetry Hub -->
        <div class="status-row">
          <div class="status-pill-group">
            <div class="status-badge">
              <span class="status-dot" id="status-dot"></span>
              <span class="status-text" id="status-text">Camera Ready: Awaiting Start</span>
            </div>

            <!-- Finger Extension Matrix [T] [I] [M] [R] [P] -->
            <div class="finger-status-container" title="Finger Extension Status (Thumb, Index, Middle, Ring, Pinky)">
              <span class="finger-dot" data-finger="T">T</span>
              <span class="finger-dot" data-finger="I">I</span>
              <span class="finger-dot" data-finger="M">M</span>
              <span class="finger-dot" data-finger="R">R</span>
              <span class="finger-dot" data-finger="P">P</span>
            </div>
          </div>

          <!-- Multi-Axis Telemetry Hub -->
          <div class="telemetry-readout">
            <div class="telemetry-chip">OPEN <span class="telemetry-val" id="val-openness">0%</span></div>
            <div class="telemetry-chip">PITCH <span class="telemetry-val" id="val-hand-pitch">+0°</span></div>
            <div class="telemetry-chip">ROLL <span class="telemetry-val" id="val-hand-rot">+0°</span></div>
            <div class="telemetry-chip">PINCH <span class="telemetry-val" id="val-pinch">1.00</span></div>
            <div class="telemetry-chip">TIME DILATION <span class="telemetry-val" id="val-time-dilation">1.00x</span></div>
          </div>
        </div>

        <!-- Expansion & Time Dilation Progress Bar -->
        <div class="progress-section">
          <div class="progress-labels">
            <span class="label-fist">✊ SINGULARITY (FIST)</span>
            <span class="label-center" id="label-center-status">NORMAL TIME (1.0x)</span>
            <span class="label-warp">🖐️ SUPERNOVA / EXPAND</span>
          </div>
          <div class="progress-track" id="progress-track">
            <div class="progress-fill" id="progress-fill"></div>
            <div class="progress-marker" id="progress-marker"></div>
          </div>
        </div>

        <!-- Scene Selector & Control Actions Row -->
        <div class="action-row">
          <!-- Scene Switcher Buttons -->
          <div class="btn-group scene-group">
            <button class="hud-btn scene-btn active" data-scene="gargantua" id="btn-scene-gargantua">🌌 Gargantua</button>
            <button class="hud-btn scene-btn" data-scene="wormhole" id="btn-scene-wormhole">🌀 Wormhole</button>
            <button class="hud-btn scene-btn" data-scene="tesseract" id="btn-scene-tesseract">⏳ Tesseract</button>
          </div>

          <!-- Controls & Toggles -->
          <div class="btn-group action-controls">
            <button class="hud-btn active" id="btn-toggle-audio" title="Toggle Hans Zimmer Procedural Ambient Sound">🔊 Audio: ON</button>
            <button class="hud-btn" id="btn-toggle-record" title="Record 60FPS Video (Press 'R')">🎥 Record</button>
            <button class="hud-btn" id="btn-toggle-hud" title="Clean View for Screen Recording (Press 'H')">🎬 Clean View [H]</button>
            <button class="hud-btn" id="btn-toggle-tiktok" title="Toggle 9:16 Vertical TikTok Guide">📱 9:16 Guide</button>
            <button class="hud-btn" id="btn-reset-cam" title="Reset Camera View">🎯 Reset</button>
          </div>

          <!-- Keyboard Shortcut Hints -->
          <div class="shortcut-hints">
            <span class="key-badge">1,2,3</span> Scenes &nbsp;|&nbsp;
            <span class="key-badge">SPACE</span> Morph &nbsp;|&nbsp;
            <span class="key-badge">H</span> Clean &nbsp;|&nbsp;
            <span class="key-badge">R</span> Rec &nbsp;|&nbsp;
            <span class="key-badge">M</span> Audio &nbsp;|&nbsp;
            <span class="key-badge">DRAG</span> Orbit
          </div>
        </div>
      </div>
    </footer>
  </div>

  <!-- Welcome / Permission Modal -->
  <div class="prompt-overlay" id="prompt-overlay">
    <div class="prompt-modal">
      <div class="prompt-glow-ring"></div>
      <div class="prompt-icon">🌌</div>
      <h2 class="prompt-title">INTERSTELLAR GESTURE</h2>
      <p class="prompt-subtitle">Real-Time WebGL Space Simulation</p>
      
      <div class="prompt-instruction-list">
        <div class="instruction-card">
          <span class="inst-icon">✊ / 🖐️</span>
          <div class="inst-text">
            <b>Clench / Open Palm:</b> Expand and collapse Gargantua's accretion disk or Wormhole throat.
          </div>
        </div>
        <div class="instruction-card">
          <span class="inst-icon">🖐️ ↺ / ↕️</span>
          <div class="inst-text">
            <b>Roll & Pitch Hand:</b> Smoothly steer camera yaw and pitch with spring damping physics.
          </div>
        </div>
        <div class="instruction-card">
          <span class="inst-icon">🤏 / 👈👉</span>
          <div class="inst-text">
            <b>Two-Finger Pinch & Swipe:</b> Pinch for relativistic time dilation (slow-mo); swipe to transition scenes.
          </div>
        </div>
      </div>

      <div class="prompt-actions">
        <button class="btn-primary" id="btn-start-camera">📸 Enable Webcam Tracking</button>
        <button class="btn-secondary" id="btn-start-keyboard">⌨️ Keyboard / Mouse Simulation</button>
      </div>
    </div>
  </div>

  <!-- Main TypeScript Entry Point -->
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

---

### 3.6 `src/style.css`
```css
:root {
  --bg-color: #030307;
  --panel-bg: rgba(8, 12, 24, 0.82);
  --panel-border: rgba(138, 79, 255, 0.32);
  --panel-border-glow: rgba(0, 255, 179, 0.35);
  --accent-gargantua: #ff9d00;
  --accent-wormhole: #00f0ff;
  --accent-tesseract: #00ffb3;
  --accent-cyan: #00f0ff;
  --accent-mint: #00ffb3;
  --accent-purple: #8a4fff;
  --accent-pink: #bd00ff;
  --accent-gold: #ffaa00;
  --accent-red: #ff3366;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --glow-emerald: 0 0 16px rgba(0, 255, 179, 0.45);
  --glow-purple: 0 0 20px rgba(138, 79, 255, 0.5);
  --glow-gold: 0 0 20px rgba(255, 157, 0, 0.5);
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-color);
  color: var(--text-main);
  font-family: var(--font-mono);
  -webkit-font-smoothing: antialiased;
}

#webgl-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  display: block;
}

/* 9:16 Vertical TikTok / Reels Framing Guide */
.tiktok-frame-guide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.tiktok-frame-guide.active {
  opacity: 1;
  visibility: visible;
}

.tiktok-guide-box {
  width: min(calc(100vh * 9 / 16), 90vw);
  height: 96vh;
  border: 2px dashed rgba(0, 255, 179, 0.5);
  box-shadow: 0 0 0 9999px rgba(3, 3, 7, 0.72), 0 0 30px rgba(0, 255, 179, 0.25);
  border-radius: 16px;
  position: relative;
  display: flex;
  justify-content: center;
}

.guide-tag {
  position: absolute;
  top: 12px;
  background: rgba(0, 255, 179, 0.2);
  color: var(--accent-mint);
  border: 1px solid var(--accent-mint);
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1px;
}

/* Ambient Scanlines */
.cyber-scanlines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 2;
  background: linear-gradient(
    rgba(18, 16, 38, 0) 50%,
    rgba(0, 0, 0, 0.25) 50%
  ), linear-gradient(
    90deg,
    rgba(255, 0, 0, 0.015),
    rgba(0, 255, 0, 0.008),
    rgba(0, 0, 255, 0.015)
  );
  background-size: 100% 3px, 6px 100%;
  opacity: 0.45;
}

/* Recording Status Indicator Banner */
.recording-indicator {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 10, 15, 0.88);
  border: 1px solid var(--accent-red);
  box-shadow: 0 0 20px rgba(255, 51, 102, 0.4);
  padding: 6px 16px;
  border-radius: 999px;
  z-index: 50;
  display: none;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(16px);
  font-size: 0.75rem;
}

.recording-indicator.active {
  display: flex;
}

.rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-red);
  box-shadow: 0 0 10px var(--accent-red);
  animation: recBlink 1s infinite;
}

@keyframes recBlink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.85); }
}

.rec-text {
  color: #fff;
  font-weight: 700;
  letter-spacing: 1px;
}

.rec-subtext {
  color: var(--text-muted);
  font-size: 0.65rem;
}

/* UI LAYER */
.hud-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px;
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s ease;
}

.hud-layer.hud-hidden {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.98);
}

.interactive {
  pointer-events: auto;
}

/* TOP-LEFT BRAND PANEL */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.brand-card {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 14px 22px;
  border-radius: 14px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8), inset 0 0 16px rgba(138, 79, 255, 0.15);
  display: flex;
  flex-direction: column;
  gap: 5px;
  position: relative;
  overflow: hidden;
}

.brand-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-mint), var(--accent-purple), var(--accent-cyan));
}

.brand-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-badge-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-mint);
  box-shadow: 0 0 10px var(--accent-mint);
  animation: pulseBadge 1.8s infinite;
}

@keyframes pulseBadge {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.5; }
}

.brand-title {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #ffffff 20%, var(--accent-mint) 65%, var(--accent-cyan) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-square {
  color: var(--accent-mint);
  -webkit-text-fill-color: var(--accent-mint);
  font-size: 0.85rem;
}

.brand-subtitle {
  font-size: 0.68rem;
  color: var(--text-muted);
  letter-spacing: 1.6px;
  text-transform: uppercase;
}

.scene-active-tag {
  color: var(--accent-gold);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(255, 170, 0, 0.5);
}

.stats-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  font-size: 0.72rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-lbl {
  color: var(--text-muted);
  font-size: 0.65rem;
  letter-spacing: 0.8px;
}

.stat-val {
  color: var(--text-main);
  font-weight: 600;
}

.stat-val.highlight-glow {
  color: var(--accent-mint);
  text-shadow: 0 0 10px rgba(0, 255, 179, 0.6);
  font-weight: 700;
}

.stat-divider {
  color: rgba(255, 255, 255, 0.15);
  font-size: 0.75rem;
}

/* TOP-RIGHT MINI-CAM: NEURAL TRACKER */
.webcam-container {
  position: relative;
  width: 480px;
  height: 340px;
  max-width: 42vw;
  max-height: 44vh;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 54px rgba(0,0,0,0.92), var(--glow-emerald);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.webcam-container.minimized {
  width: 58px;
  height: 58px;
  border-radius: 50%;
}

.webcam-container.minimized .webcam-video,
.webcam-container.minimized .landmark-canvas,
.webcam-container.minimized .webcam-label,
.webcam-container.minimized .cam-state-badge,
.webcam-container.minimized .hud-corner {
  display: none;
}

.hud-corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: var(--accent-mint);
  pointer-events: none;
  z-index: 6;
}

.hud-corner.top-l { top: 4px; left: 4px; border-top: 2px solid; border-left: 2px solid; }
.hud-corner.top-r { top: 4px; right: 4px; border-top: 2px solid; border-right: 2px solid; }
.hud-corner.bot-l { bottom: 4px; left: 4px; border-bottom: 2px solid; border-left: 2px solid; }
.hud-corner.bot-r { bottom: 4px; right: 4px; border-bottom: 2px solid; border-right: 2px solid; }

.webcam-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  opacity: 0.85;
}

.landmark-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: scaleX(-1);
  pointer-events: none;
}

.webcam-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 7;
  display: flex;
  gap: 6px;
}

.icon-btn {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(138, 79, 255, 0.5);
  color: var(--text-main);
  border-radius: 6px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--accent-mint);
  color: #000;
  box-shadow: var(--glow-emerald);
}

.webcam-label {
  position: absolute;
  bottom: 6px;
  left: 8px;
  font-size: 0.62rem;
  letter-spacing: 1.2px;
  font-weight: 700;
  color: var(--accent-mint);
  background: rgba(3, 3, 7, 0.85);
  padding: 3px 8px;
  border-radius: 6px;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(0, 255, 179, 0.25);
  display: flex;
  align-items: center;
  gap: 5px;
}

.pulse-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-mint);
  box-shadow: 0 0 6px var(--accent-mint);
}

.cam-state-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-mint);
  box-shadow: 0 0 8px var(--accent-mint);
}

/* FLOATING GESTURE HINT CARDS */
.gesture-hints-container {
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.gesture-hint-card {
  background: rgba(8, 12, 24, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  padding: 8px 14px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.72rem;
  color: var(--text-muted);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
  opacity: 0.75;
}

.gesture-hint-card.active {
  opacity: 1;
  border-color: var(--accent-mint);
  background: rgba(0, 255, 179, 0.12);
  color: #fff;
  transform: translateX(4px);
  box-shadow: var(--glow-emerald);
}

.hint-icon {
  font-size: 1rem;
}

.hint-text b {
  color: var(--text-main);
}

/* BOTTOM HUD CONTROLLER */
.bottom-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.hud-panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 18px;
  padding: 16px 28px;
  width: 100%;
  max-width: 900px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85), inset 0 0 20px rgba(138, 79, 255, 0.18);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  flex-wrap: wrap;
  gap: 10px;
}

.status-pill-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.7);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 10px #f59e0b;
  transition: all 0.3s ease;
}

.status-dot.active {
  background: var(--accent-mint);
  box-shadow: 0 0 10px var(--accent-mint);
  animation: pulse 2s infinite;
}

.status-dot.detecting {
  background: var(--accent-cyan);
  box-shadow: 0 0 10px var(--accent-cyan);
  animation: pulse 1s infinite;
}

.status-dot.fallback {
  background: var(--accent-purple);
  box-shadow: 0 0 10px var(--accent-purple);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.status-text {
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* FINGER STATUS MATRIX [T] [I] [M] [R] [P] */
.finger-status-container {
  display: flex;
  gap: 6px;
  background: rgba(15, 23, 42, 0.7);
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.finger-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: rgba(30, 41, 59, 0.8);
  color: var(--text-muted);
  font-size: 0.65rem;
  font-weight: 700;
  transition: all 0.15s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.finger-dot.active {
  background: var(--accent-mint);
  color: #030307;
  border-color: var(--accent-mint);
  box-shadow: 0 0 8px rgba(0, 255, 179, 0.7);
}

/* MULTI-AXIS TELEMETRY HUB */
.telemetry-readout {
  display: flex;
  gap: 8px;
  font-size: 0.72rem;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.telemetry-chip {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.telemetry-val {
  color: var(--accent-mint);
  font-weight: 700;
}

/* EXPANSION & TIME DILATION PROGRESS BAR */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-muted);
}

.label-fist {
  color: var(--accent-gold);
}

.label-center {
  color: var(--accent-mint);
}

.label-warp {
  color: var(--accent-cyan);
}

.progress-track {
  width: 100%;
  height: 10px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(138, 79, 255, 0.35);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.6);
}

.progress-fill {
  height: 100%;
  width: 50%;
  background: linear-gradient(90deg, var(--accent-gold) 0%, var(--accent-mint) 50%, var(--accent-cyan) 100%);
  border-radius: 999px;
  box-shadow: 0 0 16px rgba(0, 255, 179, 0.9);
}

.progress-marker {
  position: absolute;
  top: -2px;
  left: 50%;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 10px #ffffff, 0 0 22px var(--accent-mint);
  transform: translateX(-50%);
  pointer-events: none;
}

/* CONTROLS ROW */
.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 2px;
}

.btn-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hud-btn {
  background: rgba(30, 41, 59, 0.75);
  border: 1px solid rgba(138, 79, 255, 0.38);
  color: var(--text-main);
  padding: 6px 12px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hud-btn:hover {
  background: rgba(0, 255, 179, 0.18);
  border-color: var(--accent-mint);
  box-shadow: var(--glow-emerald);
  transform: translateY(-1px);
}

.hud-btn.active {
  background: var(--accent-mint);
  color: #030307;
  font-weight: 700;
  border-color: var(--accent-mint);
  box-shadow: var(--glow-emerald);
}

.scene-btn[data-scene="gargantua"].active {
  background: linear-gradient(135deg, #ff9d00, #ff6a00);
  color: #030307;
  border-color: #ffaa00;
  box-shadow: var(--glow-gold);
}

.scene-btn[data-scene="wormhole"].active {
  background: linear-gradient(135deg, #00f0ff, #8a4fff);
  color: #ffffff;
  border-color: #00f0ff;
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.6);
}

.scene-btn[data-scene="tesseract"].active {
  background: linear-gradient(135deg, #00ffb3, #10b981);
  color: #030307;
  border-color: #00ffb3;
  box-shadow: var(--glow-emerald);
}

.shortcut-hints {
  font-size: 0.68rem;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.key-badge {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 2px 5px;
  border-radius: 4px;
  color: var(--accent-mint);
  font-weight: 600;
}

/* PROMPT / WELCOME MODAL */
.prompt-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(3, 3, 7, 0.88);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.4s ease, visibility 0.4s ease;
}

.prompt-overlay.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.prompt-modal {
  background: rgba(12, 16, 32, 0.96);
  border: 1px solid var(--accent-mint);
  box-shadow: 0 16px 64px rgba(0, 0, 0, 0.9), var(--glow-emerald);
  border-radius: 22px;
  padding: 34px;
  max-width: 560px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.prompt-glow-ring {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  height: 120px;
  background: radial-gradient(ellipse, rgba(0, 255, 179, 0.25) 0%, rgba(0,0,0,0) 70%);
  pointer-events: none;
}

.prompt-icon {
  font-size: 2.8rem;
  filter: drop-shadow(0 0 16px var(--accent-mint));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.prompt-title {
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
}

.prompt-subtitle {
  font-size: 0.76rem;
  color: var(--accent-mint);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-top: -10px;
}

.prompt-instruction-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  text-align: left;
}

.instruction-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(20, 27, 48, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 14px;
  border-radius: 10px;
}

.inst-icon {
  font-size: 1.25rem;
  min-width: 32px;
  text-align: center;
}

.inst-text {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.inst-text b {
  color: var(--text-main);
}

.prompt-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  margin-top: 6px;
}

.btn-primary {
  flex: 1;
  background: linear-gradient(135deg, #00ffb3, #00f0ff);
  color: #030307;
  border: none;
  padding: 12px 20px;
  border-radius: 10px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 255, 179, 0.4);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 28px rgba(0, 255, 179, 0.7);
}

.btn-secondary {
  flex: 1;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text-main);
  padding: 12px 20px;
  border-radius: 10px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: rgba(51, 65, 85, 0.9);
  border-color: rgba(255, 255, 255, 0.3);
}

/* RESPONSIVE DESIGN */
@media (max-width: 768px) {
  .hud-layer {
    padding: 12px;
  }
  .webcam-container {
    width: 140px;
    height: 100px;
  }
  .brand-card {
    padding: 10px 14px;
  }
  .brand-title {
    font-size: 0.95rem;
  }
  .hud-panel {
    padding: 12px 16px;
  }
  .stats-group {
    display: none;
  }
  .shortcut-hints {
    display: none;
  }
  .telemetry-readout {
    display: none;
  }
  .gesture-hints-container {
    display: none;
  }
  .prompt-modal {
    padding: 24px 18px;
  }
  .prompt-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .webcam-container {
    width: 100px;
    height: 75px;
  }
  .action-row {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-group {
    justify-content: center;
  }
}
```

---

## 4. Verification Protocol & Execution Checklist for Worker

1. **Write `package.json`**:
   - Update `package.json` with scripts (`dev`, `build`, `preview`, `test`), `three@^0.160.0`, `@types/three@^0.160.0`, `typescript@^5.3.3`, `vite@^5.0.0`, `tsx@^4.7.0`.
   - Run `npm install` to install `@types/three`, `typescript`, `tsx`.
2. **Write `tsconfig.json`**:
   - Create `tsconfig.json` with strict ES2022 / bundler settings.
3. **Write `vite.config.ts`**:
   - Create `vite.config.ts` with Three.js manual chunking, esbuild minification, and port 3000.
4. **Write `vercel.json`**:
   - Create `vercel.json` with SPA rewrites and asset cache headers.
5. **Write `index.html`**:
   - Create updated `index.html` referencing `/src/style.css` and `/src/main.ts` with complete HUD DOM.
6. **Write `src/style.css`**:
   - Create `src/style.css` with Interstellar glassmorphic styling, media queries, and animations.
7. **Typecheck & Build Validation**:
   - Run `npx tsc --noEmit` to verify zero typecheck errors.
   - Run `npm run build` to verify `dist/` is generated cleanly with zero errors.
   - Verify `dist/index.html` and `dist/assets/` containing `three-vendor-[hash].js` and main bundle.
