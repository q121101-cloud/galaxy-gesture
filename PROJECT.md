# Master Project: Interstellar Gesture Experience

## Architecture
- **Tech Stack**: TypeScript 5.3+, Three.js r160, Vite 5, Web Audio API, MediaPipe Hands (via CDN/dynamic loader with synthetic fallback), Canvas MediaRecorder API.
- **Module Boundaries**:
  * `src/core/`: Application Engine, Lifecycle, SceneManager, Renderer (WebGL2), CameraController, TimeManager, Types & Constants.
  * `src/shaders/`: GLSL shaders for Gravitational Lensing Raymarcher, Relativistic Doppler Accretion Disk, Wormhole Portal Refraction, 5D Tesseract Lattice, Post-Processing Bloom & Gravitational Ripple.
  * `src/scenes/`: `BaseScene.ts`, `GargantuaScene.ts` (>300,000 GPU Keplerian particles, polar jets, event horizon), `WormholeScene.ts` (Ellis wormhole portal, dual starfield skybox, fly-through streaks), `TesseractScene.ts` (5D infinite bookshelf lattice, neon timeline filaments, quantum motes), `TransitionManager.ts` (>=0.5s cinematic cross-fade & morphing).
  * `src/gestures/`: `MediaPipeWrapper.ts` (dynamic script loader, camera stream manager, mobile adaptive resolution), `LandmarkNormalizer.ts` (scale-invariant palm metrics), `GestureRecognizer.ts` (open/fist, tilt/pitch 3D normal, two-finger pinch, wave/swipe sliding window), `SpringPhysics.ts` (2nd-order critically damped harmonic oscillator), `SyntheticGestureSimulator.ts` (automated test runner support).
  * `src/audio/`: `AudioEngine.ts` (100% procedural Web Audio API, zero audio files), `ReverbGenerator.ts` (algorithmic cathedral convolution impulse), `GargantuaOrganSynth.ts` (Hans Zimmer additive pipe organ drone), `WormholePadSynth.ts` (ethereal resonant cosmic pad), `TesseractClockworkSynth.ts` (high-precision audioContext clockwork ticking + sub-harmonics), `GestureAudioCoupler.ts` (gesture intensity modulation & crossfade).
  * `src/ui/`: `GlassmorphicHUD.ts` (monospaced telemetry, live FPS, particle counter), `WebcamInset.ts` (corner hand skeleton overlay), `GestureHints.ts` (interactive guide cards), `VideoRecorder.ts` (Canvas `captureStream(60)` + Web Audio destination `MediaRecorder`, [H] key clean mode).
  * `src/main.ts`: Entry point bootstrap tying together Engine, Scenes, Gestures, Audio, and UI.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | TypeScript & Vite Project Build | Strict TS + Vite configuration, clean build (`npm run build` exits 0), zero bundler errors | M1 | ORIGINAL_REQUEST §R5 |
