import { GestureState, HandLandmark } from '../core/types';
import { GestureRecognizer } from './GestureRecognizer';
import { SyntheticGestureSimulator } from './SyntheticGestureSimulator';

export interface TrackerStatusMessage {
  status: 'INITIALIZING' | 'ACTIVE' | 'TRACKED' | 'DETECTING' | 'FALLBACK' | 'ERROR' | 'STOPPED';
  message: string;
  openness?: number;
  handPosition?: { x: number; y: number };
  handAngle?: number;
  handPitch?: number;
  handScale?: number;
  fingerStates?: number[];
  latency?: number;
}

export interface MediaPipeWrapperConfig {
  videoElement?: HTMLVideoElement | null;
  canvasElement?: HTMLCanvasElement | null;
  onStateChange?: (status: TrackerStatusMessage) => void;
  onGestureState?: (state: GestureState) => void;
  enableKeyboardFallback?: boolean;
}

// MediaPipe 21 Landmark skeleton connections
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17],
];

/**
 * MediaPipeWrapper
 * Dynamic CDN script loader, camera stream manager, mobile adaptive resolution negotiator,
 * and robust fallback dispatcher.
 */
export class MediaPipeWrapper {
  public video: HTMLVideoElement | null = null;
  public canvas: HTMLCanvasElement | null = null;
  public ctx: CanvasRenderingContext2D | null = null;

  public readonly recognizer: GestureRecognizer;
  public readonly simulator: SyntheticGestureSimulator;

  private stream: MediaStream | null = null;
  private hands: any = null;
  private procCanvas: HTMLCanvasElement | null = null;
  private procCtx: CanvasRenderingContext2D | null = null;

  private isCameraRunning: boolean = false;
  private isProcessing: boolean = false;
  private isFallbackActive: boolean = false;
  private isMobile: boolean = false;

  private consecutiveMissingFrames: number = 0;
  private readonly missingFramesThreshold: number = 8;
  private latencyMs: number = 0;

  private onStateChange: (status: TrackerStatusMessage) => void;
  private onGestureState: (state: GestureState) => void;
  private loopId: number | null = null;

  // Keyboard fallback simulation state
  private keyboardTargetOpenness: number = 0.0;
  private keyboardTargetX: number = 0.0;
  private keyboardTargetY: number = 0.0;
  private keyboardTargetRoll: number = 0.0;
  private keyboardTargetPitch: number = 0.0;
  private keyboardTargetPinch: number = 1.0;

