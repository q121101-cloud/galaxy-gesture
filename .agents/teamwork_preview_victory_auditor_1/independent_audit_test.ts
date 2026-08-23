import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GalaxyScene } from '../../src/scenes/GalaxyScene';
import { WormholeScene } from '../../src/scenes/WormholeScene';
import { SceneManager } from '../../src/core/SceneManager';
import { AudioEngine } from '../../src/audio/AudioEngine';
import { WormholePadSynth } from '../../src/audio/WormholePadSynth';
import { GestureAudioCoupler } from '../../src/audio/GestureAudioCoupler';
import { MockWebGL2RenderingContext } from '../../test/e2e_harness';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[AUDIT ASSERTION FAILED] ${msg}`);
  }
  console.log(`  [PASS] ${msg}`);
}

async function runIndependentAudit() {
  console.log('\n=== INDEPENDENT AUDIT EXECUTION ===\n');

  const rootDir = process.cwd();

  // --- CHECK 1: File Deletion Verifications (R1) ---
  console.log('1. Checking file deletions:');
  const deletedFiles = [
    'src/scenes/GargantuaScene.ts',
    'src/scenes/TesseractScene.ts',
    'src/audio/GargantuaOrganSynth.ts',
    'src/audio/TesseractClockworkSynth.ts',
  ];
  for (const relPath of deletedFiles) {
    const fullPath = path.join(rootDir, relPath);
    assert(!fs.existsSync(fullPath), `Deleted file ${relPath} does NOT exist on disk`);
  }

  // --- CHECK 2: AudioEngine Cleanup (R1) ---
  console.log('\n2. Checking AudioEngine references:');
  const audioCode = fs.readFileSync(path.join(rootDir, 'src/audio/AudioEngine.ts'), 'utf-8');
  assert(!audioCode.includes('realTrackEl'), 'AudioEngine contains no realTrackEl');
  assert(!audioCode.includes('realTrackSource'), 'AudioEngine contains no realTrackSource');
  assert(!audioCode.includes('realTrackGain'), 'AudioEngine contains no realTrackGain');
  assert(!audioCode.includes('no-time-for-caution'), 'AudioEngine contains no no-time-for-caution.mp3 reference');
  assert(!audioCode.includes('GargantuaOrganSynth'), 'AudioEngine contains no GargantuaOrganSynth');
  assert(!audioCode.includes('TesseractClockworkSynth'), 'AudioEngine contains no TesseractClockworkSynth');

  // --- CHECK 3: GalaxyScene Initialization & Architecture (R2) ---
  console.log('\n3. Checking GalaxyScene Particle Attributes & Layout:');
  const galaxy = new GalaxyScene();
  assert(galaxy.name === 'galaxy', 'GalaxyScene name is "galaxy"');
  assert(galaxy.particleCount === 200000, 'GalaxyScene default particle count is 200,000');

  const mockCanvas = {
    width: 1920,
    height: 1080,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => new MockWebGL2RenderingContext({} as any),
  } as unknown as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas: mockCanvas, context: new MockWebGL2RenderingContext(mockCanvas as any) as any });
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

  await galaxy.init(renderer, camera);
  assert(galaxy.isInitialized, 'GalaxyScene successfully initialized');

  let points: THREE.Points | null = null;
  galaxy.scene.traverse((obj) => {
    if (obj instanceof THREE.Points) points = obj;
  });
  assert(points !== null, 'GalaxyScene contains Three.Points mesh');

  const geo = points!.geometry;
  const posAttr = geo.getAttribute('position');
  assert(posAttr && posAttr.count === 200000, 'Position attribute count is 200,000');

  const requiredAttrs = [
    'position', 'aTargetFist', 'aTargetOpen', 'aColor', 'aSize',
    'aType', 'aOrbitSpeed', 'aOrbitRadius', 'aOrbitAngle', 'aPhase', 'aWarpVelocity'
  ];
  for (const attr of requiredAttrs) {
    assert(geo.getAttribute(attr) !== undefined, `BufferGeometry has attribute "${attr}"`);
  }

  // Verify particle type ratio: 30% core, 70% outer
  const types = geo.getAttribute('aType').array;
  let coreCount = 0;
  let outerCount = 0;
  for (let i = 0; i < types.length; i++) {
    if (types[i] < 0.5) coreCount++;
    else outerCount++;
  }
  assert(coreCount === 60000, `Core particle count is exactly 30% (60,000 / 200,000, got ${coreCount})`);
  assert(outerCount === 140000, `Outer particle count is exactly 70% (140,000 / 200,000, got ${outerCount})`);

  // --- CHECK 4: Vertex Shader Logic (R2) ---
  console.log('\n4. Checking Galaxy GLSL Vertex Shader logic:');
  const mat = points!.material as THREE.ShaderMaterial;
  const vert = mat.vertexShader;
  assert(vert.includes('aType < 0.5'), 'Vertex shader branches on aType < 0.5 for core vs outer stars');
  assert(vert.includes('currentPos = aTargetFist;'), 'Vertex shader freezes outer particles at aTargetFist');
  assert(vert.includes('mix(fistPos, openPos, morphFactor)'), 'Vertex shader morphs core particles with uOpenness');
  assert(vert.includes('hsv2rgb'), 'Vertex shader contains hsv2rgb function for rainbow cycling');

  // --- CHECK 5: Rainbow & Theme Toggles (R2) ---
  console.log('\n5. Checking Rainbow & Theme Toggles:');
  galaxy.setTheme('rainbow');
  assert(mat.uniforms.uIsRainbow.value === 1.0, 'setTheme("rainbow") sets uIsRainbow = 1.0');
  const isRainbowActive = galaxy.toggleRainbow();
  assert(isRainbowActive === false && mat.uniforms.uIsRainbow.value === 0.0, 'toggleRainbow() toggles uIsRainbow to 0.0');
  galaxy.toggleRainbow();
  assert(mat.uniforms.uIsRainbow.value === 1.0, 'toggleRainbow() toggles back to 1.0');

  const themes = ['emerald', 'nebula', 'supernova', 'cyber'];
  for (const th of themes) {
    galaxy.setTheme(th);
    assert(mat.uniforms.uIsRainbow.value === 0.0, `setTheme("${th}") sets uIsRainbow = 0.0`);
  }

  // --- CHECK 6: SceneManager Integration & Default Scene (R3) ---
  console.log('\n6. Checking SceneManager wiring & cycling:');
  const sm = new SceneManager();
  const wormhole = new WormholeScene();
  await sm.registerScene(galaxy, renderer, camera);
  await sm.registerScene(wormhole, renderer, camera);

  assert(sm.getActiveSceneName() === 'galaxy', 'GalaxyScene is active/default scene on load');
  assert(sm.getParticleCount() === 200000, 'Active particle count on load is 200,000');

  // Swipe / Next transition to Wormhole
  sm.nextScene({ duration: 0.5 });
  sm.update(0.5, 0.5, 1.0, {
    hasHand: false,
    openness: 0,
    pinchDistance: 1,
    timeDilation: 1,
    rotation: { yaw: 0, pitch: 0, roll: 0 },
    position: { x: 0, y: 0 },
    zoomDelta: 0,
    swipeTriggered: null,
    intensity: 0,
    rawLandmarks: null
  });
  assert(sm.getActiveSceneName() === 'wormhole', 'nextScene transitioned to "wormhole"');
  assert(sm.getParticleCount() >= 300000, `Wormhole active particle count is >= 300,000 (got ${sm.getParticleCount()})`);

  // Next transition back to Galaxy (circular)
  sm.nextScene({ duration: 0.5 });
  sm.update(0.5, 0.5, 1.0, {
    hasHand: false,
    openness: 0,
    pinchDistance: 1,
    timeDilation: 1,
    rotation: { yaw: 0, pitch: 0, roll: 0 },
    position: { x: 0, y: 0 },
    zoomDelta: 0,
    swipeTriggered: null,
    intensity: 0,
    rawLandmarks: null
  });
  assert(sm.getActiveSceneName() === 'galaxy', 'nextScene wrapped circularly back to "galaxy"');

  // --- CHECK 7: Audio Engine Integration (R3) ---
  console.log('\n7. Checking Audio Engine integration:');
  const audioEngine = new AudioEngine();
  await audioEngine.init();
  audioEngine.setScene('galaxy', 0.1);
  audioEngine.updateGestureModulation({
    hasHand: true,
    openness: 0.8,
    pinchDistance: 0.4,
    timeDilation: 0.7,
    rotation: { yaw: 0.1, pitch: 0.2, roll: -0.3 },
    position: { x: 0.1, y: -0.1 },
    zoomDelta: 0,
    swipeTriggered: null,
    intensity: 0.6,
    rawLandmarks: null
  });
  audioEngine.setScene('wormhole', 0.1);
  audioEngine.dispose();
  console.log('  [PASS] AudioEngine executed without error during scene changes and gesture modulations');

  console.log('\n=== ALL INDEPENDENT VERIFICATION CHECKS PASSED ===\n');
}

runIndependentAudit().catch((err) => {
  console.error('\nAUDIT FAILED WITH ERROR:\n', err);
  process.exit(1);
});

import { MockAudioContext } from '../../test/e2e_harness';

async function runAudioContextMockAudit() {
  console.log('\n8. Checking MockAudioContext full audio graph:');
  const mockCtx = new MockAudioContext();
  const engine = new AudioEngine(mockCtx as any);
  await engine.init();
  engine.setScene('galaxy', 0.5);
  engine.updateGestureModulation({
    hasHand: true,
    openness: 0.7,
    pinchDistance: 0.3,
    timeDilation: 0.4,
    rotation: { yaw: 0.2, pitch: -0.1, roll: 0.5 },
    position: { x: 0.2, y: 0.3 },
    zoomDelta: 0,
    swipeTriggered: null,
    intensity: 0.8,
    rawLandmarks: null
  });
  engine.setScene('wormhole', 0.5);
  engine.updateGestureModulation({
    hasHand: true,
    openness: 0.2,
    pinchDistance: 0.9,
    timeDilation: 1.0,
    rotation: { yaw: -0.2, pitch: 0.1, roll: -0.5 },
    position: { x: -0.2, y: -0.3 },
    zoomDelta: 0,
    swipeTriggered: null,
    intensity: 0.3,
    rawLandmarks: null
  });
  engine.dispose();
  console.log('  [PASS] Full mock audio graph executed and disposed cleanly');
}

runAudioContextMockAudit();
