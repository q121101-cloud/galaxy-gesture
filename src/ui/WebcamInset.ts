import { HandLandmark } from '../core/types';
import { HAND_CONNECTIONS } from '../gestures/MediaPipeWrapper';

export interface WebcamInsetConfig {
  containerId?: string;
  videoId?: string;
  canvasId?: string;
  toggleBtnId?: string;
  stateBadgeId?: string;
}

/**
 * WebcamInset
 * Corner-mounted neural tracker inset with real-time hand skeleton overlay,
 * picture-in-picture size minimization, and connection state badging.
 */
export class WebcamInset {
  private container: HTMLElement | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private toggleBtn: HTMLElement | null = null;
  private stateBadge: HTMLElement | null = null;

  private isMinimizedState: boolean = false;

  constructor(config: WebcamInsetConfig = {}) {
    const containerId = config.containerId ?? 'webcam-container';
    const videoId = config.videoId ?? 'webcam-video';
    const canvasId = config.canvasId ?? 'landmark-canvas';
    const toggleBtnId = config.toggleBtnId ?? 'btn-toggle-pip';
    const stateBadgeId = config.stateBadgeId ?? 'cam-state-badge';

    if (typeof document !== 'undefined') {
      this.container = document.getElementById(containerId);
      this.video = document.getElementById(videoId) as HTMLVideoElement | null;
      this.canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
      this.toggleBtn = document.getElementById(toggleBtnId);
      this.stateBadge = document.getElementById(stateBadgeId);

      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d', { alpha: true });
      }

      this.initEvents();
    }
  }

  private initEvents(): void {
    this.toggleBtn?.addEventListener('click', () => {
      this.toggleMinimize();
    });
  }

  /**
   * Toggle Picture-in-Picture minimized state
   */
  public toggleMinimize(forceState?: boolean): boolean {
    this.isMinimizedState = forceState !== undefined ? forceState : !this.isMinimizedState;
    if (this.container) {
      this.container.classList.toggle('minimized', this.isMinimizedState);
    }
    return this.isMinimizedState;
  }

  public isMinimized(): boolean {
    return this.isMinimizedState;
  }

  /**
   * Render cyber neon landmark skeleton on overlay canvas
   */
  public drawSkeleton(landmarks: HandLandmark[] | null): void {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!landmarks || landmarks.length < 21) {
      return;
    }

    // 1. Draw glowing neon bone lines
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

    // 2. Draw glowing joint nodes & bright fingertip highlights
    const tipIndices = [4, 8, 12, 16, 20];
    for (let i = 0; i < Math.min(landmarks.length, 21); i++) {
      const isTip = tipIndices.includes(i);
      ctx.beginPath();
      ctx.arc(landmarks[i].x * w, landmarks[i].y * h, isTip ? 6.0 : 4.0, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#ffffff' : '#8a4fff';
      ctx.shadowColor = isTip ? '#ffffff' : '#8a4fff';
      ctx.shadowBlur = isTip ? 12 : 8;
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }

  /**
   * Update tracker state indicator dot
   */
  public setStateBadge(state: 'active' | 'detecting' | 'fallback' | 'error' | 'off'): void {
    if (!this.stateBadge) return;

    this.stateBadge.style.display = state === 'off' ? 'none' : 'block';
    if (state === 'active') {
      this.stateBadge.style.background = '#00ffb3';
      this.stateBadge.style.boxShadow = '0 0 10px #00ffb3';
    } else if (state === 'detecting') {
      this.stateBadge.style.background = '#00f0ff';
      this.stateBadge.style.boxShadow = '0 0 10px #00f0ff';
    } else if (state === 'fallback') {
      this.stateBadge.style.background = '#8a4fff';
      this.stateBadge.style.boxShadow = '0 0 10px #8a4fff';
    } else if (state === 'error') {
      this.stateBadge.style.background = '#ff3366';
      this.stateBadge.style.boxShadow = '0 0 10px #ff3366';
    }
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }

  public getCanvasElement(): HTMLCanvasElement | null {
    return this.canvas;
  }

  public getContainerElement(): HTMLElement | null {
    return this.container;
  }
}