| 2 | Vercel Deployment Configuration | `vercel.json` with SPA routing and asset cache headers | M1 | ORIGINAL_REQUEST §R5 |
| 3 | Core Engine & Scene Infrastructure | WebGL2 renderer, SceneManager, CameraController, TimeManager with time-dilation scaling | M1 | ORIGINAL_REQUEST §R1 |
| 4 | GLSL Shader Pipeline | Gravitational lensing raymarching, Doppler shift accretion disk, wormhole portal, 5D lattice shaders | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Gargantua Scene Visuals | Physically-inspired black hole, event horizon, glowing accretion disk with warped top/bottom lensing, Doppler beaming (blueshift approach / redshift recede) | M2 | ORIGINAL_REQUEST §R1 |
| 6 | Gargantua GPU Particle System | ≥300,000 GPU particles orbiting with Keplerian velocities, relativistic polar jets | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Wormhole Scene Visuals | Traversable spherical portal with celestial refraction, starfield visible through opening, fly-through particle streaks | M2 | ORIGINAL_REQUEST §R1 |
| 8 | Tesseract Scene Visuals | 5D infinite bookshelf lattice, crossing neon timeline filaments, quantum motes, time dimension visualization | M2 | ORIGINAL_REQUEST §R1 |
| 9 | Cinematic Scene Transitions | Smooth ≥0.5s cross-fade / particle morphing with gravitational ripple pass, no hard cuts or flashes | M2 | ORIGINAL_REQUEST §R1 |
| 10 | MediaPipe Hands Integration | Webcam stream initialization, mobile adaptive resolution, fallback / synthetic simulation for headless tests | M3 | ORIGINAL_REQUEST §R2 |
| 11 | Open Hand ↔ Fist Gesture | Continuous scale-invariant palm extension metric for zoom/expand/collapse | M3 | ORIGINAL_REQUEST §R2 |
| 12 | Tilt & Pitch Gesture Control | 3D palm plane normal calculation driving smooth vertical yaw and horizontal pitch | M3 | ORIGINAL_REQUEST §R2 |
| 13 | Two-Finger Pinch Time Dilation | Thumb-to-index pinch distance metric driving continuous slow-motion time dilation ($\tau \in [0.1, 1.0]$) | M3 | ORIGINAL_REQUEST §R2 |
| 14 | Wave / Swipe Scene Switching | 12-frame sliding window palm velocity tracker with directional dominance ratio and cooldown | M3 | ORIGINAL_REQUEST §R2 |
| 15 | Spring-Damper Physics System | 2nd-order critically damped harmonic oscillator equations eliminating jitter and overshoot | M3 | ORIGINAL_REQUEST §R2 |
| 16 | Procedural Web Audio Engine | 100% synthesized Web Audio API infrastructure with algorithmic cathedral reverb, zero external audio assets | M4 | ORIGINAL_REQUEST §R3 |
| 17 | Gargantua Hans Zimmer Organ Drone | Multi-oscillator additive pipe organ synth ($C_1 \to C_6$), wave shaper saturation, cascaded resonant lowpass filter | M4 | ORIGINAL_REQUEST §R3 |
| 18 | Wormhole Cosmic Pad Soundscape | Detuned supersaw pad with stereo chorus delays and hand-roll modulated bandpass filter | M4 | ORIGINAL_REQUEST §R3 |
| 19 | Tesseract Clockwork Ticking Synth | Lookahead `audioContext.currentTime` scheduler triggering micro-impulse ticking + sub-harmonic drone cluster | M4 | ORIGINAL_REQUEST §R3 |
| 20 | Dynamic Gesture Audio Modulation | Modulation of volume, filter cutoffs, and resonance based on gesture intensity and time dilation | M4 | ORIGINAL_REQUEST §R3 |
| 21 | Equal-Power Audio Scene Crossfade | Seamless 1.5s equal-power crossfade between ambient soundscapes on scene transition | M4 | ORIGINAL_REQUEST §R3 |
| 22 | Glassmorphic Cinematic HUD | Monospaced telemetry overlay showing active scene, live FPS counter, active particle count (>300k) | M5 | ORIGINAL_REQUEST §R4 |
| 23 | Webcam Inset & Skeleton Overlay | Corner mounted webcam preview with real-time hand landmark skeleton canvas | M5 | ORIGINAL_REQUEST §R4 |
| 24 | Gesture Hint Cards | Contextual guide cards indicating available gestures that fade in/out | M5 | ORIGINAL_REQUEST §R4 |
| 25 | Screen Recording Engine & [H] Key | Canvas `captureStream(60)` + Web Audio destination `MediaRecorder` export, `[H]` key Clean Mode toggle | M5 | ORIGINAL_REQUEST §R4 |
| 26 | Mobile-Responsive Layout & Touch | Adaptive viewport scaling, responsive HUD, touch fallback controls | M5 | ORIGINAL_REQUEST §R4 |
| 27 | Comprehensive E2E Testing Suite | Tier 1 (Feature Coverage), Tier 2 (Boundary/Corner), Tier 3 (Cross-Feature Pairwise), Tier 4 (Real-World Workloads) | M6 / E2E Track | ORIGINAL_REQUEST §Acceptance Criteria |
| 28 | Adversarial Coverage Hardening | Tier 5 white-box gap analysis, edge case stress testing, performance validation (≥60 FPS) | M6 / Final | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Foundation & Shaders | TypeScript, Vite, WebGL2/Three.js engine core, GLSL shaders, Vercel config, build setup | none | DONE |
| M2 | Interstellar 3D Scenes | Gargantua (>300k particles, Doppler disk, lensing), Wormhole (portal, skybox), Tesseract (5D lattice), Transitions | M1 | IN_PROGRESS |
| M3 | MediaPipe Gestures & Physics | MediaPipe loader, landmark normalizer, gesture recognizer (fist/open, tilt/pitch, pinch, swipe), spring physics | M1 | IN_PROGRESS |
| M4 | Procedural Web Audio Engine | 100% Web Audio synth (Hans Zimmer organ, wormhole pad, tesseract clockwork), algorithmic reverb, gesture coupling | M1 | IN_PROGRESS |
| M5 | Cinematic HUD & UI Integration | Glassmorphic HUD, live FPS/particle stats, webcam inset, gesture hints, [H] video recorder, main bootstrap | M2, M3, M4 | PLANNED |
| M6 | Final Verification & Hardening | 100% pass of E2E test suite (Tiers 1-4) + Tier 5 adversarial coverage hardening, zero build errors | M5, TEST_READY | PLANNED |

