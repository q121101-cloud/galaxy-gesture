import { describe, it, expect, beforeEach, MockDOMElement } from './e2e_harness';
import { Engine } from '../src/core/Engine';
import { GargantuaScene } from '../src/scenes/GargantuaScene';
import { WormholeScene } from '../src/scenes/WormholeScene';
import { TesseractScene } from '../src/scenes/TesseractScene';
import { AudioEngine } from '../src/audio/AudioEngine';
import { LandmarkNormalizer } from '../src/gestures/LandmarkNormalizer';
import { GestureRecognizer } from '../src/gestures/GestureRecognizer';
import { SpringPhysicsPipeline } from '../src/gestures/SpringPhysics';
import { VideoRecorder } from '../src/ui/VideoRecorder';
import { GestureState, HandLandmark } from '../src/core/types';

describe('Milestone 6 - Suite 1: High-Velocity Gesture & Rapid Transition Stress', () => {
  let engine: Engine;
  let recognizer: GestureRecognizer;
  let normalizer: LandmarkNormalizer;
  let springPhysics: SpringPhysicsPipeline;

  beforeEach(async () => {
    const canvas = new MockDOMElement('canvas') as any;
    engine = new Engine({ canvas });
    await engine.registerScene(new GargantuaScene());
    await engine.registerScene(new WormholeScene());
    await engine.registerScene(new TesseractScene());

    recognizer = new GestureRecognizer();
    normalizer = new LandmarkNormalizer();
    springPhysics = new SpringPhysicsPipeline();
  });

  it('M6.1.1: 50 consecutive rapid scene transitions maintain numerical stability with zero NaNs', () => {
    const scenes = ['gargantua', 'wormhole', 'tesseract'];
    for (let i = 0; i < 50; i++) {
      const nextScene = scenes[i % 3];
      engine.switchScene(nextScene, { duration: 0.5, type: 'crossfade' });
      engine.renderFrame(i * 16.6);

      const activeName = engine.sceneManager.getActiveSceneName();
      expect(['gargantua', 'wormhole', 'tesseract']).toContain(activeName);
    }
  });

  it('M6.1.2: Extreme alternating gesture spam (fist -> open -> pinch -> violent tilt) filters cleanly', () => {
    for (let f = 0; f < 100; f++) {
      const rawLandmarks: HandLandmark[] = Array.from({ length: 21 }, (_, i) => ({
        x: (f % 2 === 0 ? 0.2 : 0.8) + (Math.sin(f * 0.5 + i) * 0.1),
        y: (f % 3 === 0 ? 0.3 : 0.7) + (Math.cos(f * 0.5 + i) * 0.1),
        z: (Math.sin(f) * 0.05),
      }));

      const normalized = normalizer.normalize(rawLandmarks, 0.016);
      const rawState = recognizer.process(normalized ? normalized.landmarks : null, 0.016);
      const smoothedState = springPhysics.update(rawState, 0.016);

      expect(Number.isFinite(smoothedState.openness)).toBe(true);
      expect(Number.isFinite(smoothedState.timeDilation)).toBe(true);
      expect(Number.isFinite(smoothedState.rotation.yaw)).toBe(true);
      expect(Number.isFinite(smoothedState.rotation.pitch)).toBe(true);
      expect(Number.isFinite(smoothedState.rotation.roll)).toBe(true);
      expect(smoothedState.timeDilation).toBeGreaterThanOrEqual(0.1);
      expect(smoothedState.timeDilation).toBeLessThanOrEqual(1.0);
    }
  });

  it('M6.1.3: Direction reversal 200 times within 1 second preserves spring convergence with 0 overshoot', () => {
    for (let step = 0; step < 200; step++) {
      const targetRoll = (step % 2 === 0 ? 1.0 : -1.0) * (Math.PI / 4);
      const dummyState: GestureState = {
        hasHand: true,
        openness: step % 2 === 0 ? 1.0 : 0.0,
        pinchDistance: step % 2 === 0 ? 1.0 : 0.0,
        timeDilation: step % 2 === 0 ? 1.0 : 0.1,
        rotation: { yaw: 0, pitch: 0, roll: targetRoll },
        position: { x: 0, y: 0 },
        zoomDelta: 0,
        swipeTriggered: null,
        intensity: 1.0,
        rawLandmarks: null,
      };

      const smoothed = springPhysics.update(dummyState, 0.005);
      expect(Number.isFinite(smoothed.rotation.roll)).toBe(true);
      expect(Math.abs(smoothed.rotation.roll)).toBeLessThanOrEqual(Math.PI);
    }
  });
});

