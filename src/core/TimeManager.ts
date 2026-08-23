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
      this.currentFps = Math.max(1, Math.round(this.frameCount / (this.rawElapsedTime - this.lastFpsUpdate)));
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
