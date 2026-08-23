/**
 * Gargantua Organ Synth — Hans Zimmer Pipe Organ Additive Synthesis
 *
 * Emulates the monumental pipe organ drone heard in Interstellar (Cornfield Chase,
 * Stay, No Time for Caution) via 6 harmonic pipe ranks (32' to 1 1/3'), WaveShaper
 * saturation distortion, cascaded 24dB/oct resonant lowpass filtering, and slow LFO detuning.
 */

export interface PipeRankConfig {
  name: string;
  footage: string;
  multiplier: number;
  type: OscillatorType;
  baseGain: number;
  detuneCents: number;
}

export const GARGANTUA_PIPE_RANKS: PipeRankConfig[] = [
  { name: 'Sub-Bourdon', footage: "32'", multiplier: 1.0, type: 'sine', baseGain: 0.85, detuneCents: 0.0 },
  { name: 'Principal Bass', footage: "16'", multiplier: 2.0, type: 'triangle', baseGain: 0.70, detuneCents: 1.5 },
  { name: 'Diapason', footage: "8'", multiplier: 4.0, type: 'triangle', baseGain: 0.55, detuneCents: -2.2 },
  { name: 'Octave', footage: "4'", multiplier: 8.0, type: 'sawtooth', baseGain: 0.35, detuneCents: 3.1 },
  { name: 'Super Octave', footage: "2'", multiplier: 16.0, type: 'sawtooth', baseGain: 0.20, detuneCents: -4.0 },
  { name: 'Mixture', footage: "1 1/3'", multiplier: 24.0, type: 'sine', baseGain: 0.10, detuneCents: 2.8 },
];

export class GargantuaOrganSynth {
  private readonly context: BaseAudioContext;
  private readonly baseFrequency: number;

  private isStarted: boolean = false;
  private isDisposed: boolean = false;

  // Node Graph
  private oscillators: OscillatorNode[] = [];
  private pipeGains: GainNode[] = [];
  private mixerGain: GainNode;
  private waveShaper: WaveShaperNode;
  private filter1: BiquadFilterNode;
  private filter2: BiquadFilterNode;
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private outputGain: GainNode;

  private currentGain: number = 0.8;
  private currentCutoff: number = 450;
  private currentQ: number = 2.5;

  constructor(context: BaseAudioContext, rootFrequency: number = 32.703) {
    this.context = context;
    // Clamp root frequency to safe audible bounds [20Hz, 20000Hz]
    this.baseFrequency = Math.max(20, Math.min(20000, rootFrequency));

    // 1. Create summing mixer node
    this.mixerGain = this.context.createGain();
    this.mixerGain.gain.setValueAtTime(0.4, this.context.currentTime);

    // 2. Create WaveShaper for non-linear warm tube saturation
    this.waveShaper = this.context.createWaveShaper();
    this.waveShaper.curve = this.createSaturationCurve(256, 2.5) as any;
    this.waveShaper.oversample = 'none';

    // 3. Cascaded 24dB/oct resonant lowpass filters (two 12dB/oct stages)
    this.filter1 = this.context.createBiquadFilter();
    this.filter1.type = 'lowpass';
    this.filter1.frequency.setValueAtTime(this.currentCutoff, this.context.currentTime);
    this.filter1.Q.setValueAtTime(this.currentQ, this.context.currentTime);

    this.filter2 = this.context.createBiquadFilter();
    this.filter2.type = 'lowpass';
    this.filter2.frequency.setValueAtTime(this.currentCutoff, this.context.currentTime);
    this.filter2.Q.setValueAtTime(this.currentQ, this.context.currentTime);

    // 4. Master Output Gain / Envelope
    this.outputGain = this.context.createGain();
    this.outputGain.gain.setValueAtTime(0.0001, this.context.currentTime);

    // 5. Connect processing pipeline
    this.mixerGain.connect(this.waveShaper);
    this.waveShaper.connect(this.filter1);
    this.filter1.connect(this.filter2);
    this.filter2.connect(this.outputGain);

    // 6. Build Harmonic Pipe Oscillators
    this.buildPipeRanks();
  }

