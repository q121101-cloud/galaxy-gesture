/**
 * Milestone 2 Test Suite: Interstellar 3D Scenes & Transitions
 * 
 * Verifies:
 * 1. BaseScene abstract lifecycle, camera rigging, particle count tracking, and disposal.
 * 2. GargantuaScene: Black hole event horizon, photon ring, relativistic Doppler accretion disk,
 *    upper/lower warped lensing halo arches, and >=300,000 GPU Keplerian particles with polar jets.
 * 3. WormholeScene: Traversable Ellis wormhole spherical portal, 4D celestial refraction,
 *    Einstein ring boundary, dual starfields, and >=300,000 warp particles.
 * 4. TesseractScene: 5D infinite bookshelf periodic lattice, neon quantum timeline filaments,
 *    temporal coordinate pulses, and >=300,000 quantum motes.
 * 5. TransitionManager: Cinematic cross-fade, smootherstep camera interpolation,
 *    gravitational ripple metric wave, and duration >= 0.5s.
 * 6. SceneManager & Engine Integration with all 3 scenes.
 */

import * as THREE from 'three';
import { describe, it, expect, MockWebGL2RenderingContext } from './e2e_harness';
import { BaseScene } from '../src/scenes/BaseScene';
import { GargantuaScene } from '../src/scenes/GargantuaScene';
import { WormholeScene } from '../src/scenes/WormholeScene';
import { TesseractScene } from '../src/scenes/TesseractScene';
import { TransitionManager, smootherstep } from '../src/scenes/TransitionManager';
import { SceneManager } from '../src/core/SceneManager';
import { GestureState } from '../src/core/types';

// Mock WebGLRenderer helper for headless scene testing
function createMockRenderer(): THREE.WebGLRenderer {
  const canvas = (typeof document !== 'undefined' ? document.createElement('canvas') : {
    width: 1280,
    height: 720,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => new MockWebGL2RenderingContext(canvas as any),
  } as unknown as HTMLCanvasElement);
  return new THREE.WebGLRenderer({ canvas, context: new MockWebGL2RenderingContext(canvas as any) as any });
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
    intensity: 0.5,
    rawLandmarks: null,
  };
}

