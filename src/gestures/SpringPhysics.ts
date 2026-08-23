import { GestureState, RotationEuler, Vec3 } from '../core/types';

/**
 * Critically Damped Harmonic Oscillator (zeta = 1.0).
 * Uses exact discrete-time analytical integration for arbitrary variable dt.
 * Guarantees zero overshoot and zero ringing with maximum convergence speed.
 */
export class CriticallyDampedSpring {
  public position: number = 0;
  public velocity: number = 0;
  public target: number = 0;
  public omega0: number; // Undamped natural frequency in rad/s

  constructor(omega0: number = 10.0, initialPosition: number = 0) {
    this.omega0 = Math.max(0.1, omega0);
    this.position = initialPosition;
    this.target = initialPosition;
    this.velocity = 0;
  }

  public setTarget(target: number): void {
    if (Number.isFinite(target)) {
      this.target = target;
    }
  }

  public snapTo(position: number): void {
    if (Number.isFinite(position)) {
      this.position = position;
      this.target = position;
      this.velocity = 0;
    }
  }

  /**
   * Exact analytical integration step for critically damped spring.
   */
  public update(dt: number): number {
    const clampedDt = Math.max(0.0001, Math.min(dt, 0.1));
    if (!Number.isFinite(this.target)) {
      this.target = this.position;
    }

    const y = this.position - this.target; // Error offset
    const w = this.omega0;
    const expTerm = Math.exp(-w * clampedDt);

    // Exact state transition
    const yNext = expTerm * (y * (1.0 + w * clampedDt) + this.velocity * clampedDt);
    const vNext = expTerm * (this.velocity * (1.0 - w * clampedDt) - y * (w * w * clampedDt));

    this.position = this.target + yNext;
    this.velocity = vNext;

    // Numerical snap to zero when tiny
    if (Math.abs(yNext) < 1e-6 && Math.abs(vNext) < 1e-6) {
      this.position = this.target;
      this.velocity = 0;
    }

    return this.position;
  }

  public reset(position: number = 0): void {
    this.position = position;
    this.target = position;
    this.velocity = 0;
  }
}

/**
 * Numerical 2nd-Order Spring-Damper Simulator.
 * Compliant with standard stiffness (k) and damping (c) interface.
 */
export class SpringDamperSimulator {
  public position: number = 0;
  public velocity: number = 0;
  public target: number = 0;
  public stiffness: number; // k
  public damping: number;   // c

  constructor(stiffness: number = 100, damping: number = 20) {
    this.stiffness = Math.max(0.001, stiffness);
    // Sanitize negative damping to positive critical damping c = 2*sqrt(k)
    this.damping = damping <= 0 ? 2.0 * Math.sqrt(this.stiffness) : damping;
  }

  public setTarget(target: number): void {
    if (Number.isFinite(target)) {
      this.target = target;
    }
  }

  public update(dt: number): number {
    const clampedDt = Math.max(0.0001, Math.min(dt, 0.1));
    if (!Number.isFinite(this.target)) {
      this.target = this.position;
    }

    // Semi-implicit Euler integration for stability
    const force = -this.stiffness * (this.position - this.target) - this.damping * this.velocity;
    const acceleration = force; // Unit mass m = 1.0
    this.velocity += acceleration * clampedDt;
    this.position += this.velocity * clampedDt;

    return this.position;
  }

  public reset(position: number = 0): void {
    this.position = position;
    this.target = position;
    this.velocity = 0;
  }
}

/**
 * 3D Spring Vector for continuous coordinate damping.
 */
export class SpringVector3 {
  public x: CriticallyDampedSpring;
  public y: CriticallyDampedSpring;
  public z: CriticallyDampedSpring;

  constructor(omega0: number = 10.0, initial: Vec3 = { x: 0, y: 0, z: 0 }) {
    this.x = new CriticallyDampedSpring(omega0, initial.x);
    this.y = new CriticallyDampedSpring(omega0, initial.y);
    this.z = new CriticallyDampedSpring(omega0, initial.z);
  }

  public setTarget(target: Vec3): void {
    this.x.setTarget(target.x);
    this.y.setTarget(target.y);
    this.z.setTarget(target.z);
  }

  public update(dt: number): Vec3 {
    return {
      x: this.x.update(dt),
      y: this.y.update(dt),
      z: this.z.update(dt),
    };
  }

  public reset(pos: Vec3 = { x: 0, y: 0, z: 0 }): void {
    this.x.reset(pos.x);
    this.y.reset(pos.y);
    this.z.reset(pos.z);
  }
}

/**
 * Spring Rotation Euler for smooth camera yaw, pitch, roll tracking with angular wrapping.
 */
export class SpringRotationEuler {
  public yaw: CriticallyDampedSpring;
  public pitch: CriticallyDampedSpring;
  public roll: CriticallyDampedSpring;

  constructor(
    omegaYaw: number = 7.5,
    omegaPitch: number = 8.5,
    omegaRoll: number = 8.0,
    initial: RotationEuler = { yaw: 0, pitch: 0, roll: 0 }
  ) {
    this.yaw = new CriticallyDampedSpring(omegaYaw, initial.yaw);
    this.pitch = new CriticallyDampedSpring(omegaPitch, initial.pitch);
    this.roll = new CriticallyDampedSpring(omegaRoll, initial.roll);
  }