  /**
   * Generates a non-linear soft-clipping saturation curve:
   * f(x) = ((1 + k) * x) / (1 + k * |x|)
   */
  private createSaturationCurve(samples: number = 256, k: number = 2.5): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * Instantiates each harmonic pipe rank oscillator and connects to mixer
   */
  private buildPipeRanks(): void {
    // Build slow LFO (0.07 Hz) for detuning chorus swell
    try {
      this.lfoOsc = this.context.createOscillator();
      this.lfoOsc.frequency.setValueAtTime(0.07, this.context.currentTime);
      this.lfoGain = this.context.createGain();
      this.lfoGain.gain.setValueAtTime(3.5, this.context.currentTime); // +/- 3.5 cents
      this.lfoOsc.connect(this.lfoGain);
    } catch {
      // Graceful fallback for mock contexts lacking full LFO routing
      this.lfoOsc = null;
      this.lfoGain = null;
    }

    for (const rank of GARGANTUA_PIPE_RANKS) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      osc.type = rank.type;
      const freq = Math.max(20, Math.min(20000, this.baseFrequency * rank.multiplier));
      osc.frequency.setValueAtTime(freq, this.context.currentTime);
      osc.detune.setValueAtTime(rank.detuneCents, this.context.currentTime);

      gain.gain.setValueAtTime(rank.baseGain, this.context.currentTime);

      osc.connect(gain);
      gain.connect(this.mixerGain);

      // Connect LFO detune modulation if supported
      if (this.lfoGain) {
        try {
          this.lfoGain.connect(osc.detune);
        } catch {
          // AudioParam connection not supported in some mock environments
        }
      }

      this.oscillators.push(osc);
      this.pipeGains.push(gain);
    }
  }

  /**
   * Starts all pipe oscillators with smooth envelope attack
   */
  public start(time?: number, attackDuration: number = 0.8): void {
    if (this.isStarted || this.isDisposed) return;
    this.isStarted = true;

    const startTime = time ?? this.context.currentTime;
    const safeAttack = Math.max(0.001, attackDuration);

    for (const osc of this.oscillators) {
      try {
        osc.start(startTime);
      } catch {
        // Safe catch if already started
      }
    }

    if (this.lfoOsc) {
      try {
        this.lfoOsc.start(startTime);
      } catch {}
    }

    // Ramp up output envelope smoothly
    this.outputGain.gain.cancelScheduledValues?.(startTime);
    this.outputGain.gain.setValueAtTime(0.0001, startTime);
    try {
      this.outputGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.currentGain), startTime + safeAttack);
    } catch {
      this.outputGain.gain.linearRampToValueAtTime(this.currentGain, startTime + safeAttack);
    }
  }

  /**
   * Stops the pipe organ synth with smooth release
   */
  public stop(time?: number, releaseDuration: number = 0.4): void {
    if (!this.isStarted || this.isDisposed) return;

    const stopTime = time ?? this.context.currentTime;
    const safeRelease = Math.max(0.001, releaseDuration);

    this.outputGain.gain.cancelScheduledValues?.(stopTime);
    this.outputGain.gain.setValueAtTime(this.outputGain.gain.value, stopTime);
    try {
      this.outputGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + safeRelease);
    } catch {
      this.outputGain.gain.linearRampToValueAtTime(0.0, stopTime + safeRelease);
    }

    // Schedule stop on oscillators after release
    const endOscTime = stopTime + safeRelease + 0.05;
    for (const osc of this.oscillators) {
      try {
        osc.stop(endOscTime);
      } catch {}
    }
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop(endOscTime);
      } catch {}
    }

    this.isStarted = false;
  }

  /**
   * Modulate lowpass filter cutoff frequency
   */
  public setCutoff(frequency: number, time?: number): void {
    if (this.isDisposed) return;
    const safeFreq = Number.isFinite(frequency) ? Math.max(20, Math.min(20000, frequency)) : 450;
    this.currentCutoff = safeFreq;
    const t = time ?? this.context.currentTime;

    try {
      this.filter1.frequency.setTargetAtTime(safeFreq, t, 0.05);
      this.filter2.frequency.setTargetAtTime(safeFreq, t, 0.05);
    } catch {
      this.filter1.frequency.setValueAtTime(safeFreq, t);
      this.filter2.frequency.setValueAtTime(safeFreq, t);
    }
  }

  /**
   * Modulate filter resonance Q
   */
  public setResonance(q: number, time?: number): void {
    if (this.isDisposed) return;
    const safeQ = Number.isFinite(q) ? Math.max(0.1, Math.min(25.0, q)) : 2.5;
    this.currentQ = safeQ;
    const t = time ?? this.context.currentTime;

    try {
      this.filter1.Q.setTargetAtTime(safeQ, t, 0.05);
      this.filter2.Q.setTargetAtTime(safeQ, t, 0.05);
    } catch {
      this.filter1.Q.setValueAtTime(safeQ, t);
      this.filter2.Q.setValueAtTime(safeQ, t);
    }
  }

  /**
   * Modulate volume gain
   */
  public setGain(gain: number, time?: number): void {
    if (this.isDisposed) return;
    const safeGain = Number.isFinite(gain) ? Math.max(0.0, Math.min(1.0, gain)) : 0.8;
    this.currentGain = safeGain;
    const t = time ?? this.context.currentTime;

    if (this.isStarted) {
      try {
        this.outputGain.gain.setTargetAtTime(safeGain, t, 0.05);
      } catch {
        this.outputGain.gain.setValueAtTime(safeGain, t);
      }
    }
  }

  /**
   * Modulate volume based on gesture intensity [0.0, 1.0]
   */
  public setIntensity(intensity: number, time?: number): void {
    const safeIntensity = Number.isFinite(intensity) ? Math.max(0.0, Math.min(1.0, intensity)) : 0.0;
    const mappedGain = 0.2 + safeIntensity * 0.6; // [0.2, 0.8]
    this.setGain(mappedGain, time);
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
    for (const g of this.pipeGains) {
      try {
        g.disconnect();
      } catch {}
    }
    try {
      this.mixerGain.disconnect();
      this.waveShaper.disconnect();
      this.filter1.disconnect();
      this.filter2.disconnect();
      this.outputGain.disconnect();
      this.lfoGain?.disconnect();
      this.lfoOsc?.disconnect();
    } catch {}

    this.oscillators = [];
    this.pipeGains = [];
  }
}
