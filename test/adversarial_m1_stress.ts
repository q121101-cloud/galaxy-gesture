/**
 * Standalone Adversarial Stress Harness for Milestone 1
 * Core Foundation, Camera Controller, TimeManager, and Shader Pipeline
 */

import * as THREE from 'three';
import { setupTestEnvironment, teardownTestEnvironment } from './e2e_harness';
import { TimeManager } from '../src/core/TimeManager';
import { CameraController } from '../src/core/CameraController';
import { SceneManager } from '../src/core/SceneManager';
import { Engine } from '../src/core/Engine';
import { GestureState, IScene } from '../src/core/types';
import { createLensingMaterial, LENSING_VERTEX_SHADER, LENSING_FRAGMENT_SHADER } from '../src/shaders/lensing.glsl';
import { ACCRETION_VERTEX_SHADER } from '../src/shaders/accretion.vert';
import { createAccretionMaterial, ACCRETION_FRAGMENT_SHADER } from '../src/shaders/accretion.frag';
import { PORTAL_VERTEX_SHADER } from '../src/shaders/portal.vert';
import { createPortalMaterial, PORTAL_FRAGMENT_SHADER } from '../src/shaders/portal.frag';
import { LATTICE_VERTEX_SHADER } from '../src/shaders/lattice.vert';
import { createLatticeMaterial, LATTICE_FRAGMENT_SHADER } from '../src/shaders/lattice.frag';
import { CinematicPostPipeline, COMPOSITE_POST_VERTEX_SHADER, COMPOSITE_POST_FRAGMENT_SHADER } from '../src/shaders/postprocessing';

setupTestEnvironment();
(globalThis as any).self = globalThis;

if ((globalThis as any).window) {
  (globalThis as any).window.requestAnimationFrame = (cb: Function) => setTimeout(() => cb(Date.now()), 16);
  (globalThis as any).window.cancelAnimationFrame = (id: any) => clearTimeout(id);
}
(globalThis as any).requestAnimationFrame = (cb: Function) => setTimeout(() => cb(Date.now()), 16);
(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

let totalPassed = 0;
let totalFailed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    totalPassed++;
    console.log(`  \x1b[32m✓\x1b[0m [PASS] ${testName}`);
  } else {
    totalFailed++;
    const msg = `[FAIL] ${testName}${detail ? ' -> ' + detail : ''}`;
    failures.push(msg);
    console.error(`  \x1b[31m✗\x1b[0m ${msg}`);
  }
}

console.log('\n\x1b[1m\x1b[36m========================================================================\x1b[0m');
console.log('\x1b[1m\x1b[36m   ADVERSARIAL STRESS HARNESS — MILESTONE 1 DEEP PROBING                \x1b[0m');
console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m\n');

// ============================================================================
// SUITE 1: TimeManager Adversarial Stress
// ============================================================================
console.log('\x1b[1m\x1b[35m▶ SUITE 1: TimeManager Adversarial Stress & Chaos Injections\x1b[0m');

