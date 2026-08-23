/**
 * Wormhole Pad Synth — Ethereal Cosmic Supersaw Pad with Stereo Chorus Delay
 *
 * Synthesizes an expansive, swirling cosmic soundscape featuring 6 detuned
 * supersaw harmonic voices, dual-channel stereo modulated chorus delays, and
 * a resonant bandpass filter dynamically swept by hand rotation and warp velocity.
 */

export interface PadVoiceConfig {
  freq: number;
  type: OscillatorType;
  detuneCents: number;
  gain: number;
}

export const WORMHOLE_PAD_VOICES: PadVoiceConfig[] = [
  { freq: 73.416, type: 'sawtooth', detuneCents: -7.0, gain: 0.35 }, // D2 -7ct
  { freq: 73.416, type: 'sawtooth', detuneCents: 7.0, gain: 0.35 },  // D2 +7ct
  { freq: 110.000, type: 'sawtooth', detuneCents: -5.0, gain: 0.30 }, // A2 -5ct
  { freq: 174.614, type: 'sawtooth', detuneCents: 4.0, gain: 0.25 },  // F3 +4ct
  { freq: 261.626, type: 'sawtooth', detuneCents: -6.0, gain: 0.20 }, // C4 -6ct
  { freq: 329.628, type: 'sine', detuneCents: 5.0, gain: 0.18 },     // E4 +5ct (shimmer top)
];

export class WormholePadSynth {
  private readonly context: BaseAudioContext;
  private isStarted: boolean = false;
  private isDisposed: boolean = false;

  // Oscillators & Mixer
  private oscillators: OscillatorNode[] = [];
  private voiceGains: GainNode[] = [];
  private mixerGain: GainNode;

  // Stereo Chorus Delay Line
  private leftDelay: DelayNode;
  private rightDelay: DelayNode;
  private leftFeedback: GainNode;
  private rightFeedback: GainNode;
  private lfoLeft: OscillatorNode | null = null;
  private lfoRight: OscillatorNode | null = null;
  private lfoGainLeft: GainNode | null = null;
  private lfoGainRight: GainNode | null = null;

  // Resonant Bandpass Filter & Master Output
  private bandpassFilter: BiquadFilterNode;
  private outputGain: GainNode;

  private currentGain: number = 0.75;
  private currentCutoff: number = 800;
  private currentQ: number = 3.8;
  private pitchMultiplier: number = 1.0;

  constructor(context: BaseAudioContext) {
    this.context = context;

    // 1. Voice Summing Mixer
    this.mixerGain = this.context.createGain();
    this.mixerGain.gain.setValueAtTime(0.4, this.context.currentTime);

    // 2. Dual Chorus Delay Lines (Stereo Decorrelation)
    this.leftDelay = this.context.createDelay(1.0);
    this.leftDelay.delayTime.setValueAtTime(0.022, this.context.currentTime); // 22ms base

    this.rightDelay = this.context.createDelay(1.0);
    this.rightDelay.delayTime.setValueAtTime(0.031, this.context.currentTime); // 31ms base

    this.leftFeedback = this.context.createGain();
    this.leftFeedback.gain.setValueAtTime(Math.min(0.85, 0.40), this.context.currentTime);

    this.rightFeedback = this.context.createGain();
    this.rightFeedback.gain.setValueAtTime(Math.min(0.85, 0.40), this.context.currentTime);

    // Wire Delay feedback loops
    this.mixerGain.connect(this.leftDelay);
    this.mixerGain.connect(this.rightDelay);
    this.leftDelay.connect(this.leftFeedback);
    this.leftFeedback.connect(this.leftDelay);
    this.rightDelay.connect(this.rightFeedback);
    this.rightFeedback.connect(this.rightDelay);

    // 3. Resonant Bandpass Filter
    this.bandpassFilter = this.context.createBiquadFilter();
    this.bandpassFilter.type = 'bandpass';
    this.bandpassFilter.frequency.setValueAtTime(this.currentCutoff, this.context.currentTime);
    this.bandpassFilter.Q.setValueAtTime(this.currentQ, this.context.currentTime);

    this.leftDelay.connect(this.bandpassFilter);
    this.rightDelay.connect(this.bandpassFilter);
    this.mixerGain.connect(this.bandpassFilter); // direct dry blend

    // 4. Output Gain Node / Envelope
    this.outputGain = this.context.createGain();
    this.outputGain.gain.setValueAtTime(0.0001, this.context.currentTime);
    this.bandpassFilter.connect(this.outputGain);

    // 5. Build Oscillator Bank & LFOs
    this.buildVoices();
    this.setupChorusLFOs();
  }

