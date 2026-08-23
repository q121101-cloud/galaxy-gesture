import { GestureState, HandLandmark, RotationEuler, Vec3 } from '../core/types';
import { LandmarkNormalizer, OneEuroFilter } from './LandmarkNormalizer';
import { SpringPhysicsPipeline } from './SpringPhysics';

export interface CentroidSample {
  timestamp: number;
  x: number;
  y: number;
  z: number;
}

export interface GestureMetrics {
  openness: number;
  pinchDistance: number;
  palmScale: number;
  yaw: number;
  pitch: number;
  roll: number;
  fingerStates: number[];
  centroid: Vec3;
}

/**
 * GestureRecognizer
 * High-precision mathematical extractor for all 5 gesture dimensions.
 */
export class GestureRecognizer {
  private normalizer: LandmarkNormalizer;
  private physics: SpringPhysicsPipeline;

  // 12-frame sliding window for swipe velocity detection
  private centroidBuffer: CentroidSample[] = [];
  private readonly maxBufferSize: number = 12;
  private lastSwipeTime: number = -1000;
  private readonly swipeCooldownMs: number = 800;

  // 1€ feature filters
  private opennessFilter: OneEuroFilter;
  private pinchFilter: OneEuroFilter;
  private rollFilter: OneEuroFilter;
  private pitchFilter: OneEuroFilter;
  private yawFilter: OneEuroFilter;
  private posXFilter: OneEuroFilter;
  private posYFilter: OneEuroFilter;

  // Current states
  private lastState: GestureState;

  constructor() {
    this.normalizer = new LandmarkNormalizer();
    this.physics = new SpringPhysicsPipeline();

    this.opennessFilter = new OneEuroFilter({ minCutoff: 0.6, beta: 0.04, dCutoff: 1.0 });
    this.pinchFilter = new OneEuroFilter({ minCutoff: 0.5, beta: 0.04, dCutoff: 1.0 });
    this.rollFilter = new OneEuroFilter({ minCutoff: 0.35, beta: 0.035, dCutoff: 1.0 });
    this.pitchFilter = new OneEuroFilter({ minCutoff: 0.35, beta: 0.035, dCutoff: 1.0 });
    this.yawFilter = new OneEuroFilter({ minCutoff: 0.35, beta: 0.035, dCutoff: 1.0 });
    this.posXFilter = new OneEuroFilter({ minCutoff: 0.4, beta: 0.035, dCutoff: 1.0 });
    this.posYFilter = new OneEuroFilter({ minCutoff: 0.4, beta: 0.035, dCutoff: 1.0 });

    this.lastState = this.createDefaultState();
  }

  public createDefaultState(): GestureState {
    return {
      hasHand: false,
      openness: 0.0,
      pinchDistance: 1.0,
      timeDilation: 1.0,
      rotation: { yaw: 0, pitch: 0, roll: 0 },
      position: { x: 0, y: 0 },
      zoomDelta: 0.0,
      swipeTriggered: null,
      intensity: 0.0,
      rawLandmarks: null,
    };
  }

