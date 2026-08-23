/**
 * Procedural Web Audio Engine — Master Soundscape Graph & Scene Crossfader
 *
 * 100% synthesized Web Audio API sound architecture (zero external sample assets).
 * Manages spatial cathedral convolution reverb, Hans Zimmer pipe organ, ethereal
 * supersaw cosmic pad, lookahead tesseract clockwork scheduler, dynamic gesture
 * modulation coupler, equal-power 1.5s scene crossfading, and MediaStream destination.
 */

import { GestureState, IAudioEngine } from '../core/types';
import { generateReverbImpulse } from './ReverbGenerator';
import { GargantuaOrganSynth } from './GargantuaOrganSynth';
import { WormholePadSynth } from './WormholePadSynth';
import { TesseractClockworkSynth } from './TesseractClockworkSynth';
import { GestureAudioCoupler } from './GestureAudioCoupler';

export class AudioEngine implements IAudioEngine {
  private context: AudioContext | BaseAudioContext | null = null;
  private isInitialized: boolean = false;
  private isDisposed: boolean = false;
  private isMuted: boolean = false;

  // Active scene tracking
  private activeSceneName: string = 'gargantua';
  private crossfadeTimer: any = null;
  private crossfadeAnimFrame: any = null;

  // Synths
  private organSynth: GargantuaOrganSynth | null = null;
  private padSynth: WormholePadSynth | null = null;
  private clockSynth: TesseractClockworkSynth | null = null;
  private coupler: GestureAudioCoupler | null = null;

  // Scene Stem Gains
  private gargantuaStemGain: GainNode | null = null;
  private wormholeStemGain: GainNode | null = null;
  private tesseractStemGain: GainNode | null = null;