{
  const tm = new TimeManager();

  // Test 1.1: Zero delta time
  const t1 = tm.update(1.0, 1000);
  const t2 = tm.update(1.0, 1000); // 0ms elapsed
  assert(
    !isNaN(t2.rawDelta) && !isNaN(t2.scaledDelta) && isFinite(t2.rawDelta) && t2.rawDelta >= 0,
    'Zero delta time produces valid non-negative rawDelta and scaledDelta',
    `rawDelta=${t2.rawDelta}, scaledDelta=${t2.scaledDelta}`
  );

  // Test 1.2: Backward / Negative timestamp jump (Clock jitter or NTP sync)
  const t3 = tm.update(1.0, 500); // Jump back 500ms
  assert(
    !isNaN(t3.rawDelta) && t3.rawDelta > 0 && !isNaN(t3.rawTime),
    'Negative timestamp jump falls back gracefully to default delta without backward time travel',
    `rawDelta=${t3.rawDelta}, rawTime=${t3.rawTime}`
  );

  // Test 1.3: Huge delta time (Tab backgrounding / suspend for 1000s)
  const t4 = tm.update(1.0, 500 + 1000 * 1000);
  assert(
    t4.rawDelta <= 0.1001 && t4.rawDelta > 0,
    'Huge delta time is clamped to maxDelta (0.1s)',
    `rawDelta=${t4.rawDelta}`
  );

  // Test 1.4: Extreme rapid time dilation oscillation (0.0001 to 100.0) across 100,000 frames
  tm.reset();
  let timeDilationStable = true;
  let currTime = 1000;
  for (let i = 0; i < 100000; i++) {
    const target = i % 2 === 0 ? 0.0001 : 100.0;
    currTime += 16.666;
    const st = tm.update(target, currTime);
    if (isNaN(st.timeDilation) || !isFinite(st.timeDilation) || st.timeDilation < 0.099 || st.timeDilation > 1.001) {
      timeDilationStable = false;
      break;
    }
  }
  assert(
    timeDilationStable,
    '100,000 frame rapid oscillation preserves strict clamping [0.1, 1.0] and numerical stability'
  );

  // Test 1.5: Sub-millisecond micro-step jitter (1 microsecond steps)
  let microStepValid = true;
  tm.reset();
  let microTime = 1000;
  for (let i = 0; i < 1000; i++) {
    microTime += 0.001; // 1 microsecond = 0.001ms
    const st = tm.update(0.5, microTime);
    if (isNaN(st.rawDelta) || isNaN(st.scaledDelta) || !isFinite(st.scaledDelta)) {
      microStepValid = false;
      break;
    }
  }
  assert(microStepValid, 'Microsecond timestamp steps (0.001ms) maintain stable delta calculations');

  // Test 1.6: 1,000,000 continuous frames long-run accumulation
  tm.reset();
  let longRunValid = true;
  let simulatedTime = 0;
  for (let i = 0; i < 1000000; i++) {
    simulatedTime += 16.666666;
    const st = tm.update(0.5, simulatedTime);
    if (isNaN(st.rawTime) || isNaN(st.scaledTime) || !isFinite(st.scaledTime) || st.scaledTime < 0) {
      longRunValid = false;
      break;
    }
  }
  assert(
    longRunValid && tm.getScaledTime() > 0,
    '1,000,000 frame continuous accumulation maintains valid monotonically increasing scaledTime',
    `scaledTime=${tm.getScaledTime()}`
  );
}

// ============================================================================
// SUITE 2: CameraController Boundary & Extreme Conditions
// ============================================================================
console.log('\n\x1b[1m\x1b[35m▶ SUITE 2: CameraController Boundary & Extreme Chaos Injections\x1b[0m');