  /**
   * Primary recognition pipeline: Takes raw MediaPipe landmarks and returns smoothed GestureState.
   */
  public process(rawLandmarks: HandLandmark[] | null, dt: number = 0.016, timestamp?: number): GestureState {
    const time = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

    if (!rawLandmarks || rawLandmarks.length < 21) {
      this.reset();
      const defaultState = this.createDefaultState();
      return this.physics.update(defaultState, dt);
    }

    // 1. Analyze landmarks
    const metrics = GestureRecognizer.analyzeLandmarks(rawLandmarks);

    // 2. Filter primary metrics with 1€ filters
    const filteredOpenness = this.opennessFilter.filter(metrics.openness, time);
    const filteredPinch = this.pinchFilter.filter(metrics.pinchDistance, time);
    const filteredRoll = this.rollFilter.filter(metrics.roll, time);
    const filteredPitch = this.pitchFilter.filter(metrics.pitch, time);
    const filteredYaw = this.yawFilter.filter(metrics.yaw, time);

    // Map screen-normalized hand centroid to NDC [-1.0, 1.0]
    // Inverted X for natural mirror behavior
    const ndcX = -(metrics.centroid.x * 2.0 - 1.0);
    const ndcY = -(metrics.centroid.y * 2.0 - 1.0);
    const filteredX = this.posXFilter.filter(ndcX, time);
    const filteredY = this.posYFilter.filter(ndcY, time);

    // 3. Compute continuous Time Dilation tau in [0.1, 1.0]
    // Pinch distance 0.0 -> tau = 0.1, Pinch distance 1.0 -> tau = 1.0
    const timeDilation = Math.max(0.1, Math.min(1.0, 0.1 + filteredPinch * 0.9));

    // 4. Compute Zoom Delta from palm scale & openness
    const normScale = Math.max(-0.5, Math.min(0.5, metrics.palmScale / 0.15 - 1.0));
    const zoomDelta = normScale + (filteredOpenness - 0.5) * 0.4;

    // 5. Update 12-frame sliding window & detect wave/swipe
    const swipeTriggered = this.detectSwipe(metrics.centroid, time, filteredOpenness);

    // 6. Compute Kinetic Intensity
    const intensity = this.computeIntensity(metrics, filteredOpenness);

    const rawState: GestureState = {
      hasHand: true,
      openness: Math.max(0.0, Math.min(1.0, filteredOpenness)),
      pinchDistance: Math.max(0.0, Math.min(1.0, filteredPinch)),
      timeDilation,
      rotation: {
        yaw: filteredYaw,
        pitch: Math.max(-1.0, Math.min(1.0, filteredPitch)),
        roll: filteredRoll,
      },
      position: {
        x: Math.max(-1.0, Math.min(1.0, filteredX)),
        y: Math.max(-1.0, Math.min(1.0, filteredY)),
      },
      zoomDelta,
      swipeTriggered,
      intensity,
      rawLandmarks,
    };

    // 7. Pass through 2nd-order critically damped spring physics for zero-jitter rendering
    this.lastState = this.physics.update(rawState, dt);
    return this.lastState;
  }

