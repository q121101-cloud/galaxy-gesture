# Interstellar Gesture Experience — Architectural & Build Foundation Survey Report

**Agent**: Explorer 1 (Architectural & Build Foundation Specialist)  
**Date**: 2026-08-23  
**Project**: `/Users/quan/.gemini/antigravity/scratch/galaxy-gesture`  
**Status**: Comprehensive Survey Complete  

---

## 1. Executive Summary

The **Interstellar Gesture Experience** is a real-time WebGL space simulation inspired by Christopher Nolan's *Interstellar*. It renders three physically and visually distinct scenes—**Gargantua (Black Hole)**, **Wormhole Portal**, and **5D Tesseract Lattice**—powered by 300,000+ GPU particles, relativistic gravitational lensing shaders, Web Audio procedural synthesis (Hans Zimmer organ drone & clockwork ticking), and real-time MediaPipe hand gesture tracking.

This report establishes the complete architectural blueprint, technical stack, TypeScript module interfaces, MediaPipe integration strategy, Canvas `captureStream` + `MediaRecorder` video recording pipeline, and production-ready build configuration for seamless Vercel deployment.

---

## 2. Technical Stack & Build Foundation

### 2.1 Core Stack Specifications
- **Build Tooling**: Vite 5.x + TypeScript 5.3+ (ESNext modules, strict type safety).
- **Rendering Engine**: Three.js (r160+) / WebGL2 with custom GLSL shaders (vertex, fragment, postprocessing).
- **Shader Pipeline**: Type-safe GLSL template literals (`.glsl.ts` modules) with string interpolation for shared mathematical routines (noise, Doppler factor, gravitational lensing deflection).
- **Computer Vision**: Hybrid MediaPipe Hands loader with CDN dynamic loading, offscreen 640x480 hardware acceleration, 1€ filtering, and graceful keyboard/mouse fallback.
- **Audio Engine**: Native Web Audio API procedural synthesis (additive organ oscillators, custom noise buffers, algorithmic biquad filter sweeps, synthetic convolver reverb) with zero external audio assets.
- **Video Capture**: HTMLCanvasElement `captureStream(60)` + Web Audio `createMediaStreamDestination()` + `MediaRecorder` (VP9/VP8/H264) for one-key `[H]` cinematic and 9:16 TikTok video recording.
- **Deployment**: Vercel zero-configuration SPA deployment with `vercel.json` rewrite rules and immutable asset caching headers.

---

## 3. Directory Layout & Module Boundaries

