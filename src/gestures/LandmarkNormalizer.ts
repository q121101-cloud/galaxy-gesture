import { HandLandmark, Vec3 } from '../core/types';

/**
 * Configuration options for the 1€ Filter (One Euro Filter).
 */
export interface OneEuroFilterConfig {
  minCutoff?: number; // Minimum cutoff frequency in Hz (smooths low speed jitter)
  beta?: number;      // Speed coefficient (reduces lag during fast movement)
  dCutoff?: number;   // Cutoff frequency for derivative filtering in Hz
}

/**
 * 1€ Filter (One Euro Filter)
 * Ultra-smooth motion filtering with zero jitter at low speeds and instant reaction at high speeds.
 * Reference: Casiez et al., CHI 2012.
 */
export class OneEuroFilter {
  public minCutoff: number;
  public beta: number;
  public dCutoff: number;

  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  constructor(config: OneEuroFilterConfig = {}) {
    this.minCutoff = config.minCutoff ?? 0.5;
    this.beta = config.beta ?? 0.045;
    this.dCutoff = config.dCutoff ?? 1.0;
  }

  /**
   * Filter a single scalar measurement x at the given timestamp (in ms).
   */
  public filter(x: number, timestamp: number = (typeof performance !== 'undefined' ? performance.now() : Date.now())): number {
    if (!Number.isFinite(x)) {
      return this.xPrev ?? 0;
    }

    if (this.tPrev === null || this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = timestamp;
      this.dxPrev = 0;
      return x;
    }

    const dt = Math.max((timestamp - this.tPrev) / 1000.0, 0.001);
    this.tPrev = timestamp;

    const dx = (x - this.xPrev) / dt;
    const alphaD = this.computeAlpha(dt, this.dCutoff);
    const dxHat = alphaD * dx + (1.0 - alphaD) * this.dxPrev;
    this.dxPrev = dxHat;

    const cutoff = Math.max(0.001, this.minCutoff + this.beta * Math.abs(dxHat));
    const alpha = this.computeAlpha(dt, cutoff);

    const xHat = alpha * x + (1.0 - alpha) * this.xPrev;
    this.xPrev = xHat;
    return xHat;
  }

  /**
   * Compute smoothing factor alpha for a given delta time and cutoff frequency.
   */
  public computeAlpha(dt: number, cutoff: number): number {
    const tau = 1.0 / (2.0 * Math.PI * Math.max(cutoff, 0.0001));
    return 1.0 / (1.0 + tau / dt);
  }

  /**
   * Reset filter state to initial uninitialized values.
   */
  public reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

/**
 * 3D Vector 1€ Filter.
 */
export class OneEuroFilter3D {
  private filterX: OneEuroFilter;
  private filterY: OneEuroFilter;
  private filterZ: OneEuroFilter;

  constructor(config: OneEuroFilterConfig = {}) {
    this.filterX = new OneEuroFilter(config);
    this.filterY = new OneEuroFilter(config);
    this.filterZ = new OneEuroFilter(config);
  }

  public filter(v: Vec3, timestamp?: number): Vec3 {
    return {
      x: this.filterX.filter(v.x, timestamp),
      y: this.filterY.filter(v.y, timestamp),
      z: this.filterZ.filter(v.z, timestamp),
    };
  }

  public reset(): void {
    this.filterX.reset();
    this.filterY.reset();
    this.filterZ.reset();
  }
}

export interface NormalizedHandData {
  palmScale: number;
  wrist: Vec3;
  indexMcp: Vec3;
  middleMcp: Vec3;
  pinkyMcp: Vec3;
  middleTip: Vec3;
  thumbTip: Vec3;
  indexTip: Vec3;
  ringTip: Vec3;
  pinkyTip: Vec3;
  centroid: Vec3;
  landmarks: HandLandmark[];
}

/**
 * LandmarkNormalizer
 * Computes scale-invariant, coordinate-normalized, and 1€-smoothed hand landmarks.
 */
export class LandmarkNormalizer {
  private landmarkFilters: OneEuroFilter3D[] = [];
  private palmScaleFilter: OneEuroFilter;
  private isInitialized: boolean = false;

