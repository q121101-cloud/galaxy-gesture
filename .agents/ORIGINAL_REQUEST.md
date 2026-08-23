# Original User Request

## 2026-08-23T17:16:45Z

This is a single self-contained refactor; keep it small and focused.

Refactor the Interstellar Gesture Experience project at the working directory below. The project currently has 3 scenes: GargantuaScene, WormholeScene, and TesseractScene. Perform the following changes:

Working directory: `/Users/quan/.gemini/antigravity/scratch/galaxy-gesture`
Integrity mode: demo

---

## Context — Old Galaxy Particle Code

The git repository contains an older commit `297e27f` which had a `src/particles.js` galaxy simulation with:
- A 500,000 GPU-particle spiral galaxy using Three.js `BufferGeometry` + custom GLSL shaders
- A "Core" particle type (30%) tightly packed at the center, and "Accretion Disc" particles (70%) in spiral arms
- Per-particle attributes: `aTargetFist`, `aTargetOpen`, `aOrbitSpeed`, `aOrbitRadius`, `aOrbitAngle`, `aPhase`, `aColor`, `aType`, `aSize`, `aWarpVelocity`
- Uniforms: `uTime`, `uOpenness`, `uPixelRatio`, `uHandPos`, `uIsRainbow`
- Full 7-color RGB rainbow HSV cycling (`hsv2rgb` GLSL function)
- The `uOpenness` uniform controlled the entire galaxy expansion (both core and arms scaled together)

Retrieve the full `src/particles.js` content from git using: `git show 297e27f:src/particles.js`

---

## Requirements

### R1. Remove GargantuaScene and TesseractScene
Delete `src/scenes/GargantuaScene.ts` and `src/scenes/TesseractScene.ts` entirely. Remove all references to them from `src/scenes/index.ts`, `src/core/SceneManager.ts`, and any other files that import or register them. Remove their related audio synths (`GargantuaOrganSynth.ts`, `TesseractClockworkSynth.ts`) and all references. Also remove the real MP3 track (`no-time-for-caution.mp3`) playback code from `AudioEngine.ts` since it was Gargantua-specific — remove `realTrackEl`, `realTrackSource`, `realTrackGain` and all related logic. The WormholeScene and its audio (WormholePadSynth) must remain fully functional.

### R2. Add a New GalaxyScene — Stars as Static Background, Only Core Zooms
Create a new `src/scenes/GalaxyScene.ts` based on the old galaxy particle code from `git show 297e27f:src/particles.js`.

The key behavioral change from the original: **the outer star/disc particles must NOT scale or move with the hand gesture**. They are static background stars — rendered in world space, unaffected by `uOpenness`. Only the **central core** particles (the inner glowing nucleus, `aType < 0.5`) should respond to the `uOpenness` uniform by expanding/contracting. When the user opens their hand, only the bright central nucleus grows larger; the outer galaxy stars remain perfectly still as a backdrop.

Specifically:
- Outer disc/arm particles (`aType >= 0.5`): positions are frozen at their `aTargetFist` positions at all times, regardless of `uOpenness`.
- Core particles (`aType < 0.5`): interpolate between `aTargetFist` (fist) and `aTargetOpen` (open hand), driven by `uOpenness` exactly as before.
- The 7-color RGB rainbow cycling must still work (activated via existing UI or toggle).
- Particle count: 200,000 total (matching the current project's count from the last fix).
- The scene must integrate with the existing `BaseScene.ts` interface, `SceneManager`, `TransitionManager`, and gesture/audio infrastructure.

### R3. Wire GalaxyScene into the App
- Register GalaxyScene as the **first/default scene** in `SceneManager`.
- WormholeScene remains as the second scene (swipe gesture transitions between them).
- Update all HUD labels, scene name displays, and gesture hint cards to reflect only the 2 remaining scenes.
- For audio: GalaxyScene uses the `WormholePadSynth` ambient or silence — no Gargantua organ or real MP3. The Galaxy scene should use a pleasant ambient drone if one is available from existing synths; otherwise silence is acceptable.

---

## Acceptance Criteria

### Scene Removal
- [ ] `src/scenes/GargantuaScene.ts` and `src/scenes/TesseractScene.ts` do not exist in the final codebase.
- [ ] `GargantuaOrganSynth.ts` and `TesseractClockworkSynth.ts` do not exist in the final codebase.
- [ ] No import errors referencing the deleted files (`npm run build` exits with code 0).
- [ ] AudioEngine no longer references `realTrackEl` or `no-time-for-caution.mp3`.

### GalaxyScene Behavior
- [ ] GalaxyScene renders visibly with star particles distributed across the viewport.
- [ ] Outer disc/arm particles remain stationary — they do NOT move or scale when `uOpenness` changes (verifiable by reading the vertex shader: outer particles must use a fixed position, not interpolate with `uOpenness`).
- [ ] Core particles visibly expand/contract when `uOpenness` changes (open hand → core expands, fist → core contracts).
- [ ] Rainbow mode activates and all 200,000 particles cycle through 7 colors.

### Build & Integration
- [ ] `npm run build` exits with code 0 with no TypeScript errors.
- [ ] GalaxyScene is the default scene on app load.
- [ ] Swipe gesture transitions correctly between GalaxyScene and WormholeScene.