```
/Users/quan/.gemini/antigravity/scratch/galaxy-gesture/
├── index.html                     # Clean entry HTML with viewport, HUD mount point, canvas
├── styles.css                     # Glassmorphic cyber/cinematic styling, HUD layout, animations
├── package.json                   # Modernized dependencies and build scripts
├── tsconfig.json                  # Strict TypeScript configuration
├── vite.config.ts                 # Vite bundle settings, manual chunks, server config
├── vercel.json                    # Vercel SPA routing and caching headers
└── src/
    ├── main.ts                    # Bootstrap entry point
    │
    ├── core/                      # Engine Foundations
    │   ├── Engine.ts              # Master loop, RAF, lifecycle coordinator, FPS telemetry
    │   ├── SceneManager.ts        # Scene registration, crossfade transitions, active scene switching
    │   ├── Renderer.ts            # WebGLRenderer, HalfFloatType HDR target, EffectComposer, Bloom
    │   ├── CameraController.ts    # Spring-damped camera rig, FOV warping, hand tilt integration
    │   ├── TimeManager.ts         # Delta time, time-dilation factor (pinch gesture), simulation clocks
    │   └── types.ts               # Core interfaces, HandPose, Telemetry, SceneState
    │
    ├── scenes/                    # Interactive Visual Scenes
    │   ├── BaseScene.ts           # Abstract scene base (init, update, render, destroy, resize, getParticleCount)
    │   ├── GargantuaScene.ts      # Gravitational lensing black hole + 300k accretion disk particles + Doppler shift
    │   ├── WormholeScene.ts       # Traversable spherical wormhole portal + dual-universe starfield + slipstream particles
    │   └── TesseractScene.ts      # Infinite 5D hypercube bookshelf lattice + quantum light beams + temporal freeze
    │
    ├── shaders/                   # Custom GLSL Shaders & Math Modules
    │   ├── common/
    │   │   ├── noise.glsl.ts      # Simplex, curl noise, harmonic wave turbulence
    │   │   └── color.glsl.ts      # Blackbody spectrum, relativistic Doppler shifts, HSV/RGB conversion
    │   ├── gargantua/
    │   │   ├── lensing.glsl.ts    # Schwarzschild metric raymarching & light deflection around event horizon
    │   │   ├── accretion.vert.ts  # Keplerian orbital dynamics, vertical disk warp, point size attenuation
    │   │   └── accretion.frag.ts  # Temperature gradient, Doppler beaming (blueshift approach, redshift recess)
    │   ├── wormhole/
    │   │   ├── portal.vert.ts     # Throat geometry transformation & curvature
    │   │   └── portal.frag.ts     # Dual-universe celestial sphere mapping, Einstein ring distortion
    │   ├── tesseract/
    │   │   ├── lattice.vert.ts    # 4D hypercube coordinate projection & infinite spatial tiling
    │   │   └── lattice.frag.ts    # Temporal interference patterns, pulsating quantum light filaments
    │   └── postprocessing/
    │       └── cinematicPass.ts   # Anamorphic bloom, film grain, subtle chromatic aberration, vignette
    │
    ├── gestures/                  # Computer Vision & Motion Controls
    │   ├── MediaPipeHandsWrapper.ts # Crash-proof MediaPipe loader, offscreen processing, error handling
    │   ├── GestureRecognizer.ts   # Clench/Open, 2-finger pinch, roll tilt, pitch tilt, swipe detection
    │   ├── OneEuroFilter.ts       # Adaptive 1€ filter for zero jitter and low latency
    │   ├── SpringDamping.ts       # Second-order smooth spring damping for fluid camera/control motion
    │   └── GestureTypes.ts        # HandTrackingResult, FingerStates, GestureMode
    │
    ├── audio/                     # Procedural Web Audio Synthesis
    │   ├── AudioEngine.ts         # AudioContext, master gain/limiter, convolver reverb, MediaStreamDestination
    │   ├── GargantuaOrganDrone.ts # Additive church organ oscillators (Hans Zimmer Interstellar chord chords)
    │   ├── WormholeCosmicPad.ts   # Ethereal resonant pads + swept slipstream bandpass noise
    │   ├── TesseractClockworkSynth.ts # Algorithmic clock ticking (pocket watch) + modal crystal bells
    │   └── GestureAudioCoupler.ts # Dynamically maps gestures (openness, pinch, speed) to audio filters/reverb
    │
    └── ui/                        # Glassmorphic Cinematic HUD
        ├── GlassmorphicHUD.ts     # HUD container, status pills, telemetry readouts, scene indicators
        ├── WebcamInset.ts         # Mini-cam corner inset with neon landmark skeleton & PiP toggle
        ├── GestureHints.ts        # Animated contextual gesture guidance cards
        ├── VideoRecorder.ts       # Canvas captureStream + MediaRecorder recorder & WebM/MP4 exporter
        ├── SceneNavOverlay.ts     # Quick scene switch pills (1: Gargantua, 2: Wormhole, 3: Tesseract)
        └── StatsOverlay.ts        # Live FPS, frame time latency, GPU particle count
```

---

## 4. Subsystem Deep Dives

### 4.1 MediaPipe Integration Strategy (Zero-Crash & Bundler Resilient)

#### Challenge
Standard `@mediapipe/hands` npm packages often crash Vite/Rollup builds due to CommonJS/ESM module mismatches and hardcoded WASM binary resolution paths.

#### Solution Architecture
1. **Dynamic CDN Loader with Runtime Singleton**: `MediaPipeHandsWrapper` dynamically injects the verified `@mediapipe/hands` script (`hands.js`) and configures `locateFile` to retrieve `hands.binarypb` and `hands_solution_packed_assets.data` from the Google CDN.
2. **Dedicated Offscreen Processing Canvas**: Captures video frames into an offscreen 640x480 canvas, minimizing memory overhead and decoupling rendering from tracking.
3. **Adaptive Frame Loop**: Uses `requestVideoFrameCallback` on supporting browsers (Chrome/Edge) with automatic fallback to `requestAnimationFrame`.
4. **Dual 1€ Filtering**: Every tracking scalar ($x, y, \text{roll}, \text{pitch}, \text{openness}, \text{scale}$) passes through a specialized 1€ filter (`minCutoff = 0.4`, `beta = 0.035`) guaranteeing zero jitter during stationary hand poses and instantaneous responsiveness during fast gestures.
5. **Universal Keyboard/Mouse Fallback**: If webcam is disabled or permission denied, the system seamlessly routes keyboard controls (`Space` for morph/openness, `W/A/S/D` or Arrow keys for pitch/roll, `P` for pinch time dilation, `1/2/3` for scene switching) without crashing or interrupting the WebGL engine.

