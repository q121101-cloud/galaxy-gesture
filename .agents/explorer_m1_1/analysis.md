# Architectural Analysis & Blueprints: Core Engine & Foundation (Milestone 1)

## 1. Executive Summary & Scope Overview

The **Core Foundation** of the *Interstellar Gesture Experience* establishes the central backbone for all graphical simulation, physics updates, scene transitions, gesture navigation, and telemetry broadcasting.

To fulfill Christopher Nolan's cinematic standard alongside smooth real-time hand tracking, the engine architecture strictly enforces:
1. **Temporal Decoupling**: Separation between **Physical World Time** ($\tau$-dilated for particle physics and accretion disk simulation) and **Interface/Interaction Time** (un-dilated for responsive camera damping, gestures, and UI telemetry).
2. **Spring-Damped Stability**: Harmonic damping across camera orientation and zoom parameters to eliminate tracking jitter from webcam landmarks.
3. **Zero-Flicker Scene Lifecycles**: Strict lifecycle contracts (`IScene`) supporting hot-swapping and seamless $\ge 0.5$s cross-scene transitions.
4. **High-Performance WebGL2 Pipeline**: Clamped DPR (1.5x on high-DPI displays), `ACESFilmicToneMapping`, non-allocating render loops, and full GPU memory cleanup.

---

## 2. Strict Type System Specifications (`src/core/types.ts`)

The type system must strictly cover all modules (Core, Scenes, Gestures, Audio, Shaders, UI).

```typescript
import * as THREE from 'three';

/**
 * Common 3D Vector interface for lightweight transfers
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Rotational orientation in Euler radians
 */
export interface RotationEuler {
  yaw: number;   // Radians around Y-axis (tilt left/right)
  pitch: number; // Radians around X-axis (tilt up/down)
  roll: number;  // Radians around Z-axis (hand bank)
}

/**
 * Normalized 3D Hand Landmark from MediaPipe
 */
export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Real-time gesture state produced by GestureRecognizer
 */
export interface GestureState {
  /** Whether at least one valid hand is currently tracked */
  hasHand: boolean;
  /** Hand openness scalar [0.0 = clutched fist, 1.0 = wide open palm] */
  openness: number;
  /** Distance between thumb and index finger tip [0.0 = pinch closed, 1.0 = wide apart] */
  pinchDistance: number;
  /** Relativistic time dilation scalar multiplier \tau \in [0.1, 1.0] */
  timeDilation: number;
  /** Spring-damped 3D palm plane orientation in radians */
  rotation: RotationEuler;
  /** Normalized hand position offset from viewport center [-1.0, 1.0] */
  position: { x: number; y: number };
  /** Camera zoom delta driven by hand scale/distance */
  zoomDelta: number;
  /** Discrete swipe gesture event trigger ('left' | 'right' | null) */
  swipeTriggered: 'left' | 'right' | null;
  /** Composite gesture kinetic energy / motion magnitude [0.0, 1.0] */
  intensity: number;
  /** 21 raw MediaPipe 3D landmarks or null if undetected */
  rawLandmarks: HandLandmark[] | null;
}

/**
 * High-performance scene interface
 */
export interface IScene {
  /** Unique scene identifier (e.g. 'gargantua', 'wormhole', 'tesseract') */
  readonly name: string;
  /** Number of active GPU particles rendered in this scene (e.g. >= 300,000) */
  readonly particleCount: number;
  /** Underlying Three.js scene graph */
  readonly scene: THREE.Scene;
  /** Optional scene-specific camera, defaults to engine camera if omitted */
  readonly camera?: THREE.PerspectiveCamera;

  /** Initialize scene assets, geometries, materials, and GPU buffers */
  init(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): Promise<void> | void;
  /** Per-frame update pass for physics, shaders, and particle dynamics */
  update(delta: number, timeDilation: number, gestureState: GestureState): void;
  /** Render pass executed by Engine or PostProcessing pipeline */
  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  /** Invoked when this scene becomes active */
  onEnter(previousSceneName?: string): void;
  /** Invoked when navigating away from this scene */
  onExit(nextSceneName?: string): void;
  /** Clean up all GPU buffers, textures, materials, and geometries */
  dispose(): void;
  /** Handle viewport dimensions and aspect ratio update */
  resize?(width: number, height: number, pixelRatio: number): void;
}

/**
 * Real-time telemetry broadcasted to Glassmorphic HUD
 */
export interface HUDTelemetry {
  currentScene: string;
  fps: number;
  frameTimeMs: number;
  particleCount: number;
  gestureName: string;
  timeDilation: number;
  isRecording: boolean;
  hudVisible: boolean;
  handDetected: boolean;
  handOpenness: number;
  handPitch: number;
  handRoll: number;
  zoomLevel: number;
  latencyMs: number;
}

/**
 * Procedural Web Audio Engine Interface
 */
export interface IAudioEngine {
  init(): Promise<void>;
  setScene(sceneName: string, transitionDuration?: number): void;
  updateGestureModulation(gestureState: GestureState): void;
  setMuted(muted: boolean): void;
  getMediaStreamDestination(): MediaStreamDestinationNode | null;
  dispose(): void;
}

/**
 * Transition specification between scenes
 */
export type SceneTransitionType = 'crossfade' | 'gravitational_warp' | 'particle_morph';

export interface TransitionConfig {
  duration: number; // in seconds (must be >= 0.5s)
  type: SceneTransitionType;
  easing?: (t: number) => number;
}

export interface SceneTransitionState {
  isTransitioning: boolean;
  fromScene: string | null;
  toScene: string | null;
  progress: number; // [0.0, 1.0]
  duration: number;
  elapsed: number;
  type: SceneTransitionType;
}

/**
 * Configuration options for Application Engine
 */
export interface EngineConfig {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
  powerPreference?: 'high-performance' | 'default' | 'low-power';
  maxPixelRatio?: number;
  toneMapping?: THREE.ToneMapping;
  toneMappingExposure?: number;
  enablePostProcessing?: boolean;
  clearColor?: number;
  clearAlpha?: number;
}

/**
 * Configuration options for Camera Controller
 */
export interface CameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  initialPosition?: THREE.Vector3;
  initialTarget?: THREE.Vector3;
  dampingFactor?: number;
  minDistance?: number;
  maxDistance?: number;
  pitchLimit?: number; // max pitch radians
  yawLimit?: number;   // max yaw radians
}

/**
 * Common Uniforms passed into all custom shaders
 */
export interface CommonShaderUniforms {
  uTime: { value: number };
  uDeltaTime: { value: number };
  uResolution: { value: THREE.Vector2 };
  uCameraPosition: { value: THREE.Vector3 };
  uTimeDilation: { value: number };
}
```

