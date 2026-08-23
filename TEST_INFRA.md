# E2E Test Infra: Interstellar Gesture Experience

## Test Philosophy
- Opaque-box, requirement-driven. Derives strictly from ORIGINAL_REQUEST.md.
- Methodology: 4-tier systematic testing (Tier 1: Feature Coverage, Tier 2: Boundary/Corner Cases, Tier 3: Cross-Feature Combinations, Tier 4: Real-World Workload Scenarios).
- Independent headless execution: Tests can run in Node.js / jsdom / headless browser using SyntheticGestureSimulator without requiring a physical webcam or GPU hardware.

## Feature Inventory & Test Mapping
| # | Feature | Requirement Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|-------------------|:------:|:------:|:------:|:------:|
| 1 | TypeScript & Clean Build | R5 | 5 | 5 | ✓ | ✓ |
| 2 | Vercel Deployment Config | R5 | 5 | 5 | ✓ | ✓ |
| 3 | Core Engine & Lifecycle | R1 | 5 | 5 | ✓ | ✓ |
| 4 | Gravitational Lensing Shader | R1 | 5 | 5 | ✓ | ✓ |
| 5 | Gargantua Accretion Disk (Doppler Shift) | R1 | 5 | 5 | ✓ | ✓ |
| 6 | Gargantua ≥300k GPU Particles & Jets | R1 | 5 | 5 | ✓ | ✓ |
| 7 | Wormhole Spherical Portal & Starfield | R1 | 5 | 5 | ✓ | ✓ |
| 8 | 5D Tesseract Bookshelf Lattice | R1 | 5 | 5 | ✓ | ✓ |
| 9 | Smooth Cinematic Scene Transitions (≥0.5s) | R1 | 5 | 5 | ✓ | ✓ |
| 10 | MediaPipe Hands Stream & Adaptive Res | R2 | 5 | 5 | ✓ | ✓ |
| 11 | Open Hand ↔ Fist Zoom Expansion/Collapse | R2 | 5 | 5 | ✓ | ✓ |
| 12 | Hand Tilt & Pitch 3D Rotation | R2 | 5 | 5 | ✓ | ✓ |
| 13 | Two-Finger Pinch Time Dilation (0.1 to 1.0) | R2 | 5 | 5 | ✓ | ✓ |
| 14 | Wave / Swipe Scene Transition Detection | R2 | 5 | 5 | ✓ | ✓ |
| 15 | Spring-Damper Interpolation (No Jitter) | R2 | 5 | 5 | ✓ | ✓ |
| 16 | Procedural Web Audio Synthesis (No Files) | R3 | 5 | 5 | ✓ | ✓ |
| 17 | Gargantua Hans Zimmer Organ Drone | R3 | 5 | 5 | ✓ | ✓ |
| 18 | Wormhole Ethereal Cosmic Pad | R3 | 5 | 5 | ✓ | ✓ |
| 19 | Tesseract Clockwork Ticking Synth | R3 | 5 | 5 | ✓ | ✓ |
| 20 | Gesture-Modulated Audio & Equal-Power Fade | R3 | 5 | 5 | ✓ | ✓ |
| 21 | Glassmorphic HUD (FPS & Particle Counter) | R4 | 5 | 5 | ✓ | ✓ |
| 22 | Webcam Inset & Skeleton Landmarks | R4 | 5 | 5 | ✓ | ✓ |
| 23 | Contextual Gesture Hints | R4 | 5 | 5 | ✓ | ✓ |
| 24 | Canvas MediaRecorder [H] Video Capture Mode | R4 | 5 | 5 | ✓ | ✓ |
| 25 | Mobile-Responsive Layout & Touch Fallback | R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: `npx tsx test/test_runner.ts`
- Pass/Fail semantics: All assertions must pass; exit code 0 on full success, exit code 1 on failure.
- Test case format:
  * `test/tier1_features.test.ts` (≥5 tests per feature)
  * `test/tier2_boundaries.test.ts` (Edge cases, null checks, extreme landmark coordinates, rapid gesture spam, audio buffer overflows, canvas resize)
  * `test/tier3_combinations.test.ts` (Simultaneous tilt + pinch, scene transition mid-pinch, rapid swipe while audio crossfades, video recording during particle surge)
  * `test/tier4_scenarios.test.ts` (Full end-to-end user journeys: Interstellar cinematic flight, TikTok recording session, mobile low-bandwidth session)

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Nolan Cinema Journey: Gargantua exploration -> Wormhole fly-through -> Tesseract dimension traversal | F3, F5, F6, F7, F8, F9, F11, F12, F14, F17, F18, F19, F21 | High |
| 2 | Time Dilation Relativistic Study: Two-finger pinch slow motion with particle deceleration & audio pitch drop | F5, F6, F13, F15, F20 | Medium |
| 3 | Mobile Lightweight Mode: Low resolution MediaPipe input + touch drag fallback + responsive HUD scaling | F10, F11, F12, F25, F26 | Medium |
| 4 | TikTok 9:16 Cinematic Capture Session: [H] key HUD hide, Canvas captureStream(60) recording, audio mixing | F21, F24, F25, F20 | High |
| 5 | Extreme Gesture Stress Test: Rapid alternating fist/open, violent tilt spikes, rapid swipe sequence | F11, F12, F14, F15, F9, F21 | High |

## Coverage Thresholds
- Tier 1: ≥125 tests (≥5 per feature × 25 features)
- Tier 2: ≥125 tests (boundary value analysis across all 25 features)
- Tier 3: ≥25 pairwise interaction tests
- Tier 4: ≥5 realistic end-to-end user journey tests
- Total target: ≥280 automated test assertions