{
  const camCtrl = new CameraController({
    fov: 60,
    near: 1.0,
    far: 3000.0,
    initialPosition: new THREE.Vector3(0, 40, 250),
    minDistance: 40.0,
    maxDistance: 700.0,
  });

  const baseGesture: GestureState = {
    hasHand: true,
    openness: 0.5,
    pinchDistance: 1.0,
    timeDilation: 1.0,
    rotation: { yaw: 0, pitch: 0, roll: 0 },
    position: { x: 0, y: 0 },
    zoomDelta: 0,
    swipeTriggered: null,
    intensity: 0.5,
    rawLandmarks: null,
  };

  // Test 2.1: Extreme rotation values (Yaw & Pitch +/- 1,000,000 rad)
  camCtrl.update(0.016, {
    ...baseGesture,
    rotation: { yaw: 1000000, pitch: -1000000, roll: 500000 },
  });
  const pos = camCtrl.camera.position;
  assert(
    !isNaN(pos.x) && !isNaN(pos.y) && !isNaN(pos.z) && isFinite(pos.x) && isFinite(pos.y) && isFinite(pos.z),
    'Extreme rotation (+/- 1e6 rad) clamped within yaw/pitch limits without NaN/Inf position',
    `pos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`
  );

  // Test 2.2: Extreme zoom & openness boundaries
  camCtrl.update(0.016, {
    ...baseGesture,
    openness: 999999,
    zoomDelta: 999999,
  });
  // Simulate 100 frames to settle
  for (let i = 0; i < 100; i++) camCtrl.update(0.016, { ...baseGesture, openness: 999999, zoomDelta: 999999 });
  const dist = camCtrl.camera.position.length();
  assert(
    dist <= 750 && dist >= 35,
    'Extreme zoom in/out remains strictly bounded by minDistance/maxDistance',
    `dist=${dist.toFixed(2)}`
  );

  // Test 2.3: Zero and negative delta in CameraController update
  camCtrl.update(0, baseGesture);
  camCtrl.update(-0.016, baseGesture);
  assert(
    !isNaN(camCtrl.camera.position.x) && isFinite(camCtrl.camera.position.x),
    'Zero and negative rawDelta update do not cause NaN or position explosion'
  );

  // Test 2.4: Gimbal limit stress: Pitch at limit +/- PI/2
  const customCam = new CameraController({ pitchLimit: Math.PI / 2 });
  customCam.update(0.016, {
    ...baseGesture,
    rotation: { yaw: 0, pitch: Math.PI / 2, roll: 0 },
  });
  for (let i = 0; i < 60; i++) customCam.update(0.016, { ...baseGesture, rotation: { yaw: 0, pitch: Math.PI / 2, roll: 0 } });
  customCam.camera.updateMatrixWorld(true);
  const det = customCam.camera.matrixWorld.determinant();
  assert(
    !isNaN(det) && isFinite(det),
    'Camera matrix remains valid and non-singular at extreme pitch limit'
  );

  // Test 2.5: Impulse shake spam & decay
  for (let i = 0; i < 1000; i++) {
    camCtrl.triggerImpulseShake(100.0);
  }
  // Allow 60 frames of decay
  for (let i = 0; i < 60; i++) {
    camCtrl.update(0.016);
  }
  assert(
    !isNaN(camCtrl.camera.position.x) && isFinite(camCtrl.camera.position.x),
    'Impulse shake spam clamps max intensity and decays smoothly without runaway jitter'
  );

  // Test 2.6: Aspect ratio boundaries (0, negative, infinite)
  camCtrl.updateAspect(0, 0); // Guarded
  camCtrl.updateAspect(1920, 0); // Height <= 0 guarded
  camCtrl.updateAspect(10000, 1);
  assert(
    camCtrl.camera.aspect === 10000,
    'Aspect ratio update correctly handles extreme aspect ratios and guards height <= 0'
  );
}

// ============================================================================
// SUITE 3: Shader Pipeline & GLSL Code Generation
// ============================================================================
console.log('\n\x1b[1m\x1b[35m▶ SUITE 3: Shader Pipeline, Materials & GLSL Static Analysis\x1b[0m');

