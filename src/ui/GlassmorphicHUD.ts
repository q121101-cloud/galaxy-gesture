import { HUDTelemetry } from '../core/types';
import { TrackerStatusMessage } from '../gestures/MediaPipeWrapper';

export interface GlassmorphicHUDCallbacks {
  onSceneSelect?: (sceneName: string) => void;
  onAudioToggle?: () => boolean;
  onRecordToggle?: () => boolean;
  onHudToggle?: (visible: boolean) => void;
  onTikTokToggle?: (active: boolean) => void;
  onResetCamera?: () => void;
  onStartCamera?: () => Promise<void> | void;
  onStartKeyboard?: () => void;
}

/**
 * GlassmorphicHUD
 * High-performance HUD overlay manager providing real-time telemetry readouts,
 * live rolling FPS counter, particle counter (>300,000 GPU particles),
 * relativistic time dilation progress gauge, finger extension matrix,
 * and cinematic control toggles.
 */
export class GlassmorphicHUD {
  private hudLayer: HTMLElement | null = null;
  private valScene: HTMLElement | null = null;
  private valParticles: HTMLElement | null = null;
  private valFps: HTMLElement | null = null;
  private valLatency: HTMLElement | null = null;

  private statusDot: HTMLElement | null = null;
  private statusText: HTMLElement | null = null;
  private fingerDots: NodeListOf<HTMLElement> | null = null;

  private valOpenness: HTMLElement | null = null;
  private valPitch: HTMLElement | null = null;
  private valRoll: HTMLElement | null = null;
  private valPinch: HTMLElement | null = null;
  private valTimeDilation: HTMLElement | null = null;

  private progressFill: HTMLElement | null = null;
  private progressMarker: HTMLElement | null = null;
  private labelCenterStatus: HTMLElement | null = null;

  private tiktokFrame: HTMLElement | null = null;
  private promptOverlay: HTMLElement | null = null;

  private btnToggleAudio: HTMLElement | null = null;
  private btnToggleRecord: HTMLElement | null = null;
  private btnToggleHud: HTMLElement | null = null;
  private btnToggleTiktok: HTMLElement | null = null;
  private btnResetCam: HTMLElement | null = null;
  private btnStartCam: HTMLElement | null = null;
  private btnStartKeyboard: HTMLElement | null = null;

  private sceneButtons: Map<string, HTMLElement> = new Map();

  private hudVisible: boolean = true;
  private tiktokFrameActive: boolean = false;
  private isAudioActive: boolean = true;
  private isRecordingActive: boolean = false;

  private callbacks: GlassmorphicHUDCallbacks;

  constructor(callbacks: GlassmorphicHUDCallbacks = {}) {
    this.callbacks = callbacks;
    this.cacheDOMElements();
    this.initEventListeners();
  }

  private cacheDOMElements(): void {
    if (typeof document === 'undefined') return;

    this.hudLayer = document.getElementById('hud-layer') || document.querySelector('.hud-layer');
    this.valScene = document.getElementById('val-scene');
    this.valParticles = document.getElementById('val-particles');
    this.valFps = document.getElementById('val-fps');
    this.valLatency = document.getElementById('val-latency');

    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.fingerDots = document.querySelectorAll('.finger-dot');

    this.valOpenness = document.getElementById('val-openness');
    this.valPitch = document.getElementById('val-hand-pitch');
    this.valRoll = document.getElementById('val-hand-rot');
    this.valPinch = document.getElementById('val-pinch');
    this.valTimeDilation = document.getElementById('val-time-dilation');

    this.progressFill = document.getElementById('progress-fill');
    this.progressMarker = document.getElementById('progress-marker');
    this.labelCenterStatus = document.getElementById('label-center-status');

    this.tiktokFrame = document.getElementById('tiktok-frame-guide');
    this.promptOverlay = document.getElementById('prompt-overlay');

    this.btnToggleAudio = document.getElementById('btn-toggle-audio');
    this.btnToggleRecord = document.getElementById('btn-toggle-record');
    this.btnToggleHud = document.getElementById('btn-toggle-hud');
    this.btnToggleTiktok = document.getElementById('btn-toggle-tiktok');
    this.btnResetCam = document.getElementById('btn-reset-cam');

    this.btnStartCam = document.getElementById('btn-start-camera');
    this.btnStartKeyboard = document.getElementById('btn-start-keyboard');

    const gargantuaBtn = document.getElementById('btn-scene-gargantua');
    const wormholeBtn = document.getElementById('btn-scene-wormhole');
    const tesseractBtn = document.getElementById('btn-scene-tesseract');

    if (gargantuaBtn) this.sceneButtons.set('gargantua', gargantuaBtn);
    if (wormholeBtn) this.sceneButtons.set('wormhole', wormholeBtn);
    if (tesseractBtn) this.sceneButtons.set('tesseract', tesseractBtn);
  }

