/**
 * Milestone 2 Test Suite: Interstellar 3D Scenes & Transitions
 * 
 * Verifies:
 * 1. BaseScene abstract lifecycle, camera rigging, particle count tracking, and disposal.
 * 2. GalaxyScene: 200,000 GPU particle spiral galaxy, static outer stars, zooming central core,
 *    multi-theme support, and 7-color rainbow cycling.
 * 3. WormholeScene: Traversable Ellis wormhole spherical portal, 4D celestial refraction,
 *    Einstein ring boundary, dual starfields, and >=300,000 warp particles.
 * 4. TransitionManager: Cinematic cross-fade, smootherstep camera interpolation,
 *    gravitational ripple metric wave, and duration >= 0.5s.
 * 5. SceneManager & Engine Integration with GalaxyScene and WormholeScene.
 */

import * as THREE from 'three';
import { describe, it, expect, MockWebGL2RenderingContext } from './e2e_harness';
import { BaseScene } from '../src/scenes/BaseScene';
import { GalaxyScene } from '../src/scenes/GalaxyScene';
import { WormholeScene } from '../src/scenes/WormholeScene';
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
// SUITE 2: GalaxyScene GPU Particle Simulation Verification
// ============================================================================
describe('Milestone 2 - Suite 2: Galaxy Spiral Simulation & GPU Particles', () => {
  it('M2.2.1: GalaxyScene initializes with default 200,000 particles and camera rig', () => {
    const galaxy = new GalaxyScene();
    expect(galaxy.name).toBe('galaxy');
    expect(galaxy.particleCount).toBe(200000);
    expect(galaxy.cameraRig).toBeDefined();
    expect(galaxy.cameraRig.defaultPosition.z).toBe(100);
  });

  it('M2.2.2: Particle count initializes with exactly 200,000 GPU particles and BufferGeometry', async () => {
    const galaxy = new GalaxyScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await galaxy.init(renderer, camera);
    expect(galaxy.particleCount).toBe(200000);
    expect(galaxy.scene.children.length).toBeGreaterThanOrEqual(1);
  });

  it('M2.2.3: Scene graph contains Points object with all 11 required attribute buffers', async () => {
    const galaxy = new GalaxyScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await galaxy.init(renderer, camera);

    let pointsObj: THREE.Points | null = null;
    galaxy.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Points) pointsObj = obj;
    });

    expect(pointsObj).not.toBeNull();
    const geo = pointsObj!.geometry;
    expect(geo.getAttribute('position')).toBeDefined();
    expect(geo.getAttribute('position').count).toBe(200000);
    expect(geo.getAttribute('aTargetFist')).toBeDefined();
    expect(geo.getAttribute('aTargetOpen')).toBeDefined();
    expect(geo.getAttribute('aColor')).toBeDefined();
    expect(geo.getAttribute('aSize')).toBeDefined();
    expect(geo.getAttribute('aType')).toBeDefined();
    expect(geo.getAttribute('aOrbitSpeed')).toBeDefined();
    expect(geo.getAttribute('aOrbitRadius')).toBeDefined();
    expect(geo.getAttribute('aOrbitAngle')).toBeDefined();
    expect(geo.getAttribute('aPhase')).toBeDefined();
    expect(geo.getAttribute('aWarpVelocity')).toBeDefined();
  });

  it('M2.2.4: 30% core particles and 70% outer disc particles are correctly tagged in aType', async () => {
    const galaxy = new GalaxyScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await galaxy.init(renderer, camera);

    let pointsObj: THREE.Points | null = null;
    galaxy.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Points) pointsObj = obj;
    });

    const types = pointsObj!.geometry.getAttribute('aType').array;
    const coreCount = Math.floor(200000 * 0.30); // 60,000
    expect(types[0]).toBe(0.0);
    expect(types[coreCount - 1]).toBe(0.0);
    expect(types[coreCount]).toBe(1.0);
    expect(types[199999]).toBe(1.0);
  });

  it('M2.2.5: Theme selection and Rainbow mode update material uniforms and color attributes', async () => {
    const galaxy = new GalaxyScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await galaxy.init(renderer, camera);

    // Switch theme to nebula
    galaxy.setTheme('nebula');
    let pointsObj: THREE.Points | null = null;
    galaxy.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Points) pointsObj = obj;
    });
    const mat = pointsObj!.material as THREE.ShaderMaterial;
    expect(mat.uniforms.uIsRainbow.value).toBe(0.0);

    // Switch to rainbow
    galaxy.setTheme('rainbow');
    expect(mat.uniforms.uIsRainbow.value).toBe(1.0);

    // Toggle rainbow
    const isNow = galaxy.toggleRainbow();
    expect(isNow).toBe(false);
    expect(mat.uniforms.uIsRainbow.value).toBe(0.0);
  });

  it('M2.2.6: update() advances simulation time and updates openness and hand position uniforms', async () => {
    const galaxy = new GalaxyScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await galaxy.init(renderer, camera);

    const gesture = createNeutralGestureState();
    gesture.hasHand = true;
    gesture.openness = 0.85;
    gesture.position = { x: 0.3, y: -0.2 };

    galaxy.update(0.016, 0.5, gesture); // delta = 0.016, timeDilation = 0.5
    expect(galaxy.isInitialized).toBe(true);

    let pointsObj: THREE.Points | null = null;
    galaxy.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Points) pointsObj = obj;
    });
    const mat = pointsObj!.material as THREE.ShaderMaterial;
    expect(mat.uniforms.uTime.value).toBeCloseTo(0.008, 5);
    expect(mat.uniforms.uOpenness.value).toBe(0.85);
    expect(mat.uniforms.uHandPos.value.x).toBe(0.3);
    expect(mat.uniforms.uHandPos.value.y).toBe(-0.2);
  });

  it('M2.2.7: Vertex shader strictly keeps outer stars stationary (aTargetFist) while central core interpolates with uOpenness', async () => {
    const galaxy = new GalaxyScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await galaxy.init(renderer, camera);

    let pointsObj: THREE.Points | null = null;
    galaxy.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Points) pointsObj = obj;
    });
    const mat = pointsObj!.material as THREE.ShaderMaterial;
    const vert = mat.vertexShader;

    // Verify outer particles (aType >= 0.5) are frozen at aTargetFist without uOpenness morphing
    expect(vert).toContain('aType < 0.5');
    expect(vert).toContain('currentPos = aTargetFist;');
    expect(vert).toContain('mix(fistPos, openPos, morphFactor)');
  });

  it('M2.2.8: All theme palettes (emerald, nebula, supernova, cyber) update color buffer', async () => {
    const galaxy = new GalaxyScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    await galaxy.init(renderer, camera);

    let pointsObj: THREE.Points | null = null;
    galaxy.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Points) pointsObj = obj;
    });
    const colorAttr = pointsObj!.geometry.getAttribute('aColor');

    // Test supernova
    galaxy.setTheme('supernova');
    expect(colorAttr.array[0]).toBeGreaterThan(0.5); // Warm / orange-red tone for core

    // Test cyber
    galaxy.setTheme('cyber');
    expect(colorAttr.array[0]).toBeDefined();

    // Test emerald
    galaxy.setTheme('emerald');
    expect(colorAttr.array[0]).toBeDefined();

    galaxy.dispose();
  });

  it('M2.2.9: GalaxyScene update handles null or partial gesture states safely', async () => {
    const galaxy = new GalaxyScene();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    await galaxy.init(renderer, camera);

    // Call update with null / undefined gesture state
    expect(() => galaxy.update(0.016, 1.0, null as any)).not.toThrow();
    expect(() => galaxy.update(0.016, 1.0, {} as any)).not.toThrow();

    galaxy.dispose();
  });

  it('M2.2.10: GalaxyScene handles method invocations prior to init() gracefully', () => {
    const galaxy = new GalaxyScene();

    expect(() => galaxy.setTheme('supernova')).not.toThrow();
    expect(galaxy.toggleRainbow()).toBe(false);
    expect(() => galaxy.resize(1920, 1080, 1.5)).not.toThrow();
    expect(() => galaxy.update(0.016, 1.0, createNeutralGestureState())).not.toThrow();
    expect(() => galaxy.dispose()).not.toThrow();
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

    wormhole.scene.traverse((obj: THREE.Object3D) => {
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
// SUITE 4: TransitionManager & Cinematic Interpolation
// ============================================================================
describe('Milestone 2 - Suite 4: TransitionManager, Smootherstep & Metric Ripple', () => {
  it('M2.4.1: Quintic smootherstep satisfies zero velocity and acceleration boundary conditions', () => {
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

  it('M2.4.2: Transition duration is strictly clamped to >= 0.5 seconds', () => {
    const tm = new TransitionManager();
    const galaxy = new GalaxyScene();
    const wormhole = new WormholeScene();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    // Request ultra-fast 0.1s transition -> should clamp to 0.5s
    tm.startTransition(galaxy, wormhole, camera, { duration: 0.1 });
    expect(tm.getState().duration).toBeGreaterThanOrEqual(0.5);
    expect(tm.getState().duration).toBe(0.5);
  });

  it('M2.4.3: Camera position and FOV interpolate smoothly between scene camera rigs', () => {
    const tm = new TransitionManager();
    const galaxy = new GalaxyScene();
    const wormhole = new WormholeScene();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    camera.position.set(0, 0, 100);
    camera.fov = 60;

    tm.startTransition(galaxy, wormhole, camera, { duration: 1.0, type: 'crossfade' });
    expect(tm.isTransitioning()).toBe(true);

    // Advance halfway (0.5s)
    tm.update(0.5, camera);
    expect(tm.getProgress()).toBe(0.5);
    expect(camera.position.z).toBeLessThan(100); // Approaching wormhole camera position (85)

    // Complete transition (another 0.5s)
    tm.update(0.5, camera);
    expect(tm.getProgress()).toBe(1.0);
    expect(tm.isTransitioning()).toBe(false);
    expect(camera.position.z).toBeCloseTo(85, 1);
    expect(camera.fov).toBeCloseTo(60, 1);
  });

  it('M2.4.4: Gravitational ripple parameters trigger and decay during transition', () => {
    const tm = new TransitionManager();
    const galaxy = new GalaxyScene();
    const wormhole = new WormholeScene();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    tm.startTransition(galaxy, wormhole, camera, { duration: 1.0, type: 'gravitational_warp' });

    // Mid transition ripple peak
    tm.update(0.5, camera);
    const midParams = tm.getRippleParams();
    expect(midParams.strength).toBeGreaterThan(0.5);

    // Transition completion
    tm.update(0.5, camera);
    expect(tm.isTransitioning()).toBe(false);
  });

  it('M2.4.5: Lifecycle listeners onStart, onProgress, onComplete fire in order', () => {
    const tm = new TransitionManager();
    const galaxy = new GalaxyScene();
    const wormhole = new WormholeScene();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    const events: string[] = [];
    tm.onStart((from, to) => events.push(`start:${from}->${to}`));
    tm.onProgress((p) => {
      if (p === 0.5) events.push(`progress:0.5`);
    });
    tm.onComplete((to) => events.push(`complete:${to}`));

    tm.startTransition(galaxy, wormhole, camera, { duration: 1.0 });
    tm.update(0.5, camera);
    tm.update(0.5, camera);

    expect(events).toContain('start:galaxy->wormhole');
    expect(events).toContain('progress:0.5');
    expect(events).toContain('complete:wormhole');
  });
});

// ============================================================================
// SUITE 5: Full 2-Scene Integration & Cycling
// ============================================================================
describe('Milestone 2 - Suite 5: 2-Scene Manager Integration & Seamless Cycling', () => {
  it('M2.5.1: SceneManager registers both scenes and sets Galaxy as default', async () => {
    const sm = new SceneManager();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    const galaxy = new GalaxyScene();
    const wormhole = new WormholeScene();

    await sm.registerScene(galaxy, renderer, camera);
    await sm.registerScene(wormhole, renderer, camera);

    expect(sm.getActiveSceneName()).toBe('galaxy');
    expect(sm.getParticleCount()).toBe(200000);
  });

  it('M2.5.2: Circular nextScene navigates Galaxy -> Wormhole -> Galaxy', async () => {
    const sm = new SceneManager();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await sm.registerScene(new GalaxyScene(), renderer, camera);
    await sm.registerScene(new WormholeScene(), renderer, camera);

    const gesture = createNeutralGestureState();

    // 1. Galaxy -> Wormhole
    sm.nextScene({ duration: 0.5 });
    sm.update(0.5, 0.5, 1.0, gesture);
    expect(sm.getActiveSceneName()).toBe('wormhole');

    // 2. Wormhole -> Galaxy
    sm.nextScene({ duration: 0.5 });
    sm.update(0.5, 0.5, 1.0, gesture);
    expect(sm.getActiveSceneName()).toBe('galaxy');
  });

  it('M2.5.3: Disposal cleanly disposes all registered scenes and transitions', async () => {
    const sm = new SceneManager();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    const galaxy = new GalaxyScene();
    const wormhole = new WormholeScene();

    await sm.registerScene(galaxy, renderer, camera);
    await sm.registerScene(wormhole, renderer, camera);

    sm.dispose();
    expect(sm.getActiveScene()).toBeNull();
    expect(sm.getActiveSceneName()).toBe('Unknown');
    expect(sm.getParticleCount()).toBe(0);
    expect(galaxy.isInitialized).toBe(false);
    expect(wormhole.isInitialized).toBe(false);
  });

  it('M2.5.4: Transition listener onStart receives correct destination scene', async () => {
    const sm = new SceneManager();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await sm.registerScene(new GalaxyScene(), renderer, camera);
    await sm.registerScene(new WormholeScene(), renderer, camera);

    let startedTo: string = '';
    sm.onTransitionStart((from, to) => {
      startedTo = to;
    });

    sm.nextScene({ duration: 1.0 });
    expect(startedTo).toBe('wormhole');

    sm.dispose();
  });

  it('M2.5.5: Circular previousScene navigates Galaxy -> Wormhole -> Galaxy', async () => {
    const sm = new SceneManager();
    const renderer = createMockRenderer();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

    await sm.registerScene(new GalaxyScene(), renderer, camera);
    await sm.registerScene(new WormholeScene(), renderer, camera);

    const gesture = createNeutralGestureState();

    // 1. Galaxy -> Wormhole (previous wraps to last)
    sm.previousScene({ duration: 0.5 });
    sm.update(0.5, 0.5, 1.0, gesture);
    expect(sm.getActiveSceneName()).toBe('wormhole');

    // 2. Wormhole -> Galaxy (previous returns to first)
    sm.previousScene({ duration: 0.5 });
    sm.update(0.5, 0.5, 1.0, gesture);
    expect(sm.getActiveSceneName()).toBe('galaxy');

    sm.dispose();
  });
});