  /**
   * Scale-invariant landmark feature analysis.
   */
  public static analyzeLandmarks(lm: HandLandmark[]): GestureMetrics {
    if (!lm || lm.length < 21) {
      return {
        openness: 0,
        pinchDistance: 1.0,
        palmScale: 0.1,
        yaw: 0,
        pitch: 0,
        roll: 0,
        fingerStates: [0, 0, 0, 0, 0],
        centroid: { x: 0, y: 0, z: 0 },
      };
    }

    const wrist = lm[0];
    const indexMcp = lm[5];
    const middleMcp = lm[9];
    const pinkyMcp = lm[17];
    const middleTip = lm[12];
    const thumbTip = lm[4];
    const indexTip = lm[8];

    // 1. Palm Scale L_palm
    const dxWidth = (pinkyMcp.x ?? 0) - (indexMcp.x ?? 0);
    const dyWidth = (pinkyMcp.y ?? 0) - (indexMcp.y ?? 0);
    const dzWidth = (pinkyMcp.z ?? 0) - (indexMcp.z ?? 0);
    const palmWidth = Math.hypot(dxWidth, dyWidth, dzWidth);

    const dxHeight = (middleMcp.x ?? 0) - (wrist.x ?? 0);
    const dyHeight = (middleMcp.y ?? 0) - (wrist.y ?? 0);
    const dzHeight = (middleMcp.z ?? 0) - (wrist.z ?? 0);
    const palmHeight = Math.hypot(dxHeight, dyHeight, dzHeight);

    const palmScale = Math.max((palmWidth * 1.2 + palmHeight * 1.0) / 2.2, 0.035);

    // 2. Hand Roll Rotation Angle (Left < 0, Right > 0)
    const dirX = -((middleMcp.x ?? 0) - (wrist.x ?? 0));
    const dirY = -((middleMcp.y ?? 0) - (wrist.y ?? 0));
    const roll = Math.atan2(dirX, -dirY);

    // 3. Hand Pitch Tilt Angle (Pitch Down < 0, Pitch Up > 0)
    const deltaZKnuckle = (middleMcp.z ?? 0) - (wrist.z ?? 0);
    const deltaZTip = (middleTip.z ?? 0) - (wrist.z ?? 0);
    const avgDeltaZ = (deltaZKnuckle * 0.4 + deltaZTip * 0.6) / palmScale;
    const pitch = Math.max(-1.0, Math.min(1.0, -avgDeltaZ * 1.3));

    // 4. Hand Yaw Angle
    const yaw = Math.atan2((indexMcp.z ?? 0) - (pinkyMcp.z ?? 0), (indexMcp.x - pinkyMcp.x) || 0.001);

    // 5. 5-Finger Extension Analysis
    const fingerDefs = [
      { tip: 4, pip: 3, mcp: 2, isThumb: true },
      { tip: 8, pip: 6, mcp: 5, isThumb: false },
      { tip: 12, pip: 10, mcp: 9, isThumb: false },
      { tip: 16, pip: 14, mcp: 13, isThumb: false },
      { tip: 20, pip: 18, mcp: 17, isThumb: false },
    ];

    let fingerExtSum = 0;
    const fingerScores: number[] = [];

    for (const def of fingerDefs) {
      const tipPt = lm[def.tip];
      const pipPt = lm[def.pip];
      const mcpPt = lm[def.mcp];

      if (def.isThumb) {
        const dTipPinky = Math.hypot(
          (tipPt.x ?? 0) - (pinkyMcp.x ?? 0),
          (tipPt.y ?? 0) - (pinkyMcp.y ?? 0),
          (tipPt.z ?? 0) - (pinkyMcp.z ?? 0)
        );
        const dMcpPinky = Math.hypot(
          (mcpPt.x ?? 0) - (pinkyMcp.x ?? 0),
          (mcpPt.y ?? 0) - (pinkyMcp.y ?? 0),
          (mcpPt.z ?? 0) - (pinkyMcp.z ?? 0)
        );
        const thumbRatio = (dTipPinky - dMcpPinky * 0.7) / (palmScale * 0.9);
        const score = Math.max(0.0, Math.min(1.0, (thumbRatio - 0.1) / 0.85));
        fingerScores.push(score);
        fingerExtSum += score;
      } else {
        const dTipWrist = Math.hypot(
          (tipPt.x ?? 0) - (wrist.x ?? 0),
          (tipPt.y ?? 0) - (wrist.y ?? 0),
          (tipPt.z ?? 0) - (wrist.z ?? 0)
        );
        const dPipWrist = Math.hypot(
          (pipPt.x ?? 0) - (wrist.x ?? 0),
          (pipPt.y ?? 0) - (wrist.y ?? 0),
          (pipPt.z ?? 0) - (wrist.z ?? 0)
        );
        const dMcpWrist = Math.hypot(
          (mcpPt.x ?? 0) - (wrist.x ?? 0),
          (mcpPt.y ?? 0) - (wrist.y ?? 0),
          (mcpPt.z ?? 0) - (wrist.z ?? 0)
        );
        const extRatio = (dTipWrist - dMcpWrist) / (Math.max(dPipWrist - dMcpWrist, 0.01) * 1.65);
        const score = Math.max(0.0, Math.min(1.0, (extRatio - 0.15) / 0.75));
        fingerScores.push(score);
        fingerExtSum += score;
      }
    }

    // 6. Radial Dispersion
    const tips = [4, 8, 12, 16, 20];
    let totalTipDist = 0;
    for (const t of tips) {
      totalTipDist += Math.hypot(
        (lm[t].x ?? 0) - (wrist.x ?? 0),
        (lm[t].y ?? 0) - (wrist.y ?? 0),
        (lm[t].z ?? 0) - (wrist.z ?? 0)
      );
    }
    const avgTipDist = totalTipDist / 5.0;
    const distRatio = avgTipDist / palmScale;
    const ratioScore = Math.max(0.0, Math.min(1.0, (distRatio - 0.88) / 0.87));
    const openness = Math.max(0.0, Math.min(1.0, (fingerExtSum / 5.0) * 0.6 + ratioScore * 0.4));

    // 7. Pinch Distance
    const rawPinchDist = Math.hypot(
      (thumbTip.x ?? 0) - (indexTip.x ?? 0),
      (thumbTip.y ?? 0) - (indexTip.y ?? 0),
      (thumbTip.z ?? 0) - (indexTip.z ?? 0)
    );
    const pinchDistance = Math.max(0.0, Math.min(1.0, (rawPinchDist / palmScale - 0.15) / 0.85));

    // 8. Palm Centroid
    let cx = 0, cy = 0, cz = 0;
    for (const p of [0, 5, 9, 13, 17]) {
      cx += lm[p].x ?? 0;
      cy += lm[p].y ?? 0;
      cz += lm[p].z ?? 0;
    }

    return {
      openness,
      pinchDistance,
      palmScale,
      yaw,
      pitch,
      roll,
      fingerStates: fingerScores,
      centroid: { x: cx / 5.0, y: cy / 5.0, z: cz / 5.0 },
    };
  }