---

### 4.2 Video Recording & 9:16 TikTok Capture Mechanism

```
+-------------------+      +-----------------------+
|  WebGL2 Canvas    | ---> | canvas.captureStream  | ---\
+-------------------+      +-----------------------+     \
                                                          +--> MediaStream ---> MediaRecorder ---> Blob/Download
+-------------------+      +-----------------------+     /     (60 FPS + Audio)  (VP9/H264 WebM)
|  Web Audio Engine | ---> | createMediaStreamDest | ---/
+-------------------+      +-----------------------+
```

1. **Stream Capture**:
   - `const canvasStream = canvas.captureStream(60);` captures full-resolution 60 FPS WebGL frames.
   - `const audioDest = audioCtx.createMediaStreamDestination();` routes mixed procedural audio into a stream track.
   - Combined stream: `new MediaStream([...canvasStream.getVideoTracks(), ...audioDest.stream.getAudioTracks()])`.
2. **MediaRecorder Management**:
   - Uses `MediaRecorder` with prioritized MIME types (`video/webm;codecs=vp9,opus`, `video/webm;codecs=vp8,opus`, `video/mp4`).
   - Collects recorded chunks on `dataavailable` event.
   - On completion, packages chunks into a `Blob`, creates an object URL, and triggers immediate download (`interstellar-capture-[scene]-[timestamp].webm`).
3. **Clean HUD Mode (`[H]` key / Record Button)**:
   - When recording starts or `[H]` is triggered, the HUD enters `.hud-hidden` mode (smooth fade out) so the video output contains pure, cinematic visuals.
   - Optional 9:16 vertical overlay guide provides TikTok framing guidelines.

---

### 4.3 Visual Scenes Mathematical & Shader Specifications

#### Scene 1: Gargantua (Black Hole & Relativistic Accretion Disk)
- **Gravitational Lensing Fragment Shader**:
  - Implements Schwarzschild black hole ray deflection:
    $$\hat{\alpha}(b) \approx \frac{4GM}{c^2 b} = \frac{2 r_s}{b}$$
  - For each camera ray passing within impact parameter $b < \sqrt{27}/2 r_s \approx 2.6 r_s$, light is captured by the event horizon (pure shadow).
  - Outside the horizon, rays deflect gravitationally, bending the background starfield into Einstein rings and bending the back half of the accretion disk over and under the black hole.
- **Accretion Disk Particle Dynamics (300,000+ Particles)**:
  - Keplerian orbital angular velocity $\omega(r) = \sqrt{GM/r^3} \propto r^{-1.5}$.
  - Relativistic Doppler factor calculation:
    $$\delta = \frac{1}{\gamma (1 - \beta \cos\theta)}, \quad \beta = \frac{v}{c}, \quad \gamma = \frac{1}{\sqrt{1 - \beta^2}}$$
  - Blue-shifted side (approaching observer): intense cyan/blue-white radiance and relativistic beaming intensity boost ($\propto \delta^3$).
  - Red-shifted side (receding observer): deep orange/amber-red shift and dimmed intensity.
  - Hand openness dynamically controls accretion disk accretion rate and gravitational radius expansion/contraction.

#### Scene 2: Wormhole Portal (Traversable 4D Gateway)
- **Spherical Throat Geometry**:
  - A 3D spherical lens embedded in space connecting Universe A (Saturn celestial background) to Universe B (distant interstellar galaxy).
  - Raymarching calculates entry intersection with the throat sphere, mapping rays into the second universe's celestial starfield coordinates.
  - Cosmic slipstream particle field (100,000+ particles) streaming along hyperbolic trajectories through the throat.
  - Hand pinch/fist gestures trigger hyper-space travel through the portal.

#### Scene 3: Tesseract (5D Hypercube Infinite Bookshelf)
- **4D/5D Spatial Lattice**:
  - Infinite coordinate tiling of perpendicular intersecting light beams in $X, Y, Z, W$ dimensions.
  - Procedural volumetric shader simulating glowing emerald/cyan light rays crossing across infinite temporal layers.
  - Floating gravimetric dust motes (100,000+ particles) that vibrate and pulse.
  - **Two-Finger Pinch Time Dilation**:
    - Clamps the simulation clock `uTimeDilation` towards 0.05, freezing the tesseract lattice vibrations and slowing particle dust into suspended animation.