  private initEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Scene Switch Buttons
    this.sceneButtons.forEach((btn, sceneKey) => {
      btn.addEventListener('click', () => {
        this.setActiveScene(sceneKey);
        this.callbacks.onSceneSelect?.(sceneKey);
      });
    });

    // Audio Toggle
    this.btnToggleAudio?.addEventListener('click', () => {
      if (this.callbacks.onAudioToggle) {
        const nextState = this.callbacks.onAudioToggle();
        this.setAudioActive(nextState);
      }
    });

    // Record Toggle
    this.btnToggleRecord?.addEventListener('click', () => {
      if (this.callbacks.onRecordToggle) {
        const recording = this.callbacks.onRecordToggle();
        this.setRecordingState(recording);
      }
    });

    // Clean View / HUD Toggle
    this.btnToggleHud?.addEventListener('click', () => {
      this.toggleHUD();
    });

    // TikTok 9:16 Guide Toggle
    this.btnToggleTiktok?.addEventListener('click', () => {
      this.toggleTikTokGuide();
    });

    // Camera Reset Button
    this.btnResetCam?.addEventListener('click', () => {
      this.callbacks.onResetCamera?.();
    });

    // Start Camera Modal Action
    this.btnStartCam?.addEventListener('click', async () => {
      this.hidePromptModal();
      if (this.callbacks.onStartCamera) {
        await this.callbacks.onStartCamera();
      }
    });

