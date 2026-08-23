import * as THREE from 'three';
import { TimeManager } from '../../src/core/TimeManager';
import { CameraController } from '../../src/core/CameraController';
import { SceneManager } from '../../src/core/SceneManager';
import { Engine } from '../../src/core/Engine';
import { createLensingMaterial, LENSING_FRAGMENT_SHADER } from '../../src/shaders/lensing.glsl';
import { createAccretionMaterial, ACCRETION_FRAGMENT_SHADER } from '../../src/shaders/accretion.frag';
import { createPortalMaterial, PORTAL_FRAGMENT_SHADER } from '../../src/shaders/portal.frag';
import { createLatticeMaterial, LATTICE_FRAGMENT_SHADER } from '../../src/shaders/lattice.frag';
import { CinematicPostPipeline } from '../../src/shaders/postprocessing';
import { IScene, GestureState } from '../../src/core/types';

interface ProbeResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: ProbeResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  results.push({
    name,
    passed: condition,
    details: condition ? `PASS: ${details}` : `FAIL: ${details}`
  });
}

async function runProbe() {
  // Probe 1: TimeManager
  console.log('--- Probing TimeManager ---');
  const tm = new TimeManager();
  const t0 = tm.update(1.0, 1000);
  const t1 = tm.update(1.0, 1016.67);
  assert(t1.rawDelta > 0.015 && t1.rawDelta < 0.018, 'TimeManager Raw Delta', `rawDelta = ${t1.rawDelta}`);
  assert(t1.scaledDelta > 0.015 && t1.scaledDelta < 0.018, 'TimeManager Scaled Delta (tau=1)', `scaledDelta = ${t1.scaledDelta}`);

  // Probe time dilation transition
  for (let i = 0; i < 60; i++) {
    tm.update(0.1, 1016.67 + i * 16.67);
  }
  const dilatedState = tm.update(0.1, 1016.67 + 60 * 16.67);
  assert(dilatedState.timeDilation < 0.2, 'TimeManager Dilation Convergence', `timeDilation = ${dilatedState.timeDilation}`);
  assert(dilatedState.scaledDelta < 0.005, 'TimeManager Scaled Delta (tau->0.1)', `scaledDelta = ${dilatedState.scaledDelta}`);

  // Probe 2: CameraController
  console.log('--- Probing CameraController ---');
  const cc = new CameraController({
    fov: 60,
    initialPosition: new THREE.Vector3(0, 40, 250),
    dampingFactor: 5.5,
  });
  const initialPos = cc.camera.position.clone();
  assert(initialPos.z === 250 && initialPos.y === 40, 'CameraController Initial Pos', `pos = ${initialPos.toArray()}`);

  const dummyGesture: GestureState = {
    hasHand: true,
    openness: 1.0,
    pinchDistance: 1.0,
    timeDilation: 1.0,
    rotation: { yaw: 0.5, pitch: -0.2, roll: 0 },
    position: { x: 0, y: 0 },
    zoomDelta: 0.5,
    swipeTriggered: null,
    intensity: 0.8,
    rawLandmarks: null,
  };

  for (let i = 0; i < 30; i++) {
    cc.update(0.016, dummyGesture);
  }
  const movedPos = cc.camera.position.clone();
  assert(!movedPos.equals(initialPos), 'CameraController Gesture Tracking', `new pos = ${movedPos.toArray()}`);

  // Probe 3: SceneManager
  console.log('--- Probing SceneManager ---');
  const sm = new SceneManager();
  let scene1Updated = false;
  let scene2Updated = false;

  const scene1: IScene = {
    name: 'scene1',
    particleCount: 100000,
    scene: new THREE.Scene(),
    init: () => {},
    update: () => { scene1Updated = true; },
    render: () => {},
    onEnter: () => {},
    onExit: () => {},
    dispose: () => {},
  };

  const scene2: IScene = {
    name: 'scene2',
    particleCount: 200000,
    scene: new THREE.Scene(),
    init: () => {},
    update: () => { scene2Updated = true; },
    render: () => {},
    onEnter: () => {},
    onExit: () => {},
    dispose: () => {},
  };

  const mockRenderer = {
    clear: () => {},
    render: () => {},
    setSize: () => {},
    setPixelRatio: () => {},
    dispose: () => {},
  } as any;

  await sm.registerScene(scene1, mockRenderer, cc.camera);
  await sm.registerScene(scene2, mockRenderer, cc.camera);

  assert(sm.getActiveSceneName() === 'scene1', 'SceneManager Initial Active Scene', sm.getActiveSceneName());
  assert(sm.getParticleCount() === 100000, 'SceneManager Particle Count', `${sm.getParticleCount()}`);

  // Switch scene
  sm.switchTo('scene2', { duration: 0.5, type: 'crossfade' });
  assert(sm.getTransitionState().isTransitioning === true, 'SceneManager Transition Started', `isTransitioning = true`);

  // Update during transition
  sm.update(0.016, 0.016, 1.0, dummyGesture);
  assert(scene1Updated && scene2Updated, 'SceneManager Dual Update During Transition', `s1=${scene1Updated}, s2=${scene2Updated}`);

  // Complete transition
  for (let i = 0; i < 40; i++) {
    sm.update(0.016, 0.016, 1.0, dummyGesture);
  }
  assert(sm.getActiveSceneName() === 'scene2', 'SceneManager Transition Completion', sm.getActiveSceneName());
  assert(!sm.getTransitionState().isTransitioning, 'SceneManager Transition Ended', `isTransitioning = false`);

  // Probe 4: Shader Materials & GLSL Math
  console.log('--- Probing Shader Materials ---');
  const lensingMat = createLensingMaterial();
  assert(lensingMat.uniforms.uSchwarzschildRadius.value === 0.08, 'Lensing Uniforms', `uSchwarzschildRadius = 0.08`);
  assert(LENSING_FRAGMENT_SHADER.includes('bcrit = 2.598076 * rs'), 'Lensing Schwarzschild b_crit formula', 'found');
  assert(LENSING_FRAGMENT_SHADER.includes('photonWinding = -log('), 'Lensing Photon Winding formula', 'found');

  const accretionMat = createAccretionMaterial();
  assert(accretionMat.uniforms.uInnerRadius.value === 3.0, 'Accretion ISCO Uniform', `uInnerRadius = 3.0`);
  assert(accretionMat.uniforms.uBeamingExponent.value === 4.0, 'Accretion Bolometric Beaming Uniform', `uBeamingExponent = 4.0`);
  assert(ACCRETION_FRAGMENT_SHADER.includes('gamma = 1.0 / sqrt(max(0.01, 1.0 - betaMag * betaMag))'), 'Accretion Lorentz factor gamma', 'found');
  assert(ACCRETION_FRAGMENT_SHADER.includes('kappaGrav = sqrt(max(0.01, 1.0 - uSchwarzschildRadius / max(r, uSchwarzschildRadius + 0.01)))'), 'Accretion Gravitational Redshift kappa', 'found');
  assert(ACCRETION_FRAGMENT_SHADER.includes('dopplerG = kappaGrav / (gamma * max(0.05, 1.0 - betaDotLos))'), 'Accretion Doppler Factor g', 'found');
  assert(ACCRETION_FRAGMENT_SHADER.includes('beaming = pow(max(0.01, dopplerG), uBeamingExponent)'), 'Accretion Relativistic Beaming g^4', 'found');

  const portalMat = createPortalMaterial();
  assert(portalMat.uniforms.uRefractionIndex.value === 1.24, 'Portal Refraction Uniform', `uRefractionIndex = 1.24`);
  assert(PORTAL_FRAGMENT_SHADER.includes('refract(-V, N, 1.0 / max(0.01, etaR))'), 'Portal Chromatic Dispersion Red Refract', 'found');
  assert(PORTAL_FRAGMENT_SHADER.includes('refract(-V, N, 1.0 / max(0.01, etaB))'), 'Portal Chromatic Dispersion Blue Refract', 'found');

  const latticeMat = createLatticeMaterial();
  assert(latticeMat.uniforms.uGridSpacing.value === 8.0, 'Lattice Grid Spacing', `uGridSpacing = 8.0`);
  assert(LATTICE_FRAGMENT_SHADER.includes('vec3 cell = floor(p / L)'), 'Lattice Periodic Cell Floor', 'found');
  assert(LATTICE_FRAGMENT_SHADER.includes('float dX = length(u.yz) * L'), 'Lattice Orthogonal Beam Distance', 'found');

  console.log('\n========================================');
  console.log('FORENSIC PROBE SUMMARY:');
  console.log('========================================');
  let allPassed = true;
  for (const res of results) {
    console.log(`${res.passed ? '✓' : '✗'} [${res.name}]: ${res.details}`);
    if (!res.passed) allPassed = false;
  }
  console.log(`\nFinal Probe Result: ${allPassed ? 'ALL PASS (CLEAN)' : 'FAILURES DETECTED'}`);
  process.exit(allPassed ? 0 : 1);
}

runProbe();
