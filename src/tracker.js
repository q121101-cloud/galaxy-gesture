/**
 * 1€ Filter (One Euro Filter)
 * Ultra-smooth motion filtering with zero jitter at low speeds and instant reaction at high speeds.
 */
class OneEuroFilter {
  constructor({ minCutoff = 0.5, beta = 0.045, dCutoff = 1.0 }) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  filter(x, timestamp = performance.now()) {
    if (this.tPrev === null || this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = timestamp;
      this.dxPrev = 0;
      return x;
    }

    const dt = Math.max((timestamp - this.tPrev) / 1000.0, 0.001);
    this.tPrev = timestamp;

    const dx = (x - this.xPrev) / dt;
    const alphaD = this.computeAlpha(dt, this.dCutoff);
    const dxHat = alphaD * dx + (1 - alphaD) * this.dxPrev;
    this.dxPrev = dxHat;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const alpha = this.computeAlpha(dt, cutoff);

    const xHat = alpha * x + (1 - alpha) * this.xPrev;
    this.xPrev = xHat;
    return xHat;
  }

  computeAlpha(dt, cutoff) {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

// MediaPipe 21 Landmark skeleton connections
const HAND_CONNECTIONS = [
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
  [5, 9], [9, 13], [13, 17]
];

export class NeuralTracker {
  constructor({ videoElement, canvasElement, onStateChange }) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d', { alpha: true }) : null;
    this.onStateChange = onStateChange || (() => {});

    this.isMobile = /iPhone|iPad|iPod|Android|Mobile|Tablet/i.test(navigator.userAgent || '');
    this.currentFacingMode = 'user'; // 'user' (front) or 'environment' (back)

    // Offscreen Canvas for high-speed neural inference
    this.procCanvas = document.createElement('canvas');
    this.procCanvas.width = this.isMobile ? 360 : 480;
    this.procCanvas.height = this.isMobile ? 480 : 360;
    this.procCtx = this.procCanvas.getContext('2d', { willReadFrequently: false });

    // Output tracking parameters
    this.openness = 0.0;
    this.handPosition = { x: 0, y: 0 };
    this.handAngle = 0.0;     // Roll Angle in Radians (Left < 0, Right > 0)
    this.handPitch = 0.0;     // Pitch Angle in Radians (Down < 0, Up > 0)
    this.handScale = 1.0;     // Hand Camera Distance Scale (Zoom parameter)
    this.rawOpenness = 0.0;
    this.rawHandPosition = { x: 0, y: 0 };
    this.rawHandAngle = 0.0;
    this.rawHandPitch = 0.0;
    this.rawHandScale = 1.0;
    this.fingerStates = [0, 0, 0, 0, 0]; // [T, I, M, R, P]

    // Ultra-smooth 1€ Filters (tuned for zero latency)
    this.opennessFilter = new OneEuroFilter({ minCutoff: 0.6, beta: 0.04, dCutoff: 1.0 });
    this.posXFilter = new OneEuroFilter({ minCutoff: 0.4, beta: 0.035, dCutoff: 1.0 });
    this.posYFilter = new OneEuroFilter({ minCutoff: 0.4, beta: 0.035, dCutoff: 1.0 });
    this.angleFilter = new OneEuroFilter({ minCutoff: 0.35, beta: 0.035, dCutoff: 1.0 });
    this.pitchFilter = new OneEuroFilter({ minCutoff: 0.35, beta: 0.035, dCutoff: 1.0 });
    this.scaleFilter = new OneEuroFilter({ minCutoff: 0.4, beta: 0.035, dCutoff: 1.0 });

    this.isHandDetected = false;
    this.isCameraRunning = false;
    this.isProcessing = false;
    this.latencyMs = 0;
    this.consecutiveMissingFrames = 0;

    // Fallback Touch & Keyboard Controls
    this.isFallbackActive = false;
    this.touchTargetOpenness = 0.0;
    this.touchTargetX = 0.0;
    this.touchTargetY = 0.0;
    this.touchTargetAngle = 0.0;
    this.touchTargetPitch = 0.0;
    this.touchTargetScale = 1.0;

    this.setupTouchAndKeyboardFallback();
  }

  async init() {
    this.onStateChange({ status: 'INITIALIZING', message: 'Initializing Neural Tracker...' });

    // Check secure context for mobile
    const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecure && this.isMobile) {
      this.onStateChange({
        status: 'FALLBACK',
        message: '⚠️ Hãy mở bằng link HTTPS để cấp quyền Camera trên điện thoại'
      });
    }

    try {
      if (typeof window.Hands === 'undefined') {
        await this.loadScripts();
      }

      this.hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      // Mobile devices use modelComplexity: 0 for lightning-fast 60+ FPS inference & zero throttling
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: this.isMobile ? 0 : 1,
        minDetectionConfidence: 0.45,
        minTrackingConfidence: 0.45
      });

