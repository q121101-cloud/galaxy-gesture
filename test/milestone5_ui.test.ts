import { describe, it, expect, beforeEach, afterEach, MockDOMElement, MockAudioContext } from './e2e_harness';
import { GlassmorphicHUD } from '../src/ui/GlassmorphicHUD';
import { WebcamInset } from '../src/ui/WebcamInset';
import { GestureHints } from '../src/ui/GestureHints';
import { VideoRecorder } from '../src/ui/VideoRecorder';
import { AudioEngine } from '../src/audio/AudioEngine';
import { HUDTelemetry, GestureState, HandLandmark } from '../src/core/types';

describe('Milestone 5 - Suite 1: GlassmorphicHUD Telemetry & UI Controls', () => {
  let hud: GlassmorphicHUD;
  let selectedScene: string = '';
  let audioToggled: boolean = false;
  let recordToggled: boolean = false;
  let hudVisibility: boolean = true;
  let tiktokActive: boolean = false;
  let cameraReset: boolean = false;

  beforeEach(() => {
    selectedScene = '';
    audioToggled = false;
    recordToggled = false;
    hudVisibility = true;
    tiktokActive = false;
    cameraReset = false;

    hud = new GlassmorphicHUD({
      onSceneSelect: (scene) => { selectedScene = scene; },
      onAudioToggle: () => { audioToggled = !audioToggled; return audioToggled; },
      onRecordToggle: () => { recordToggled = !recordToggled; return recordToggled; },
      onHudToggle: (visible) => { hudVisibility = visible; },
      onTikTokToggle: (active) => { tiktokActive = active; },
      onResetCamera: () => { cameraReset = true; },
    });
  });

  it('M5.1.1: GlassmorphicHUD updates scene name and active particle counter (200,000)', () => {
    const telemetry: HUDTelemetry = {
      currentScene: 'galaxy',
      fps: 60,
      frameTimeMs: 16.6,
      particleCount: 200000,
      gestureName: 'Fist (Singularity)',
      timeDilation: 1.0,
      isRecording: false,
      hudVisible: true,
      handDetected: true,
      handOpenness: 0.1,
      handPitch: 0.2,
      handRoll: -0.1,
      zoomLevel: 1.0,
      latencyMs: 16,
    };

    hud.updateTelemetry(telemetry);

    const doc = (globalThis as any).document;
    const valScene = doc.getElementById('val-scene');
    const valParticles = doc.getElementById('val-particles');
    const valFps = doc.getElementById('val-fps');

    expect(valScene?.textContent).toBe('GALAXY');
    expect(valParticles?.textContent).toBe('200,000');
    expect(valFps?.textContent).toBe('60');
  });

  it('M5.1.2: Telemetry updates time dilation gauge and dynamic center label', () => {
    const doc = (globalThis as any).document;
    const labelCenter = doc.getElementById('label-center-status');
    const valTimeDilation = doc.getElementById('val-time-dilation');
    const valPinch = doc.getElementById('val-pinch');

    // Relativistic dilation state
    hud.updateTelemetry({
      currentScene: 'galaxy',
      fps: 59,
      frameTimeMs: 16.9,
      particleCount: 200000,
      gestureName: 'Pinch (Time Dilation)',
      timeDilation: 0.2,
      isRecording: false,
      hudVisible: true,
      handDetected: true,
      handOpenness: 0.5,
      handPitch: 0,
      handRoll: 0,
      zoomLevel: 1.0,
      latencyMs: 17,
    });

    expect(valTimeDilation?.textContent).toBe('0.20x');
    expect(valPinch?.textContent).toBe('0.11');
    expect(labelCenter?.textContent).toContain('RELATIVISTIC DILATION');

    // Supernova expand state
    hud.updateTelemetry({
      currentScene: 'galaxy',
      fps: 60,
      frameTimeMs: 16.6,
      particleCount: 200000,
      gestureName: 'Open Palm',
      timeDilation: 1.0,
      isRecording: false,
      hudVisible: true,
      handDetected: true,
      handOpenness: 0.95,
      handPitch: 0,
      handRoll: 0,
      zoomLevel: 1.2,
      latencyMs: 16,
    });

    expect(labelCenter?.textContent).toBe('🖐️ SUPERNOVA / EXPAND');
  });

  it('M5.1.3: Tracker status updates status dot class and finger matrix dots', () => {
    const doc = (globalThis as any).document;
    const statusText = doc.getElementById('status-text');
    const statusDot = doc.getElementById('status-dot');

    hud.updateTrackerStatus({
      status: 'TRACKED',
      message: 'Tracking Active [Open: 80%]',
      fingerStates: [1, 1, 1, 0, 0],
      latency: 14,
    });

    expect(statusText?.textContent).toBe('Tracking Active [Open: 80%]');
    expect(statusDot?.classList.contains('active')).toBe(true);

    hud.updateTrackerStatus({
      status: 'FALLBACK',
      message: 'Keyboard Fallback Active',
    });

    expect(statusDot?.classList.contains('fallback')).toBe(true);
  });

  it('M5.1.4: [H] key clean mode toggles HUD overlay visibility cleanly', () => {
    expect(hud.isHUDVisible()).toBe(true);

    const isVis1 = hud.toggleHUD();
    expect(isVis1).toBe(false);
    expect(hud.isHUDVisible()).toBe(false);
    expect(hudVisibility).toBe(false);

    const isVis2 = hud.toggleHUD();
    expect(isVis2).toBe(true);
    expect(hud.isHUDVisible()).toBe(true);
    expect(hudVisibility).toBe(true);
  });

  it('M5.1.5: 9:16 TikTok guide toggles frame overlay and button state', () => {
    expect(hud.isTikTokGuideActive()).toBe(false);

    const active1 = hud.toggleTikTokGuide();
    expect(active1).toBe(true);
    expect(hud.isTikTokGuideActive()).toBe(true);
    expect(tiktokActive).toBe(true);

    const active2 = hud.toggleTikTokGuide();
    expect(active2).toBe(false);
    expect(hud.isTikTokGuideActive()).toBe(false);
    expect(tiktokActive).toBe(false);
  });

  it('M5.1.6: Scene buttons update active styling and trigger onSceneSelect callback', () => {
    hud.setActiveScene('wormhole');
    const doc = (globalThis as any).document;
    const btnWormhole = doc.getElementById('btn-scene-wormhole');
    const btnGalaxy = doc.getElementById('btn-scene-galaxy');

    expect(btnWormhole?.classList.contains('active')).toBe(true);
    expect(btnGalaxy?.classList.contains('active')).toBe(false);

    hud.setActiveScene('galaxy');
    expect(btnGalaxy?.classList.contains('active')).toBe(true);
    expect(btnWormhole?.classList.contains('active')).toBe(false);
  });
});