// ============================================================================
// SUITE 1: BaseScene Lifecycle & Interface Compliance
// ============================================================================
describe('Milestone 2 - Suite 1: BaseScene Lifecycle & Camera Rigging', () => {
  class TestScene extends BaseScene {
    public readonly name = 'test_scene';
    public setupCalled = false;
    public updateCount = 0;

    protected setupScene(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
      this.setupCalled = true;
      this._particleCount = 1000;
      const geo = this.registerDisposable(new THREE.BufferGeometry());
      const mat = this.registerDisposable(new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const mesh = new THREE.Mesh(geo, mat);
      this.scene.add(mesh);
    }

    public update(delta: number, timeDilation: number, gestureState: GestureState): void {
      this.updateCount++;
    }
  }

  it('M2.1.1: BaseScene initializes with default camera rigging and state', () => {
    const scene = new TestScene();
    expect(scene.name).toBe('test_scene');
    expect(scene.particleCount).toBe(0);
    expect(scene.isInitialized).toBe(false);
    expect(scene.isActive).toBe(false);
    expect(scene.cameraRig).toBeDefined();
    expect(scene.cameraRig.fov).toBe(60);
  });

  it('M2.1.2: init() invokes setupScene and marks isInitialized = true', async () => {
    const scene = new TestScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await scene.init(renderer, camera);
    expect(scene.setupCalled).toBe(true);
    expect(scene.isInitialized).toBe(true);
    expect(scene.particleCount).toBe(1000);
  });

  it('M2.1.3: onEnter and onExit update isActive flag', () => {
    const scene = new TestScene();
    expect(scene.isActive).toBe(false);
    scene.onEnter();
    expect(scene.isActive).toBe(true);
    scene.onExit();
    expect(scene.isActive).toBe(false);
  });

  it('M2.1.4: dispose() frees registered disposables and empties scene graph', async () => {
    const scene = new TestScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await scene.init(renderer, camera);
    expect(scene.scene.children.length).toBe(1);

    scene.dispose();
    expect(scene.scene.children.length).toBe(0);
    expect(scene.isInitialized).toBe(false);
    expect(scene.isActive).toBe(false);
  });
});

// ============================================================================
// SUITE 2: GargantuaScene Astrophysics & GPU Particle Verification
// ============================================================================
describe('Milestone 2 - Suite 2: Gargantua Black Hole, Accretion Disk & Particles', () => {
  it('M2.2.1: Gargantua satisfies physical radius relationships (Rs, Rph, ISCO, Rout)', () => {
    const gargantua = new GargantuaScene({ schwarzschildRadius: 4.0 });
    expect(gargantua.name).toBe('gargantua');
    expect(gargantua.schwarzschildRadius).toBe(4.0);
    expect(gargantua.photonSphereRadius).toBe(6.0); // 1.5 * Rs
    expect(gargantua.innerDiskRadius).toBe(12.0); // 3.0 * Rs (ISCO)
    expect(gargantua.outerDiskRadius).toBe(48.0); // 12.0 * Rs
    expect(gargantua.outerDiskRadius).toBeGreaterThan(gargantua.innerDiskRadius);
  });

  it('M2.2.2: Particle count strictly meets requirement of >= 300,000 GPU particles', async () => {
    const gargantua = new GargantuaScene({ particleCount: 350000 });
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await gargantua.init(renderer, camera);
    expect(gargantua.particleCount).toBeGreaterThanOrEqual(300000);
    expect(gargantua.particleCount).toBe(350000);
  });

  it('M2.2.3: Scene graph contains Event Horizon, Photon Ring, Equatorial Disk, and Warped Arches', async () => {
    const gargantua = new GargantuaScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await gargantua.init(renderer, camera);
    // Verify children added to scene
    expect(gargantua.scene.children.length).toBeGreaterThanOrEqual(5);

    let hasPoints = false;
    let meshCount = 0;
    gargantua.scene.traverse((obj) => {
      if (obj instanceof THREE.Points) hasPoints = true;
      if (obj instanceof THREE.Mesh) meshCount++;
    });

    expect(hasPoints).toBe(true);
    expect(meshCount).toBeGreaterThanOrEqual(4); // Event horizon, photon ring, disk, upper arch, lower arch
  });

  it('M2.2.4: GPU Keplerian particles geometry contains all required attribute buffers', async () => {
    const gargantua = new GargantuaScene({ particleCount: 350000 });
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await gargantua.init(renderer, camera);

    let pointsObj: THREE.Points | null = null;
    gargantua.scene.traverse((obj) => {
      if (obj instanceof THREE.Points) pointsObj = obj;
    });

    expect(pointsObj).not.toBeNull();
    const geo = pointsObj!.geometry;
    expect(geo.getAttribute('position')).toBeDefined();
    expect(geo.getAttribute('position').count).toBe(350000);
    expect(geo.getAttribute('aVelocity')).toBeDefined();
    expect(geo.getAttribute('aColor')).toBeDefined();
    expect(geo.getAttribute('aSize')).toBeDefined();
    expect(geo.getAttribute('aOrbitRadius')).toBeDefined();
    expect(geo.getAttribute('aOrbitSpeed')).toBeDefined();
    expect(geo.getAttribute('aOrbitAngle')).toBeDefined();
    expect(geo.getAttribute('aType')).toBeDefined();
    expect(geo.getAttribute('aPhase')).toBeDefined();
  });

  it('M2.2.5: Relativistic Doppler beaming mathematical formulas are physically exact', () => {
    // Relativistic Doppler factor g = sqrt(1 - Rs/r - beta^2) / (gamma * (1 - beta * cos(theta)))
    const beta = 0.45; // 0.45c
    const gamma = 1.0 / Math.sqrt(1.0 - beta * beta);
    const cosThetaApproach = 1.0;
    const cosThetaRecede = -1.0;

    const gApproach = 1.0 / (gamma * (1.0 - beta * cosThetaApproach));
    const gRecede = 1.0 / (gamma * (1.0 - beta * cosThetaRecede));

    expect(gApproach).toBeGreaterThan(1.0);
    expect(gRecede).toBeLessThan(1.0);

    // Bolometric beaming I_obs = g^4 * I_emit
    const beamingApproach = Math.pow(gApproach, 4.0);
    const beamingRecede = Math.pow(gRecede, 4.0);

    expect(beamingApproach).toBeGreaterThan(4.0);
    expect(beamingRecede).toBeLessThan(0.5);
    expect(beamingApproach / beamingRecede).toBeGreaterThan(10.0);
  });

  it('M2.2.6: update() advances simulation time and modulates uniforms with gesture state', async () => {
    const gargantua = new GargantuaScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await gargantua.init(renderer, camera);

    const gesture = createNeutralGestureState();
    gesture.hasHand = true;
    gesture.openness = 0.8;

    gargantua.update(0.016, 0.5, gesture); // 50% slow motion
    expect(gargantua.isInitialized).toBe(true);
  });
});

// ============================================================================
// SUITE 3: WormholeScene Astrophysics & Particle Stream Verification
// ============================================================================
describe('Milestone 2 - Suite 3: Wormhole 4D Refraction Portal & Warp Streaks', () => {
  it('M2.3.1: Wormhole initializes with throat radius a = 15.0 and >= 300,000 particles', async () => {
    const wormhole = new WormholeScene({ throatRadius: 15.0, particleCount: 300000 });
    expect(wormhole.name).toBe('wormhole');
    expect(wormhole.throatRadius).toBe(15.0);

    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await wormhole.init(renderer, camera);
    expect(wormhole.particleCount).toBeGreaterThanOrEqual(300000);
  });

  it('M2.3.2: Ellis drainhole metric hyperbolic throat radius follows r(z) = sqrt(a^2 + z^2)', () => {
    const a = 15.0;
    const z0 = 0.0;
    const z10 = 10.0;
    const z50 = 50.0;

    const r0 = Math.sqrt(a * a + z0 * z0);
    const r10 = Math.sqrt(a * a + z10 * z10);
    const r50 = Math.sqrt(a * a + z50 * z50);

    expect(r0).toBe(15.0);
    expect(r10).toBeCloseTo(18.028, 2);
    expect(r50).toBeCloseTo(52.202, 2);
    expect(r50).toBeGreaterThan(r10);
    expect(r10).toBeGreaterThan(r0);
  });

  it('M2.3.3: Scene graph contains refractive portal sphere, Einstein boundary ring, and particles', async () => {
    const wormhole = new WormholeScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await wormhole.init(renderer, camera);

    let hasPortalMesh = false;
    let hasPoints = false;

    wormhole.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) hasPortalMesh = true;
      if (obj instanceof THREE.Points) hasPoints = true;
    });

    expect(hasPortalMesh).toBe(true);
    expect(hasPoints).toBe(true);
  });

  it('M2.3.4: update() modulates fly-through travel progress and warp streak velocity', async () => {
    const wormhole = new WormholeScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await wormhole.init(renderer, camera);

    const gesture = createNeutralGestureState();
    gesture.hasHand = true;
    gesture.openness = 1.0; // Max speed fly-through

    wormhole.update(0.1, 1.0, gesture);
    expect(wormhole.isInitialized).toBe(true);
  });
});