  private buildVoices(): void {
    for (const voice of WORMHOLE_PAD_VOICES) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      osc.type = voice.type;
      const baseFreq = Math.max(20, Math.min(20000, voice.freq));
      osc.frequency.setValueAtTime(baseFreq, this.context.currentTime);
      osc.detune.setValueAtTime(voice.detuneCents, this.context.currentTime);

      gain.gain.setValueAtTime(voice.gain, this.context.currentTime);

      osc.connect(gain);
      gain.connect(this.mixerGain);

      this.oscillators.push(osc);
      this.voiceGains.push(gain);
    }
  }

  private setupChorusLFOs(): void {
    try {
      // Left LFO: 0.25 Hz sine, +/- 4.5ms
      this.lfoLeft = this.context.createOscillator();
      this.lfoLeft.frequency.setValueAtTime(0.25, this.context.currentTime);
      this.lfoGainLeft = this.context.createGain();
      this.lfoGainLeft.gain.setValueAtTime(0.0045, this.context.currentTime);
      this.lfoLeft.connect(this.lfoGainLeft);
      this.lfoGainLeft.connect(this.leftDelay.delayTime);

      // Right LFO: 0.38 Hz sine, +/- 5.2ms
      this.lfoRight = this.context.createOscillator();
      this.lfoRight.frequency.setValueAtTime(0.38, this.context.currentTime);
      this.lfoGainRight = this.context.createGain();
      this.lfoGainRight.gain.setValueAtTime(0.0052, this.context.currentTime);
      this.lfoRight.connect(this.lfoGainRight);
      this.lfoGainRight.connect(this.rightDelay.delayTime);
    } catch {
      // AudioParam connection fallback for limited test mock environments
      this.lfoLeft = null;
      this.lfoRight = null;
      this.lfoGainLeft = null;
      this.lfoGainRight = null;
    }
  }

  /**
   * Start pad oscillators and smoothly ramp volume up
   */
  public start(time?: number, attackDuration: number = 1.0): void {
    if (this.isStarted || this.isDisposed) return;
    this.isStarted = true;

    const startTime = time ?? this.context.currentTime;
    const safeAttack = Math.max(0.001, attackDuration);

    for (const osc of this.oscillators) {
      try {
        osc.start(startTime);
      } catch {}
    }

    try {
      this.lfoLeft?.start(startTime);
      this.lfoRight?.start(startTime);
    } catch {}

    this.outputGain.gain.cancelScheduledValues?.(startTime);
    this.outputGain.gain.setValueAtTime(0.0001, startTime);
    try {
      this.outputGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.currentGain), startTime + safeAttack);
    } catch {
      this.outputGain.gain.linearRampToValueAtTime(this.currentGain, startTime + safeAttack);
    }
  }

  /**
   * Stop pad oscillators with smooth envelope release
   */
  public stop(time?: number, releaseDuration: number = 0.5): void {
    if (!this.isStarted || this.isDisposed) return;

    const stopTime = time ?? this.context.currentTime;
    const safeRelease = Math.max(0.001, Math.min(0.5, releaseDuration));

    this.outputGain.gain.cancelScheduledValues?.(stopTime);
    this.outputGain.gain.setValueAtTime(this.outputGain.gain.value, stopTime);
    try {
      this.outputGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + safeRelease);
    } catch {
      this.outputGain.gain.linearRampToValueAtTime(0.0, stopTime + safeRelease);
    }

    const endOscTime = stopTime + safeRelease + 0.05;
    for (const osc of this.oscillators) {
      try {
        osc.stop(endOscTime);
      } catch {}
    }
    try {
      this.lfoLeft?.stop(endOscTime);
      this.lfoRight?.stop(endOscTime);
    } catch {}

    this.isStarted = false;
  }

  /**
   * Dynamic sweep for bandpass filter frequency
   */
  public setCutoff(frequency: number, time?: number): void {
    if (this.isDisposed) return;
    const safeFreq = Number.isFinite(frequency) ? Math.max(20, Math.min(20000, frequency)) : 800;
    this.currentCutoff = safeFreq;
    const t = time ?? this.context.currentTime;

    try {
      this.bandpassFilter.frequency.setTargetAtTime(safeFreq, t, 0.04);
    } catch {
      this.bandpassFilter.frequency.setValueAtTime(safeFreq, t);
    }
  }

  /**
   * Modulate bandpass filter resonance Q
   */
  public setResonance(q: number, time?: number): void {
    if (this.isDisposed) return;
    const safeQ = Number.isFinite(q) ? Math.max(0.1, Math.min(25.0, q)) : 3.8;
    this.currentQ = safeQ;
    const t = time ?? this.context.currentTime;

    try {
      this.bandpassFilter.Q.setTargetAtTime(safeQ, t, 0.04);
    } catch {
      this.bandpassFilter.Q.setValueAtTime(safeQ, t);
    }
  }

  /**
   * Modulate master pad gain
   */
  public setGain(gain: number, time?: number): void {
    if (this.isDisposed) return;
    const safeGain = Number.isFinite(gain) ? Math.max(0.0, Math.min(1.0, gain)) : 0.75;
    this.currentGain = safeGain;
    const t = time ?? this.context.currentTime;

    if (this.isStarted) {
      try {
        this.outputGain.gain.setTargetAtTime(safeGain, t, 0.04);
      } catch {
        this.outputGain.gain.setValueAtTime(safeGain, t);
      }
    }
  }

  /**
   * Exponential pitch glide for warp acceleration / fly-through boost
   * @param factor Frequency multiplier (e.g. 1.0 to 2.0)
   * @param time Timestamp
   * @param duration Glide duration in seconds
   */
  public setPitchGlide(factor: number, time?: number, duration: number = 1.0): void {
    if (this.isDisposed) return;
    const safeFactor = Number.isFinite(factor) ? Math.max(0.25, Math.min(4.0, factor)) : 1.0;
    this.pitchMultiplier = safeFactor;
    const t = time ?? this.context.currentTime;
    const d = Math.max(0.05, duration);

    for (let i = 0; i < this.oscillators.length; i++) {
      const osc = this.oscillators[i];
      const baseFreq = WORMHOLE_PAD_VOICES[i].freq;
      const targetFreq = Math.max(20, Math.min(20000, baseFreq * safeFactor));

      try {
        osc.frequency.cancelScheduledValues?.(t);
        osc.frequency.setValueAtTime(osc.frequency.value, t);
        osc.frequency.exponentialRampToValueAtTime(targetFreq, t + d);
      } catch {
        osc.frequency.setValueAtTime(targetFreq, t);
      }
    }
  }

  public connect(destination: AudioNode): void {
    this.outputGain.connect(destination);
  }

  public disconnect(destination?: AudioNode): void {
    try {
      this.outputGain.disconnect(destination as any);
    } catch {}
  }

  public getOutputNode(): GainNode {
    return this.outputGain;
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.stop(this.context.currentTime, 0.01);

    for (const osc of this.oscillators) {
      try {
        osc.disconnect();
      } catch {}
    }
    for (const g of this.voiceGains) {
      try {
        g.disconnect();
      } catch {}
    }
    try {
      this.mixerGain.disconnect();
      this.leftDelay.disconnect();
      this.rightDelay.disconnect();
      this.leftFeedback.disconnect();
      this.rightFeedback.disconnect();
      this.bandpassFilter.disconnect();
      this.outputGain.disconnect();
      this.lfoGainLeft?.disconnect();
      this.lfoGainRight?.disconnect();
      this.lfoLeft?.disconnect();
      this.lfoRight?.disconnect();
    } catch {}

    this.oscillators = [];
    this.voiceGains = [];
  }
}
