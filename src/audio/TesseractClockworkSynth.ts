/**
 * Tesseract Clockwork Synth — Lookahead Micro-Impulse Scheduler & Sub-Harmonics
 *
 * Implements a high-precision lookahead audioContext.currentTime scheduler
 * triggering crystalline micro-impulse ticking with polyrhythmic delays, alongside
 * an ominous 5D gravitational sub-harmonic drone cluster (29.14Hz Bb0, 43.65Hz F1, 69.30Hz Db2).
 * Responsive to relativistic time dilation (tau in [0.1, 1.0]).
 */

export class TesseractClockworkSynth {
  private readonly context: BaseAudioContext;

  private isStarted: boolean = false;
  private isDisposed: boolean = false;

  // Lookahead Clock Scheduler
  private baseBpm: number = 72;
  private timeDilation: number = 1.0;
  private nextTickTime: number = 0.0;
  private lastScheduledTime: number = 0.0;
  private timerId: any = null;
  private readonly lookaheadSeconds: number = 0.15; // 150ms lookahead
  private readonly scheduleIntervalMs: number = 35; // 35ms polling

  // Audio Graph Nodes
  private tickBusGain: GainNode;
  private echoDelay: DelayNode;
  private echoFeedback: GainNode;
  private subDroneMixer: GainNode;
  private subFilter: BiquadFilterNode;
  private subOscillators: OscillatorNode[] = [];
  private subGains: GainNode[] = [];
  private tremoloOsc: OscillatorNode | null = null;
  private tremoloGain: GainNode | null = null;

  private masterOutput: GainNode;
  private currentGain: number = 0.75;

  constructor(context: BaseAudioContext) {
    this.context = context;

    // 1. Tick Bus & Polyrhythmic Cross-Delay
    this.tickBusGain = this.context.createGain();
    this.tickBusGain.gain.setValueAtTime(0.8, this.context.currentTime);

    this.echoDelay = this.context.createDelay(1.0);
    this.echoDelay.delayTime.setValueAtTime(0.3125, this.context.currentTime); // 3/16th delay @ 72BPM

    this.echoFeedback = this.context.createGain();
    this.echoFeedback.gain.setValueAtTime(Math.min(0.85, 0.35), this.context.currentTime);

    this.tickBusGain.connect(this.echoDelay);
    this.echoDelay.connect(this.echoFeedback);
    this.echoFeedback.connect(this.echoDelay);

    // 2. Deep Sub-Harmonic Drone Cluster (Bb0: 29.14Hz, F1: 43.65Hz, Db2: 69.30Hz)
    this.subDroneMixer = this.context.createGain();
    this.subDroneMixer.gain.setValueAtTime(0.5, this.context.currentTime);

    this.subFilter = this.context.createBiquadFilter();
    this.subFilter.type = 'lowpass';
    this.subFilter.frequency.setValueAtTime(120, this.context.currentTime);
    this.subFilter.Q.setValueAtTime(1.8, this.context.currentTime);

    this.subDroneMixer.connect(this.subFilter);

    // 3. Master Output Gain
    this.masterOutput = this.context.createGain();
    this.masterOutput.gain.setValueAtTime(0.0001, this.context.currentTime);

    this.tickBusGain.connect(this.masterOutput);
    this.echoDelay.connect(this.masterOutput);
    this.subFilter.connect(this.masterOutput);

    // 4. Build Sub-Bass Drone Cluster
    this.buildSubDroneCluster();
  }

