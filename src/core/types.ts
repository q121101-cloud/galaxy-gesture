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
  getMediaStreamDestination(): MediaStreamAudioDestinationNode | null;
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
 * Common Uniforms passed into custom shaders
 */
export interface CommonShaderUniforms {
  uTime: { value: number };
  uDeltaTime: { value: number };
  uResolution: { value: THREE.Vector2 };
  uCameraPosition: { value: THREE.Vector3 };
  uTimeDilation: { value: number };
}