  constructor(filterConfig?: OneEuroFilterConfig) {
    const config = filterConfig ?? { minCutoff: 0.6, beta: 0.04, dCutoff: 1.0 };
    for (let i = 0; i < 21; i++) {
      this.landmarkFilters.push(new OneEuroFilter3D(config));
    }
    this.palmScaleFilter = new OneEuroFilter({ minCutoff: 0.4, beta: 0.035, dCutoff: 1.0 });
  }

  /**
   * Computes the invariant palm metric L_palm from 21 MediaPipe landmarks.
   */
  public static computePalmScale(landmarks: HandLandmark[]): number {
    if (!landmarks || landmarks.length < 21) {
      return 0.1;
    }

    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const middleMcp = landmarks[9];
    const pinkyMcp = landmarks[17];

    const dxWidth = (pinkyMcp.x ?? 0) - (indexMcp.x ?? 0);
    const dyWidth = (pinkyMcp.y ?? 0) - (indexMcp.y ?? 0);
    const dzWidth = (pinkyMcp.z ?? 0) - (indexMcp.z ?? 0);
    const palmWidth = Math.hypot(dxWidth, dyWidth, dzWidth);

    const dxHeight = (middleMcp.x ?? 0) - (wrist.x ?? 0);
    const dyHeight = (middleMcp.y ?? 0) - (wrist.y ?? 0);
    const dzHeight = (middleMcp.z ?? 0) - (wrist.z ?? 0);
    const palmHeight = Math.hypot(dxHeight, dyHeight, dzHeight);

    const rawScale = (1.2 * palmWidth + 1.0 * palmHeight) / 2.2;
    return Math.max(rawScale, 0.035);
  }

  /**
   * Filter and normalize 21 3D landmarks.
   */
  public normalize(rawLandmarks: HandLandmark[] | null, timestamp?: number): NormalizedHandData | null {
    if (!rawLandmarks || rawLandmarks.length < 21) {
      this.reset();
      return null;
    }

    const time = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

    // 1. Sanitize & Filter each landmark point
    const filteredLandmarks: HandLandmark[] = [];
    for (let i = 0; i < 21; i++) {
      const raw = rawLandmarks[i] ?? { x: 0.5, y: 0.5, z: 0.0 };
      const sx = Number.isFinite(raw.x) ? raw.x : 0.5;
      const sy = Number.isFinite(raw.y) ? raw.y : 0.5;
      const sz = Number.isFinite(raw.z) ? raw.z : 0.0;

      const filtered = this.landmarkFilters[i].filter({ x: sx, y: sy, z: sz }, time);
      filteredLandmarks.push(filtered);
    }

    // 2. Compute palm scale and filter it
    const rawScale = LandmarkNormalizer.computePalmScale(filteredLandmarks);
    const smoothedScale = this.palmScaleFilter.filter(rawScale, time);
    const palmScale = Math.max(smoothedScale, 0.035);

    // 3. Compute palm centroid from key base points [0, 5, 9, 13, 17]
    const baseIndices = [0, 5, 9, 13, 17];
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    for (const idx of baseIndices) {
      sumX += filteredLandmarks[idx].x;
      sumY += filteredLandmarks[idx].y;
      sumZ += filteredLandmarks[idx].z;
    }
    const centroid: Vec3 = {
      x: sumX / baseIndices.length,
      y: sumY / baseIndices.length,
      z: sumZ / baseIndices.length,
    };

    this.isInitialized = true;

    return {
      palmScale,
      wrist: filteredLandmarks[0],
      indexMcp: filteredLandmarks[5],
      middleMcp: filteredLandmarks[9],
      pinkyMcp: filteredLandmarks[17],
      middleTip: filteredLandmarks[12],
      thumbTip: filteredLandmarks[4],
      indexTip: filteredLandmarks[8],
      ringTip: filteredLandmarks[16],
      pinkyTip: filteredLandmarks[20],
      centroid,
      landmarks: filteredLandmarks,
    };
  }

  /**
   * Reset all internal 1€ filters (e.g. on hand tracking loss).
   */
  public reset(): void {
    if (!this.isInitialized) return;
    for (const f of this.landmarkFilters) {
      f.reset();
    }
    this.palmScaleFilter.reset();
    this.isInitialized = false;
  }
}