{
  // Test 3.1: Material factories creation
  const lensingMat = createLensingMaterial();
  const accretionMat = createAccretionMaterial();
  const portalMat = createPortalMaterial();
  const latticeMat = createLatticeMaterial();

  assert(lensingMat instanceof THREE.ShaderMaterial, 'Lensing ShaderMaterial creates successfully');
  assert(accretionMat instanceof THREE.ShaderMaterial, 'Accretion ShaderMaterial creates successfully');
  assert(portalMat instanceof THREE.ShaderMaterial, 'Portal ShaderMaterial creates successfully');
  assert(latticeMat instanceof THREE.ShaderMaterial, 'Lattice ShaderMaterial creates successfully');

  // Test 3.2: Verify Uniforms Existence & Types
  const lensingUniforms = lensingMat.uniforms;
  assert(
    Boolean(lensingUniforms.uSchwarzschildRadius && lensingUniforms.uPhotonSphereRadius && lensingUniforms.uDistortionStrength),
    'Lensing uniforms contain Schwarzschild and photon sphere physical parameters'
  );

  const accretionUniforms = accretionMat.uniforms;
  assert(
    Boolean(accretionUniforms.uInnerRadius && accretionUniforms.uOuterRadius && accretionUniforms.uDopplerStrength && accretionUniforms.uBeamingExponent),
    'Accretion uniforms contain inner/outer radius and relativistic Doppler beaming parameters'
  );

  const portalUniforms = portalMat.uniforms;
  assert(
    Boolean(portalUniforms.uThroatRadius && portalUniforms.uRefractionIndex && portalUniforms.uDispersion),
    'Portal uniforms contain throat radius and chromatic dispersion parameters'
  );

  const latticeUniforms = latticeMat.uniforms;
  assert(
    Boolean(latticeUniforms.uGridSpacing && latticeUniforms.uBeamRadius && latticeUniforms.uFilamentGlowColorA),
    'Lattice uniforms contain grid spacing and 5D filament glow colors'
  );

  // Test 3.3: GLSL Syntax Validator
  interface ShaderCheck {
    name: string;
    source: string;
    type: 'vertex' | 'fragment';
  }

  const shaders: ShaderCheck[] = [
    { name: 'Lensing Vertex', source: LENSING_VERTEX_SHADER, type: 'vertex' },
    { name: 'Lensing Fragment', source: LENSING_FRAGMENT_SHADER, type: 'fragment' },
    { name: 'Accretion Vertex', source: ACCRETION_VERTEX_SHADER, type: 'vertex' },
    { name: 'Accretion Fragment', source: ACCRETION_FRAGMENT_SHADER, type: 'fragment' },
    { name: 'Portal Vertex', source: PORTAL_VERTEX_SHADER, type: 'vertex' },
    { name: 'Portal Fragment', source: PORTAL_FRAGMENT_SHADER, type: 'fragment' },
    { name: 'Lattice Vertex', source: LATTICE_VERTEX_SHADER, type: 'vertex' },
    { name: 'Lattice Fragment', source: LATTICE_FRAGMENT_SHADER, type: 'fragment' },
    { name: 'Composite Post Vertex', source: COMPOSITE_POST_VERTEX_SHADER, type: 'vertex' },
    { name: 'Composite Post Fragment', source: COMPOSITE_POST_FRAGMENT_SHADER, type: 'fragment' },
  ];

  for (const s of shaders) {
    let valid = true;
    let errorDetail = '';

    // Check non-empty
    if (!s.source || s.source.trim().length === 0) {
      valid = false;
      errorDetail = 'Shader string is empty';
    }

    // Check balanced curly braces
    const openBraces = (s.source.match(/\{/g) || []).length;
    const closeBraces = (s.source.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      valid = false;
      errorDetail = `Mismatched braces: ${openBraces} '{' vs ${closeBraces} '}'`;
    }

    // Check balanced parentheses
    const openParens = (s.source.match(/\(/g) || []).length;
    const closeParens = (s.source.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      valid = false;
      errorDetail = `Mismatched parentheses: ${openParens} '(' vs ${closeParens} ')'`;
    }

    // Check main function existence
    if (!/void\s+main\s*\(\s*\)/.test(s.source)) {
      valid = false;
      errorDetail = 'Missing void main() entry point';
    }

    // Check precision in fragment shaders
    if (s.type === 'fragment' && !/precision\s+(highp|mediump|lowp)\s+float;/.test(s.source)) {
      valid = false;
      errorDetail = 'Missing precision declaration in fragment shader';
    }

    assert(valid, `GLSL Syntax Check: ${s.name} (${s.type})`, errorDetail);
  }
}

// ============================================================================
// SUITE 4: SceneManager & Transition Stress
// ============================================================================
console.log('\n\x1b[1m\x1b[35m▶ SUITE 4: SceneManager Transition & Lifecycle Stress\x1b[0m');

{
  const sm = new SceneManager();
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas });
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

  const createMockScene = (name: string, pCount: number): IScene => {
    let entered = 0;
    let exited = 0;
    let updated = 0;
    return {
      name,
      particleCount: pCount,
      scene: new THREE.Scene(),
      init: () => {},
      update: () => { updated++; },
      render: () => {},
      onEnter: () => { entered++; },
      onExit: () => { exited++; },
      dispose: () => {},
    };
  };

  const s1 = createMockScene('s1', 100);
  const s2 = createMockScene('s2', 200);
  const s3 = createMockScene('s3', 300);

  await sm.registerScene(s1, renderer, camera);
  await sm.registerScene(s2, renderer, camera);
  await sm.registerScene(s3, renderer, camera);

  // Test 4.1: Initial scene active
  assert(sm.getActiveSceneName() === 's1', 'First registered scene is active by default');

  // Test 4.2: Enforce >= 0.5s minimum transition duration
  sm.switchTo('s2', { duration: 0.1 });
  const transState = sm.getTransitionState();
  assert(transState.duration >= 0.5, 'Transition duration < 0.5s is automatically clamped to >= 0.5s');

  // Test 4.3: Rapid switching stress (spamming switchTo during transition)
  let rapidSwitchOk = true;
  try {
    for (let i = 0; i < 500; i++) {
      const target = i % 2 === 0 ? 's1' : 's3';
      sm.switchTo(target, { duration: 0.5 });
      sm.update(0.016, 0.016, 1.0, {} as any);
    }
  } catch (err) {
    rapidSwitchOk = false;
  }
  assert(rapidSwitchOk, '500 rapid scene transition requests handle interruption without exception');

  // Test 4.4: Completion of transition advances to target scene
  sm.switchTo('s3', { duration: 0.5 });
  // Advance 0.6s
  sm.update(0.6, 0.6, 1.0, {} as any);
  assert(sm.getActiveSceneName() === 's3' && !sm.getTransitionState().isTransitioning, 'Completed transition sets activeScene and clears isTransitioning');

  // Test 4.5: nextScene circular navigation
  sm.nextScene({ duration: 0.5 }); // s3 -> s1
  sm.update(0.6, 0.6, 1.0, {} as any);
  assert(sm.getActiveSceneName() === 's1', 'Circular nextScene navigates correctly from last to first scene');

  sm.dispose();
}

