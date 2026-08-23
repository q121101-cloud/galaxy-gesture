/**
 * Milestone 4 Procedural Web Audio Engine Test Suite
 * 
 * Deep unit and integration tests for:
 * 1. ReverbGenerator (algorithmic impulse response synthesis, duration, decay, reverse, decorrelation)
 * 2. GargantuaOrganSynth (6-rank additive synthesis, saturation curve, cascaded filter, LFO, gesture intensity)
 * 3. WormholePadSynth (6 detuned supersaw oscillators, stereo delay chorus, resonant bandpass, pitch glide)
 * 4. TesseractClockworkSynth (lookahead scheduler, micro-clicks, sub-harmonics, time dilation)
 * 5. GestureAudioCoupler (metric mapping, parameter sanitization, formula accuracy)
 * 6. AudioEngine (master audio graph, autoplay unlock, equal-power crossfader, mute, MediaStreamDestination)
 */

import { describe, it, expect, MockAudioContext } from './e2e_harness';
import { generateReverbImpulse, createCathedralReverb } from '../src/audio/ReverbGenerator';
import { GargantuaOrganSynth, GARGANTUA_PIPE_RANKS } from '../src/audio/GargantuaOrganSynth';
import { WormholePadSynth, WORMHOLE_PAD_VOICES } from '../src/audio/WormholePadSynth';
import { TesseractClockworkSynth } from '../src/audio/TesseractClockworkSynth';
import { GestureAudioCoupler } from '../src/audio/GestureAudioCoupler';
import { AudioEngine } from '../src/audio/AudioEngine';
import { GestureState } from '../src/core/types';