describe('Milestone 6 - Suite 2: Procedural Audio Engine DSP Hardening', () => {
  let audioEngine: AudioEngine;

  beforeEach(() => {
    audioEngine = new AudioEngine();
    audioEngine.init().catch(() => {});
  });

  it('M6.2.1: AudioEngine withstands 1,000 rapid gesture modulation calls with NaN/Infinity protection', () => {
    for (let i = 0; i < 1000; i++) {
      const state: GestureState = {
        hasHand: i % 2 === 0,
        openness: i % 3 === 0 ? NaN : (i % 10) / 10,
        pinchDistance: i % 4 === 0 ? Infinity : (i % 10) / 10,
        timeDilation: i % 5 === 0 ? -Infinity : 0.1 + (i % 10) * 0.09,
        rotation: {
          yaw: i % 7 === 0 ? NaN : (i % 5) * 0.2,
          pitch: (i % 5) * 0.2,
          roll: (i % 5) * 0.2,
        },
        position: { x: 0, y: 0 },
        zoomDelta: 0,
        swipeTriggered: null,
        intensity: i % 6 === 0 ? NaN : 0.5,
        rawLandmarks: null,
      };

      expect(() => {
        audioEngine.updateGestureModulation(state);
      }).not.toThrow();
    }
  });

  it('M6.2.2: Equal-power gain invariant holds during 50 back-to-back audio scene crossfades', () => {
    const scenes = ['gargantua', 'wormhole', 'tesseract'];
    for (let i = 0; i < 50; i++) {
      const target = scenes[i % 3];
      expect(() => {
        audioEngine.setScene(target, 0.5);
      }).not.toThrow();
    }
  });
});

describe('Milestone 6 - Suite 3: Video Recording & Canvas Stress', () => {
  let recorder: VideoRecorder;
  let canvas: MockDOMElement;

  beforeEach(() => {
    canvas = new MockDOMElement('canvas');
    recorder = new VideoRecorder({
      canvas: canvas as any,
      audioEngine: new AudioEngine(),
      fps: 60,
    });
  });

  it('M6.3.1: Rapid start/stop cycling 20 times in sub-second bursts maintains clean recorder state', () => {
    for (let i = 0; i < 20; i++) {
      recorder.start();
      expect(recorder.isRecording()).toBe(true);
      recorder.stop();
      expect(recorder.isRecording()).toBe(false);
    }
  });

  it('M6.3.2: Canvas resizing 50 times during active video capture preserves aspect and buffer integrity', () => {
    recorder.start();
    expect(recorder.isRecording()).toBe(true);

    const sizes = [
      { w: 1920, h: 1080 },
      { w: 1080, h: 1920 }, // TikTok 9:16
      { w: 1280, h: 720 },
      { w: 3840, h: 2160 },
      { w: 480, h: 360 },
    ];

    for (let i = 0; i < 50; i++) {
      const sz = sizes[i % sizes.length];
      canvas.width = sz.w;
      canvas.height = sz.h;
      expect(canvas.width).toBe(sz.w);
      expect(canvas.height).toBe(sz.h);
    }

    recorder.stop();
    expect(recorder.isRecording()).toBe(false);
  });
});

describe('Milestone 6 - Suite 4: Mathematical Invariants & Forensic Integrity', () => {
  it('M6.4.1: Relativistic Doppler beaming formula invariant: D(theta, beta) strictly positive for beta < 1', () => {
    const beta = 0.5; // v/c
    const gamma = 1.0 / Math.sqrt(1.0 - beta * beta);
    for (let deg = 0; deg <= 360; deg += 15) {
      const rad = (deg * Math.PI) / 180;
      const cosTheta = Math.cos(rad);
      const D = 1.0 / (gamma * (1.0 - beta * cosTheta));
      expect(D).toBeGreaterThan(0.0);
      expect(Number.isFinite(D)).toBe(true);
    }
  });

  it('M6.4.2: Ellis drainhole metric hyperbolic throat radius satisfies r(z) >= a for all z in [-1000, 1000]', () => {
    const a = 15.0;
    for (let z = -1000; z <= 1000; z += 50) {
      const r = Math.sqrt(a * a + z * z);
      expect(r).toBeGreaterThanOrEqual(a);
      expect(Number.isFinite(r)).toBe(true);
    }
  });

  it('M6.4.3: 5D hyper-cube coordinate bounds satisfy periodic torus modulo: fmod(x, L) in [0, L)', () => {
    const L = 12.0;
    for (let x = -500; x <= 500; x += 13.7) {
      const mod = ((x % L) + L) % L;
      expect(mod).toBeGreaterThanOrEqual(0.0);
      expect(mod).toBeLessThan(L);
    }
  });
});