  /**
   * 12-frame sliding window velocity tracking for wave / swipe gesture.
   */
  private detectSwipe(centroid: Vec3, timestamp: number, openness: number): 'left' | 'right' | null {
    this.centroidBuffer.push({
      timestamp,
      x: centroid.x,
      y: centroid.y,
      z: centroid.z,
    });

    if (this.centroidBuffer.length > this.maxBufferSize) {
      this.centroidBuffer.shift();
    }

    if (this.centroidBuffer.length < 6) {
      return null;
    }

    // Must be open hand (openness >= 0.40) to swipe
    if (openness < 0.35) {
      return null;
    }

    // Cooldown check (800ms)
    if (timestamp - this.lastSwipeTime < this.swipeCooldownMs) {
      return null;
    }

    const first = this.centroidBuffer[0];
    const last = this.centroidBuffer[this.centroidBuffer.length - 1];
    const dt = Math.max((last.timestamp - first.timestamp) / 1000.0, 0.05);

    const deltaX = last.x - first.x;
    const deltaY = last.y - first.y;

    const vx = deltaX / dt;
    const vy = deltaY / dt;

    // Check directional dominance ratio: |vx| > 2.2 * |vy|
    const dominanceRatio = Math.abs(vx) / (Math.abs(vy) + 0.0001);
    if (dominanceRatio < 2.0) {
      return null;
    }

    // Check intermediate steps to prevent direction reversals mid-swipe
    let prevX = first.x;
    let positiveSteps = 0;
    let negativeSteps = 0;
    for (let i = 1; i < this.centroidBuffer.length; i++) {
      const step = this.centroidBuffer[i].x - prevX;
      if (step > 0.005) positiveSteps++;
      else if (step < -0.005) negativeSteps++;
      prevX = this.centroidBuffer[i].x;
    }

    if (positiveSteps > 0 && negativeSteps > 0 && Math.min(positiveSteps, negativeSteps) >= 3) {
      // Ambiguous zig-zag motion, reject
      return null;
    }

    // Velocity threshold: total deltaX >= 0.25 or |vx| >= 0.05 (clamped)
    if (Math.abs(deltaX) > 0.25 || Math.abs(vx) > 0.8) {
      this.lastSwipeTime = timestamp;
      // In mirrored camera feed, deltaX > 0 corresponds to moving rightward
      return deltaX > 0 ? 'right' : 'left';
    }

    return null;
  }

  private computeIntensity(metrics: GestureMetrics, openness: number): number {
    let velocityEnergy = 0;
    if (this.centroidBuffer.length >= 2) {
      const p1 = this.centroidBuffer[this.centroidBuffer.length - 2];
      const p2 = this.centroidBuffer[this.centroidBuffer.length - 1];
      const dt = Math.max((p2.timestamp - p1.timestamp) / 1000.0, 0.001);
      const speed = Math.hypot(p2.x - p1.x, p2.y - p1.y) / dt;
      velocityEnergy = Math.min(1.0, speed / 2.0);
    }

    const rotationalEnergy = Math.min(1.0, (Math.abs(metrics.roll) + Math.abs(metrics.pitch)) / 2.0);
    const rawIntensity = 0.4 * velocityEnergy + 0.3 * rotationalEnergy + 0.3 * openness;
    return Math.max(0.0, Math.min(1.0, rawIntensity));
  }

  public reset(): void {
    this.centroidBuffer = [];
    this.normalizer.reset();
    this.physics.reset();
    this.opennessFilter.reset();
    this.pinchFilter.reset();
    this.rollFilter.reset();
    this.pitchFilter.reset();
    this.yawFilter.reset();
    this.posXFilter.reset();
    this.posYFilter.reset();
    this.lastState = this.createDefaultState();
  }
}
