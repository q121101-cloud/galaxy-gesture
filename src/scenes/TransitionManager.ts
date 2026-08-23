import * as THREE from 'three';
import { IScene, SceneTransitionState, SceneTransitionType, TransitionConfig } from '../core/types';
import { BaseScene } from './BaseScene';

/**
 * Quintic smootherstep for zero-jerk continuous motion
 * S(t) = 6t^5 - 15t^4 + 10t^3, where S'(0) = S'(1) = S''(0) = S''(1) = 0
 */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0.0), 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

/**
 * TransitionManager: Coordinates cinematic scene transitions,
 * camera rigging interpolation, particle morphing parameters,
 * and screen-space gravitational ripple waves.
 */
export class TransitionManager {
  private transitionState: SceneTransitionState = {
    isTransitioning: false,
    fromScene: null,
    toScene: null,
    progress: 1.0,
    duration: 1.0,
    elapsed: 0,
    type: 'crossfade',
  };

  // Camera interpolation state
  private sourceCamPos: THREE.Vector3 = new THREE.Vector3();
  private targetCamPos: THREE.Vector3 = new THREE.Vector3();
  private sourceLookAt: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();
  private sourceFov: number = 60;
  private targetFov: number = 60;

  // Gravitational metric ripple state
  private rippleCenter: THREE.Vector2 = new THREE.Vector2(0.5, 0.5);
  private rippleStrength: number = 0.0;
  private rippleTime: number = 0.0;

  private onStartListeners: Array<(from: string | null, to: string) => void> = [];
  private onProgressListeners: Array<(progress: number, from: string | null, to: string) => void> = [];
  private onCompleteListeners: Array<(to: string) => void> = [];

  constructor() {}

  /**
   * Start a cinematic transition between two scenes
   */
  public startTransition(
    fromScene: IScene | null,
    toScene: IScene,
    camera: THREE.PerspectiveCamera,
    config?: Partial<TransitionConfig>
  ): void {
    const duration = Math.max(0.5, config?.duration ?? 1.0); // Enforce >= 0.5s requirement
    const type: SceneTransitionType = config?.type ?? 'crossfade';

    const fromName = fromScene ? fromScene.name : null;
    const toName = toScene.name;

    // Capture camera source state
    this.sourceCamPos.copy(camera.position);
    this.sourceFov = camera.fov;

    // Capture target camera state from BaseScene camera rigging if available
    if (toScene instanceof BaseScene && toScene.cameraRig) {
      this.targetCamPos.copy(toScene.cameraRig.defaultPosition);
      this.targetLookAt.copy(toScene.cameraRig.targetLookAt);
      this.targetFov = toScene.cameraRig.fov ?? 60;
    } else {
      this.targetCamPos.copy(camera.position);
      this.targetLookAt.set(0, 0, 0);
      this.targetFov = camera.fov;
    }

    if (fromScene instanceof BaseScene && fromScene.cameraRig) {
      this.sourceLookAt.copy(fromScene.cameraRig.targetLookAt);
    } else {
      this.sourceLookAt.set(0, 0, 0);
    }

    // Trigger ripple for gravitational_warp or default crossfade
    this.rippleStrength = type === 'gravitational_warp' ? 1.0 : 0.6;
    this.rippleTime = 0.0;

    this.transitionState = {
      isTransitioning: true,
      fromScene: fromName,
      toScene: toName,
      progress: 0.0,
      duration,
      elapsed: 0.0,
      type,
    };

    if (fromScene) {
      fromScene.onExit(toName);
    }
    toScene.onEnter(fromName ?? undefined);

    this.onStartListeners.forEach((cb) => cb(fromName, toName));
  }

  /**
   * Per-frame transition advance pass (uses rawDelta so transitions never freeze under slow-motion)
   */
  public update(rawDelta: number, camera: THREE.PerspectiveCamera): void {
    if (!this.transitionState.isTransitioning) {
      // Decay residual ripple
      if (this.rippleStrength > 0.001) {
        this.rippleTime += rawDelta;
        this.rippleStrength = Math.max(0.0, this.rippleStrength - rawDelta * 1.5);
      }
      return;
    }

    this.transitionState.elapsed += rawDelta;
    const linearProgress = Math.min(1.0, this.transitionState.elapsed / this.transitionState.duration);
    this.transitionState.progress = linearProgress;

    // Smoothed transition progress (zero acceleration endpoints)
    const smoothT = smootherstep(0.0, 1.0, linearProgress);

    // Interpolate camera position, lookAt target, and FOV
    camera.position.lerpVectors(this.sourceCamPos, this.targetCamPos, smoothT);
    const currentLookAt = new THREE.Vector3().lerpVectors(this.sourceLookAt, this.targetLookAt, smoothT);
    camera.lookAt(currentLookAt);
    camera.fov = THREE.MathUtils.lerp(this.sourceFov, this.targetFov, smoothT);
    camera.updateProjectionMatrix();

    // Advance gravitational metric wave ripple
    this.rippleTime += rawDelta;
    this.rippleStrength = Math.sin(smoothT * Math.PI) * (this.transitionState.type === 'gravitational_warp' ? 1.0 : 0.6);

    this.onProgressListeners.forEach((cb) =>
      cb(this.transitionState.progress, this.transitionState.fromScene, this.transitionState.toScene!)
    );

    // Transition completion
    if (linearProgress >= 1.0) {
      this.transitionState.isTransitioning = false;
      const completedTo = this.transitionState.toScene!;
      this.onCompleteListeners.forEach((cb) => cb(completedTo));
    }
  }

  public getState(): Readonly<SceneTransitionState> {
    return this.transitionState;
  }

  public isTransitioning(): boolean {
    return this.transitionState.isTransitioning;
  }

  public getProgress(): number {
    return this.transitionState.progress;
  }

  public getSmoothedProgress(): number {
    return smootherstep(0.0, 1.0, this.transitionState.progress);
  }

  public getRippleParams(): { strength: number; time: number; center: THREE.Vector2 } {
    return {
      strength: this.rippleStrength,
      time: this.rippleTime,
      center: this.rippleCenter,
    };
  }

  public onStart(callback: (from: string | null, to: string) => void): () => void {
    this.onStartListeners.push(callback);
    return () => {
      this.onStartListeners = this.onStartListeners.filter((c) => c !== callback);
    };
  }

  public onProgress(callback: (progress: number, from: string | null, to: string) => void): () => void {
    this.onProgressListeners.push(callback);
    return () => {
      this.onProgressListeners = this.onProgressListeners.filter((c) => c !== callback);
    };
  }

  public onComplete(callback: (to: string) => void): () => void {
    this.onCompleteListeners.push(callback);
    return () => {
      this.onCompleteListeners = this.onCompleteListeners.filter((c) => c !== callback);
    };
  }

  public dispose(): void {
    this.transitionState.isTransitioning = false;
    this.onStartListeners = [];
    this.onProgressListeners = [];
    this.onCompleteListeners = [];
  }
}