  // Master Processing Nodes
  private masterFilter: BiquadFilterNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private mixerSum: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  private userMasterVolume: number = 0.8;
  private unlockEventListeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];

  constructor(customContext?: BaseAudioContext) {
    if (customContext) {
      this.context = customContext;
    }
  }

  /**
   * Initializes the procedural Web Audio graph and synths
   */
  public async init(): Promise<void> {
    if (this.isInitialized || this.isDisposed) return;

    // 1. Resolve or instantiate AudioContext
    if (!this.context) {
      const AudioContextClass =
        (globalThis as any).AudioContext ||
        (globalThis as any).webkitAudioContext;

      if (AudioContextClass) {
        this.context = new AudioContextClass();
      } else {
        console.warn('[AudioEngine] Web Audio API not supported in this environment.');
        return;
      }
    }

    const ctx = this.context!;

    // 2. Setup browser autoplay unlock listeners
    this.setupAutoplayUnlock();

    // 3. Instantiate Master Processing Chain
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.setValueAtTime(2500, ctx.currentTime);
    this.masterFilter.Q.setValueAtTime(1.0, ctx.currentTime);

    // Convolver & Algorithmic Cathedral Reverb IR (3.8s decay)
    this.convolver = ctx.createConvolver();
    try {
      this.convolver.buffer = generateReverbImpulse(ctx, 3.8, 2.4, false);
      this.convolver.normalize = true;
    } catch (e) {
      console.warn('[AudioEngine] Failed to generate convolution impulse buffer:', e);
    }

    this.reverbWetGain = ctx.createGain();
    this.reverbWetGain.gain.setValueAtTime(0.40, ctx.currentTime);

    this.reverbDryGain = ctx.createGain();
    this.reverbDryGain.gain.setValueAtTime(0.75, ctx.currentTime);

    this.mixerSum = ctx.createGain();
    this.mixerSum.gain.setValueAtTime(1.0, ctx.currentTime);

    // Master Limiter / Dynamics Compressor to prevent clipping
    this.masterLimiter = ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-24, ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(30, ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(12, ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.003, ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.25, ctx.currentTime);

    // Master Gain & MediaStream Destination (for video recorder capture)
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.userMasterVolume, ctx.currentTime);

    try {
      const anyCtx = ctx as any;
      if (anyCtx && typeof anyCtx.createMediaStreamDestination === 'function') {
        this.mediaStreamDest = anyCtx.createMediaStreamDestination();
      }
    } catch {}

    // Connect Reverb Matrix & Master Output
    this.masterFilter.connect(this.convolver);
    this.masterFilter.connect(this.reverbDryGain);

    this.convolver.connect(this.reverbWetGain);

    this.reverbWetGain.connect(this.mixerSum);
    this.reverbDryGain.connect(this.mixerSum);

    this.mixerSum.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterGain);

    if (ctx.destination) {
      this.masterGain.connect(ctx.destination);
    }
    if (this.mediaStreamDest) {
      this.masterGain.connect(this.mediaStreamDest);
    }

    // 4. Create Scene Stem Gains
    this.gargantuaStemGain = ctx.createGain();
    this.gargantuaStemGain.gain.setValueAtTime(1.0, ctx.currentTime); // active initially

    this.wormholeStemGain = ctx.createGain();
    this.wormholeStemGain.gain.setValueAtTime(0.0, ctx.currentTime);

    this.tesseractStemGain = ctx.createGain();
    this.tesseractStemGain.gain.setValueAtTime(0.0, ctx.currentTime);

    this.gargantuaStemGain.connect(this.masterFilter);
    this.wormholeStemGain.connect(this.masterFilter);
    this.tesseractStemGain.connect(this.masterFilter);

    // 5. Instantiate Procedural Synths
    this.organSynth = new GargantuaOrganSynth(ctx);
    this.organSynth.connect(this.gargantuaStemGain);

    this.padSynth = new WormholePadSynth(ctx);
    this.padSynth.connect(this.wormholeStemGain);

    this.clockSynth = new TesseractClockworkSynth(ctx);
    this.clockSynth.connect(this.tesseractStemGain);

    this.coupler = new GestureAudioCoupler(ctx);

    // 6. Start default scene synth
    this.organSynth.start(ctx.currentTime + 0.05);

    this.isInitialized = true;
    console.log('[AudioEngine] Procedural Web Audio Engine initialized.');
  }

  /**
   * Listens for user gestures to unlock AudioContext on autoplay-restricted browsers
   */
  private setupAutoplayUnlock(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const unlock = async () => {
      if (this.context && this.context.state === 'suspended') {
        try {
          await (this.context as AudioContext).resume();
          console.log('[AudioEngine] AudioContext autoplay unlocked.');
        } catch (err) {
          console.warn('[AudioEngine] Autoplay resume failed:', err);
        }
      }
      this.removeAutoplayListeners();
    };

    const events = ['pointerdown', 'click', 'keydown', 'touchstart'];
    for (const evt of events) {
      const listener: EventListener = () => { unlock(); };
      window.addEventListener(evt, listener, { once: true, passive: true });
      this.unlockEventListeners.push({ target: window, type: evt, listener });
    }
  }

  private removeAutoplayListeners(): void {
    for (const { target, type, listener } of this.unlockEventListeners) {
      try {
        target.removeEventListener(type, listener);
      } catch {}
    }
    this.unlockEventListeners = [];
  }

  /**
   * Normalizes scene name string to canonical key ('gargantua' | 'wormhole' | 'tesseract')
   */
  private normalizeSceneName(name: string): 'gargantua' | 'wormhole' | 'tesseract' {
    const lower = name.toLowerCase();
    if (lower.includes('wormhole') || lower.includes('portal')) return 'wormhole';
    if (lower.includes('tesseract') || lower.includes('5d')) return 'tesseract';
    return 'gargantua';
  }

  private getStemGain(sceneKey: 'gargantua' | 'wormhole' | 'tesseract'): GainNode | null {
    switch (sceneKey) {
      case 'gargantua': return this.gargantuaStemGain;
      case 'wormhole': return this.wormholeStemGain;
      case 'tesseract': return this.tesseractStemGain;
    }
  }

  private getSynth(sceneKey: 'gargantua' | 'wormhole' | 'tesseract') {
    switch (sceneKey) {
      case 'gargantua': return this.organSynth;
      case 'wormhole': return this.padSynth;
      case 'tesseract': return this.clockSynth;
    }
  }

  /**
   * Equal-power scene crossfade (1.5s default)
   * cos^2(theta) + sin^2(theta) = 1.0
   */
  public setScene(sceneName: string, transitionDuration: number = 1.5): void {
    if (!this.isInitialized || this.isDisposed || !this.context) return;

    const targetKey = this.normalizeSceneName(sceneName);
    const sourceKey = this.normalizeSceneName(this.activeSceneName);

    if (targetKey === sourceKey && this.activeSceneName !== '') return;
    this.activeSceneName = targetKey;

    const fromGain = this.getStemGain(sourceKey);
    const toGain = this.getStemGain(targetKey);
    const toSynth = this.getSynth(targetKey);

    // Cancel any active crossfade
    if (this.crossfadeTimer) {
      clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    if (this.crossfadeAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.crossfadeAnimFrame);
      this.crossfadeAnimFrame = null;
    }

    // Start target synth if not yet running
    if (toSynth) {
      toSynth.start(this.context.currentTime);
    }

    const duration = Math.max(0.05, transitionDuration);
    const startTime = Date.now();
    const durationMs = duration * 1000;

    const fromStartVal = fromGain ? fromGain.gain.value : 1.0;
    const toStartVal = toGain ? toGain.gain.value : 0.0;

    // Smooth equal-power animated crossfade step loop
    const stepCrossfade = () => {
      if (!this.context || this.isDisposed) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);

      // Equal power trigonometry: angle in [0, pi/2]
      const angle = progress * (Math.PI / 2);
      const outPower = Math.cos(angle); // 1.0 -> 0.0
      const inPower = Math.sin(angle);  // 0.0 -> 1.0

      const currentCtxTime = this.context.currentTime;

      if (fromGain) {
        const val = Math.max(0.0, fromStartVal * outPower);
        try {
          fromGain.gain.setValueAtTime(val, currentCtxTime);
        } catch {}
      }

      if (toGain) {
        const val = Math.min(1.0, toStartVal + (1.0 - toStartVal) * inPower);
        try {
          toGain.gain.setValueAtTime(val, currentCtxTime);
        } catch {}
      }

      if (progress < 1.0) {
        if (typeof requestAnimationFrame !== 'undefined') {
          this.crossfadeAnimFrame = requestAnimationFrame(stepCrossfade);
        } else {
          this.crossfadeTimer = setTimeout(stepCrossfade, 16);
        }
      } else {
        // Crossfade complete: stop old synth to save CPU
        if (fromGain) {
          try { fromGain.gain.setValueAtTime(0.0, this.context.currentTime); } catch {}
        }
        if (toGain) {
          try { toGain.gain.setValueAtTime(1.0, this.context.currentTime); } catch {}
        }
        const oldSynth = this.getSynth(sourceKey);
        if (oldSynth && sourceKey !== targetKey) {
          oldSynth.stop(this.context.currentTime + 0.1);
        }
      }
    };

    stepCrossfade();
  }

  /**
   * Dispatches real-time gesture telemetry to GestureAudioCoupler
   */
  public updateGestureModulation(gestureState: GestureState): void {
    if (!this.isInitialized || this.isDisposed || !this.coupler) return;
    if (!this.masterFilter || !this.reverbWetGain || !this.reverbDryGain || !this.masterGain) return;

    this.coupler.update(
      gestureState,
      this.activeSceneName,
      {
        gargantua: this.organSynth ?? undefined,
        wormhole: this.padSynth ?? undefined,
        tesseract: this.clockSynth ?? undefined,
      },
      {
        masterFilter: this.masterFilter,
        reverbWetGain: this.reverbWetGain,
        reverbDryGain: this.reverbDryGain,
        masterGain: this.masterGain,
      }
    );
  }

  /**
   * Smooth volume muting without clicks
   */
  public setMuted(muted: boolean): void {
    if (!this.isInitialized || this.isDisposed || !this.masterGain || !this.context) return;
    this.isMuted = muted;

    const t = this.context.currentTime;
    const targetVal = muted ? 0.0 : this.userMasterVolume;

    try {
      this.masterGain.gain.cancelScheduledValues?.(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(targetVal, t + 0.05);
    } catch {
      this.masterGain.gain.setValueAtTime(targetVal, t);
    }
  }

  /**
   * Sets base user master volume level [0.0, 1.0]
   */
  public setVolume(volume: number): void {
    const clamped = Math.max(0.0, Math.min(1.0, volume));
    this.userMasterVolume = clamped;
    if (!this.isMuted && this.masterGain && this.context) {
      try {
        this.masterGain.gain.setTargetAtTime(clamped, this.context.currentTime, 0.05);
      } catch {
        this.masterGain.gain.setValueAtTime(clamped, this.context.currentTime);
      }
    }
  }

  /**
   * Exposes Web Audio stream destination for video recording capture
   */
  public getMediaStreamDestination(): MediaStreamAudioDestinationNode | null {
    return this.mediaStreamDest;
  }

  public getContext(): BaseAudioContext | null {
    return this.context;
  }

  /**
   * Fully disposes all synths, processing nodes, event listeners, and audio context
   */
  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    this.removeAutoplayListeners();

    if (this.crossfadeTimer) {
      clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    if (this.crossfadeAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.crossfadeAnimFrame);
      this.crossfadeAnimFrame = null;
    }

    this.organSynth?.dispose();
    this.padSynth?.dispose();
    this.clockSynth?.dispose();

    try {
      this.masterGain?.disconnect();
      this.mixerSum?.disconnect();
      this.masterLimiter?.disconnect();
      this.masterFilter?.disconnect();
      this.convolver?.disconnect();
      this.reverbWetGain?.disconnect();
      this.reverbDryGain?.disconnect();
      this.gargantuaStemGain?.disconnect();
      this.wormholeStemGain?.disconnect();
      this.tesseractStemGain?.disconnect();
    } catch {}

    if (this.context && (this.context as any).close && this.context.state !== 'closed') {
      try {
        (this.context as any).close();
      } catch {}
    }

    this.organSynth = null;
    this.padSynth = null;
    this.clockSynth = null;
    this.coupler = null;
    this.context = null;
    this.isInitialized = false;
  }
}