## E2E Testing Track
- **Owner**: E2E Testing Orchestrator
- **Scope**: Requirement-driven opaque-box test suite covering Tiers 1-4 (Features, Boundaries, Combinations, Real-world workloads), automated test runner, `TEST_READY.md`.

## Interface Contracts

### Core ↔ Scenes (`src/core/types.ts` & `src/scenes/BaseScene.ts`)
- `interface IScene`:
  * `name: string`
  * `particleCount: number`
  * `init(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): Promise<void> | void`
  * `update(delta: number, timeDilation: number, gestureState: GestureState): void`
  * `render(renderer: THREE.WebGLRenderer): void`
  * `onEnter(previousSceneName?: string): void`
  * `onExit(nextSceneName?: string): void`
  * `dispose(): void`

### Gestures ↔ Core/Scenes/Audio (`src/gestures/GestureRecognizer.ts`)
- `interface GestureState`:
  * `hasHand: boolean`
  * `openness: number` (0.0 = tight fist, 1.0 = wide open)
  * `pinchDistance: number` (0.0 = fully pinched, 1.0 = fully open)
  * `timeDilation: number` (0.1 = maximum slow motion, 1.0 = normal time)
  * `rotation: { yaw: number; pitch: number; roll: number }` (spring-damped radians)
  * `zoomDelta: number` (expansion/collapse scalar)
  * `swipeTriggered: 'left' | 'right' | null` (debounced event)
  * `intensity: number` (composite hand motion energy 0.0 to 1.0)
  * `rawLandmarks: Array<{ x: number; y: number; z: number }> | null`

### Audio ↔ Core/Scenes (`src/audio/AudioEngine.ts`)
- `interface IAudioEngine`:
  * `init(): Promise<void>`
  * `setScene(sceneName: string, transitionDuration?: number): void`
  * `updateGestureModulation(gestureState: GestureState): void`
  * `setMuted(muted: boolean): void`
  * `getMediaStreamDestination(): MediaStreamDestinationNode | null`
  * `dispose(): void`

### UI ↔ Core/Gestures/Audio (`src/ui/GlassmorphicHUD.ts`)
- `interface HUDTelemetry`:
  * `currentScene: string`
  * `fps: number`
  * `particleCount: number`
  * `gestureName: string`
  * `timeDilation: number`
  * `isRecording: boolean`
  * `hudVisible: boolean`

## Code Layout
```
/Users/quan/.gemini/antigravity/scratch/galaxy-gesture/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── src/
│   ├── main.ts
│   ├── style.css
│   ├── core/
│   │   ├── Engine.ts
│   │   ├── SceneManager.ts
│   │   ├── CameraController.ts
│   │   ├── TimeManager.ts
│   │   └── types.ts
│   ├── shaders/
│   │   ├── lensing.glsl.ts
│   │   ├── accretion.vert.ts
│   │   ├── accretion.frag.ts
│   │   ├── portal.vert.ts
│   │   ├── portal.frag.ts
│   │   ├── lattice.vert.ts
│   │   ├── lattice.frag.ts
│   │   └── postprocessing.ts
│   ├── scenes/
│   │   ├── BaseScene.ts
│   │   ├── GargantuaScene.ts
│   │   ├── WormholeScene.ts
│   │   ├── TesseractScene.ts
│   │   └── TransitionManager.ts
│   ├── gestures/
│   │   ├── MediaPipeWrapper.ts
│   │   ├── LandmarkNormalizer.ts
│   │   ├── GestureRecognizer.ts
│   │   ├── SpringPhysics.ts
│   │   └── SyntheticGestureSimulator.ts
│   ├── audio/
│   │   ├── AudioEngine.ts
│   │   ├── ReverbGenerator.ts
│   │   ├── GargantuaOrganSynth.ts
│   │   ├── WormholePadSynth.ts
│   │   ├── TesseractClockworkSynth.ts
│   │   └── GestureAudioCoupler.ts
│   └── ui/
│       ├── GlassmorphicHUD.ts
│       ├── WebcamInset.ts
│       ├── GestureHints.ts
│       └── VideoRecorder.ts
├── test/
│   ├── e2e_harness.ts
│   ├── test_runner.ts
│   ├── tier1_features.test.ts
│   ├── tier2_boundaries.test.ts
│   ├── tier3_combinations.test.ts
│   └── tier4_scenarios.test.ts
└── .agents/
```
