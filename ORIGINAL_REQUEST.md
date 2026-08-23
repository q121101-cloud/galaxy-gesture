# Original User Request

## Initial Request — 2026-08-23T09:39:54Z

Build a visually stunning, fully interactive **Interstellar Gesture Experience** web app — a real-time WebGL space simulation inspired by Christopher Nolan's *Interstellar*, where the user controls the universe with their bare hands via a webcam. Think: Gargantua black hole with gravitationally-lensed accretion disk, wormhole travel, 5D Tesseract, all driven by MediaPipe hand gestures — cinematic, polished, and deployable to Vercel.

Working directory: `/Users/quan/.gemini/antigravity/scratch/galaxy-gesture`
Integrity mode: demo

---

## Requirements

### R1. Interstellar Visual Scenes — Cinematic WebGL
Build at minimum **3 distinct interactive scenes**, each visually jaw-dropping:

- **Gargantua Scene**: A physically-inspired black hole with a glowing orange/gold accretion disk warped by gravitational lensing (the light bends *around* the event horizon like in the film). Particle jets, Doppler-shifted redshift/blueshift on orbiting matter, stars lensed in the background. Minimum 300,000 GPU particles.
- **Wormhole Scene**: A traversable wormhole rendered as a spherical portal — the starfield on the other side visible through it, with the user flying through on gesture. Inspired by the film's Saturn wormhole visual.
- **Tesseract Scene**: An infinite 5D bookshelf space — neon light beams crossing infinitely, time represented as a physical dimension, visual references to the film's climax. Eerie, beautiful, immersive.

Scenes must transition smoothly (cinematic cross-fade or particle morph) on gesture command.

### R2. MediaPipe Hand Gesture Controls — All Scenes
Integrate **MediaPipe Hands** for real-time webcam-based gesture control across all scenes:

- **Open hand → fist**: Expand / collapse the black hole or wormhole (zoom in/out).
- **Hand tilt left / right**: Rotate the scene around the vertical axis.
- **Hand pitch up / down**: Tilt the scene on the horizontal axis.
- **Two-finger pinch**: Slow-motion time dilation effect (particles slow down dramatically).
- **Wave / swipe**: Transition to next scene.
- Gestures must be smooth with spring-damped interpolation — no jitter, no lag.
- Must work on both desktop and mobile browsers (adaptive resolution for MediaPipe on mobile).

### R3. Ambient Cinematic Audio
Include **ambient sound** playing in each scene:
- Deep, haunting organ-style drone (Hans Zimmer Interstellar style) for Gargantua.
- Ethereal, reverb-heavy soundscape for Wormhole.
- Eerie ticking / silence broken by distant sound for Tesseract.
- Audio must be generated programmatically using the Web Audio API (oscillators, reverb, filters) — no external audio files needed. Bundle everything in the app.
- Volume responds to gesture intensity.

### R4. UI Polish — Cinematic HUD
A minimal, glassmorphic HUD overlay:
- Current scene name displayed in subtle monospaced font.
- Live FPS counter and particle count.
- Webcam feed inset (small, corner-mounted) showing hand landmark overlay.
- Gesture hint cards that fade in/out to guide the user.
- Video recording mode (`[H]` key) that hides HUD for clean TikTok-ready 9:16 capture.
- Mobile-responsive layout.

### R5. Vercel Deployment Ready
The project must build cleanly (`npm run build`) with zero errors and be deployable to Vercel via `vercel --prod` with no manual configuration. Include a `vercel.json` if needed.

---

## Acceptance Criteria

### Visual Quality
- [ ] Gargantua scene renders with visible gravitational lensing — stars visibly curve around the event horizon.
- [ ] Accretion disk glows with Doppler-shifted color (blue-shifted on approach side, red-shifted on recession side).
- [ ] Wormhole scene renders a visible spherical portal with a star field visible through the opening.
- [ ] Tesseract scene fills the viewport with infinite-feeling geometry / light beams, no obvious tiling seams.
- [ ] All scene transitions are smooth (≥ 0.5s cross-fade, no hard cuts or white flashes).
- [ ] App renders at ≥ 60 FPS on a modern desktop (Chrome/Firefox) with all effects active.

### Gesture Controls
- [ ] Open hand → fist gesture reliably triggers zoom expand/collapse with < 200ms latency on desktop.
- [ ] Hand tilt and pitch rotate the scene visibly and smoothly with spring damping (no jitter).
- [ ] Two-finger pinch triggers visible time-dilation slow-motion effect.
- [ ] Swipe gesture reliably transitions between scenes.
- [ ] App functions on a modern Android/iOS browser (MediaPipe loads, gestures recognized).

### Audio
- [ ] Each scene has its own distinct ambient audio that plays without user interaction (or on first click if autoplay blocked).
- [ ] Audio transitions smoothly between scenes (crossfade, no abrupt cut).
- [ ] Volume changes are audible when gesture intensity varies.

### Build & Deploy
- [ ] `npm run build` exits with code 0 and produces a working `dist/` folder.
- [ ] The built app loads correctly when served (`npm run preview` or static server).
- [ ] A `vercel.json` or equivalent config is present and correct.
