import * as THREE from 'three';
import { EngineConfig, GestureState, HUDTelemetry, IAudioEngine, IScene, TransitionConfig } from './types';
import { TimeManager } from './TimeManager';
import { CameraController } from './CameraController';
import { SceneManager } from './SceneManager';

export class Engine {
  public readonly canvas: HTMLCanvasElement;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly timeManager: TimeManager;
  public readonly cameraController: CameraController;
  public readonly sceneManager: SceneManager;
  public audioEngine: IAudioEngine | null = null;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private telemetryListeners: Array<(telemetry: HUDTelemetry) => void> = [];
  private currentGestureState: GestureState;
  private isPostProcessingEnabled: boolean = true;
  private isRecording: boolean = false;
  private hudVisible: boolean = true;

  constructor(config: EngineConfig) {
    this.canvas = config.canvas;

    // 1. Configure WebGL2 high-performance renderer
    const maxPixelRatio = config.maxPixelRatio ?? 1.5;
    const pixelRatio = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, maxPixelRatio) : 1.0;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: config.antialias ?? false, // Disabled by default for maximum fillrate with bloom & 300k+ particles
      powerPreference: config.powerPreference ?? 'high-performance',
      alpha: false,
      stencil: false,
      depth: true,
      precision: 'highp',
    });

    const initialWidth = this.canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const initialHeight = this.canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 720);

    this.renderer.setSize(initialWidth, initialHeight, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = config.toneMapping ?? THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = config.toneMappingExposure ?? 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;

    // 2. Instantiate core subsystems
    this.timeManager = new TimeManager();
    this.cameraController = new CameraController();
    this.sceneManager = new SceneManager();

    // 3. Default neutral gesture state
    this.currentGestureState = {
      hasHand: false,
      openness: 0.0,
      pinchDistance: 1.0,
      timeDilation: 1.0,
      rotation: { yaw: 0, pitch: 0, roll: 0 },
      position: { x: 0, y: 0 },
      zoomDelta: 0,
      swipeTriggered: null,
      intensity: 0,
      rawLandmarks: null,
    };

    // 4. Setup Resizing
    this.setupResizeObserver();
  }

  private setupResizeObserver(): void {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.resize(width, height);
    };

    window.addEventListener('resize', handleResize);

    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    const pixelRatio = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.5) : 1.0;
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.cameraController.updateAspect(width, height);
    this.sceneManager.resize(width, height, pixelRatio);
  }

  /**
   * Register a scene into the engine
   */
  public async registerScene(scene: IScene): Promise<void> {
    await this.sceneManager.registerScene(scene, this.renderer, this.cameraController.camera);
  }

  /**
   * Assign or replace active Audio Engine instance
   */
  public setAudioEngine(audioEngine: IAudioEngine | null): void {
    this.audioEngine = audioEngine;
  }

  /**
   * Switch active scene
   */
  public switchScene(sceneName: string, config?: Partial<TransitionConfig>): boolean {
    const transitioned = this.sceneManager.switchTo(sceneName, config);
    if (transitioned && this.audioEngine) {
      this.audioEngine.setScene(sceneName, config?.duration ?? 1.5);
    }
    return transitioned;
  }

  /**
   * Update gesture state from MediaPipe or Keyboard fallback
   */
  public setGestureState(state: Partial<GestureState>): void {
    this.currentGestureState = {
      ...this.currentGestureState,
      ...state,
    };

    // Forward real-time gesture telemetry to procedural audio coupler
    if (this.audioEngine) {
      this.audioEngine.updateGestureModulation(this.currentGestureState);
    }

    // If swipe was triggered, automatically trigger scene switch
    if (state.swipeTriggered === 'right') {
      this.sceneManager.nextScene({ duration: 1.0, type: 'crossfade' });
      if (this.audioEngine) {
        this.audioEngine.setScene(this.sceneManager.getActiveSceneName(), 1.0);
      }
    } else if (state.swipeTriggered === 'left') {
      this.sceneManager.previousScene({ duration: 1.0, type: 'crossfade' });
      if (this.audioEngine) {
        this.audioEngine.setScene(this.sceneManager.getActiveSceneName(), 1.0);
      }
    }
  }

  public getGestureState(): Readonly<GestureState> {
    return this.currentGestureState;
  }

  /**
   * Start main animation loop
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = (timestamp: number) => {
      if (!this.isRunning) return;
      this.renderFrame(timestamp);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Execute a single animation and render frame
   */
  public renderFrame(timestamp?: number): void {
    // 1. Advance time manager
    const timeState = this.timeManager.update(this.currentGestureState.timeDilation, timestamp);

    // 2. Update camera physics using rawDelta (so camera controls remain snappy during slow motion)
    this.cameraController.update(timeState.rawDelta, this.currentGestureState);

    // 3. Update active scenes using scaledDelta for particle physics
    this.sceneManager.update(
      timeState.scaledDelta,
      timeState.rawDelta,
      timeState.timeDilation,
      this.currentGestureState
    );

    // 4. Render pass
    this.renderer.clear();
    this.sceneManager.render(this.renderer, this.cameraController.camera);

    // 5. Broadcast HUD Telemetry
    this.dispatchTelemetry(timeState.fps, timeState.frameTimeMs, timeState.timeDilation);
  }

  private dispatchTelemetry(fps: number, frameTimeMs: number, timeDilation: number): void {
    if (this.telemetryListeners.length === 0) return;

    let gestureName = 'None';
    if (this.currentGestureState.hasHand) {
      if (this.currentGestureState.pinchDistance < 0.3) {
        gestureName = 'Pinch (Time Dilation)';
      } else if (this.currentGestureState.openness < 0.2) {
        gestureName = 'Fist (Singularity)';
      } else if (this.currentGestureState.openness > 0.8) {
        gestureName = 'Open Palm (Supernova)';
      } else {
        gestureName = 'Tracking';
      }
    }

    const telemetry: HUDTelemetry = {
      currentScene: this.sceneManager.getActiveSceneName(),
      fps,
      frameTimeMs,
      particleCount: this.sceneManager.getParticleCount(),
      gestureName,
      timeDilation,
      isRecording: this.isRecording,
      hudVisible: this.hudVisible,
      handDetected: this.currentGestureState.hasHand,
      handOpenness: this.currentGestureState.openness,
      handPitch: this.currentGestureState.rotation.pitch,
      handRoll: this.currentGestureState.rotation.roll,
      zoomLevel: 1.0 + this.currentGestureState.zoomDelta,
      latencyMs: Math.round(frameTimeMs),
    };

    for (const listener of this.telemetryListeners) {
      listener(telemetry);
    }
  }

  public onTelemetry(callback: (telemetry: HUDTelemetry) => void): () => void {
    this.telemetryListeners.push(callback);
    return () => {
      this.telemetryListeners = this.telemetryListeners.filter((c) => c !== callback);
    };
  }

  public setRecording(isRecording: boolean): void {
    this.isRecording = isRecording;
  }

  public setHudVisible(visible: boolean): void {
    this.hudVisible = visible;
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public dispose(): void {
    this.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.audioEngine?.dispose();
    this.audioEngine = null;
    this.sceneManager.dispose();
    this.renderer.dispose();
    this.telemetryListeners = [];
  }
}