---

### 4.4 Procedural Web Audio Engine Architecture

No external MP3/WAV files required. Everything generated programmatically via Web Audio API:

1. **Gargantua (Hans Zimmer Organ Drone)**:
   - 4 additive oscillator banks (Sawtooth + Triangle) tuned to deep modal fifths (`A1` 55Hz, `E2` 82.4Hz, `A2` 110Hz, `C#3` 138.6Hz).
   - Dual resonant lowpass filter with slow 0.05Hz LFO modulation simulating massive air columns.
   - Hand openness modulates filter cutoff (180Hz to 2800Hz) and harmonic richness.
2. **Wormhole (Cosmic Reverb Pad & Slipstream Pink Noise)**:
   - Detuned Sine/Sawtooth pad filtered through a high-reverb Convolver.
   - Procedural pink noise generator swept through a dynamic bandpass filter mapped to hand roll and pitch.
3. **Tesseract (Clockwork Ticking & Eerie Modal Bells)**:
   - Algorithmic micro-impulse click generator (80 BPM pocket watch rhythm) with rapid exponential envelope.
   - High-Q resonant bandpass filters creating shimmering glass/crystal overtones.
   - Two-finger pinch modulates clock tempo down to ultra-slow heartbeat pulses.

---

## 5. Build Configuration & Vercel Deployment

### 5.1 `package.json`
```json
{
  "name": "galaxy-gesture",
  "version": "2.0.0",
  "description": "Interstellar Gesture Experience - Real-time WebGL space simulation controlled by MediaPipe hand gestures",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.160.0"
  },
  "devDependencies": {
    "@types/three": "^0.160.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.12"
  }
}
```

### 5.2 `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

### 5.3 `vite.config.ts`
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  }
});
```

### 5.4 `vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 6. Implementation Roadmap & Milestones

| Milestone | Scope | Deliverables |
|---|---|---|
| **M1: Build & Core Engine** | TypeScript setup, Vite config, `Engine`, `SceneManager`, `Renderer`, `CameraController`, `TimeManager` | Zero-error `tsc && vite build`, multi-scene lifecycle foundation |
| **M2: Gestures & Filtering** | `MediaPipeHandsWrapper`, `GestureRecognizer`, `OneEuroFilter`, `SpringDamping` | Jitter-free hand tracking, 5-finger analysis, keyboard fallback |
| **M3: Gargantua Scene** | Gravitational lensing shader, 300k+ accretion particles, Doppler shift, Einstein ring | Physically-inspired black hole with relativistic optical effects |
| **M4: Wormhole Scene** | Traversable spherical portal shader, celestial skybox refraction, slipstream particles | Portal fly-through on gesture zoom, dual starfield warping |
| **M5: Tesseract Scene** | 5D hypercube lattice shader, glowing light beams, pinch time dilation | Infinite bookshelf room with interactive quantum time freeze |
| **M6: Procedural Web Audio** | `AudioEngine`, `GargantuaOrganDrone`, `WormholePad`, `TesseractClockwork`, `GestureAudioCoupler` | Atmospheric soundscapes with smooth crossfades and zero assets |
| **M7: UI & Video Capture** | `GlassmorphicHUD`, `WebcamInset`, `VideoRecorder` (Canvas + Audio), `[H]` mode | TikTok 9:16 capture, smooth scene navigation, Vercel verification |

---

## 7. Risk Analysis & Mitigation Strategies

1. **Risk: High GPU particle count causing frame drops on low-end hardware.**  
   *Mitigation*: Dynamic particle LOD scaling based on measured FPS (e.g. 500k on desktop GPU $\to$ 200k on mobile/integrated GPU) + quarter-resolution Bloom pass.
2. **Risk: MediaPipe initialization failure or webcam permissions blocked.**  
   *Mitigation*: Immediate automatic fallback to keyboard/mouse controls with clear HUD status feedback so the app remains 100% interactive.
3. **Risk: MediaRecorder audio synchronization drift.**  
   *Mitigation*: Single `AudioContext` routing directly into `createMediaStreamDestination()`, mixed simultaneously with `canvas.captureStream(60)`.
4. **Risk: Vercel deployment MIME type or SPA routing issues.**  
   *Mitigation*: `vercel.json` with universal wildcard rewrites and static asset cache headers.

---

**Survey Completed By**: Explorer 1  
**Handoff Reference**: `handoff.md` in `.agents/explorer_survey_1/`