  public setTarget(target: RotationEuler): void {
    // Wrap angles to [-PI, PI] to prevent 360 degree accumulation issues
    const wrap = (rad: number) => Math.atan2(Math.sin(rad), Math.cos(rad));
    this.yaw.setTarget(wrap(target.yaw));
    this.pitch.setTarget(Math.max(-1.0, Math.min(1.0, target.pitch)));
    this.roll.setTarget(wrap(target.roll));
  }

  public update(dt: number): RotationEuler {
    return {
      yaw: this.yaw.update(dt),
      pitch: this.pitch.update(dt),
      roll: this.roll.update(dt),
    };
  }

  public reset(val: RotationEuler = { yaw: 0, pitch: 0, roll: 0 }): void {
    this.yaw.reset(val.yaw);
    this.pitch.reset(val.pitch);
    this.roll.reset(val.roll);
  }
}

/**
 * SpringPhysicsPipeline
 * Master physics smoothing engine for all gesture parameters.
 */
export class SpringPhysicsPipeline {
  private opennessSpring: CriticallyDampedSpring;
  private pinchSpring: CriticallyDampedSpring;
  private timeDilationSpring: CriticallyDampedSpring;
  private zoomSpring: CriticallyDampedSpring;
  private intensitySpring: CriticallyDampedSpring;
  private rotationSprings: SpringRotationEuler;
  private positionSprings: SpringVector3;

  constructor() {
    // Parameter Tuning Matrix according to Section 3.2:
    // Openness: omega = 14.0 (snappy 0.21s response)
    // Yaw: omega = 7.5 (celestial weight 0.40s)
    // Pitch: omega = 8.5 (smooth altitude 0.35s)
    // Zoom: omega = 6.0 (deep breathing 0.50s)
    // Time Dilation: omega = 12.0 (bullet-time 0.25s)
    this.opennessSpring = new CriticallyDampedSpring(14.0, 0.0);
    this.pinchSpring = new CriticallyDampedSpring(12.0, 1.0);
    this.timeDilationSpring = new CriticallyDampedSpring(12.0, 1.0);
    this.zoomSpring = new CriticallyDampedSpring(6.0, 0.0);
    this.intensitySpring = new CriticallyDampedSpring(10.0, 0.0);
    this.rotationSprings = new SpringRotationEuler(7.5, 8.5, 8.0);
    this.positionSprings = new SpringVector3(9.0);
  }

  /**
   * Smooths incoming raw GestureState into critically damped physics state.
   */
  public update(rawState: GestureState, dt: number): GestureState {
    if (rawState.hasHand) {
      this.opennessSpring.setTarget(rawState.openness);
      this.pinchSpring.setTarget(rawState.pinchDistance);
      this.timeDilationSpring.setTarget(rawState.timeDilation);
      this.zoomSpring.setTarget(rawState.zoomDelta);
      this.intensitySpring.setTarget(rawState.intensity);
      this.rotationSprings.setTarget(rawState.rotation);
      this.positionSprings.setTarget({
        x: rawState.position.x,
        y: rawState.position.y,
        z: 0,
      });
    } else {
      // Smoothly return to neutral resting state
      this.opennessSpring.setTarget(0.0);
      this.pinchSpring.setTarget(1.0);
      this.timeDilationSpring.setTarget(1.0);
      this.zoomSpring.setTarget(0.0);
      this.intensitySpring.setTarget(0.0);
      this.rotationSprings.setTarget({ yaw: 0, pitch: 0, roll: 0 });
      this.positionSprings.setTarget({ x: 0, y: 0, z: 0 });
    }

    const smoothedOpenness = Math.max(0.0, Math.min(1.0, this.opennessSpring.update(dt)));
    const smoothedPinch = Math.max(0.0, Math.min(1.0, this.pinchSpring.update(dt)));
    const smoothedTau = Math.max(0.1, Math.min(1.0, this.timeDilationSpring.update(dt)));
    const smoothedZoom = this.zoomSpring.update(dt);
    const smoothedIntensity = Math.max(0.0, Math.min(1.0, this.intensitySpring.update(dt)));
    const smoothedRotation = this.rotationSprings.update(dt);
    const smoothedPos = this.positionSprings.update(dt);

    return {
      hasHand: rawState.hasHand,
      openness: smoothedOpenness,
      pinchDistance: smoothedPinch,
      timeDilation: smoothedTau,
      rotation: smoothedRotation,
      position: { x: smoothedPos.x, y: smoothedPos.y },
      zoomDelta: smoothedZoom,
      swipeTriggered: rawState.swipeTriggered,
      intensity: smoothedIntensity,
      rawLandmarks: rawState.rawLandmarks,
    };
  }

  public reset(): void {
    this.opennessSpring.reset(0.0);
    this.pinchSpring.reset(1.0);
    this.timeDilationSpring.reset(1.0);
    this.zoomSpring.reset(0.0);
    this.intensitySpring.reset(0.0);
    this.rotationSprings.reset();
    this.positionSprings.reset();
  }
}