---

## 3. Temporal Dynamics & Time Manager (`src/core/TimeManager.ts`)

### Mathematical Specification
1. **Delta Time Clamping**:
   $$dt_{\text{raw}} = \min(t_{\text{current}} - t_{\text{prev}}, dt_{\text{max}})$$
   where $dt_{\text{max}} = 0.1\text{s}$ (100ms) prevents unbounded physics explosions on tab switching.

2. **Relativistic Time Dilation ($\tau$)**:
   $$\tau \in [0.1, 1.0]$$
   When the user pinches fingers, $\tau \to 0.1$ (10x slow-motion). When hands release, $\tau \to 1.0$ (standard relativistic speed).
   Smooth exponential interpolation of target dilation:
   $$\tau_{t} = \tau_{t-1} + (\tau_{\text{target}} - \tau_{t-1}) \cdot (1 - e^{-\lambda \cdot dt_{\text{raw}}})$$
   where $\lambda = 8.0\text{ s}^{-1}$ ensures a silky, organic transition without abrupt velocity spikes.

3. **Scaled Delta Calculation**:
   $$dt_{\text{scaled}} = dt_{\text{raw}} \cdot \tau_{t}$$

4. **Dual Running Clocks**:
   - $T_{\text{raw}} = \sum dt_{\text{raw}}$: Used for camera spring dampening, UI transitions, audio scheduler, and HUD frame rates.
   - $T_{\text{scaled}} = \sum dt_{\text{scaled}}$: Passed to GLSL uniforms and GPU particle integrators so physics trajectories slow down.

5. **Rolling FPS & Frame Timing**:
   Sliding window of frame times over 0.25-second epochs for zero-overhead, stable FPS telemetry.

### Complete Blueprint