    // Start Keyboard Fallback Modal Action
    this.btnStartKeyboard?.addEventListener('click', () => {
      this.hidePromptModal();
      if (this.callbacks.onStartKeyboard) {
        this.callbacks.onStartKeyboard();
      }
    });
  }

  /**
   * Update real-time HUD telemetry readouts
   */
  public updateTelemetry(telemetry: HUDTelemetry): void {
    // 1. Scene Name
    if (this.valScene && telemetry.currentScene) {
      const formattedName = telemetry.currentScene.toUpperCase();
      if (this.valScene.textContent !== formattedName) {
        this.valScene.textContent = formattedName;
      }
    }

    // 2. Particle Count (>300,000 GPU Particles)
    if (this.valParticles) {
      const formattedCount = telemetry.particleCount.toLocaleString();
      if (this.valParticles.textContent !== formattedCount) {
        this.valParticles.textContent = formattedCount;
      }
    }

    // 3. Rolling Live FPS
    if (this.valFps) {
      this.valFps.textContent = `${Math.round(telemetry.fps)}`;
    }

    // 4. Latency
    if (this.valLatency) {
      this.valLatency.textContent = `${Math.max(1, telemetry.latencyMs)} ms`;
    }

    // 5. Openness Percentage & Progress Bar
    const openPct = Math.max(0, Math.min(100, Math.round(telemetry.handOpenness * 100)));
    if (this.valOpenness) {
      this.valOpenness.textContent = `${openPct}%`;
    }

    if (this.progressFill) {
      this.progressFill.style.width = `${openPct}%`;
    }
    if (this.progressMarker) {
      this.progressMarker.style.left = `${openPct}%`;
    }

    // 6. 3D Hand Pitch & Roll in Degrees
    if (this.valPitch) {
      const pitchDeg = Math.round((telemetry.handPitch * 180) / Math.PI);
      this.valPitch.textContent = `${pitchDeg >= 0 ? '+' : ''}${pitchDeg}°`;
    }

    if (this.valRoll) {
      const rollDeg = Math.round((telemetry.handRoll * 180) / Math.PI);
      this.valRoll.textContent = `${rollDeg >= 0 ? '+' : ''}${rollDeg}°`;
    }

    // 7. Relativistic Time Dilation & Pinch Distance
    if (this.valTimeDilation) {
      this.valTimeDilation.textContent = `${telemetry.timeDilation.toFixed(2)}x`;
    }

    if (this.valPinch) {
      const normalizedPinch = Math.max(0, Math.min(1, (telemetry.timeDilation - 0.1) / 0.9));
      this.valPinch.textContent = normalizedPinch.toFixed(2);
    }

    // 8. Progress Center Label Description
    if (this.labelCenterStatus) {
      if (telemetry.timeDilation < 0.35) {
        this.labelCenterStatus.textContent = `RELATIVISTIC DILATION (${telemetry.timeDilation.toFixed(2)}x)`;
      } else if (telemetry.handOpenness < 0.2) {
        this.labelCenterStatus.textContent = '✊ SINGULARITY (FIST)';
      } else if (telemetry.handOpenness > 0.8) {
        this.labelCenterStatus.textContent = '🖐️ SUPERNOVA / EXPAND';
      } else {
        this.labelCenterStatus.textContent = 'NORMAL TIME (1.0x)';
      }
    }
  }

  /**
   * Update tracker status badge, message, and finger dots
   */
  public updateTrackerStatus(status: TrackerStatusMessage): void {
    if (this.statusText) {
      this.statusText.textContent = status.message;
    }

    if (this.statusDot) {
      this.statusDot.className = 'status-dot';
      if (status.status === 'TRACKED') {
        this.statusDot.classList.add('active');
      } else if (status.status === 'DETECTING' || status.status === 'INITIALIZING') {
        this.statusDot.classList.add('detecting');
      } else if (status.status === 'FALLBACK') {
        this.statusDot.classList.add('fallback');
      }
    }

    if (status.fingerStates && this.fingerDots && this.fingerDots.length === 5) {
      status.fingerStates.forEach((val, idx) => {
        const dot = this.fingerDots?.[idx];
        if (dot) {
          const isActive = val > 0.45;
          dot.classList.toggle('active', isActive);
          dot.style.opacity = (0.3 + val * 0.7).toFixed(2);
        }
      });
    }
  }

  /**
   * Set active scene UI button state
   */
  public setActiveScene(sceneName: string): void {
    this.sceneButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key.toLowerCase() === sceneName.toLowerCase());
    });

    if (this.valScene) {
      this.valScene.textContent = sceneName.toUpperCase();
    }
  }

  /**
   * Set audio toggle button label and state
   */
  public setAudioActive(active: boolean): void {
    this.isAudioActive = active;
    if (this.btnToggleAudio) {
      this.btnToggleAudio.classList.toggle('active', active);
      this.btnToggleAudio.textContent = active ? '🔊 Audio: ON' : '🔇 Audio: OFF';
    }
  }

  /**
   * Set video recording button label and state
   */
  public setRecordingState(isRecording: boolean): void {
    this.isRecordingActive = isRecording;
    if (this.btnToggleRecord) {
      this.btnToggleRecord.classList.toggle('active', isRecording);
      this.btnToggleRecord.textContent = isRecording ? '⏹ Stop Rec' : '🎥 Record';
    }
  }

  /**
   * Toggle HUD overlay visibility for clean screen recording ([H] key)
   */
  public toggleHUD(forceState?: boolean): boolean {
    this.hudVisible = forceState !== undefined ? forceState : !this.hudVisible;
    if (this.hudLayer) {
      this.hudLayer.classList.toggle('hud-hidden', !this.hudVisible);
    }
    this.callbacks.onHudToggle?.(this.hudVisible);
    return this.hudVisible;
  }

  /**
   * Toggle 9:16 vertical TikTok framing guide
   */
  public toggleTikTokGuide(forceState?: boolean): boolean {
    this.tiktokFrameActive = forceState !== undefined ? forceState : !this.tiktokFrameActive;
    if (this.tiktokFrame) {
      this.tiktokFrame.classList.toggle('active', this.tiktokFrameActive);
    }
    if (this.btnToggleTiktok) {
      this.btnToggleTiktok.classList.toggle('active', this.tiktokFrameActive);
    }
    this.callbacks.onTikTokToggle?.(this.tiktokFrameActive);
    return this.tiktokFrameActive;
  }

  /**
   * Hide the welcome / permissions prompt overlay
   */
  public hidePromptModal(): void {
    if (this.promptOverlay) {
      this.promptOverlay.classList.add('hidden');
    }
  }

  public isHUDVisible(): boolean {
    return this.hudVisible;
  }

  public isTikTokGuideActive(): boolean {
    return this.tiktokFrameActive;
  }
}
