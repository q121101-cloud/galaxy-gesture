/**
 * Gesture-Audio Coupler — Real-Time Dynamic Parameter Modulation
 *
 * Couples real-time 3D hand tracking metrics (palm openness, pinch tightness,
 * relativistic time dilation, rotational roll, kinetic intensity) to procedural
 * audio synthesis parameters (cascaded filter cutoffs, resonance, master presence,
 * reverb wet/dry matrix, and lookahead clock dilation).
 */

import { GestureState } from '../core/types';
import { GargantuaOrganSynth } from './GargantuaOrganSynth';
import { WormholePadSynth } from './WormholePadSynth';
import { TesseractClockworkSynth } from './TesseractClockworkSynth';

export interface CouplerTargetNodes {
  masterFilter: BiquadFilterNode;
  reverbWetGain: GainNode;
  reverbDryGain: GainNode;
  masterGain: GainNode;
}

export class GestureAudioCoupler {
  private readonly context: BaseAudioContext;

  constructor(context: BaseAudioContext) {
    this.context = context;
  }

  /**
   * Clamps and sanitizes a numeric audio parameter to prevent NaN / Infinity exceptions
   */
  public sanitizeParam(val: number, min: number, max: number, fallback: number): number {
    if (!Number.isFinite(val)) return fallback;
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Updates all active synths and master processing nodes based on gesture state
   */
  public update(
    gestureState: GestureState,
    activeSceneName: string,
    synths: {
      gargantua?: GargantuaOrganSynth;
      wormhole?: WormholePadSynth;
      tesseract?: TesseractClockworkSynth;
    },
    targets: CouplerTargetNodes
  ): void {
    const t = this.context.currentTime;
    const timeConstant = 0.04; // 40ms smooth ramping to prevent audio clicking

    // Extract & sanitize gesture metrics
    const hasHand = gestureState.hasHand ?? false;
    const rawOpenness = hasHand ? gestureState.openness : 0.6;
    const rawPinch = hasHand ? gestureState.pinchDistance : 1.0;
    const rawTau = hasHand ? gestureState.timeDilation : 1.0;
    const rawIntensity = hasHand ? gestureState.intensity : 0.4;
    const rawRoll = hasHand ? gestureState.rotation.roll : 0.0;

    const openness = this.sanitizeParam(rawOpenness, 0.0, 1.0, 0.6);
    const pinchDistance = this.sanitizeParam(rawPinch, 0.0, 1.0, 1.0);
    const tau = this.sanitizeParam(rawTau, 0.1, 1.0, 1.0);
    const intensity = this.sanitizeParam(rawIntensity, 0.0, 1.0, 0.4);
    const roll = this.sanitizeParam(rawRoll, -Math.PI, Math.PI, 0.0);

    // 1. Master Presence & Lowpass Filter Cutoff: fc = 180 * 10^(2.0 * O) -> [180Hz, 18000Hz]
    // Modulated additionally by pinch distance: fc_pinch = 350 + pinchDistance * (4000 - 350)
    const baseCutoff = 180 * Math.pow(10, 2.0 * openness);
    const pinchCutoffMod = 350 + pinchDistance * (baseCutoff - 350);
    const masterCutoff = this.sanitizeParam(pinchCutoffMod, 20, 20000, 2500);

    try {
      targets.masterFilter.frequency.setTargetAtTime(masterCutoff, t, timeConstant);
    } catch {
      targets.masterFilter.frequency.setValueAtTime(masterCutoff, t);
    }

    // 2. Master Kinetic Gain: Gain = 0.3 + intensity * 0.7 -> [0.3, 1.0]
    const dynamicMasterGain = this.sanitizeParam(0.3 + intensity * 0.7, 0.0, 1.0, 0.75);
    try {
      targets.masterGain.gain.setTargetAtTime(dynamicMasterGain, t, timeConstant);
    } catch {
      targets.masterGain.gain.setValueAtTime(dynamicMasterGain, t);
    }

    // 3. Reverb Wet/Dry Matrix: Wet = 0.25 + 0.60 * min(1.0, intensity / 0.8)
    const wetMix = this.sanitizeParam(0.25 + 0.60 * Math.min(1.0, intensity / 0.8), 0.0, 0.95, 0.40);
    const dryMix = this.sanitizeParam(Math.sqrt(Math.max(0.0, 1.0 - wetMix * wetMix)), 0.0, 1.0, 0.75);

    try {
      targets.reverbWetGain.gain.setTargetAtTime(wetMix, t, timeConstant);
      targets.reverbDryGain.gain.setTargetAtTime(dryMix, t, timeConstant);
    } catch {
      targets.reverbWetGain.gain.setValueAtTime(wetMix, t);
      targets.reverbDryGain.gain.setValueAtTime(dryMix, t);
    }

    // 4. Scene-Specific Synth Modulations
    const normalizedScene = activeSceneName.toLowerCase();

    if (normalizedScene.includes('gargantua') || normalizedScene.includes('blackhole')) {
      if (synths.gargantua) {
        // Modulate organ filter cutoff by hand openness: [200Hz, 1800Hz]
        const organCutoff = this.sanitizeParam(200 + openness * 1600, 20, 20000, 450);
        synths.gargantua.setCutoff(organCutoff, t);
        synths.gargantua.setIntensity(intensity, t);
      }
    } else if (normalizedScene.includes('wormhole') || normalizedScene.includes('portal')) {
      if (synths.wormhole) {
        // Modulate wormhole resonant bandpass center frequency: fc = 450 + 2200 * O + 600 * |roll|
        const bandpassCutoff = this.sanitizeParam(450 + 2200 * openness + 600 * Math.abs(roll), 20, 20000, 800);
        synths.wormhole.setCutoff(bandpassCutoff, t);
        // Warp fly-through pitch glide from kinetic intensity
        const glideFactor = this.sanitizeParam(1.0 + intensity * 0.5, 0.5, 2.5, 1.0);
        synths.wormhole.setPitchGlide(glideFactor, t, 0.2);
      }
    } else if (normalizedScene.includes('tesseract') || normalizedScene.includes('5d')) {
      if (synths.tesseract) {
        // Modulate tesseract clockwork time dilation
        synths.tesseract.setTimeDilation(tau);
      }
    }
  }
}