```typescript
export interface TimeState {
  rawDelta: number;
  scaledDelta: number;
  rawTime: number;
  scaledTime: number;
  timeDilation: number;
  fps: number;
  frameTimeMs: number;
}

export class TimeManager {
  private rawElapsedTime: number = 0;
  private scaledElapsedTime: number = 0;
  private lastTimestamp: number = 0;
  private currentDilation: number = 1.0;
  private targetDilation: number = 1.0;
  private readonly maxDelta: number = 0.1; // 100ms max cap
  private readonly dilationDamping: number = 8.0;

  // FPS Telemetry Tracking
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  private currentFrameTimeMs: number = 16.67;

  constructor() {
    this.lastTimestamp = typeof performance !== 'undefined' ? performance.now() : 0;
  }

  /**
   * Update time manager per animation frame
   * @param targetTimeDilation Optional instantaneous dilation target from GestureState [0.1, 1.0]
   * @param nowTimestamp Optional timestamp override for deterministic tests
   */
  public update(targetTimeDilation?: number, nowTimestamp?: number): TimeState {
    const now = nowTimestamp !== undefined ? nowTimestamp : (typeof performance !== 'undefined' ? performance.now() : Date.now());
    
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = now;
    }

    // 1. Raw delta in seconds
    let rawDelta = (now - this.lastTimestamp) / 1000.0;
    if (rawDelta < 0) rawDelta = 0.016; // guard against clock jitter
    rawDelta = Math.min(rawDelta, this.maxDelta);
    this.lastTimestamp = now;

    // 2. Smooth exponential decay of time dilation
    if (targetTimeDilation !== undefined) {
      this.targetDilation = Math.max(0.1, Math.min(1.0, targetTimeDilation));
    }
    const dampFactor = 1.0 - Math.exp(-this.dilationDamping * rawDelta);
    this.currentDilation += (this.targetDilation - this.currentDilation) * dampFactor;
    this.currentDilation = Math.max(0.1, Math.min(1.0, this.currentDilation));

    // 3. Dilated delta calculation
    const scaledDelta = rawDelta * this.currentDilation;

    // 4. Clocks accumulation
    this.rawElapsedTime += rawDelta;
    this.scaledElapsedTime += scaledDelta;

    // 5. FPS & Telemetry
    this.frameCount++;
    this.currentFrameTimeMs = rawDelta * 1000.0;
    if (this.rawElapsedTime - this.lastFpsUpdate >= 0.25) {
      this.currentFps = Math.round(this.frameCount / (this.rawElapsedTime - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = this.rawElapsedTime;
    }

    return {
      rawDelta,
      scaledDelta,
      rawTime: this.rawElapsedTime,
      scaledTime: this.scaledElapsedTime,
      timeDilation: this.currentDilation,
      fps: this.currentFps,
      frameTimeMs: this.currentFrameTimeMs,
    };
  }

  public setTimeDilationTarget(target: number): void {
    this.targetDilation = Math.max(0.1, Math.min(1.0, target));
  }

  public getTimeDilation(): number {
    return this.currentDilation;
  }

  public getRawDelta(): number {
    return this.currentFrameTimeMs / 1000.0;
  }

  public getRawTime(): number {
    return this.rawElapsedTime;
  }

  public getScaledTime(): number {
    return this.scaledElapsedTime;
  }

  public getFps(): number {
    return this.currentFps;
  }

  public getFrameTimeMs(): number {
    return this.currentFrameTimeMs;
  }

  public reset(): void {
    this.rawElapsedTime = 0;
    this.scaledElapsedTime = 0;
    this.lastTimestamp = typeof performance !== 'undefined' ? performance.now() : 0;
    this.currentDilation = 1.0;
    this.targetDilation = 1.0;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
  }
}
```

---

## 4. Cinematic Camera Controller (`src/core/CameraController.ts`)

### Mathematical Specification
1. **Spring-Damped 3D Tracking**:
   Orientation and offsets use 2nd-order critically damped filters:
   $$\vec{X}_{t} = \vec{X}_{t-1} + (\vec{X}_{\text{target}} - \vec{X}_{t-1}) \cdot (1 - e^{-k \cdot dt_{\text{raw}}})$$
   where $k_{\text{cam}} = 5.0\text{ s}^{-1}$ for smooth tracking with zero overshoot.