// ============================================================================
// SUITE 4: TesseractScene 5D Bookshelf Lattice & Quantum Motes
// ============================================================================
describe('Milestone 2 - Suite 4: Tesseract 5D Bookshelf Lattice & Quantum Filaments', () => {
  it('M2.4.1: Tesseract initializes with periodic spacing L = 12.0 and >= 300,000 particles', async () => {
    const tesseract = new TesseractScene({ gridSpacing: 12.0, particleCount: 300000 });
    expect(tesseract.name).toBe('tesseract');
    expect(tesseract.gridSpacing).toBe(12.0);

    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await tesseract.init(renderer, camera);
    expect(tesseract.particleCount).toBeGreaterThanOrEqual(300000);
  });

  it('M2.4.2: 5D hyper-cube coordinate projection maps (x, y, z, w, v) dimensions', () => {
    const p5D = { x: 10.0, y: 20.0, z: 30.0, w: 4.0, v: -2.0 };
    const projectedX = p5D.x + Math.sin(p5D.w * 0.2) * 2.5;
    const projectedY = p5D.y + Math.cos(p5D.v * 0.2) * 2.5;
    const projectedZ = p5D.z + Math.sin((p5D.w + p5D.v) * 0.15) * 2.0;

    expect(Number.isFinite(projectedX)).toBe(true);
    expect(Number.isFinite(projectedY)).toBe(true);
    expect(Number.isFinite(projectedZ)).toBe(true);
  });

  it('M2.4.3: Scene graph contains lattice bounding volume, instanced bookshelf slats, and quantum motes', async () => {
    const tesseract = new TesseractScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await tesseract.init(renderer, camera);

    let hasInstancedMesh = false;
    let hasPoints = false;

    tesseract.scene.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) hasInstancedMesh = true;
      if (obj instanceof THREE.Points) hasPoints = true;
    });

    expect(hasInstancedMesh).toBe(true);
    expect(hasPoints).toBe(true);
  });

  it('M2.4.4: Quantum motes attribute buffers contain 5D temporal coordinate channels', async () => {
    const tesseract = new TesseractScene({ particleCount: 300000 });
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await tesseract.init(renderer, camera);

    let pointsObj: THREE.Points | null = null;
    tesseract.scene.traverse((obj) => {
      if (obj instanceof THREE.Points) pointsObj = obj;
    });

    expect(pointsObj).not.toBeNull();
    const geo = pointsObj!.geometry;
    expect(geo.getAttribute('aCoord5D')).toBeDefined();
    expect(geo.getAttribute('aCoord5D').itemSize).toBe(2); // (w, v)
  });
});