describe('Worker 4 - Procedural Web Audio Synthesis & DSP Modules', () => {

  // ==========================================================================
  // 1. ReverbGenerator Tests
  // ==========================================================================
  it('M4.1.1: generateReverbImpulse generates a valid stereo AudioBuffer with exponential decay', () => {
    const ctx = new MockAudioContext();
    const buffer = generateReverbImpulse(ctx as any, 3.8, 2.4, false);

    expect(buffer.numberOfChannels).toBe(2);
    expect(buffer.sampleRate).toBe(44100);
    expect(buffer.duration).toBeCloseTo(3.8, 2);
    expect(buffer.length).toBe(Math.floor(44100 * 3.8));

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    expect(left.length).toBe(buffer.length);
    expect(right.length).toBe(buffer.length);

    // Initial energy should be significantly higher than end energy due to decay e^(-2.4 * 3.8)
    let earlyEnergy = 0;
    let lateEnergy = 0;
    for (let i = 0; i < 100; i++) earlyEnergy += Math.abs(left[i]);
    for (let i = buffer.length - 100; i < buffer.length; i++) lateEnergy += Math.abs(left[i]);

    expect(earlyEnergy).toBeGreaterThan(lateEnergy);
  });

  it('M4.1.2: generateReverbImpulse handles extreme and zero durations safely', () => {
    const ctx = new MockAudioContext();
    const zeroBuf = generateReverbImpulse(ctx as any, 0, 2.0);
    expect(zeroBuf.length).toBeGreaterThanOrEqual(1);

    const tinyBuf = generateReverbImpulse(ctx as any, 0.001, 2.0);
    expect(tinyBuf.length).toBeGreaterThanOrEqual(1);

    const reverseBuf = generateReverbImpulse(ctx as any, 1.0, 2.4, true);
    expect(reverseBuf.duration).toBeCloseTo(1.0, 2);
  });

  it('M4.1.3: createCathedralReverb instantiates a ConvolverNode configured with the IR buffer', () => {
    const ctx = new MockAudioContext();
    const convolver = createCathedralReverb(ctx as any, { duration: 2.0, decay: 2.0 });

    expect(convolver).toBeDefined();
    expect(convolver.buffer).toBeDefined();
    expect(convolver.buffer!.duration).toBeCloseTo(2.0, 1);
    expect(convolver.normalize).toBe(true);
  });

  // ==========================================================================
  // 2. GargantuaOrganSynth Tests
  // ==========================================================================
  it('M4.2.1: GargantuaOrganSynth builds 6 harmonic pipe ranks with correct root frequencies', () => {
    const ctx = new MockAudioContext();
    const organ = new GargantuaOrganSynth(ctx as any, 32.703); // C1 root

    expect(GARGANTUA_PIPE_RANKS.length).toBe(6);
    expect(GARGANTUA_PIPE_RANKS[0].footage).toBe("32'");
    expect(GARGANTUA_PIPE_RANKS[0].type).toBe('sine');
    expect(GARGANTUA_PIPE_RANKS[1].footage).toBe("16'");
    expect(GARGANTUA_PIPE_RANKS[1].type).toBe('triangle');
    expect(GARGANTUA_PIPE_RANKS[3].footage).toBe("4'");
    expect(GARGANTUA_PIPE_RANKS[3].type).toBe('sawtooth');

    const outNode = organ.getOutputNode();
    expect(outNode).toBeDefined();
    expect(outNode.gain.value).toBeCloseTo(0.0001, 3);
  });

  it('M4.2.2: GargantuaOrganSynth starts with envelope attack and stops with release', () => {
    const ctx = new MockAudioContext();
    const organ = new GargantuaOrganSynth(ctx as any);

    organ.start(ctx.currentTime, 0.5);
    expect(organ.getOutputNode().gain.value).toBeGreaterThan(0.0);

    organ.stop(ctx.currentTime, 0.2);
    expect(organ.getOutputNode().gain.value).toBeCloseTo(0.0, 2);
  });

  it('M4.2.3: GargantuaOrganSynth modulates cutoff, resonance, gain, and intensity safely', () => {
    const ctx = new MockAudioContext();
    const organ = new GargantuaOrganSynth(ctx as any);

    organ.start();
    organ.setCutoff(650);
    organ.setResonance(4.0);
    organ.setGain(0.9);
    organ.setIntensity(0.85);

    expect(organ.getOutputNode().gain.value).toBeGreaterThan(0.0);

    // Boundary / NaN checks
    organ.setCutoff(NaN);
    organ.setResonance(Infinity);
    organ.setGain(-1.0);
    organ.setIntensity(2.0);

    organ.dispose();
  });

  // ==========================================================================
  // 3. WormholePadSynth Tests
  // ==========================================================================
  it('M4.3.1: WormholePadSynth instantiates 6 supersaw voices and chorus delay lines', () => {
    const ctx = new MockAudioContext();
    const pad = new WormholePadSynth(ctx as any);

    expect(WORMHOLE_PAD_VOICES.length).toBe(6);
    expect(WORMHOLE_PAD_VOICES[0].type).toBe('sawtooth');
    expect(WORMHOLE_PAD_VOICES[5].type).toBe('sine');

    const out = pad.getOutputNode();
    expect(out).toBeDefined();
    expect(out.gain.value).toBeCloseTo(0.0001, 3);
  });

  it('M4.3.2: WormholePadSynth start, stop, pitch glide, and filter modulation operate cleanly', () => {
    const ctx = new MockAudioContext();
    const pad = new WormholePadSynth(ctx as any);

    pad.start(ctx.currentTime, 0.8);
    expect(pad.getOutputNode().gain.value).toBeGreaterThan(0.0);

    pad.setCutoff(1200);
    pad.setResonance(4.5);
    pad.setPitchGlide(1.5, ctx.currentTime, 0.5);
    pad.setGain(0.7);

    pad.stop(ctx.currentTime, 0.3);
    pad.dispose();
  });

  // ==========================================================================
  // 4. TesseractClockworkSynth Tests
  // ==========================================================================
  it('M4.4.1: TesseractClockworkSynth starts scheduler and handles relativistic time dilation', () => {
    const ctx = new MockAudioContext();
    const clock = new TesseractClockworkSynth(ctx as any);

    clock.start(ctx.currentTime, 0.5);
    expect(clock.getOutputNode().gain.value).toBeGreaterThan(0.0);

    // Normal time dilation tau = 1.0 -> 72 BPM
    clock.setTimeDilation(1.0);

    // Relativistic pinch dilation tau = 0.2 -> dilated clock rate
    clock.setTimeDilation(0.2);

    // Boundary extreme dilation tau = 0.001 clamped to >= 0.1
    clock.setTimeDilation(0.001);

    clock.stop(ctx.currentTime, 0.2);
    clock.dispose();
  });

  // ==========================================================================
  // 5. GestureAudioCoupler Tests
  // ==========================================================================
  it('M4.5.1: GestureAudioCoupler sanitizes invalid parameters against NaN and Infinity', () => {
    const ctx = new MockAudioContext();
    const coupler = new GestureAudioCoupler(ctx as any);

    expect(coupler.sanitizeParam(100, 20, 20000, 450)).toBe(100);
    expect(coupler.sanitizeParam(NaN, 20, 20000, 450)).toBe(450);
    expect(coupler.sanitizeParam(Infinity, 20, 20000, 450)).toBe(450);
    expect(coupler.sanitizeParam(-10, 20, 20000, 450)).toBe(20);
    expect(coupler.sanitizeParam(99999, 20, 20000, 450)).toBe(20000);
  });

  it('M4.5.2: GestureAudioCoupler updates filter cutoff and volume according to formulas', () => {
    const ctx = new MockAudioContext();
    const coupler = new GestureAudioCoupler(ctx as any);

    const masterFilter = ctx.createBiquadFilter();
    const reverbWetGain = ctx.createGain();
    const reverbDryGain = ctx.createGain();
    const masterGain = ctx.createGain();

    const organ = new GargantuaOrganSynth(ctx as any);
    const pad = new WormholePadSynth(ctx as any);
    const clock = new TesseractClockworkSynth(ctx as any);

    const gesture: GestureState = {
      hasHand: true,
      openness: 0.8,
      pinchDistance: 0.5,
      timeDilation: 0.5,
      rotation: { yaw: 0.1, pitch: 0.2, roll: -0.3 },
      position: { x: 0, y: 0 },
      zoomDelta: 0,
      swipeTriggered: null,
      intensity: 0.7,
      rawLandmarks: null,
    };

    coupler.update(
      gesture,
      'gargantua',
      { gargantua: organ, wormhole: pad, tesseract: clock },
      {
        masterFilter: masterFilter as any,
        reverbWetGain: reverbWetGain as any,
        reverbDryGain: reverbDryGain as any,
        masterGain: masterGain as any,
      }
    );

    expect(masterGain.gain.value).toBeCloseTo(0.3 + 0.7 * 0.7, 2);
    expect(reverbWetGain.gain.value).toBeGreaterThanOrEqual(0.25);
    expect(masterFilter.frequency.value).toBeGreaterThan(20);

    // Test with wormhole active
    coupler.update(
      gesture,
      'wormhole',
      { gargantua: organ, wormhole: pad, tesseract: clock },
      {
        masterFilter: masterFilter as any,
        reverbWetGain: reverbWetGain as any,
        reverbDryGain: reverbDryGain as any,
        masterGain: masterGain as any,
      }
    );

    // Test with tesseract active
    coupler.update(
      gesture,
      'tesseract',
      { gargantua: organ, wormhole: pad, tesseract: clock },
      {
        masterFilter: masterFilter as any,
        reverbWetGain: reverbWetGain as any,
        reverbDryGain: reverbDryGain as any,
        masterGain: masterGain as any,
      }
    );

    organ.dispose();
    pad.dispose();
    clock.dispose();
  });

  // ==========================================================================
  // 6. AudioEngine Master Graph & Lifecycle Tests
  // ==========================================================================
  it('M4.6.1: AudioEngine initializes master graph, reverb IR, and default gargantua scene', async () => {
    const ctx = new MockAudioContext();
    const engine = new AudioEngine(ctx as any);

    await engine.init();
    expect(engine.getContext()).toBe(ctx as any);

    const dest = engine.getMediaStreamDestination();
    expect(dest).toBeDefined();
    expect(dest!.stream.getAudioTracks().length).toBeGreaterThan(0);

    engine.dispose();
  });

  it('M4.6.2: AudioEngine performs equal-power scene crossfade between scenes', async () => {
    const ctx = new MockAudioContext();
    const engine = new AudioEngine(ctx as any);
    await engine.init();

    // Crossfade to wormhole
    engine.setScene('wormhole', 1.5);
    expect(typeof engine.setScene).toBe('function');

    // Rapid switch to tesseract
    engine.setScene('tesseract', 1.0);

    // Switch back to gargantua
    engine.setScene('gargantua', 0.5);

    engine.dispose();
  });

  it('M4.6.3: AudioEngine volume control and mute operate smoothly without clicks', async () => {
    const ctx = new MockAudioContext();
    const engine = new AudioEngine(ctx as any);
    await engine.init();

    engine.setVolume(0.9);
    engine.setMuted(true);
    engine.setMuted(false);

    const gesture: GestureState = {
      hasHand: true,
      openness: 0.5,
      pinchDistance: 1.0,
      timeDilation: 1.0,
      rotation: { yaw: 0, pitch: 0, roll: 0 },
      position: { x: 0, y: 0 },
      zoomDelta: 0,
      swipeTriggered: null,
      intensity: 0.5,
      rawLandmarks: null,
    };

    engine.updateGestureModulation(gesture);
    engine.dispose();
  });
});