2. **Hand Gesture to Camera Mapping**:
   - **Hand Roll / Tilt ($\text{yaw}$)**: $\Delta \theta = \text{rotation.yaw} \cdot \theta_{\text{max}}$ (rotates camera around origin in azimuth).
   - **Hand Pitch ($\text{pitch}$)**: $\Delta \phi = \text{rotation.pitch} \cdot \phi_{\text{max}}$ (tilts camera elevation between $[-45^\circ, +45^\circ]$).
   - **Hand Openness / Fist**:
     $$d_{\text{zoom}} = d_{\text{base}} - (\text{openness} - 0.5) \cdot 80.0 - \text{zoomDelta} \cdot 120.0$$
     clamped to $[d_{\text{min}}, d_{\text{max}}]$.

3. **Impulse Gravitational Shake**:
   Decaying gravitational wave shake when passing event horizon or during black hole warp:
   $$\vec{S}_{t} = \vec{S}_{t-1} \cdot e^{-\gamma \cdot dt_{\text{raw}}} + A \cdot [\sin(\omega_1 t), \cos(\omega_2 t), 0]$$

### Complete Blueprint

```typescript
import * as THREE from 'three';
import { CameraConfig, GestureState } from './types';

export class CameraController {
  public readonly camera: THREE.PerspectiveCamera;
  private readonly initialPosition: THREE.Vector3;
  private readonly targetLookAt: THREE.Vector3;
  private readonly currentLookAt: THREE.Vector3;

  // Smoothed camera transform states
  private currentPos: THREE.Vector3;
  private targetPos: THREE.Vector3;
  private currentYaw: number = 0;
  private currentPitch: number = 0;
  private targetYaw: number = 0;
  private targetPitch: number = 0;
  private currentDistance: number = 250;
  private baseDistance: number = 250;

  // Damping configuration
  private readonly dampingFactor: number;
  private readonly minDistance: number;
  private readonly maxDistance: number;
  private readonly pitchLimit: number;
  private readonly yawLimit: number;

  // Shake / Gravitational wave impulse
  private shakeIntensity: number = 0;
  private readonly shakeDecay: number = 5.0;

  constructor(config?: CameraConfig) {
    const fov = config?.fov ?? 60;
    const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16 / 9;
    const near = config?.near ?? 1.0;
    const far = config?.far ?? 3000.0;

    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.initialPosition = config?.initialPosition?.clone() ?? new THREE.Vector3(0, 40, 250);
    this.targetLookAt = config?.initialTarget?.clone() ?? new THREE.Vector3(0, 0, 0);
    this.currentLookAt = this.targetLookAt.clone();

    this.currentPos = this.initialPosition.clone();
    this.targetPos = this.initialPosition.clone();
    this.baseDistance = this.initialPosition.length();
    this.currentDistance = this.baseDistance;

    this.dampingFactor = config?.dampingFactor ?? 5.5;
    this.minDistance = config?.minDistance ?? 40.0;
    this.maxDistance = config?.maxDistance ?? 700.0;
    this.pitchLimit = config?.pitchLimit ?? (Math.PI / 4.0); // +/- 45 deg
    this.yawLimit = config?.yawLimit ?? (Math.PI / 3.0);     // +/- 60 deg

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Update camera physics using unscaled raw delta time
   */
  public update(rawDelta: number, gestureState?: GestureState): void {
    if (gestureState && (gestureState.hasHand || gestureState.intensity > 0)) {
      // 1. Map gesture orientation
      this.targetYaw = Math.max(-this.yawLimit, Math.min(this.yawLimit, gestureState.rotation.yaw * 1.2));
      this.targetPitch = Math.max(-this.pitchLimit, Math.min(this.pitchLimit, gestureState.rotation.pitch * 1.0));

      // 2. Map openness & scale to zoom distance
      const zoomOffset = -(gestureState.openness - 0.5) * 70.0 - gestureState.zoomDelta * 90.0;
      const targetDist = Math.max(this.minDistance, Math.min(this.maxDistance, this.baseDistance + zoomOffset));
      this.currentDistance += (targetDist - this.currentDistance) * (1.0 - Math.exp(-this.dampingFactor * rawDelta));

      // 3. Compute spherical target position
      const cx = this.currentDistance * Math.sin(this.targetYaw) * Math.cos(this.targetPitch);
      const cy = 40.0 + this.currentDistance * Math.sin(this.targetPitch) - gestureState.position.y * 20.0;
      const cz = this.currentDistance * Math.cos(this.targetYaw) * Math.cos(this.targetPitch);

      this.targetPos.set(cx, cy, cz);
    } else {
      // Return gently to default home position
      this.targetYaw = 0;
      this.targetPitch = 0;
      this.targetPos.copy(this.initialPosition);
      this.currentDistance += (this.baseDistance - this.currentDistance) * (1.0 - Math.exp(-this.dampingFactor * rawDelta));
    }

    // 4. Smooth exponential position damping
    const damp = 1.0 - Math.exp(-this.dampingFactor * rawDelta);
    this.currentPos.lerp(this.targetPos, damp);

    // 5. Apply impulse shake if active
    if (this.shakeIntensity > 0.001) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity * 4.0;
      const sy = (Math.random() - 0.5) * this.shakeIntensity * 4.0;
      const sz = (Math.random() - 0.5) * this.shakeIntensity * 4.0;
      this.camera.position.set(this.currentPos.x + sx, this.currentPos.y + sy, this.currentPos.z + sz);
      this.shakeIntensity *= Math.exp(-this.shakeDecay * rawDelta);
    } else {
      this.camera.position.copy(this.currentPos);
      this.shakeIntensity = 0;
    }

    // 6. LookAt damping
    this.currentLookAt.lerp(this.targetLookAt, damp);
    this.camera.lookAt(this.currentLookAt);
  }

  public triggerImpulseShake(intensity: number = 1.0): void {
    this.shakeIntensity = Math.min(intensity, 5.0);
  }

  public setLookAtTarget(target: THREE.Vector3): void {
    this.targetLookAt.copy(target);
  }

  public updateAspect(width: number, height: number): void {
    if (height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public reset(): void {
    this.currentPos.copy(this.initialPosition);
    this.targetPos.copy(this.initialPosition);
    this.currentLookAt.copy(this.targetLookAt);
    this.currentYaw = 0;
    this.currentPitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.shakeIntensity = 0;
    this.camera.position.copy(this.initialPosition);
    this.camera.lookAt(this.targetLookAt);
  }
}
```