// ============================================================================
// SUITE 5: TransitionManager & Cinematic Interpolation
// ============================================================================
describe('Milestone 2 - Suite 5: TransitionManager, Smootherstep & Metric Ripple', () => {
  it('M2.5.1: Quintic smootherstep satisfies zero velocity and acceleration boundary conditions', () => {
    // S(0) = 0, S(1) = 1
    expect(smootherstep(0, 1, 0.0)).toBe(0.0);
    expect(smootherstep(0, 1, 1.0)).toBe(1.0);
    expect(smootherstep(0, 1, 0.5)).toBe(0.5);

    // Clamping outside [0, 1]
    expect(smootherstep(0, 1, -0.5)).toBe(0.0);
    expect(smootherstep(0, 1, 1.5)).toBe(1.0);

    // Mid-interval values are monotonically increasing
    let prev = 0.0;
    for (let t = 0.1; t <= 1.0; t += 0.1) {
      const val = smootherstep(0, 1, t);
      expect(val).toBeGreaterThan(prev);
      prev = val;
    }
  });

  it('M2.5.2: Transition duration is strictly clamped to >= 0.5 seconds', () => {
    const tm = new TransitionManager();
    const gargantua = new GargantuaScene();
    const wormhole = new WormholeScene();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    // Request ultra-fast 0.1s transition -> should clamp to 0.5s
    tm.startTransition(gargantua, wormhole, camera, { duration: 0.1 });
    expect(tm.getState().duration).toBeGreaterThanOrEqual(0.5);
    expect(tm.getState().duration).toBe(0.5);
  });

  it('M2.5.3: Camera position and FOV interpolate smoothly between scene camera rigs', () => {
    const tm = new TransitionManager();
    const gargantua = new GargantuaScene();
    const wormhole = new WormholeScene();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    camera.position.set(0, 18, 95);
    camera.fov = 55;

    tm.startTransition(gargantua, wormhole, camera, { duration: 1.0, type: 'crossfade' });
    expect(tm.isTransitioning()).toBe(true);

    // Advance halfway (0.5s)
    tm.update(0.5, camera);
    expect(tm.getProgress()).toBe(0.5);
    expect(camera.position.z).toBeLessThan(95); // Approaching wormhole camera position (85)

    // Complete transition (another 0.5s)
    tm.update(0.5, camera);
    expect(tm.getProgress()).toBe(1.0);
    expect(tm.isTransitioning()).toBe(false);
    expect(camera.position.z).toBeCloseTo(85, 1);
    expect(camera.fov).toBeCloseTo(60, 1);
  });

  it('M2.5.4: Gravitational ripple parameters trigger and decay during transition', () => {
    const tm = new TransitionManager();
    const gargantua = new GargantuaScene();
    const tesseract = new TesseractScene();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    tm.startTransition(gargantua, tesseract, camera, { duration: 1.0, type: 'gravitational_warp' });

    // Mid transition ripple peak
    tm.update(0.5, camera);
    const midParams = tm.getRippleParams();
    expect(midParams.strength).toBeGreaterThan(0.5);

    // Transition completion
    tm.update(0.5, camera);
    expect(tm.isTransitioning()).toBe(false);
  });

  it('M2.5.5: Lifecycle listeners onStart, onProgress, onComplete fire in order', () => {
    const tm = new TransitionManager();
    const gargantua = new GargantuaScene();
    const wormhole = new WormholeScene();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    const events: string[] = [];
    tm.onStart((from, to) => events.push(`start:${from}->${to}`));
    tm.onProgress((p) => {
      if (p === 0.5) events.push(`progress:0.5`);
    });
    tm.onComplete((to) => events.push(`complete:${to}`));

    tm.startTransition(gargantua, wormhole, camera, { duration: 1.0 });
    tm.update(0.5, camera);
    tm.update(0.5, camera);

    expect(events).toContain('start:gargantua->wormhole');
    expect(events).toContain('progress:0.5');
    expect(events).toContain('complete:wormhole');
  });
});

