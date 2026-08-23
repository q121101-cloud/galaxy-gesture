/**
 * Algorithmic Spatial Cathedral Convolution Reverb Generator
 *
 * Synthesizes an acoustic impulse response (IR) into an AudioBuffer using
 * exponential energy decay, stereo decorrelation, and discrete early reflection
 * comb impulses, eliminating the need for external WAV/MP3 files.
 */

export interface ReverbOptions {
  duration?: number; // IR duration in seconds (default: 3.8s)
  decay?: number;    // Exponential decay factor (default: 2.4)
  reverse?: boolean; // Reverse envelope for reverse reverb effects (default: false)
}

/**
 * Generate a 2-channel stereo convolution impulse response AudioBuffer.
 *
 * @param context The Web Audio BaseAudioContext
 * @param duration IR duration in seconds (default: 3.8s)
 * @param decay Exponential decay rate (default: 2.4)
 * @param reverse Whether to reverse the buffer (default: false)
 * @returns Fully synthesized AudioBuffer ready for ConvolverNode
 */
export function generateReverbImpulse(
  context: BaseAudioContext,
  duration: number = 3.8,
  decay: number = 2.4,
  reverse: boolean = false
): AudioBuffer {
  const sampleRate = context.sampleRate || 44100;
  const safeDuration = Math.max(0.0001, duration);
  const length = Math.max(1, Math.floor(sampleRate * safeDuration));
  const impulse = context.createBuffer(2, length, sampleRate);

  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  // Early reflection tap indices (scaled to current sample rate)
  const lTap1 = Math.round(0.0272 * sampleRate);
  const lTap2 = Math.round(0.0635 * sampleRate);
  const lTap3 = Math.round(0.1156 * sampleRate);

  const rTap1 = Math.round(0.0340 * sampleRate);
  const rTap2 = Math.round(0.0726 * sampleRate);
  const rTap3 = Math.round(0.1088 * sampleRate);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Exponential energy decay envelope: e^(-decay * t)
    const env = Math.exp(-decay * t);

    // Colored white/pink decorrelated stereo noise
    const noiseL = (Math.random() * 2 - 1) * env;
    const noiseR = (Math.random() * 2 - 1) * env;

    // Early reflection comb impulses
    let earlyL = 0;
    if (i === lTap1) earlyL += 0.60;
    if (i === lTap2) earlyL += 0.40;
    if (i === lTap3) earlyL += 0.25;

    let earlyR = 0;
    if (i === rTap1) earlyR += 0.60;
    if (i === rTap2) earlyR += 0.40;
    if (i === rTap3) earlyR += 0.25;

    left[i] = noiseL * 0.85 + earlyL;
    right[i] = noiseR * 0.85 + earlyR;
  }

  if (reverse) {
    left.reverse();
    right.reverse();
  }

  return impulse;
}

/**
 * Creates and configures a ConvolverNode loaded with the algorithmic cathedral IR.
 *
 * @param context The Web Audio BaseAudioContext
 * @param options Optional duration, decay, and reverse settings
 * @returns Configured ConvolverNode
 */
export function createCathedralReverb(
  context: BaseAudioContext,
  options?: ReverbOptions
): ConvolverNode {
  const convolver = context.createConvolver();
  const duration = options?.duration ?? 3.8;
  const decay = options?.decay ?? 2.4;
  const reverse = options?.reverse ?? false;

  convolver.buffer = generateReverbImpulse(context, duration, decay, reverse);
  convolver.normalize = true;
  return convolver;
}