      this.hands.onResults((results) => this.handleResults(results));

      await this.startCamera();
      this.onStateChange({ status: 'ACTIVE', message: 'Neural Tracker Active' });
    } catch (err) {
      console.warn('NeuralTracker initialization warning:', err);
      this.isFallbackActive = true;
      this.onStateChange({
        status: 'FALLBACK',
        message: this.isMobile
          ? 'Touch Mode: Chạm / Kéo / Dùng 2 ngón tay thu phóng'
          : 'Keyboard Mode: [SPACE] Morph | [↑ / ↓] Pitch & Zoom | [← / →] Roll'
      });
    }
  }

  async loadScripts() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error('Failed to load MediaPipe Hands: ' + e));
      document.head.appendChild(script);
    });
  }

  async startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('navigator.mediaDevices.getUserMedia is not supported or requires HTTPS');
    }

    // Stop existing stream if any
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }

    const constraintList = [
      // 1. Mobile optimized constraint
      {
        video: {
          facingMode: this.currentFacingMode,
          width: { ideal: this.isMobile ? 480 : 640 },
          height: { ideal: this.isMobile ? 640 : 480 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      },
      // 2. Generic facingMode
      {
        video: { facingMode: this.currentFacingMode },
        audio: false
      },
      // 3. Fallback any camera
      {
        video: true,
        audio: false
      }
    ];

    let stream = null;
    let lastError = null;

    for (const c of constraintList) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(c);
        if (stream) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!stream) {
      throw lastError || new Error('Unable to access camera on this device');
    }

    this.stream = stream;
    this.video.srcObject = stream;
    this.video.setAttribute('playsinline', 'true');
    this.video.setAttribute('webkit-playsinline', 'true');
    this.video.muted = true;

    await new Promise((resolve) => {
      this.video.onloadedmetadata = () => {
        this.video.play().then(resolve).catch(resolve);
      };
    });

    const vw = this.video.videoWidth || (this.isMobile ? 480 : 640);
    const vh = this.video.videoHeight || (this.isMobile ? 640 : 480);

    if (this.canvas) {
      this.canvas.width = vw;
      this.canvas.height = vh;
    }
    this.procCanvas.width = Math.min(vw, 480);
    this.procCanvas.height = Math.min(vh, 480);

    this.isCameraRunning = true;
    this.startLoop();
  }

  async switchCamera() {
    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    try {
      await this.startCamera();
      return true;
    } catch (e) {
      console.warn('Switch camera error:', e);
      return false;
    }
  }

  startLoop() {
    const processFrame = async () => {
      if (!this.isCameraRunning) return;

      if (!this.isProcessing && this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        this.isProcessing = true;
        const t0 = performance.now();

        try {
          this.procCtx.drawImage(
            this.video,
            0, 0, this.video.videoWidth, this.video.videoHeight,
            0, 0, this.procCanvas.width, this.procCanvas.height
          );
          await this.hands.send({ image: this.procCanvas });
          this.latencyMs = Math.round(performance.now() - t0);
        } catch (e) {
          console.error('Hand tracking frame error:', e);
        } finally {
          this.isProcessing = false;
        }
      }

      if ('requestVideoFrameCallback' in this.video) {
        this.video.requestVideoFrameCallback(processFrame);
      } else {
        requestAnimationFrame(processFrame);
      }
    };

    if ('requestVideoFrameCallback' in this.video) {
      this.video.requestVideoFrameCallback(processFrame);
    } else {
      requestAnimationFrame(processFrame);
    }
  }

  handleResults(results) {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    const now = performance.now();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const lm = results.multiHandLandmarks[0];
      this.isHandDetected = true;
      this.consecutiveMissingFrames = 0;
      this.isFallbackActive = false;

      // 1. Invariant 3D Palm Size Reference
      const wrist = lm[0];
      const indexMcp = lm[5];
      const middleMcp = lm[9];
      const pinkyMcp = lm[17];
      const middleTip = lm[12];

      const palmWidth = Math.hypot(pinkyMcp.x - indexMcp.x, pinkyMcp.y - indexMcp.y, (pinkyMcp.z || 0) - (indexMcp.z || 0));
      const palmHeight = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y, (middleMcp.z || 0) - (wrist.z || 0));
      const palmScale = Math.max((palmWidth * 1.2 + palmHeight * 1.0) / 2.2, 0.035);

      // 2. Hand Roll Rotation Angle (Left < 0, Right > 0)
      const isFrontCam = this.currentFacingMode === 'user';
      const dirX = (isFrontCam ? -1 : 1) * (middleMcp.x - wrist.x);
      const dirY = -(middleMcp.y - wrist.y);
      this.rawHandAngle = Math.atan2(dirX, -dirY);

      // 3. Hand Pitch Tilt Angle (Pitch Down < 0, Pitch Up/Back > 0)
      const deltaZKnuckle = (middleMcp.z || 0) - (wrist.z || 0);
      const deltaZTip = (middleTip.z || 0) - (wrist.z || 0);
      const avgDeltaZ = (deltaZKnuckle * 0.4 + deltaZTip * 0.6) / palmScale;
      this.rawHandPitch = Math.max(-1.0, Math.min(1.0, -avgDeltaZ * 1.3));

      // 4. Hand Distance (Calibrated Zoom scale)
      const normScale = Math.max(0.7, Math.min(1.35, palmScale / 0.20));
      this.rawHandScale = normScale;

      // 5. Linear & Highly Sensitive Finger Extension Analysis (T, I, M, R, P)
      const fingerDefs = [
        { tip: 4, pip: 3, mcp: 2, isThumb: true },
        { tip: 8, pip: 6, mcp: 5 },
        { tip: 12, pip: 10, mcp: 9 },
        { tip: 16, pip: 14, mcp: 13 },
        { tip: 20, pip: 18, mcp: 17 }
      ];

      let fingerExtSum = 0;
      const fingerScores = [];

      for (let i = 0; i < fingerDefs.length; i++) {
        const def = fingerDefs[i];
        const tipPt = lm[def.tip];
        const pipPt = lm[def.pip];
        const mcpPt = lm[def.mcp];

        if (def.isThumb) {
          const dTipPinky = Math.hypot(tipPt.x - pinkyMcp.x, tipPt.y - pinkyMcp.y, (tipPt.z || 0) - (pinkyMcp.z || 0));
          const dMcpPinky = Math.hypot(mcpPt.x - pinkyMcp.x, mcpPt.y - pinkyMcp.y, (mcpPt.z || 0) - (pinkyMcp.z || 0));
          const thumbRatio = (dTipPinky - dMcpPinky * 0.7) / (palmScale * 0.9);
          const score = Math.max(0.0, Math.min(1.0, (thumbRatio - 0.1) / 0.85));
          fingerScores.push(score);
          fingerExtSum += score;
        } else {
          const dTipWrist = Math.hypot(tipPt.x - wrist.x, tipPt.y - wrist.y, (tipPt.z || 0) - (wrist.z || 0));
          const dPipWrist = Math.hypot(pipPt.x - wrist.x, pipPt.y - wrist.y, (pipPt.z || 0) - (wrist.z || 0));
          const dMcpWrist = Math.hypot(mcpPt.x - wrist.x, mcpPt.y - wrist.y, (mcpPt.z || 0) - (wrist.z || 0));

          const extRatio = (dTipWrist - dMcpWrist) / (Math.max(dPipWrist - dMcpWrist, 0.01) * 1.65);
          const score = Math.max(0.0, Math.min(1.0, (extRatio - 0.15) / 0.75));
          fingerScores.push(score);
          fingerExtSum += score;
        }
      }

      this.fingerStates = fingerScores;

      // 6. Multi-Fingertip Distance to Palm
      const tips = [4, 8, 12, 16, 20];
      let totalTipDist = 0;
      for (const t of tips) {
        totalTipDist += Math.hypot(lm[t].x - wrist.x, lm[t].y - wrist.y, (lm[t].z || 0) - (wrist.z || 0));
      }
      const avgTipDist = totalTipDist / 5.0;
      const distRatio = avgTipDist / palmScale;
      const ratioScore = Math.max(0.0, Math.min(1.0, (distRatio - 0.88) / 0.87));

      // 7. Linear 1:1 Responsive Openness
      const avgExt = fingerExtSum / 5.0;
      this.rawOpenness = Math.max(0.0, Math.min(1.0, avgExt * 0.6 + ratioScore * 0.4));

      // 8. Centroid Translation (X, Y in [-1, 1])
      const palmPoints = [0, 5, 9, 13, 17];
      let sumX = 0, sumY = 0;
      for (const p of palmPoints) {
        sumX += lm[p].x;
        sumY += lm[p].y;
      }
      this.rawHandPosition.x = -(sumX / palmPoints.length * 2.0 - 1.0);
      this.rawHandPosition.y = -(sumY / palmPoints.length * 2.0 - 1.0);

      // 9. Fast 1€ Filtering
      this.openness = this.opennessFilter.filter(this.rawOpenness, now);
      this.handPosition.x = this.posXFilter.filter(this.rawHandPosition.x, now);
      this.handPosition.y = this.posYFilter.filter(this.rawHandPosition.y, now);
      this.handAngle = this.angleFilter.filter(this.rawHandAngle, now);
      this.handPitch = this.pitchFilter.filter(this.rawHandPitch, now);
      this.handScale = this.scaleFilter.filter(this.rawHandScale, now);

      // 10. Draw Neon Skeleton
      if (this.ctx && this.canvas) {
        this.drawSkeleton(lm);
      }

      this.onStateChange({
        status: 'TRACKED',
        message: `Tracking Active [Open: ${Math.round(this.openness * 100)}%]`,
        openness: this.openness,
        handPosition: this.handPosition,
        handAngle: this.handAngle,
        handPitch: this.handPitch,
        handScale: this.handScale,
        fingerStates: this.fingerStates,
        latency: this.latencyMs
      });
    } else {
      this.consecutiveMissingFrames++;
      if (this.consecutiveMissingFrames > 8) {
        this.isHandDetected = false;
        this.onStateChange({
          status: 'DETECTING',
          message: 'Detecting Hand...',
          latency: this.latencyMs
        });
      }
    }
  }

  drawSkeleton(lm) {
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
      ctx.moveTo(lm[a].x * w, lm[a].y * h);
      ctx.lineTo(lm[b].x * w, lm[b].y * h);
    }
    ctx.stroke();

    // Large Joint Nodes
    const tipIndices = [4, 8, 12, 16, 20];
    for (let i = 0; i < lm.length; i++) {
      const isTip = tipIndices.includes(i);
      ctx.beginPath();
      ctx.arc(lm[i].x * w, lm[i].y * h, isTip ? 6.0 : 4.0, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#ffffff' : '#8a4fff';
      ctx.shadowColor = isTip ? '#ffffff' : '#8a4fff';
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  setupTouchAndKeyboardFallback() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.touchTargetOpenness = this.touchTargetOpenness > 0.5 ? 0.0 : 1.0;
        this.isFallbackActive = true;
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.touchTargetPitch = Math.min(1.0, this.touchTargetPitch + 0.15);
        this.touchTargetScale = Math.min(1.35, this.touchTargetScale + 0.05);
        this.isFallbackActive = true;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.touchTargetPitch = Math.max(-1.0, this.touchTargetPitch - 0.15);
        this.touchTargetScale = Math.max(0.7, this.touchTargetScale - 0.05);
        this.isFallbackActive = true;
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.touchTargetAngle -= 0.15;
        this.touchTargetX = Math.max(-1.0, this.touchTargetX - 0.1);
        this.isFallbackActive = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.touchTargetAngle += 0.15;
        this.touchTargetX = Math.min(1.0, this.touchTargetX + 0.1);
        this.isFallbackActive = true;
      }
    });

    // Touch Controls: Pinch to Zoom & Morph on mobile touch
    let initialTouchDist = 0;
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        this.isFallbackActive = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialTouchDist > 0) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const ratio = currentDist / initialTouchDist;
        this.touchTargetOpenness = Math.max(0.0, Math.min(1.0, (ratio - 0.7) / 0.9));
        this.touchTargetScale = Math.max(0.7, Math.min(1.35, ratio));
        this.isFallbackActive = true;
      }
    }, { passive: true });
  }

  update() {
    const now = performance.now();

    if (this.isFallbackActive || !this.isHandDetected) {
      this.openness = this.opennessFilter.filter(this.touchTargetOpenness, now);
      this.handPosition.x = this.posXFilter.filter(this.touchTargetX, now);
      this.handPosition.y = this.posYFilter.filter(this.touchTargetY, now);
      this.handAngle = this.angleFilter.filter(this.touchTargetAngle, now);
      this.handPitch = this.pitchFilter.filter(this.touchTargetPitch, now);
      this.handScale = this.scaleFilter.filter(this.touchTargetScale, now);
    }

    return {
      openness: this.openness,
      handPosition: this.handPosition,
      handAngle: this.handAngle,
      handPitch: this.handPitch,
      handScale: this.handScale,
      isHandDetected: this.isHandDetected,
      isFallbackActive: this.isFallbackActive,
      fingerStates: this.fingerStates,
      latency: this.latencyMs
    };
  }

  destroy() {
    this.isCameraRunning = false;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }
  }
}
