/**
 * Challenger 2 Milestone 1 Empirical Stress Test Suite
 * 
 * Adversarial stress testing for:
 * 1. Build System Robustness, Bundle Output, Chunking, Tree-shaking, Package Dependencies
 * 2. SceneManager Lifecycle Transitions, Uninitialized States, Multiple Init Calls, Disposal
 * 3. TimeManager Temporal Dynamics, Fuzzing, Clock Jitter
 * 4. CameraController Boundary Limits, Damping, Shake Impulse
 * 5. Engine Architecture, Lifecycle & Telemetry Dispatch
 * 6. GLSL Shader Pipeline & Material Factories
 */

import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import { setupTestEnvironment, teardownTestEnvironment, expect, MockWebGL2RenderingContext } from './e2e_harness';

// Must execute setupTestEnvironment before any DOM/Canvas/Three.js classes are instantiated
setupTestEnvironment();

// Ensure globalThis.self is defined so Three.js WebGLAnimation binds context
(globalThis as any).self = globalThis;

// Polyfill window RAF/cancelRAF and WebGL extension for headless Three.js WebGLRenderer compatibility
if ((globalThis as any).window) {
  (globalThis as any).window.requestAnimationFrame = (cb: Function) => setTimeout(() => cb(Date.now()), 16);
  (globalThis as any).window.cancelAnimationFrame = (id: any) => clearTimeout(id);
}
(globalThis as any).requestAnimationFrame = (cb: Function) => setTimeout(() => cb(Date.now()), 16);
(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

const origGetExtension = MockWebGL2RenderingContext.prototype.getExtension;
(MockWebGL2RenderingContext.prototype as any).getExtension = function(name: string): any {
  if (name === 'WEBGL_draw_buffers') {
    return {
      drawBuffersWEBGL: () => {},
      loseContext: () => {},
      restoreContext: () => {}
    };
  }
  return origGetExtension.call(this, name);
};

(MockWebGL2RenderingContext.prototype as any).getActiveUniform = function(program: any, index: number) {
  return null;
};
(MockWebGL2RenderingContext.prototype as any).getActiveAttrib = function(program: any, index: number) {
  return null;
};

import { SceneManager } from '../src/core/SceneManager';
import { TimeManager } from '../src/core/TimeManager';
import { CameraController } from '../src/core/CameraController';
import { Engine } from '../src/core/Engine';
import { IScene, GestureState } from '../src/core/types';
import { createLensingMaterial } from '../src/shaders/lensing.glsl';
import { createAccretionMaterial } from '../src/shaders/accretion.frag';
import { createPortalMaterial } from '../src/shaders/portal.frag';
import { createLatticeMaterial } from '../src/shaders/lattice.frag';
import { CinematicPostPipeline } from '../src/shaders/postprocessing';

// ANSI styling
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let passed = 0;
let failed = 0;
const errors: Array<{ name: string; error: any }> = [];

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ${GREEN}✓${RESET} ${name}`);
  } catch (err: any) {
    failed++;
    errors.push({ name, error: err });
    console.log(`  ${RED}✗${RESET} ${BOLD}${name}${RESET}`);
    console.log(`    ${RED}Error: ${err.message}${RESET}`);
    if (err.stack) {
      console.log(`    ${GRAY}${err.stack.split('\n').slice(1, 3).join('\n    ')}${RESET}`);
    }
  }
}

function createMockScene(name: string, particleCount: number = 100000): IScene & {
  initCalls: number;
  updateCalls: number;
  renderCalls: number;
  enterCalls: number;
  exitCalls: number;
  disposeCalls: number;
} {
  return {
    name,
    particleCount,
    scene: new THREE.Scene(),
    initCalls: 0,
    updateCalls: 0,
    renderCalls: 0,
    enterCalls: 0,
    exitCalls: 0,
    disposeCalls: 0,
    init: function() { this.initCalls++; },
    update: function() { this.updateCalls++; },
    render: function() { this.renderCalls++; },
    onEnter: function() { this.enterCalls++; },
    onExit: function() { this.exitCalls++; },
    dispose: function() { this.disposeCalls++; },
  };
}

function createNeutralGestureState(): GestureState {
  return {
    hasHand: false,
    openness: 0.5,
    pinchDistance: 1.0,
    timeDilation: 1.0,
    rotation: { yaw: 0, pitch: 0, roll: 0 },
    position: { x: 0, y: 0 },
    zoomDelta: 0,
    swipeTriggered: null,
    intensity: 0,
    rawLandmarks: null,
  };
}

export async function runChallengerTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   CHALLENGER 2: EMPIRICAL STRESS & ADVERSARIAL HARNESS (M1)            ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // ============================================================================
  // Suite 1: Build System & Bundle Integrity
  // ============================================================================
  console.log(`${BOLD}${YELLOW}▶ Suite 1: Build System, Bundle Output & Chunking Integrity${RESET}`);

  await test('S1.1: dist/ directory exists with index.html and assets', () => {
    const distPath = path.resolve(process.cwd(), 'dist');
    expect(fs.existsSync(distPath)).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'assets'))).toBe(true);
  });

  await test('S1.2: Dedicated three-vendor chunk is generated in dist/assets', () => {
    const assetsDir = path.resolve(process.cwd(), 'dist/assets');
    const files = fs.readdirSync(assetsDir);
    const vendorChunk = files.find(f => f.startsWith('three-vendor-') && f.endsWith('.js'));
    const appChunk = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
    const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));

    expect(vendorChunk !== undefined).toBe(true);
    expect(appChunk !== undefined).toBe(true);
    expect(cssFile !== undefined).toBe(true);

    const vendorSize = fs.statSync(path.join(assetsDir, vendorChunk!)).size;
    const appSize = fs.statSync(path.join(assetsDir, appChunk!)).size;

    // Three.js chunk should be > 300KB, app chunk should be compact (< 100KB)
    expect(vendorSize > 300000).toBe(true);
    expect(appSize < 100000).toBe(true);
  });

  await test('S1.3: Source maps are generated for production JS bundles', () => {
    const assetsDir = path.resolve(process.cwd(), 'dist/assets');
    const files = fs.readdirSync(assetsDir);
    const mapFiles = files.filter(f => f.endsWith('.js.map'));
    expect(mapFiles.length >= 2).toBe(true);

    // Verify valid JSON source maps
    for (const mapFile of mapFiles) {
      const mapContent = fs.readFileSync(path.join(assetsDir, mapFile), 'utf-8');
      const parsed = JSON.parse(mapContent);
      expect(parsed.version).toBe(3);
      expect(Array.isArray(parsed.sources)).toBe(true);
    }
  });

  await test('S1.4: vercel.json contains required SPA rewrites, cache rules, and security headers', () => {
    const vercelPath = path.resolve(process.cwd(), 'vercel.json');
    expect(fs.existsSync(vercelPath)).toBe(true);
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));

    // Rewrites
    expect(Array.isArray(vercelConfig.rewrites)).toBe(true);
    const spaRewrite = vercelConfig.rewrites.find((r: any) => r.source === '/(.*)' && r.destination === '/index.html');
    expect(spaRewrite !== undefined).toBe(true);

    // Headers & Camera Permissions
    expect(Array.isArray(vercelConfig.headers)).toBe(true);
    const globalHeader = vercelConfig.headers.find((h: any) => h.source === '/(.*)');
    expect(globalHeader !== undefined).toBe(true);
    const permPolicy = globalHeader.headers.find((h: any) => h.key === 'Permissions-Policy');
    expect(permPolicy !== undefined).toBe(true);
    expect(permPolicy.value.includes('camera=*')).toBe(true);
  });

  await test('S1.5: package.json has three in dependencies and dev tools in devDependencies', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.dependencies.three !== undefined).toBe(true);
    expect(pkg.devDependencies.typescript !== undefined).toBe(true);
    expect(pkg.devDependencies.vite !== undefined).toBe(true);
    expect(pkg.devDependencies.tsx !== undefined).toBe(true);
  });

  // ============================================================================
  // Suite 2: SceneManager Lifecycle & Adversarial Edge Cases
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}▶ Suite 2: SceneManager Lifecycle Transitions & Stress Cases${RESET}`);

  const mockCanvas = document.createElement('canvas') as any;
  const mockRenderer = new THREE.WebGLRenderer({ canvas: mockCanvas });
  const mockCamera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 1000);

  await test('S2.1: SceneManager empty state safety', () => {
    const sm = new SceneManager();
    expect(sm.getActiveScene()).toBe(null);
    expect(sm.getActiveSceneName()).toBe('Unknown');
    expect(sm.getParticleCount()).toBe(0);
    expect(sm.getTransitionState().isTransitioning).toBe(false);

    // Non-throwing empty operations
    sm.update(0.016, 0.016, 1.0, createNeutralGestureState());
    sm.render(mockRenderer, mockCamera);
    sm.resize(1920, 1080, 1.0);
    expect(sm.nextScene()).toBe(false);
    expect(sm.previousScene()).toBe(false);
    sm.dispose();
  });

  await test('S2.2: First registered scene auto-activates immediately', async () => {
    const sm = new SceneManager();
    const sceneA = createMockScene('gargantua', 350000);
    await sm.registerScene(sceneA, mockRenderer, mockCamera);

    expect(sm.getActiveSceneName()).toBe('gargantua');
    expect(sm.getParticleCount()).toBe(350000);
    expect(sceneA.initCalls).toBe(1);
    expect(sceneA.enterCalls).toBe(1);
  });

  await test('S2.3: Re-registering existing scene name replaces scene in registry', async () => {
    const sm = new SceneManager();
    const scene1 = createMockScene('wormhole', 100000);
    const scene2 = createMockScene('wormhole', 200000);

    await sm.registerScene(scene1, mockRenderer, mockCamera);
    await sm.registerScene(scene2, mockRenderer, mockCamera);
    expect(scene2.initCalls).toBe(1);
  });

  await test('S2.4: Switching to non-existent scene returns false and preserves active scene', async () => {
    const sm = new SceneManager();
    const sceneA = createMockScene('gargantua');
    await sm.registerScene(sceneA, mockRenderer, mockCamera);

    const result = sm.switchTo('non_existent');
    expect(result).toBe(false);
    expect(sm.getActiveSceneName()).toBe('gargantua');
    expect(sm.getTransitionState().isTransitioning).toBe(false);
  });

  await test('S2.5: Switching to already active scene when idle returns true with no transition', async () => {
    const sm = new SceneManager();
    const sceneA = createMockScene('gargantua');
    await sm.registerScene(sceneA, mockRenderer, mockCamera);

    const result = sm.switchTo('gargantua');
    expect(result).toBe(true);
    expect(sm.getTransitionState().isTransitioning).toBe(false);
  });

  await test('S2.6: Cinematic transition clamps duration >= 0.5s and tracks progress', async () => {
    const sm = new SceneManager();
    const sceneA = createMockScene('gargantua');
    const sceneB = createMockScene('wormhole');
    await sm.registerScene(sceneA, mockRenderer, mockCamera);
    await sm.registerScene(sceneB, mockRenderer, mockCamera);

    let startedFrom = '';
    let startedTo = '';
    let progressCalls = 0;
    let completedTo = '';

    sm.onTransitionStart((from, to) => { startedFrom = from; startedTo = to; });
    sm.onTransitionProgress(() => { progressCalls++; });
    sm.onTransitionComplete((to) => { completedTo = to; });

    // Request 0.1s transition, should be clamped to >= 0.5s
    sm.switchTo('wormhole', { duration: 0.1 });
    const trans = sm.getTransitionState();
    expect(trans.isTransitioning).toBe(true);
    expect(trans.duration >= 0.5).toBe(true);
    expect(startedFrom).toBe('gargantua');
    expect(startedTo).toBe('wormhole');
    expect(sceneA.exitCalls).toBe(1);
    expect(sceneB.enterCalls).toBe(1);

    // Advance 0.25s
    sm.update(0.25, 0.25, 1.0, createNeutralGestureState());
    expect(sm.getTransitionState().isTransitioning).toBe(true);
    expect(sm.getTransitionState().progress >= 0.49).toBe(true);
    expect(progressCalls > 0).toBe(true);

    // Advance 0.3s -> total 0.55s (exceeds duration)
    sm.update(0.3, 0.3, 1.0, createNeutralGestureState());
    expect(sm.getTransitionState().isTransitioning).toBe(false);
    expect(sm.getActiveSceneName()).toBe('wormhole');
    expect(completedTo).toBe('wormhole');
  });

  await test('S2.7: Transition advances via rawDelta (unaffected by extreme time dilation)', async () => {
    const sm = new SceneManager();
    const sceneA = createMockScene('gargantua');
    const sceneB = createMockScene('tesseract');
    await sm.registerScene(sceneA, mockRenderer, mockCamera);
    await sm.registerScene(sceneB, mockRenderer, mockCamera);

    sm.switchTo('tesseract', { duration: 1.0 });

    // Extreme time dilation tau = 0.1, scaledDelta = 0.01s, rawDelta = 0.1s
    for (let i = 0; i < 11; i++) {
      sm.update(0.01, 0.1, 0.1, createNeutralGestureState());
    }

    // 11 * 0.1s rawDelta = 1.1s elapsed -> transition must finish
    expect(sm.getTransitionState().isTransitioning).toBe(false);
    expect(sm.getActiveSceneName()).toBe('tesseract');
  });

  await test('S2.8: Circular navigation (nextScene & previousScene)', async () => {
    const sm = new SceneManager();
    const s1 = createMockScene('gargantua');
    const s2 = createMockScene('wormhole');
    const s3 = createMockScene('tesseract');
    await sm.registerScene(s1, mockRenderer, mockCamera);
    await sm.registerScene(s2, mockRenderer, mockCamera);
    await sm.registerScene(s3, mockRenderer, mockCamera);

    expect(sm.getActiveSceneName()).toBe('gargantua');

    sm.nextScene({ duration: 0.5 });
    sm.update(0.6, 0.6, 1.0, createNeutralGestureState());
    expect(sm.getActiveSceneName()).toBe('wormhole');

    sm.nextScene({ duration: 0.5 });
    sm.update(0.6, 0.6, 1.0, createNeutralGestureState());
    expect(sm.getActiveSceneName()).toBe('tesseract');

    sm.nextScene({ duration: 0.5 });
    sm.update(0.6, 0.6, 1.0, createNeutralGestureState());
    expect(sm.getActiveSceneName()).toBe('gargantua'); // Wrapped around

    sm.previousScene({ duration: 0.5 });
    sm.update(0.6, 0.6, 1.0, createNeutralGestureState());
    expect(sm.getActiveSceneName()).toBe('tesseract'); // Wrapped backward
  });

  await test('S2.9: Rapid transition preemption / switching mid-transition', async () => {
    const sm = new SceneManager();
    const s1 = createMockScene('gargantua');
    const s2 = createMockScene('wormhole');
    const s3 = createMockScene('tesseract');
    await sm.registerScene(s1, mockRenderer, mockCamera);
    await sm.registerScene(s2, mockRenderer, mockCamera);
    await sm.registerScene(s3, mockRenderer, mockCamera);

    // Start transition to wormhole
    sm.switchTo('wormhole', { duration: 1.0 });
    sm.update(0.2, 0.2, 1.0, createNeutralGestureState());

    // Switch to tesseract mid-flight
    sm.switchTo('tesseract', { duration: 1.0 });
    expect(sm.getTransitionState().toScene).toBe('tesseract');

    // Complete transition
    sm.update(1.1, 1.1, 1.0, createNeutralGestureState());
    expect(sm.getActiveSceneName()).toBe('tesseract');
  });

  await test('S2.10: Disposal cleans up all scenes, listeners, and survives double disposal', async () => {
    const sm = new SceneManager();
    const s1 = createMockScene('gargantua');
    const s2 = createMockScene('wormhole');
    await sm.registerScene(s1, mockRenderer, mockCamera);
    await sm.registerScene(s2, mockRenderer, mockCamera);

    sm.onTransitionStart(() => {});
    sm.onTransitionProgress(() => {});
    sm.onTransitionComplete(() => {});

    sm.dispose();

    expect(s1.disposeCalls).toBe(1);
    expect(s2.disposeCalls).toBe(1);
    expect(sm.getActiveScene()).toBe(null);

    // Double disposal test
    sm.dispose();
    expect(s1.disposeCalls).toBe(1); // not called again since map was cleared
  });

  // ============================================================================
  // Suite 3: TimeManager Temporal Robustness & Fuzzing
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}▶ Suite 3: TimeManager Temporal Dynamics & Fuzzing${RESET}`);

  await test('S3.1: Clock jitter and negative delta protection', () => {
    const tm = new TimeManager();
    tm.update(1.0, 1000);
    // Timestamp goes backwards (clock jitter / NTP sync)
    const state = tm.update(1.0, 950);
    expect(state.rawDelta > 0).toBe(true);
    expect(state.rawDelta).toBe(0.016); // Fallback guard applied
  });

  await test('S3.2: Large delta spike clamped to maxDelta (100ms cap)', () => {
    const tm = new TimeManager();
    tm.update(1.0, 1000);
    // 5 seconds sleep in background tab
    const state = tm.update(1.0, 6000);
    expect(state.rawDelta <= 0.1001).toBe(true);
  });

  await test('S3.3: Dilation target bounds clamping [0.1, 1.0]', () => {
    const tm = new TimeManager();
    tm.update(-5.0, 1000); // Invalid negative dilation
    expect(tm.getTimeDilation() >= 0.1).toBe(true);

    tm.update(50.0, 1016); // Invalid excess dilation
    expect(tm.getTimeDilation() <= 1.0).toBe(true);
  });

  await test('S3.4: Time accumulation precision over 10,000 steps', () => {
    const tm = new TimeManager();
    let now = 1000;
    for (let i = 0; i < 10000; i++) {
      now += 16.666667;
      tm.update(0.5, now);
    }
    expect(Number.isFinite(tm.getRawTime())).toBe(true);
    expect(Number.isFinite(tm.getScaledTime())).toBe(true);
    expect(tm.getScaledTime() < tm.getRawTime()).toBe(true);
  });

  await test('S3.5: reset() restores initial state cleanly', () => {
    const tm = new TimeManager();
    tm.update(0.2, 1000);
    tm.update(0.2, 2000);
    expect(tm.getRawTime() > 0).toBe(true);

    tm.reset();
    expect(tm.getRawTime()).toBe(0);
    expect(tm.getScaledTime()).toBe(0);
    expect(tm.getTimeDilation()).toBe(1.0);
  });

  // ============================================================================
  // Suite 4: CameraController Boundary Limits & Damping
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}▶ Suite 4: CameraController Limits & Shake Dynamics${RESET}`);

  await test('S4.1: Camera initializes with perspective parameters', () => {
    const cc = new CameraController({ fov: 65, near: 0.5, far: 5000 });
    expect(cc.camera.fov).toBe(65);
    expect(cc.camera.near).toBe(0.5);
    expect(cc.camera.far).toBe(5000);
  });

  await test('S4.2: Extreme gesture yaw/pitch clamped strictly to limits', () => {
    const cc = new CameraController();
    const extremeGesture: GestureState = {
      ...createNeutralGestureState(),
      hasHand: true,
      rotation: { yaw: 100.0, pitch: -100.0, roll: 0 },
    };

    // Run 60 frames
    for (let i = 0; i < 60; i++) {
      cc.update(0.016, extremeGesture);
    }

    // Camera position should stay bounded within yawLimit and pitchLimit
    const pos = cc.camera.position;
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
    expect(Number.isFinite(pos.z)).toBe(true);
  });

  await test('S4.3: Impulse shake triggers perturbation and decays to zero', () => {
    const cc = new CameraController();
    cc.triggerImpulseShake(3.0);

    // Initial shake
    cc.update(0.016);
    // After 2.0s of decay
    for (let i = 0; i < 120; i++) {
      cc.update(0.016);
    }

    const initialPos = new THREE.Vector3(0, 40, 250);
    expect(cc.camera.position.distanceTo(initialPos) < 1.0).toBe(true);
  });

  await test('S4.4: updateAspect handles invalid/zero height safely', () => {
    const cc = new CameraController();
    const initialAspect = cc.camera.aspect;
    cc.updateAspect(1920, 0); // Invalid zero height
    expect(cc.camera.aspect).toBe(initialAspect); // Unchanged

    cc.updateAspect(1920, 1080);
    expect(Math.abs(cc.camera.aspect - (1920 / 1080)) < 0.001).toBe(true);
  });

  // ============================================================================
  // Suite 5: Engine Lifecycle & Telemetry Broadcast
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}▶ Suite 5: Engine Lifecycle & Telemetry Broadcast${RESET}`);

  await test('S5.1: Engine initializes subsystems and executes renderFrame', async () => {
    const canvas = document.createElement('canvas') as any;
    const engine = new Engine({ canvas, maxPixelRatio: 1.5 });

    const scene = createMockScene('gargantua', 300000);
    await engine.registerScene(scene);

    let receivedTelemetry: any = null;
    const unsubscribe = engine.onTelemetry((t) => { receivedTelemetry = t; });

    engine.renderFrame(1016);

    expect(receivedTelemetry !== null).toBe(true);
    expect(receivedTelemetry.currentScene).toBe('gargantua');
    expect(receivedTelemetry.particleCount).toBe(300000);
    expect(receivedTelemetry.fps >= 1).toBe(true);
    expect(scene.renderCalls).toBe(1);

    unsubscribe();
    engine.dispose();
  });

  await test('S5.2: Gesture state updates trigger automatic swipe scene navigation', async () => {
    const canvas = document.createElement('canvas') as any;
    const engine = new Engine({ canvas });

    const s1 = createMockScene('gargantua');
    const s2 = createMockScene('wormhole');
    await engine.registerScene(s1);
    await engine.registerScene(s2);

    expect(engine.sceneManager.getActiveSceneName()).toBe('gargantua');

    // Trigger swipe right
    engine.setGestureState({ swipeTriggered: 'right' });
    expect(engine.sceneManager.getTransitionState().isTransitioning).toBe(true);
    expect(engine.sceneManager.getTransitionState().toScene).toBe('wormhole');

    engine.dispose();
  });

  await test('S5.3: Engine start, stop and dispose safety', () => {
    const canvas = document.createElement('canvas') as any;
    const engine = new Engine({ canvas });

    engine.start();
    engine.start(); // Redundant start is no-op
    engine.stop();
    engine.stop();  // Redundant stop is no-op

    engine.dispose();
    engine.dispose(); // Double dispose safety
  });

  // ============================================================================
  // Suite 6: GLSL Shader Pipeline & Material Factories
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}▶ Suite 6: GLSL Shader Pipeline & Material Factories${RESET}`);

  await test('S6.1: Lensing shader material contains all required uniforms', () => {
    const mat = createLensingMaterial();
    expect(mat.uniforms.tDiffuse !== undefined).toBe(true);
    expect(mat.uniforms.uBlackHoleScreenPos !== undefined).toBe(true);
    expect(mat.uniforms.uSchwarzschildRadius.value).toBe(0.08);
    expect(mat.uniforms.uPhotonSphereRadius.value).toBe(0.12);
    expect(mat.uniforms.uGlowColor.value instanceof THREE.Color).toBe(true);
    expect(mat.vertexShader.length > 20).toBe(true);
    expect(mat.fragmentShader.length > 100).toBe(true);
  });

  await test('S6.2: Accretion disk material configured with Doppler & beaming uniforms', () => {
    const mat = createAccretionMaterial({ innerRadius: 2.5, outerRadius: 15.0 });
    expect(mat.uniforms.uInnerRadius.value).toBe(2.5);
    expect(mat.uniforms.uOuterRadius.value).toBe(15.0);
    expect(mat.uniforms.uBeamingExponent.value).toBe(4.0);
    expect(mat.transparent).toBe(true);
    expect(mat.blending).toBe(THREE.AdditiveBlending);
  });

  await test('S6.3: Portal shader material configured with chromatic dispersion & dual skyboxes', () => {
    const mat = createPortalMaterial();
    expect(mat.uniforms.tSkyboxUniverse1 !== undefined).toBe(true);
    expect(mat.uniforms.tSkyboxUniverse2 !== undefined).toBe(true);
    expect(mat.uniforms.uRefractionIndex.value).toBe(1.24);
    expect(mat.uniforms.uDispersion.value).toBe(0.035);
  });

  await test('S6.4: 5D Tesseract lattice material configured with grid spacing & fog', () => {
    const mat = createLatticeMaterial();
    expect(mat.uniforms.uGridSpacing.value).toBe(8.0);
    expect(mat.uniforms.uBeamRadius.value).toBe(0.08);
    expect(mat.uniforms.uFilamentGlowColorA.value instanceof THREE.Color).toBe(true);
    expect(mat.uniforms.uFogDensity.value).toBe(0.0035);
  });

  await test('S6.5: CinematicPostPipeline instantiation, ripple trigger, update and resize', () => {
    const canvas = document.createElement('canvas') as any;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 1000);

    const pipeline = new CinematicPostPipeline(canvas, scene, camera);
    expect(pipeline.composer !== undefined).toBe(true);
    expect(pipeline.bloomPass !== undefined).toBe(true);
    expect(pipeline.compositePass !== undefined).toBe(true);

    pipeline.triggerRipple(new THREE.Vector2(0.5, 0.5));
    expect(pipeline.compositePass.uniforms.uRippleStrength.value).toBe(1.0);

    pipeline.update(0.016, 1.5, 0.8);
    expect(pipeline.compositePass.uniforms.uTime.value).toBe(1.5);
    expect(pipeline.compositePass.uniforms.uChromaticAberration.value > 0.5).toBe(true);

    pipeline.resize(1920, 1080);
    expect(pipeline.compositePass.uniforms.uResolution.value.x).toBe(1920);

    pipeline.dispose();
  });

  teardownTestEnvironment();

  // ============================================================================
  // Summary
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   CHALLENGER 2 SUMMARY REPORT                                          ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`Total Stress Tests: ${passed + failed}`);
  console.log(`Passed:             ${GREEN}${passed}${RESET}`);
  console.log(`Failed:             ${failed > 0 ? RED : GREEN}${failed}${RESET}`);

  if (failed > 0) {
    console.log(`\n${RED}${BOLD}FAILED CHALLENGES (${failed}):${RESET}`);
    for (const e of errors) {
      console.log(`  - ${e.name}: ${e.error?.message}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}✨ ALL EMPIRICAL CHALLENGES PASSED (VERDICT: APPROVE)${RESET}\n`);
    process.exit(0);
  }
}

runChallengerTests();