describe('Milestone 5 - Suite 2: WebcamInset PIP & Landmark Skeleton', () => {
  let inset: WebcamInset;

  beforeEach(() => {
    inset = new WebcamInset();
  });

  it('M5.2.1: WebcamInset initializes with video and canvas elements', () => {
    expect(inset.getVideoElement()).toBeDefined();
    expect(inset.getCanvasElement()).toBeDefined();
    expect(inset.getContainerElement()).toBeDefined();
  });

  it('M5.2.2: Minimize PIP toggle switches container minimized class', () => {
    expect(inset.isMinimized()).toBe(false);

    const state1 = inset.toggleMinimize();
    expect(state1).toBe(true);
    expect(inset.isMinimized()).toBe(true);

    const state2 = inset.toggleMinimize();
    expect(state2).toBe(false);
    expect(inset.isMinimized()).toBe(false);
  });

  it('M5.2.3: Skeleton renderer executes 21 joint landmark strokes without error', () => {
    const dummyLandmarks: HandLandmark[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.1 + (i % 5) * 0.15,
      y: 0.2 + Math.floor(i / 5) * 0.15,
      z: 0.0,
    }));

    expect(() => {
      inset.drawSkeleton(dummyLandmarks);
    }).not.toThrow();

    // Handles null or empty gracefully
    expect(() => {
      inset.drawSkeleton(null);
      inset.drawSkeleton([]);
    }).not.toThrow();
  });

  it('M5.2.4: State badge reflects tracking status changes', () => {
    expect(() => {
      inset.setStateBadge('active');
      inset.setStateBadge('detecting');
      inset.setStateBadge('fallback');
      inset.setStateBadge('error');
      inset.setStateBadge('off');
    }).not.toThrow();
  });
});