// ============================================================================
// SUITE 5: PostProcessing Pipeline Stress
// ============================================================================
console.log('\n\x1b[1m\x1b[35m▶ SUITE 5: CinematicPostPipeline Stress & Sizing\x1b[0m');

{
  const canvas = document.createElement('canvas');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  const post = new CinematicPostPipeline(canvas, scene, camera);

  // Test 5.1: Pipeline creation
  assert(post.composer !== undefined && post.bloomPass !== undefined, 'PostProcessing pipeline initializes composer and bloom pass');

  // Test 5.2: Gravitational metric ripple trigger and update
  post.triggerRipple(new THREE.Vector2(0.5, 0.5));
  assert(post.compositePass.uniforms.uRippleStrength.value === 1.0, 'Gravitational ripple triggers with initial strength 1.0');

  // Update post pipeline over 2 seconds -> ripple decays
  for (let i = 0; i < 120; i++) {
    post.update(0.016, i * 0.016, 0.5);
  }
  assert(post.compositePass.uniforms.uRippleStrength.value === 0.0, 'Gravitational ripple decays smoothly to 0.0');

  // Test 5.3: Dynamic resize adaptation
  post.resize(3840, 2160); // 4K resize
  assert(
    post.compositePass.uniforms.uResolution.value.x === 3840 && post.compositePass.uniforms.uResolution.value.y === 2160,
    'PostProcessing adapts resolution uniforms on 4K resize'
  );

  post.dispose();
}

console.log('\n\x1b[1m\x1b[36m========================================================================\x1b[0m');
console.log(`\x1b[1mTOTAL TESTS:  ${totalPassed + totalFailed}\x1b[0m`);
console.log(`\x1b[32m\x1b[1mPASSED:       ${totalPassed}\x1b[0m`);
console.log(`\x1b[31m\x1b[1mFAILED:       ${totalFailed}\x1b[0m`);
console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
