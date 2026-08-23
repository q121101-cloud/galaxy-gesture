import { Engine } from './core/Engine';
import { MediaPipeWrapper, TrackerStatusMessage } from './gestures/MediaPipeWrapper';
import { GestureState } from './core/types';
import { GargantuaScene } from './scenes/GargantuaScene';
import { WormholeScene } from './scenes/WormholeScene';
import { TesseractScene } from './scenes/TesseractScene';
import { AudioEngine } from './audio/AudioEngine';
import { GlassmorphicHUD } from './ui/GlassmorphicHUD';
import { WebcamInset } from './ui/WebcamInset';
import { GestureHints } from './ui/GestureHints';
import { VideoRecorder } from './ui/VideoRecorder';

/**
 * Interstellar Gesture Experience — Master Application Entry Point
 */
document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas #webgl-canvas not found in DOM.');
    return;
  }

  // 1. Initialize High-Performance WebGL2 Engine
  const engine = new Engine({
    canvas,
    antialias: false, // Disabled for maximum particle fillrate (300k+ particles)
    powerPreference: 'high-performance',
    maxPixelRatio: 1.5,
  });

  // 2. Initialize Procedural Web Audio Engine (100% synthesized, zero audio files)
  const audioEngine = new AudioEngine();
  engine.setAudioEngine(audioEngine);

  // 3. Register the 3 Cinematic Interstellar Scenes
  const gargantua = new GargantuaScene();
  const wormhole = new WormholeScene();
  const tesseract = new TesseractScene();

  await engine.registerScene(gargantua);
  await engine.registerScene(wormhole);
  await engine.registerScene(tesseract);

  // 4. Initialize UI Subsystems (HUD, Mini-Cam Inset, Gesture Hints, Video Recorder)
  const webcamInset = new WebcamInset();
  const gestureHints = new GestureHints();
  let isAudioMuted = false;

  const videoRecorder = new VideoRecorder({
    canvas,
    audioEngine,
    fps: 60,
    onStart: () => {
      hud.setRecordingState(true);
      engine.setRecording(true);
    },
    onStop: (_blob, _duration) => {
      hud.setRecordingState(false);
      engine.setRecording(false);
    },
  });

  const hud = new GlassmorphicHUD({
    onSceneSelect: (sceneName: string) => {
      engine.switchScene(sceneName, { duration: 1.0, type: 'crossfade' });
      gestureHints.setScene(sceneName);
    },
    onAudioToggle: () => {
      isAudioMuted = !isAudioMuted;
      audioEngine.setMuted(isAudioMuted);
      return !isAudioMuted;
    },
    onRecordToggle: () => {
      return videoRecorder.toggle();
    },
    onHudToggle: (visible: boolean) => {
      engine.setHudVisible(visible);
    },
    onTikTokToggle: (_active: boolean) => {
      // Guide visibility handled by HUD
    },
    onResetCamera: () => {
      engine.cameraController.reset();
    },
    onStartCamera: async () => {
      // Unlock AudioContext on user interaction
      await audioEngine.init().catch(() => {});
      await tracker.init();
      webcamInset.setStateBadge('active');
    },
    onStartKeyboard: async () => {
      await audioEngine.init().catch(() => {});
      hud.updateTrackerStatus({
        status: 'FALLBACK',
        message: 'Keyboard Mode Active: [SPACE] Singularity | [W/S] Pitch | [A/D] Roll | [P] Pinch',
      });
      webcamInset.setStateBadge('fallback');
    },
  });

  // 5. Initialize MediaPipe Neural Hand Tracker
  const tracker = new MediaPipeWrapper({
    videoElement: webcamInset.getVideoElement(),
    canvasElement: webcamInset.getCanvasElement(),
    onGestureState: (state: GestureState) => {
      engine.setGestureState(state);
      gestureHints.updateGesture(state);
      if (state.rawLandmarks) {
        webcamInset.drawSkeleton(state.rawLandmarks);
      }
    },
    onStateChange: (msg: TrackerStatusMessage) => {
      hud.updateTrackerStatus(msg);
      if (msg.status === 'TRACKED') {
        webcamInset.setStateBadge('active');
      } else if (msg.status === 'DETECTING') {
        webcamInset.setStateBadge('detecting');
      } else if (msg.status === 'FALLBACK') {
        webcamInset.setStateBadge('fallback');
      }
    },
  });

  // 6. Connect Real-Time Telemetry Pipeline
  engine.onTelemetry((telemetry) => {
    hud.updateTelemetry(telemetry);
  });

  // 7. Comprehensive Keyboard Controls & Hotkeys
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.target && (e.target as HTMLElement).matches('input, textarea')) return;

    if (e.key === '1') {
      engine.switchScene('gargantua', { duration: 1.0, type: 'crossfade' });
      hud.setActiveScene('gargantua');
      gestureHints.setScene('gargantua');
    } else if (e.key === '2') {
      engine.switchScene('wormhole', { duration: 1.0, type: 'crossfade' });
      hud.setActiveScene('wormhole');
      gestureHints.setScene('wormhole');
    } else if (e.key === '3') {
      engine.switchScene('tesseract', { duration: 1.0, type: 'crossfade' });
      hud.setActiveScene('tesseract');
      gestureHints.setScene('tesseract');
    } else if (e.key === ' ' || e.key === 'Tab') {
      e.preventDefault();
      engine.sceneManager.nextScene({ duration: 1.0, type: 'crossfade' });
      const nextName = engine.sceneManager.getActiveSceneName();
      audioEngine.setScene(nextName, 1.0);
      hud.setActiveScene(nextName);
      gestureHints.setScene(nextName);
    } else if (e.key === 'h' || e.key === 'H') {
      // [H] Key: Toggle Clean View for screen recording / TikTok capture
      hud.toggleHUD();
    } else if (e.key === 'r' || e.key === 'R') {
      // [R] Key: Start / Stop 60FPS Video Recording
      videoRecorder.toggle();
    } else if (e.key === 'm' || e.key === 'M') {
      // [M] Key: Toggle Audio Mute
      isAudioMuted = !isAudioMuted;
      audioEngine.setMuted(isAudioMuted);
      hud.setAudioActive(!isAudioMuted);
    } else if (e.key === 't' || e.key === 'T') {
      // [T] Key: Toggle 9:16 TikTok framing guide
      hud.toggleTikTokGuide();
    } else if (e.key === 'c' || e.key === 'C') {
      // [C] Key: Toggle Mini-Cam PIP Size
      webcamInset.toggleMinimize();
    } else if (e.key === 'Escape' || e.key === '0') {
      // [Escape / 0]: Reset camera orientation
      engine.cameraController.reset();
    }
  });

  // 8. Mobile Touch Fallback Gesture Recognition (1-finger drag orbit, 2-finger pinch dilation)
  let touchStartPos = { x: 0, y: 0 };
  let initialTouchDist = 0;

  window.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      initialTouchDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const dx = (e.touches[0].clientX - touchStartPos.x) / window.innerWidth;
      const dy = (e.touches[0].clientY - touchStartPos.y) / window.innerHeight;
      engine.setGestureState({
        hasHand: true,
        rotation: {
          yaw: dx * Math.PI,
          pitch: dy * (Math.PI / 2),
          roll: 0,
        },
      });
    } else if (e.touches.length === 2 && initialTouchDist > 0) {
      const currentDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const ratio = currentDist / initialTouchDist;
      const dilation = Math.max(0.1, Math.min(1.0, ratio));
      engine.setGestureState({
        hasHand: true,
        pinchDistance: dilation,
        timeDilation: dilation,
        openness: Math.min(1.0, ratio * 0.5),
      });
    }
  }, { passive: true });

  // 9. Start Main WebGL Animation Loop
  engine.start();

  console.log('🌌 [Interstellar] Gesture Experience fully initialized (Engine, Scenes, Audio, Gestures, HUD, Recorder).');
});