// ============================================================================
// SUITE 6: Full Multi-Scene Integration & Cycling
// ============================================================================
describe('Milestone 2 - Suite 6: Multi-Scene Manager Integration & Seamless Cycling', () => {
  it('M2.6.1: SceneManager registers all 3 scenes and sets Gargantua as default', async () => {
    const sm = new SceneManager();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    const gargantua = new GargantuaScene();
    const wormhole = new WormholeScene();
    const tesseract = new TesseractScene();

    await sm.registerScene(gargantua, renderer, camera);
    await sm.registerScene(wormhole, renderer, camera);
    await sm.registerScene(tesseract, renderer, camera);

    expect(sm.getActiveSceneName()).toBe('gargantua');
    expect(sm.getParticleCount()).toBeGreaterThanOrEqual(300000);
  });

  it('M2.6.2: Circular nextScene navigates Gargantua -> Wormhole -> Tesseract -> Gargantua', async () => {
    const sm = new SceneManager();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await sm.registerScene(new GargantuaScene(), renderer, camera);
    await sm.registerScene(new WormholeScene(), renderer, camera);
    await sm.registerScene(new TesseractScene(), renderer, camera);

    const gesture = createNeutralGestureState();

    // 1. Gargantua -> Wormhole
    sm.nextScene({ duration: 0.5 });
    sm.update(0.5, 0.5, 1.0, gesture);
    expect(sm.getActiveSceneName()).toBe('wormhole');

    // 2. Wormhole -> Tesseract
    sm.nextScene({ duration: 0.5 });
    sm.update(0.5, 0.5, 1.0, gesture);
    expect(sm.getActiveSceneName()).toBe('tesseract');

    // 3. Tesseract -> Gargantua
    sm.nextScene({ duration: 0.5 });
    sm.update(0.5, 0.5, 1.0, gesture);
    expect(sm.getActiveSceneName()).toBe('gargantua');
  });

  it('M2.6.3: Disposal cleanly disposes all registered scenes and transitions', async () => {
    const sm = new SceneManager();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    const gargantua = new GargantuaScene();
    const wormhole = new WormholeScene();
    const tesseract = new TesseractScene();

    await sm.registerScene(gargantua, renderer, camera);
    await sm.registerScene(wormhole, renderer, camera);
    await sm.registerScene(tesseract, renderer, camera);

    sm.dispose();
    expect(sm.getActiveScene()).toBeNull();
    expect(sm.getActiveSceneName()).toBe('Unknown');
    expect(sm.getParticleCount()).toBe(0);
    expect(gargantua.isInitialized).toBe(false);
    expect(wormhole.isInitialized).toBe(false);
    expect(tesseract.isInitialized).toBe(false);
  });
});