---

## 5. Scene Lifecycle & Cross-Scene Transition Manager (`src/core/SceneManager.ts`)

### Lifecycle & State Machine Architecture
- **Scene Storage**: `Map<string, IScene>`
- **Active Scene**: Currently active interactive scene.
- **Transition Orchestrator**: Manages state transitions with duration $\ge 0.5\text{s}$ (default 1.0s).
- **Graceful Lifecycle Invocations**:
  1. `scene.init(renderer, camera)` called on registration.
  2. `scene.onEnter(prevScene)` called upon transition start.
  3. `scene.update(scaledDelta, timeDilation, gesture)` called each frame.
  4. `scene.render(renderer, camera)` invoked per frame.
  5. `scene.onExit(nextScene)` called when switching away.
  6. `scene.dispose()` invoked on teardown.

### Complete Blueprint

```typescript
import * as THREE from 'three';
import { IScene, GestureState, SceneTransitionState, TransitionConfig } from './types';

export type TransitionCallback = (progress: number, fromScene: string, toScene: string) => void;

export class SceneManager {
  private scenes: Map<string, IScene> = new Map();
  private sceneOrder: string[] = [];
  private activeScene: IScene | null = null;

  // Transition state
  private transitionState: SceneTransitionState = {
    isTransitioning: false,
    fromScene: null,
    toScene: null,
    progress: 1.0,
    duration: 1.0,
    elapsed: 0,
    type: 'crossfade',
  };

  private onTransitionStartListeners: Array<(from: string, to: string) => void> = [];
  private onTransitionProgressListeners: TransitionCallback[] = [];
  private onTransitionCompleteListeners: Array<(to: string) => void> = [];

  constructor() {}

  /**
   * Register a scene into the manager
   */
  public async registerScene(scene: IScene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): Promise<void> {
    if (this.scenes.has(scene.name)) {
      console.warn(`[SceneManager] Scene '${scene.name}' already registered. Overwriting.`);
    }
    this.scenes.set(scene.name, scene);
    if (!this.sceneOrder.includes(scene.name)) {
      this.sceneOrder.push(scene.name);
    }
    await scene.init(renderer, camera);

    // If first scene registered, activate immediately
    if (!this.activeScene) {
      this.activeScene = scene;
      scene.onEnter();
    }
  }

  /**
   * Switch active scene with cinematic transition
   */
  public switchTo(sceneName: string, config?: Partial<TransitionConfig>): boolean {
    if (!this.scenes.has(sceneName)) {
      console.error(`[SceneManager] Cannot switch to non-existent scene '${sceneName}'`);
      return false;
    }

    if (this.activeScene && this.activeScene.name === sceneName && !this.transitionState.isTransitioning) {
      return true; // Already active
    }

    const fromSceneName = this.activeScene ? this.activeScene.name : null;
    const toScene = this.scenes.get(sceneName)!;
    const duration = Math.max(0.5, config?.duration ?? 1.0); // Enforce >= 0.5s requirement
    const type = config?.type ?? 'crossfade';

    if (this.activeScene) {
      this.activeScene.onExit(sceneName);
    }

    toScene.onEnter(fromSceneName ?? undefined);

    this.transitionState = {
      isTransitioning: true,
      fromScene: fromSceneName,
      toScene: sceneName,
      progress: 0.0,
      duration,
      elapsed: 0.0,
      type,
    };

    this.onTransitionStartListeners.forEach((cb) => cb(fromSceneName ?? '', sceneName));
    return true;
  }

  /**
   * Navigate circularly to next scene
   */
  public nextScene(config?: Partial<TransitionConfig>): boolean {
    if (this.sceneOrder.length < 2) return false;
    const currentIndex = this.activeScene ? this.sceneOrder.indexOf(this.activeScene.name) : -1;
    const nextIndex = (currentIndex + 1) % this.sceneOrder.length;
    return this.switchTo(this.sceneOrder[nextIndex], config);
  }

  /**
   * Navigate circularly to previous scene
   */
  public previousScene(config?: Partial<TransitionConfig>): boolean {
    if (this.sceneOrder.length < 2) return false;
    const currentIndex = this.activeScene ? this.sceneOrder.indexOf(this.activeScene.name) : 0;
    const prevIndex = (currentIndex - 1 + this.sceneOrder.length) % this.sceneOrder.length;
    return this.switchTo(this.sceneOrder[prevIndex], config);
  }

  /**
   * Update all active / transitioning scenes
   */
  public update(scaledDelta: number, rawDelta: number, timeDilation: number, gestureState: GestureState): void {
    // 1. Advance transition state using raw unscaled delta so transitions never stall
    if (this.transitionState.isTransitioning) {
      this.transitionState.elapsed += rawDelta;
      this.transitionState.progress = Math.min(1.0, this.transitionState.elapsed / this.transitionState.duration);

      this.onTransitionProgressListeners.forEach((cb) =>
        cb(this.transitionState.progress, this.transitionState.fromScene ?? '', this.transitionState.toScene ?? '')
      );

      if (this.transitionState.progress >= 1.0) {
        this.transitionState.isTransitioning = false;
        const targetScene = this.scenes.get(this.transitionState.toScene!)!;
        this.activeScene = targetScene;
        this.onTransitionCompleteListeners.forEach((cb) => cb(this.activeScene!.name));
      }
    }

    // 2. Update current active scene
    if (this.activeScene) {
      this.activeScene.update(scaledDelta, timeDilation, gestureState);
    }

    // If transitioning, also update target scene if not yet full active
    if (this.transitionState.isTransitioning && this.transitionState.toScene) {
      const targetScene = this.scenes.get(this.transitionState.toScene);
      if (targetScene && targetScene !== this.activeScene) {
        targetScene.update(scaledDelta, timeDilation, gestureState);
      }
    }
  }

  /**
   * Render the active scene
   */
  public render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    if (this.activeScene) {
      this.activeScene.render(renderer, camera);
    }
  }

  public getActiveScene(): IScene | null {
    return this.activeScene;
  }

  public getActiveSceneName(): string {
    return this.activeScene ? this.activeScene.name : 'Unknown';
  }

  public getParticleCount(): number {
    return this.activeScene ? this.activeScene.particleCount : 0;
  }

  public getTransitionState(): Readonly<SceneTransitionState> {
    return this.transitionState;
  }

  public resize(width: number, height: number, pixelRatio: number): void {
    for (const scene of this.scenes.values()) {
      if (scene.resize) {
        scene.resize(width, height, pixelRatio);
      }
    }
  }

  public onTransitionStart(callback: (from: string, to: string) => void): () => void {
    this.onTransitionStartListeners.push(callback);
    return () => {
      this.onTransitionStartListeners = this.onTransitionStartListeners.filter((c) => c !== callback);
    };
  }

  public onTransitionProgress(callback: TransitionCallback): () => void {
    this.onTransitionProgressListeners.push(callback);
    return () => {
      this.onTransitionProgressListeners = this.onTransitionProgressListeners.filter((c) => c !== callback);
    };
  }

  public onTransitionComplete(callback: (to: string) => void): () => void {
    this.onTransitionCompleteListeners.push(callback);
    return () => {
      this.onTransitionCompleteListeners = this.onTransitionCompleteListeners.filter((c) => c !== callback);
    };
  }

  public dispose(): void {
    for (const scene of this.scenes.values()) {
      scene.dispose();
    }
    this.scenes.clear();
    this.activeScene = null;
    this.onTransitionStartListeners = [];
    this.onTransitionProgressListeners = [];
    this.onTransitionCompleteListeners = [];
  }
}
```