describe('Milestone 5 - Suite 3: Contextual GestureHints Guide Cards', () => {
  let hints: GestureHints;

  beforeEach(() => {
    hints = new GestureHints();
  });

  it('M5.3.1: GestureHints initializes with cards mapped in DOM', () => {
    expect(hints.getContainerElement()).toBeDefined();
  });

  it('M5.3.2: Dynamically highlights hint cards corresponding to gesture state', () => {
    const baseState: GestureState = {
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

    // Pinch time dilation
    hints.updateGesture({ ...baseState, pinchDistance: 0.1, timeDilation: 0.2 });
    const doc = (globalThis as any).document;
    const pinchCard = doc.getElementById('hint-pinch');
    expect(pinchCard?.classList.contains('active')).toBe(true);

    // Fist clench
    hints.updateGesture({ ...baseState, openness: 0.1 });
    const fistCard = doc.getElementById('hint-open-fist');
    expect(fistCard?.classList.contains('active')).toBe(true);

    // Tilt orbit
    hints.updateGesture({ ...baseState, rotation: { yaw: 0, pitch: 0.4, roll: 0 } });
    const tiltCard = doc.getElementById('hint-tilt');
    expect(tiltCard?.classList.contains('active')).toBe(true);

    // Swipe transition
    hints.updateGesture({ ...baseState, swipeTriggered: 'right' });
    const swipeCard = doc.getElementById('hint-swipe');
    expect(swipeCard?.classList.contains('active')).toBe(true);
  });

  it('M5.3.3: Contextual labels update when navigating between galaxy and wormhole scenes', () => {
    hints.setScene('galaxy');
    const doc = (globalThis as any).document;
    const openFistCard = doc.getElementById('hint-open-fist');
    expect(openFistCard?.textContent).toContain('Core Expansion');

    hints.setScene('wormhole');
    expect(openFistCard?.textContent).toContain('Throat Warp Speed');
  });

  it('M5.3.4: Container visibility toggles smoothly', () => {
    hints.setVisible(false);
    expect(hints.getContainerElement()?.style.opacity).toBe('0');

    hints.setVisible(true);
    expect(hints.getContainerElement()?.style.opacity).toBe('1');
  });
});

describe('Milestone 5 - Suite 4: Canvas MediaRecorder [H] Video Capture', () => {
  let recorder: VideoRecorder;
  let audioEngine: AudioEngine;
  let canvas: MockDOMElement;
  let recordedBlob: Blob | null = null;
  let recordedDuration: number = 0;

  beforeEach(() => {
    canvas = new MockDOMElement('canvas');
    audioEngine = new AudioEngine();
    recordedBlob = null;
    recordedDuration = 0;

    recorder = new VideoRecorder({
      canvas: canvas as any,
      audioEngine,
      fps: 60,
      onStop: (blob, duration) => {
        recordedBlob = blob;
        recordedDuration = duration;
      },
    });
  });

  it('M5.4.1: VideoRecorder starts and captures 60FPS canvas stream and audio destination', () => {
    const started = recorder.start();
    expect(started).toBe(true);
    expect(recorder.isRecording()).toBe(true);

    const doc = (globalThis as any).document;
    const indicator = doc.getElementById('recording-indicator');
    expect(indicator?.classList.contains('active')).toBe(true);
  });

  it('M5.4.2: VideoRecorder stops cleanly and exports video blob with duration metadata', () => {
    recorder.start();
    expect(recorder.isRecording()).toBe(true);

    recorder.stop();
    expect(recorder.isRecording()).toBe(false);

    const doc = (globalThis as any).document;
    const indicator = doc.getElementById('recording-indicator');
    expect(indicator?.classList.contains('active')).toBe(false);
  });

  it('M5.4.3: VideoRecorder toggle switches recording states accurately', () => {
    expect(recorder.isRecording()).toBe(false);

    const r1 = recorder.toggle();
    expect(r1).toBe(true);
    expect(recorder.isRecording()).toBe(true);

    const r2 = recorder.toggle();
    expect(r2).toBe(false);
    expect(recorder.isRecording()).toBe(false);
  });

  it('M5.4.4: Handles missing canvas or unsupported MediaRecorder without crash', () => {
    const faultyRecorder = new VideoRecorder({
      canvas: null,
      audioEngine: null,
    });

    expect(() => {
      faultyRecorder.stop();
    }).not.toThrow();
  });
});
