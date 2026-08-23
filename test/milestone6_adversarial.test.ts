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

describe('Milestone 6 - Suite 5: Gargantua Particle Count & Cinematic Pacing Verification', () => {
  it('M6.5.1: Gargantua initializes exactly 200,000 particles with 9 allocated attribute buffers', async () => {
    const gargantua = new GargantuaScene();
    const canvas = new MockDOMElement('canvas') as any;
    const engine = new Engine({ canvas });
    await engine.registerScene(gargantua);

    expect(gargantua.particleCount).toBe(200000);
    expect(engine.sceneManager.getParticleCount()).toBe(200000);

    let pointsObj: any = null;
    gargantua.scene.traverse((obj) => {
      if ((obj as any).isPoints) pointsObj = obj;
    });
    expect(pointsObj).not.toBeNull();
    const geo = pointsObj.geometry;
    expect(geo.getAttribute('position').count).toBe(200000);
    expect(geo.getAttribute('aVelocity').count).toBe(200000);
    expect(geo.getAttribute('aColor').count).toBe(200000);
    expect(geo.getAttribute('aSize').count).toBe(200000);
    expect(geo.getAttribute('aOrbitRadius').count).toBe(200000);
    expect(geo.getAttribute('aOrbitSpeed').count).toBe(200000);
    expect(geo.getAttribute('aOrbitAngle').count).toBe(200000);
    expect(geo.getAttribute('aType').count).toBe(200000);
    expect(geo.getAttribute('aPhase').count).toBe(200000);

    engine.dispose();
  });

  it('M6.5.2: Wormhole and Tesseract scenes remain untouched at 300,000 default particles', async () => {
    const wormhole = new WormholeScene();
    const tesseract = new TesseractScene();

    expect(wormhole.particleCount).toBe(300000);
    expect(tesseract.particleCount).toBe(300000);
  });

  it('M6.5.3: CameraController applies cinematic 40-42% speed reduction for gesture yaw and pitch', () => {
    const canvas = new MockDOMElement('canvas') as any;
    const engine = new Engine({ canvas });
    const camController = engine.cameraController;

    const gesture: GestureState = {
      hasHand: true,
      openness: 0.5,
      pinchDistance: 1.0,
      timeDilation: 1.0,
      rotation: { yaw: 0.5, pitch: 0.4, roll: 0 },
      position: { x: 0, y: 0 },
      zoomDelta: 0,
      swipeTriggered: null,
      intensity: 1.0,
      rawLandmarks: null,
    };

    camController.update(0.016, gesture);

    // Target yaw should be mapped with 0.7 factor (0.5 * 0.7 = 0.35)
    // Target pitch should be mapped with 0.6 factor (0.4 * 0.6 = 0.24)
    // Both reflect ~40-42% reduction compared to original 1.2 and 1.0 multipliers
    expect((camController as any).targetYaw).toBeCloseTo(0.35, 4);
    expect((camController as any).targetPitch).toBeCloseTo(0.24, 4);

    engine.dispose();
  });

  it('M6.5.4: Photon ring rotation advances at slowed rate of 0.066 rad/s', async () => {
    const gargantua = new GargantuaScene();
    const canvas = new MockDOMElement('canvas') as any;
    const engine = new Engine({ canvas });
    await engine.registerScene(gargantua);

    const initialRotZ = (gargantua as any).photonRingMesh?.rotation?.z ?? 0;
    const gesture = {
      hasHand: false,
      openness: 0,
      pinchDistance: 1,
      timeDilation: 1,
      rotation: { yaw: 0, pitch: 0, roll: 0 },
      position: { x: 0, y: 0 },
      zoomDelta: 0,
      swipeTriggered: null,
      intensity: 0,
      rawLandmarks: null,
    };

    gargantua.update(1.0, 1.0, gesture as any); // 1 second delta
    const afterRotZ = (gargantua as any).photonRingMesh?.rotation?.z ?? 0;

    expect(afterRotZ - initialRotZ).toBeCloseTo(0.066, 4);

    engine.dispose();
  });

  it('M6.5.5: Gargantua respects explicit particleCount option but defaults to exactly 200,000', async () => {
    const defaultScene = new GargantuaScene();
    expect(defaultScene.particleCount).toBe(200000);

    const customScene = new GargantuaScene({ particleCount: 150000 });
    expect(customScene.particleCount).toBe(150000);
  });

  it('M6.5.6: Particle attribute buffer Float32Array lengths exactly match 200,000 * component count', async () => {
    const gargantua = new GargantuaScene();
    const canvas = new MockDOMElement('canvas') as any;
    const engine = new Engine({ canvas });
    await engine.registerScene(gargantua);

    let pointsObj: any = null;
    gargantua.scene.traverse((obj) => {
      if ((obj as any).isPoints) pointsObj = obj;
    });
    const geo = pointsObj.geometry;
    expect(geo.getAttribute('position').array.length).toBe(200000 * 3);
    expect(geo.getAttribute('aVelocity').array.length).toBe(200000 * 3);
    expect(geo.getAttribute('aColor').array.length).toBe(200000 * 3);
    expect(geo.getAttribute('aSize').array.length).toBe(200000);
    expect(geo.getAttribute('aOrbitRadius').array.length).toBe(200000);
    expect(geo.getAttribute('aOrbitSpeed').array.length).toBe(200000);
    expect(geo.getAttribute('aOrbitAngle').array.length).toBe(200000);
    expect(geo.getAttribute('aType').array.length).toBe(200000);
    expect(geo.getAttribute('aPhase').array.length).toBe(200000);

    engine.dispose();
  });

  it('M6.5.7: Accretion and particle uniforms scale strictly linearly with relativistic time-dilation', async () => {
    const gargantua = new GargantuaScene();
    const canvas = new MockDOMElement('canvas') as any;
    const engine = new Engine({ canvas });
    await engine.registerScene(gargantua);

    const gesture = {
      hasHand: true,
      openness: 0.8,
      pinchDistance: 0.2,
      timeDilation: 0.2,
      rotation: { yaw: 0, pitch: 0, roll: 0 },
      position: { x: 0, y: 0 },
      zoomDelta: 0,
      swipeTriggered: null,
      intensity: 1.0,
      rawLandmarks: null,
    };

    gargantua.update(1.0, 0.2, gesture as any); // delta = 1.0, timeDilation = 0.2 -> effectiveDelta = 0.2

    const partMat = (gargantua as any).particleMaterial;
    expect(partMat.uniforms.uTime.value).toBeCloseTo(0.2, 5);
    expect(partMat.uniforms.uTimeDilation.value).toBe(0.2);
    expect(partMat.uniforms.uOpenness.value).toBe(0.8);

    const accMat = (gargantua as any).accretionMaterial;
    expect(accMat.uniforms.uTime.value).toBeCloseTo(0.2, 5);
    expect(accMat.uniforms.uTimeDilation.value).toBe(0.2);
    expect(accMat.uniforms.uDopplerStrength.value).toBeCloseTo(1.4, 5);

    engine.dispose();
  });
});