  private buildSubDroneCluster(): void {
    const droneConfigs = [
      { freq: 29.14, type: 'sine' as OscillatorType, gain: 0.55 }, // Bb0
      { freq: 43.65, type: 'sine' as OscillatorType, gain: 0.45 }, // F1
      { freq: 69.30, type: 'triangle' as OscillatorType, gain: 0.30 }, // Db2
    ];

    try {
      this.tremoloOsc = this.context.createOscillator();
      this.tremoloOsc.frequency.setValueAtTime(0.15, this.context.currentTime); // 0.15Hz breathing
      this.tremoloGain = this.context.createGain();
      this.tremoloGain.gain.setValueAtTime(0.15, this.context.currentTime);
      this.tremoloOsc.connect(this.tremoloGain);
    } catch {
      this.tremoloOsc = null;
      this.tremoloGain = null;
    }

    for (const config of droneConfigs) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      osc.type = config.type;
      const freq = Math.max(20, Math.min(20000, config.freq));
      osc.frequency.setValueAtTime(freq, this.context.currentTime);
      gain.gain.setValueAtTime(config.gain, this.context.currentTime);

      osc.connect(gain);
      gain.connect(this.subDroneMixer);

      if (this.tremoloGain) {
        try {
          this.tremoloGain.connect(gain.gain);
        } catch {}
      }

      this.subOscillators.push(osc);
      this.subGains.push(gain);
    }
  }

  /**
   * Schedules a single micro-impulse tick at precise Web Audio timestamp
   */
  private scheduleTick(time: number): void {
    if (this.isDisposed || this.context.state === 'closed') return;

    try {
      // 1. High Metallic Click (instantaneous pitch drop 3400Hz -> 400Hz)
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      const pitchScale = Math.max(0.4, Math.sqrt(this.timeDilation));
      const startFreq = Math.max(400, 3400 * pitchScale);
      const endFreq = Math.max(100, 400 * pitchScale);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, time);
      try {
        osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.012);
      } catch {
        osc.frequency.setValueAtTime(endFreq, time + 0.012);
      }

      gain.gain.setValueAtTime(0.45, time);
      try {
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.018);
      } catch {
        gain.gain.linearRampToValueAtTime(0.0, time + 0.018);
      }

      osc.connect(gain);
      gain.connect(this.tickBusGain);

      osc.start(time);
      osc.stop(time + 0.025);

      // 2. Micro Noise / Friction Click (Wood/Gear transient)
      const noiseOsc = this.context.createOscillator();
      const noiseFilter = this.context.createBiquadFilter();
      const noiseGain = this.context.createGain();

      noiseOsc.type = 'triangle';
      noiseOsc.frequency.setValueAtTime(2200 * pitchScale, time);

      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2200, time);
      noiseFilter.Q.setValueAtTime(6.0, time);

      noiseGain.gain.setValueAtTime(0.35, time);
      try {
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.008);
      } catch {
        noiseGain.gain.linearRampToValueAtTime(0.0, time + 0.008);
      }

      noiseOsc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.tickBusGain);

      noiseOsc.start(time);
      noiseOsc.stop(time + 0.015);
    } catch {
      // Ignore if node scheduling fails during fast teardown
    }
  }

  /**
   * Lookahead polling scheduler loop
   */
  private tickScheduler = (): void => {
    if (!this.isStarted || this.isDisposed || this.context.state === 'closed') {
      return;
    }

    const currentCtxTime = this.context.currentTime;

    // Handle time desync or clock jumps
    if (currentCtxTime < this.lastScheduledTime - 1.0) {
      this.nextTickTime = currentCtxTime + 0.05;
    }
    this.lastScheduledTime = currentCtxTime;

    // Calculate current tick interval based on BPM & time dilation
    const clampedTau = Math.max(0.1, Math.min(1.0, this.timeDilation));
    const effectiveBpm = Math.max(6, this.baseBpm * clampedTau);
    // Interval clamped to minimum 50ms (0.05s)
    const tickInterval = Math.max(0.05, 60.0 / effectiveBpm);

    // Schedule events within the lookahead window
    let scheduleCount = 0;
    const maxEventsPerCycle = 32;

    while (
      this.nextTickTime < currentCtxTime + this.lookaheadSeconds &&
      scheduleCount < maxEventsPerCycle
    ) {
      if (this.nextTickTime >= currentCtxTime) {
        this.scheduleTick(this.nextTickTime);
      }
      this.nextTickTime += tickInterval;
      scheduleCount++;
    }

    // Ensure next tick time doesn't fall behind current time
    if (this.nextTickTime < currentCtxTime) {
      this.nextTickTime = currentCtxTime + tickInterval;
    }

    if (this.isStarted && !this.isDisposed) {
      this.timerId = setTimeout(this.tickScheduler, this.scheduleIntervalMs);
    }
  };

  /**
   * Starts the clockwork scheduler and sub-harmonic drone oscillators
   */
  public start(time?: number, attackDuration: number = 0.8): void {
    if (this.isStarted || this.isDisposed) return;
    this.isStarted = true;

    const startTime = time ?? this.context.currentTime;
    const safeAttack = Math.max(0.001, attackDuration);

    for (const osc of this.subOscillators) {
      try {
        osc.start(startTime);
      } catch {}
    }
    try {
      this.tremoloOsc?.start(startTime);
    } catch {}

    this.nextTickTime = startTime + 0.05;

    // Ramp up output gain
    this.masterOutput.gain.cancelScheduledValues?.(startTime);
    this.masterOutput.gain.setValueAtTime(0.0001, startTime);
    try {
      this.masterOutput.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.currentGain), startTime + safeAttack);
    } catch {
      this.masterOutput.gain.linearRampToValueAtTime(this.currentGain, startTime + safeAttack);
    }

    // Trigger lookahead scheduler
    this.tickScheduler();
  }

  /**
   * Stops the clockwork scheduler and drone oscillators with release fade
   */
  public stop(time?: number, releaseDuration: number = 0.3): void {
    if (!this.isStarted || this.isDisposed) return;

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    const stopTime = time ?? this.context.currentTime;
    const safeRelease = Math.max(0.001, releaseDuration);

    this.masterOutput.gain.cancelScheduledValues?.(stopTime);
    this.masterOutput.gain.setValueAtTime(this.masterOutput.gain.value, stopTime);
    try {
      this.masterOutput.gain.exponentialRampToValueAtTime(0.0001, stopTime + safeRelease);
    } catch {
      this.masterOutput.gain.linearRampToValueAtTime(0.0, stopTime + safeRelease);
    }

    const endOscTime = stopTime + safeRelease + 0.05;
    for (const osc of this.subOscillators) {
      try {
        osc.stop(endOscTime);
      } catch {}
    }
    try {
      this.tremoloOsc?.stop(endOscTime);
    } catch {}

    this.isStarted = false;
  }

  /**
   * Updates relativistic time dilation scalar [0.1, 1.0]
   */
  public setTimeDilation(tau: number): void {
    const clampedTau = Number.isFinite(tau) ? Math.max(0.1, Math.min(1.0, tau)) : 1.0;
    this.timeDilation = clampedTau;

    // Adjust sub drone filter frequency down with heavy time dilation
    const subCutoff = Math.max(30, 120 * clampedTau);
    try {
      this.subFilter.frequency.setTargetAtTime(subCutoff, this.context.currentTime, 0.05);
    } catch {
      this.subFilter.frequency.setValueAtTime(subCutoff, this.context.currentTime);
    }
  }

  public setGain(gain: number, time?: number): void {
    if (this.isDisposed) return;
    const safeGain = Number.isFinite(gain) ? Math.max(0.0, Math.min(1.0, gain)) : 0.75;
    this.currentGain = safeGain;
    const t = time ?? this.context.currentTime;

    if (this.isStarted) {
      try {
        this.masterOutput.gain.setTargetAtTime(safeGain, t, 0.04);
      } catch {
        this.masterOutput.gain.setValueAtTime(safeGain, t);
      }
    }
  }

  public connect(destination: AudioNode): void {
    this.masterOutput.connect(destination);
  }

  public disconnect(destination?: AudioNode): void {
    try {
      this.masterOutput.disconnect(destination as any);
    } catch {}
  }

  public getOutputNode(): GainNode {
    return this.masterOutput;
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.stop(this.context.currentTime, 0.01);

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    for (const osc of this.subOscillators) {
      try {
        osc.disconnect();
      } catch {}
    }
    for (const g of this.subGains) {
      try {
        g.disconnect();
      } catch {}
    }

    try {
      this.tickBusGain.disconnect();
      this.echoDelay.disconnect();
      this.echoFeedback.disconnect();
      this.subDroneMixer.disconnect();
      this.subFilter.disconnect();
      this.masterOutput.disconnect();
      this.tremoloGain?.disconnect();
      this.tremoloOsc?.disconnect();
    } catch {}

    this.subOscillators = [];
    this.subGains = [];
  }
}
