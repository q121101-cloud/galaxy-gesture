import { AudioEngine } from '../audio/AudioEngine';

export interface VideoRecorderConfig {
  canvas?: HTMLCanvasElement | null;
  audioEngine?: AudioEngine | null;
  indicatorId?: string;
  fps?: number;
  onStart?: () => void;
  onStop?: (blob: Blob, durationSeconds: number) => void;
  onError?: (error: Error) => void;
}

/**
 * VideoRecorder
 * 60 FPS Canvas MediaStream capture engine combined with Web Audio destination
 * for pristine cinematic TikTok / Reels screen recording.
 */
export class VideoRecorder {
  private canvas: HTMLCanvasElement | null = null;
  private audioEngine: AudioEngine | null = null;
  private indicator: HTMLElement | null = null;
  private recText: HTMLElement | null = null;

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecordingActive: boolean = false;
  private startTime: number = 0;
  private timerInterval: any = null;
  private targetFps: number = 60;

  private onStartCallback?: () => void;
  private onStopCallback?: (blob: Blob, durationSeconds: number) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(config: VideoRecorderConfig = {}) {
    this.canvas = config.canvas ?? null;
    this.audioEngine = config.audioEngine ?? null;
    this.targetFps = config.fps ?? 60;
    this.onStartCallback = config.onStart;
    this.onStopCallback = config.onStop;
    this.onErrorCallback = config.onError;

    const indicatorId = config.indicatorId ?? 'recording-indicator';
    if (typeof document !== 'undefined') {
      this.indicator = document.getElementById(indicatorId);
      this.recText = this.indicator?.querySelector?.('.rec-text') ?? null;
    }
  }

  public setCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
  }

  public setAudioEngine(audioEngine: AudioEngine | null): void {
    this.audioEngine = audioEngine;
  }

  /**
   * Determine the optimal supported MIME type for video recording
   */
  private getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return 'video/webm';
    }

    const preferredTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ];

    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  /**
   * Start recording the WebGL Canvas and Web Audio stream
   */
  public start(): boolean {
    if (this.isRecordingActive) return true;

    try {
      if (!this.canvas) {
        if (typeof document !== 'undefined') {
          this.canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
        }
      }

      if (!this.canvas) {
        throw new Error('No canvas element available for video recording');
      }

      // 1. Capture 60FPS canvas stream
      let stream: MediaStream;
      if (typeof (this.canvas as any).captureStream === 'function') {
        stream = (this.canvas as any).captureStream(this.targetFps);
      } else {
        throw new Error('HTMLCanvasElement.captureStream is not supported in this browser');
      }

      // 2. Mix Web Audio destination stream if available
      if (this.audioEngine) {
        const audioDest = this.audioEngine.getMediaStreamDestination();
        if (audioDest && audioDest.stream) {
          const audioTracks = audioDest.stream.getAudioTracks();
          for (const track of audioTracks) {
            stream.addTrack(track);
          }
        }
      }

      // 3. Instantiate MediaRecorder
      const mimeType = this.getSupportedMimeType();
      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder API is not supported in this environment');
      }

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.finishRecording();
      };

      this.mediaRecorder.onerror = (e: any) => {
        console.error('[VideoRecorder] MediaRecorder error:', e);
        this.onErrorCallback?.(e.error || new Error('MediaRecorder error'));
      };

      // 4. Start recording with 1-second chunks
      this.mediaRecorder.start(1000);
      this.isRecordingActive = true;
      this.startTime = Date.now();

      // 5. Activate HUD indicator
      this.showIndicator();
      this.startTimer();

      this.onStartCallback?.();
      return true;
    } catch (err: any) {
      console.warn('[VideoRecorder] Failed to start video recording:', err);
      this.onErrorCallback?.(err);
      return false;
    }
  }

  /**
   * Stop recording and package download blob
   */
  public stop(): void {
    if (!this.isRecordingActive) return;

    this.isRecordingActive = false;
    this.stopTimer();
    this.hideIndicator();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        console.warn('[VideoRecorder] Error stopping media recorder:', err);
      }
    }
  }

  /**
   * Toggle recording state
   */
  public toggle(): boolean {
    if (this.isRecordingActive) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  private finishRecording(): void {
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
    const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
    const blob = new Blob(this.recordedChunks, { type: mimeType });

    // Trigger automatic file download in browser
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && blob.size > 0) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      a.download = `interstellar_gesture_capture_${Date.now()}.${extension}`;
      if (typeof a.click === 'function') {
        a.click();
      }
      setTimeout(() => {
        try {
          if (document.body.contains ? document.body.contains(a) : true) {
            document.body.removeChild(a);
          }
        } catch (_) {}
        if (typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(url);
        }
      }, 100);
    }

    this.onStopCallback?.(blob, durationSeconds);
  }

  private startTimer(): void {
    this.stopTimer();
    this.updateTimerDisplay(0);

    this.timerInterval = setInterval(() => {
      if (!this.isRecordingActive) return;
      const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
      this.updateTimerDisplay(elapsedSec);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimerDisplay(seconds: number): void {
    if (!this.recText) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    this.recText.textContent = `REC ${pad(mins)}:${pad(secs)}`;
  }

  private showIndicator(): void {
    if (this.indicator) {
      this.indicator.classList.add('active');
    }
  }

  private hideIndicator(): void {
    if (this.indicator) {
      this.indicator.classList.remove('active');
    }
  }

  public isRecording(): boolean {
    return this.isRecordingActive;
  }

  public getElapsedTime(): number {
    if (!this.isRecordingActive) return 0;
    return (Date.now() - this.startTime) / 1000;
  }
}