---

## 6. Core Application Engine (`src/core/Engine.ts`)

### Engine Architecture & Pipeline
The Engine ties together `THREE.WebGLRenderer`, `TimeManager`, `CameraController`, `SceneManager`, and postprocessing pipelines into a robust, lifecycle-managed loop.

### Complete Blueprint

```typescript
import * as THREE from 'three';
import { EngineConfig, GestureState, HUDTelemetry, IScene, TransitionConfig } from './types';
import { TimeManager } from './TimeManager';
import { CameraController } from './CameraController';
import { SceneManager } from './SceneManager';

export class Engine {
  public readonly canvas: HTMLCanvasElement;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly timeManager: TimeManager;
  public readonly cameraController: CameraController;
  public readonly sceneManager: SceneManager;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private telemetryListeners: Array<(telemetry: HUDTelemetry) => void> = [];
  private currentGestureState: GestureState;
  private isPostProcessingEnabled: boolean = true;
  private isRecording: boolean = false;
  private hudVisible: boolean = true;

  constructor(config: EngineConfig) {
    this.canvas = config.canvas;

    // 1. Configure WebGL2 high-performance renderer
    const maxPixelRatio = config.maxPixelRatio ?? 1.5;
    const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, maxPixelRatio) : 1.0;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: config.antialias ?? false, // Disabled by default for maximum fillrate with bloom & 300k+ particles
      powerPreference: config.powerPreference ?? 'high-performance',
      alpha: false,
      stencil: false,
      depth: true,
      precision: 'highp',
    });

    const initialWidth = this.canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const initialHeight = this.canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 720);

    this.renderer.setSize(initialWidth, initialHeight, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = config.toneMapping ?? THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = config.toneMappingExposure ?? 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;

    // 2. Instantiate core subsystems
    this.timeManager = new TimeManager();
    this.cameraController = new CameraController();
    this.sceneManager = new SceneManager();

    // 3. Default neutral gesture state
    this.currentGestureState = {
      hasHand: false,
      openness: 0.0,
      pinchDistance: 1.0,
      timeDilation: 1.0,
      rotation: { yaw: 0, pitch: 0, roll: 0 },
      position: { x: 0, y: 0 },
      zoomDelta: 0,
      swipeTriggered: null,
      intensity: 0,
      rawLandmarks: null,
    };

    // 4. Setup Resizing
    this.setupResizeObserver();
  }

  private setupResizeObserver(): void {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.resize(width, height);
    };

    window.addEventListener('resize', handleResize);

    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.cameraController.updateAspect(width, height);
    this.sceneManager.resize(width, height, pixelRatio);
  }

  /**
   * Register a scene into the engine
   */
  public async registerScene(scene: IScene): Promise<void> {
    await this.sceneManager.registerScene(scene, this.renderer, this.cameraController.camera);
  }

  /**
   * Switch active scene
   */
  public switchScene(sceneName: string, config?: Partial<TransitionConfig>): boolean {
    return this.sceneManager.switchTo(sceneName, config);
  }

  /**
   * Update gesture state from MediaPipe or Keyboard fallback
   */
  public setGestureState(state: Partial<GestureState>): void {
    this.currentGestureState = {
      ...this.currentGestureState,
      ...state,
    };

    // If swipe was triggered, automatically trigger scene switch
    if (state.swipeTriggered === 'right') {
      this.sceneManager.nextScene({ duration: 1.0, type: 'crossfade' });
    } else if (state.swipeTriggered === 'left') {
      this.sceneManager.previousScene({ duration: 1.0, type: 'crossfade' });
    }
  }

  /**
   * Start main animation loop
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = (timestamp: number) => {
      if (!this.isRunning) return;
      this.renderFrame(timestamp);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Execute a single animation and render frame
   */
  public renderFrame(timestamp?: number): void {
    // 1. Advance time manager
    const timeState = this.timeManager.update(this.currentGestureState.timeDilation, timestamp);

    // 2. Update camera physics using rawDelta (so camera controls remain snappy during slow motion)
    this.cameraController.update(timeState.rawDelta, this.currentGestureState);

    // 3. Update active scenes using scaledDelta for particle physics
    this.sceneManager.update(
      timeState.scaledDelta,
      timeState.rawDelta,
      timeState.timeDilation,
      this.currentGestureState
    );

    // 4. Render pass
    this.renderer.clear();
    this.sceneManager.render(this.renderer, this.cameraController.camera);

    // 5. Broadcast HUD Telemetry
    this.dispatchTelemetry(timeState.fps, timeState.frameTimeMs, timeState.timeDilation);
  }

  private dispatchTelemetry(fps: number, frameTimeMs: number, timeDilation: number): void {
    if (this.telemetryListeners.length === 0) return;

    let gestureName = 'None';
    if (this.currentGestureState.hasHand) {
      if (this.currentGestureState.pinchDistance < 0.3) {
        gestureName = 'Pinch (Time Dilation)';
      } else if (this.currentGestureState.openness < 0.2) {
        gestureName = 'Fist (Singularity)';
      } else if (this.currentGestureState.openness > 0.8) {
        gestureName = 'Open Palm (Supernova)';
      } else {
        gestureName = 'Tracking';
      }
    }

    const telemetry: HUDTelemetry = {
      currentScene: this.sceneManager.getActiveSceneName(),
      fps,
      frameTimeMs,
      particleCount: this.sceneManager.getParticleCount(),
      gestureName,
      timeDilation,
      isRecording: this.isRecording,
      hudVisible: this.hudVisible,
      handDetected: this.currentGestureState.hasHand,
      handOpenness: this.currentGestureState.openness,
      handPitch: this.currentGestureState.rotation.pitch,
      handRoll: this.currentGestureState.rotation.roll,
      zoomLevel: 1.0 + this.currentGestureState.zoomDelta,
      latencyMs: Math.round(frameTimeMs),
    };

    for (const listener of this.telemetryListeners) {
      listener(telemetry);
    }
  }

  public onTelemetry(callback: (telemetry: HUDTelemetry) => void): () => void {
    this.telemetryListeners.push(callback);
    return () => {
      this.telemetryListeners = this.telemetryListeners.filter((c) => c !== callback);
    };
  }

  public setRecording(isRecording: boolean): void {
    this.isRecording = isRecording;
  }

  public setHudVisible(visible: boolean): void {
    this.hudVisible = visible;
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public dispose(): void {
    this.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.sceneManager.dispose();
    this.renderer.dispose();
    this.telemetryListeners = [];
  }
}
```