  constructor(config: MediaPipeWrapperConfig = {}) {
    this.video = config.videoElement ?? null;
    this.canvas = config.canvasElement ?? null;
    this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: true }) : null;
    this.onStateChange = config.onStateChange ?? (() => {});
    this.onGestureState = config.onGestureState ?? (() => {});

    this.recognizer = new GestureRecognizer();
    this.simulator = new SyntheticGestureSimulator();

    // Check mobile device characteristics
    this.isMobile = this.detectMobile();

    // Setup offscreen canvas for inference
    if (typeof document !== 'undefined') {
      this.procCanvas = document.createElement('canvas');
      this.procCanvas.width = this.isMobile ? 480 : 640;
      this.procCanvas.height = this.isMobile ? 360 : 480;
      this.procCtx = this.procCanvas.getContext('2d', { willReadFrequently: false });
    }

    if (config.enableKeyboardFallback !== false) {
      this.setupKeyboardFallback();
    }
  }

  private detectMobile(): boolean {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isTouch = navigator.maxTouchPoints > 1;
    const isSmallScreen = window.innerWidth <= 768;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (isTouch && isSmallScreen);
  }

  /**
   * Load MediaPipe Hands via CDN script loader if not already present.
   */
  public async loadScripts(): Promise<void> {
    if (typeof window === 'undefined') return;
    if ((window as any).Hands) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error('Failed to load MediaPipe Hands from CDN: ' + e));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize MediaPipe Hands, request webcam, and start stream tracking.
   */
  public async init(): Promise<void> {
    this.onStateChange({
      status: 'INITIALIZING',
      message: 'Initializing Neural Hand Tracker...',
    });

    try {
      if (typeof window !== 'undefined' && !(window as any).Hands) {
        await this.loadScripts();
      }

      const HandsClass = (window as any)?.Hands;
      if (!HandsClass) {
        throw new Error('MediaPipe Hands global constructor not available.');
      }

      this.hands = new HandsClass({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: this.isMobile ? 0 : 1, // Lite on mobile for 60fps, Full on desktop
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.hands.onResults((results: any) => this.handleResults(results));

      await this.startCamera();
      this.onStateChange({
        status: 'ACTIVE',
        message: 'Neural Tracker Active',
      });
    } catch (err: any) {
      console.warn('[MediaPipeWrapper] Webcam or MediaPipe init failed, switching to fallback mode:', err);
      this.isFallbackActive = true;
      this.onStateChange({
        status: 'FALLBACK',
        message: 'Keyboard Mode: [SPACE] Morph | [W/S, ↑/↓] Pitch | [A/D, ←/→] Roll | [P] Pinch',
      });
    }
  }

  /**
   * Initialize webcam video stream with mobile adaptive resolution.
   */
  public async startCamera(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia is not supported on this platform');
    }

    const constraints: MediaStreamConstraints = {
      video: this.isMobile
        ? {
            width: { ideal: 480, min: 320 },
            height: { ideal: 360, min: 240 },
            frameRate: { ideal: 30, min: 24 },
            facingMode: 'user',
          }
        : {
            width: { ideal: 640, min: 480 },
            height: { ideal: 480, min: 360 },
            frameRate: { ideal: 60, min: 30 },
            facingMode: 'user',
          },
      audio: false,
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (this.video) {
      this.video.srcObject = this.stream;
      await new Promise<void>((resolve) => {
        if (!this.video) return resolve();
        this.video.onloadedmetadata = () => {
          this.video?.play().catch(() => {});
          resolve();
        };
      });

      if (this.canvas) {
        this.canvas.width = this.video.videoWidth || (this.isMobile ? 480 : 640);
        this.canvas.height = this.video.videoHeight || (this.isMobile ? 360 : 480);
      }
    }

    this.isCameraRunning = true;
    this.isFallbackActive = false;
    this.startLoop();
  }

  private startLoop(): void {
    const processFrame = async () => {
      if (!this.isCameraRunning) return;

      if (
        this.video &&
        !this.isProcessing &&
        this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        this.video.videoWidth > 0 &&
        this.video.videoHeight > 0
      ) {
        this.isProcessing = true;
        const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

        try {
          if (this.procCtx && this.procCanvas) {
            this.procCtx.drawImage(
              this.video,
              0,
              0,
              this.video.videoWidth,
              this.video.videoHeight,
              0,
              0,
              this.procCanvas.width,
              this.procCanvas.height
            );
            await this.hands.send({ image: this.procCanvas });
          }
          this.latencyMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
        } catch (e) {
          console.error('[MediaPipeWrapper] Frame inference error:', e);
        } finally {
          this.isProcessing = false;
        }
      }

      if (this.video && 'requestVideoFrameCallback' in this.video) {
        (this.video as any).requestVideoFrameCallback(processFrame);
      } else if (typeof requestAnimationFrame !== 'undefined') {
        this.loopId = requestAnimationFrame(processFrame);
      }
    };

    if (this.video && 'requestVideoFrameCallback' in this.video) {
      (this.video as any).requestVideoFrameCallback(processFrame);
    } else if (typeof requestAnimationFrame !== 'undefined') {
      this.loopId = requestAnimationFrame(processFrame);
    }
  }

  /**
   * Handle results from MediaPipe Hands inference.
   */
  public handleResults(results: any): void {
    if (this.ctx && this.canvas && this.canvas.width > 0 && this.canvas.height > 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const rawLm: HandLandmark[] = results.multiHandLandmarks[0];
      this.consecutiveMissingFrames = 0;
      this.isFallbackActive = false;

      // Draw skeleton on overlay canvas
      if (this.ctx && this.canvas) {
        this.drawSkeleton(rawLm);
      }

      // Process through full Gesture Recognizer
      const gestureState = this.recognizer.process(rawLm, 0.016);
      this.onGestureState(gestureState);

      this.onStateChange({
        status: 'TRACKED',
        message: `Tracking Active [Open: ${Math.round(gestureState.openness * 100)}%]`,
        openness: gestureState.openness,
        handPosition: gestureState.position,
        handAngle: gestureState.rotation.roll,
        handPitch: gestureState.rotation.pitch,
        handScale: 1.0 + gestureState.zoomDelta,
        latency: this.latencyMs,
      });
    } else {
      this.consecutiveMissingFrames++;
      if (this.consecutiveMissingFrames > this.missingFramesThreshold) {
        const defaultState = this.recognizer.process(null, 0.016);
        this.onGestureState(defaultState);

        this.onStateChange({
          status: 'DETECTING',
          message: 'Detecting Hand...',
          latency: this.latencyMs,
        });
      }
    }
  }

  /**
   * Render neon cyber skeleton overlay on mini-cam inset canvas.
   */
  public drawSkeleton(landmarks: HandLandmark[]): void {
    if (!this.ctx || !this.canvas || landmarks.length < 21) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Bold Neon Cyber Bones
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(0, 255, 179, 0.9)';
    ctx.shadowColor = '#00ffb3';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
      const [a, b] = HAND_CONNECTIONS[i];
      if (landmarks[a] && landmarks[b]) {
        ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
        ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
      }
    }
    ctx.stroke();

    // Joint Nodes
    const tipIndices = [4, 8, 12, 16, 20];
    for (let i = 0; i < Math.min(landmarks.length, 21); i++) {
      const isTip = tipIndices.includes(i);
      ctx.beginPath();
      ctx.arc(landmarks[i].x * w, landmarks[i].y * h, isTip ? 6.0 : 4.0, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#ffffff' : '#8a4fff';
      ctx.shadowColor = isTip ? '#ffffff' : '#8a4fff';
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  /**
   * Set up keyboard simulation for testing and fallback modes.
   */
  private setupKeyboardFallback(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.keyboardTargetOpenness = this.keyboardTargetOpenness > 0.5 ? 0.0 : 1.0;
        this.dispatchKeyboardUpdate();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.keyboardTargetPitch = Math.min(1.0, this.keyboardTargetPitch + 0.15);
        this.dispatchKeyboardUpdate();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.keyboardTargetPitch = Math.max(-1.0, this.keyboardTargetPitch - 0.15);
        this.dispatchKeyboardUpdate();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.keyboardTargetRoll -= 0.15;
        this.keyboardTargetX = Math.max(-1.0, this.keyboardTargetX - 0.1);
        this.dispatchKeyboardUpdate();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.keyboardTargetRoll += 0.15;
        this.keyboardTargetX = Math.min(1.0, this.keyboardTargetX + 0.1);
        this.dispatchKeyboardUpdate();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        this.keyboardTargetPinch = this.keyboardTargetPinch < 0.5 ? 1.0 : 0.0;
        this.dispatchKeyboardUpdate();
      }
    });
  }

  private dispatchKeyboardUpdate(): void {
    this.isFallbackActive = true;
    const simState: GestureState = {
      hasHand: true,
      openness: this.keyboardTargetOpenness,
      pinchDistance: this.keyboardTargetPinch,
      timeDilation: 0.1 + this.keyboardTargetPinch * 0.9,
      rotation: {
        yaw: this.keyboardTargetRoll * 0.8,
        pitch: this.keyboardTargetPitch,
        roll: this.keyboardTargetRoll,
      },
      position: { x: this.keyboardTargetX, y: this.keyboardTargetY },
      zoomDelta: (this.keyboardTargetOpenness - 0.5) * 0.5,
      swipeTriggered: null,
      intensity: 0.5,
      rawLandmarks: null,
    };
    this.onGestureState(simState);
  }

  /**
   * Lifecycle cleanup: stop animation loops and close camera streams.
   */
  public stop(): void {
    this.isCameraRunning = false;
    if (this.loopId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.loopId);
      this.loopId = null;
    }
  }

  public destroy(): void {
    this.stop();
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    this.recognizer.reset();
    this.simulator.reset();
  }
}
