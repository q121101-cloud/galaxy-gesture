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
    const aspect = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 16 / 9;
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