---

## 7. Implementation Recommendations & Verification Plan

### Worker Implementation Guidelines
1. **Strict TypeScript & Build Cleanliness**:
   - Zero `any` types in `src/core/`.
   - All Three.js objects properly typed via `@types/three`.
   - Export all interfaces from `src/core/types.ts` and re-export from `src/core/index.ts` if convenient.

2. **Temporal Decoupling Rule**:
   - Particle positions, shader times, and orbital velocities MUST use `scaledDelta` ($dt \cdot \tau$).
   - Camera damping, UI timers, HUD FPS calculations, and gesture spring physics MUST use `rawDelta` ($dt$).
   - This ensures camera and UI never become sluggish or unresponsive when 10x slow-motion is engaged.

3. **Memory Safety & WebGL Leaks**:
   - Every `IScene.dispose()` must traverse and call `.dispose()` on `THREE.BufferGeometry`, `THREE.Material`, and `THREE.WebGLRenderTarget`.
   - In `Engine.dispose()`, ensure `ResizeObserver` is disconnected and `renderer.dispose()` is called.

4. **Testing Harness Adaptability**:
   - All methods should accept optional timestamp or mocking parameters so tests running under Node.js / jsdom without WebGL hardware can instantiate and test mathematical calculations (e.g. `TimeManager.update(tau, timestamp)`).
