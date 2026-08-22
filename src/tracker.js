/**
 * 1€ Filter – Ultra-smooth motion filtering
 */
class OneEuroFilter {
  constructor({ minCutoff = 0.5, beta = 0.045, dCutoff = 1.0 }) {
    this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
    this.xPrev = null; this.dxPrev = 0; this.tPrev = null;
  }
  filter(x, timestamp = performance.now()) {
    if (this.tPrev === null || this.xPrev === null) { this.xPrev = x; this.tPrev = timestamp; this.dxPrev = 0; return x; }
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
  computeAlpha(dt, cutoff) { const tau = 1.0 / (2.0 * Math.PI * cutoff); return 1.0 / (1.0 + tau / dt); }
  reset() { this.xPrev = null; this.dxPrev = 0; this.tPrev = null; }
}

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [9,10],[10,11],[11,12],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]
];

const IS_MOBILE = /iPhone|iPad|iPod|Android|Mobile|Tablet/i.test(navigator.userAgent || '');
const PROC_W = IS_MOBILE ? 256 : 480;
const PROC_H = IS_MOBILE ? 256 : 360;

export class NeuralTracker {
  constructor({ videoElement, canvasElement, onStateChange }) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d', { alpha: true }) : null;
    this.onStateChange = onStateChange || (() => {});
    this.isMobile = IS_MOBILE;
    this.currentFacingMode = 'user';

    this.procCanvas = document.createElement('canvas');
    this.procCanvas.width = PROC_W;
    this.procCanvas.height = PROC_H;
    this.procCtx = this.procCanvas.getContext('2d', { willReadFrequently: false });

    this.openness = 0.0; this.handPosition = { x: 0, y: 0 };
    this.handAngle = 0.0; this.handPitch = 0.0; this.handScale = 1.0;
    this.rawOpenness = 0.0; this.rawHandPosition = { x: 0, y: 0 };
    this.rawHandAngle = 0.0; this.rawHandPitch = 0.0; this.rawHandScale = 1.0;
    this.fingerStates = [0, 0, 0, 0, 0];

    this.opennessFilter = new OneEuroFilter({ minCutoff: 0.6,  beta: 0.04,  dCutoff: 1.0 });
    this.posXFilter     = new OneEuroFilter({ minCutoff: 0.4,  beta: 0.035, dCutoff: 1.0 });
    this.posYFilter     = new OneEuroFilter({ minCutoff: 0.4,  beta: 0.035, dCutoff: 1.0 });
    this.angleFilter    = new OneEuroFilter({ minCutoff: 0.35, beta: 0.035, dCutoff: 1.0 });
    this.pitchFilter    = new OneEuroFilter({ minCutoff: 0.35, beta: 0.035, dCutoff: 1.0 });
    this.scaleFilter    = new OneEuroFilter({ minCutoff: 0.4,  beta: 0.035, dCutoff: 1.0 });

    this.isHandDetected = false;
    this.isCameraRunning = false;
    this.isProcessing = false;
    this.latencyMs = 0;
    this.consecutiveMissingFrames = 0;

    this.isFallbackActive = false;
    this.touchTargetOpenness = 0.0; this.touchTargetX = 0.0; this.touchTargetY = 0.0;
    this.touchTargetAngle = 0.0; this.touchTargetPitch = 0.0; this.touchTargetScale = 1.0;

    this.setupTouchAndKeyboardFallback();
  }

  async init() {
    this.onStateChange({ status: 'INITIALIZING', message: 'Đang khởi tạo Neural Tracker...' });

    const isSecure = window.isSecureContext
      || location.hostname === 'localhost'
      || location.hostname === '127.0.0.1';

    if (!isSecure) {
      const httpsUrl = location.href.replace('http://', 'https://');
      this.onStateChange({ status: 'FALLBACK', message: '⚠️ Cần HTTPS để dùng camera trên điện thoại. Truy cập: ' + httpsUrl });
      this.isFallbackActive = true;
      return;
    }

    try {
      this.onStateChange({ status: 'INITIALIZING', message: 'Đang tải mô hình nhận diện tay...' });
      if (typeof window.Hands === 'undefined') await this.loadMediaPipe();

      this.hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: this.isMobile ? 0 : 1,
        minDetectionConfidence: 0.35,
        minTrackingConfidence: 0.35
      });
      this.hands.onResults((results) => this.handleResults(results));

      this.onStateChange({ status: 'INITIALIZING', message: 'Đang bật camera...' });
      await this.startCamera();

      this.onStateChange({ status: 'INITIALIZING', message: 'Đang khởi động AI engine...' });
      await this.warmupWasm();

      this.onStateChange({ status: 'ACTIVE', message: 'Neural Tracker sẵn sàng – Đưa tay vào khung hình' });
    } catch (err) {
      console.warn('[NeuralTracker] init error:', err);
      this.isFallbackActive = true;
      this.onStateChange({
        status: 'FALLBACK',
        message: this.isMobile
          ? 'Touch Mode: Dùng 2 ngón kéo để zoom (Camera không khả dụng)'
          : 'Keyboard: [SPACE] Morph | [Arrow] Pitch/Roll'
      });
    }
  }

  async loadMediaPipe() {
    const cdns = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
      'https://unpkg.com/@mediapipe/hands/hands.js'
    ];
    for (const src of cdns) {
      try {
        await new Promise((resolve, reject) => {
          if (typeof window.Hands !== 'undefined') { resolve(); return; }
          const s = document.createElement('script');
          s.src = src; s.crossOrigin = 'anonymous';
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
        await this.delay(300);
        if (typeof window.Hands !== 'undefined') return;
      } catch (e) { console.warn('[NeuralTracker] CDN failed:', src); }
    }
    if (typeof window.Hands === 'undefined') throw new Error('Cannot load MediaPipe Hands');
  }

  async startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia not available');

    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }

    const constraintList = [
      { video: { facingMode: { ideal: this.currentFacingMode }, width: { ideal: this.isMobile ? 640 : 1280 }, height: { ideal: this.isMobile ? 480 : 720 }, frameRate: { ideal: 30, max: 60 } }, audio: false },
      { video: { facingMode: this.currentFacingMode }, audio: false },
      { video: true, audio: false }
    ];

    let stream = null;
    for (const c of constraintList) {
      try { stream = await navigator.mediaDevices.getUserMedia(c); if (stream) break; } catch (_) {}
    }
    if (!stream) throw new Error('Cannot access camera');

    this.stream = stream;
    this.video.srcObject = stream;
    this.video.setAttribute('playsinline', 'true');
    this.video.setAttribute('webkit-playsinline', 'true');
    this.video.muted = true;

    await new Promise((resolve) => {
      const tryPlay = () => {
        this.video.play().then(resolve).catch(() => setTimeout(tryPlay, 200));
      };
      if (this.video.readyState >= 1) tryPlay();
      else this.video.addEventListener('loadedmetadata', tryPlay, { once: true });
    });

    if (this.isMobile) await this.delay(500);

    const vw = this.video.videoWidth || PROC_W;
    const vh = this.video.videoHeight || PROC_H;
    if (this.canvas) { this.canvas.width = vw; this.canvas.height = vh; }
    this.procCanvas.width = Math.min(vw, PROC_W);
    this.procCanvas.height = Math.min(vh, PROC_H);

    this.isCameraRunning = true;
    this.startLoop();
  }

  async warmupWasm() {
    try {
      this.procCtx.fillStyle = '#000';
      this.procCtx.fillRect(0, 0, this.procCanvas.width, this.procCanvas.height);
      await this.hands.send({ image: this.procCanvas });
      if (this.video.readyState >= 2) {
        this.procCtx.drawImage(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight,
          0, 0, this.procCanvas.width, this.procCanvas.height);
        await this.hands.send({ image: this.procCanvas });
      }
    } catch (_) {}
  }

  async switchCamera() {
    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    try {
      await this.startCamera(); return true;
    } catch (e) {
      console.warn('[NeuralTracker] switch error:', e);
      this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
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
          const vw = this.video.videoWidth; const vh = this.video.videoHeight;
          if (vw > 0 && vh > 0) {
            this.procCtx.drawImage(this.video, 0, 0, vw, vh, 0, 0, this.procCanvas.width, this.procCanvas.height);
            await this.hands.send({ image: this.procCanvas });
          }
          this.latencyMs = Math.round(performance.now() - t0);
        } catch (e) { console.error('[NeuralTracker] frame error:', e); }
        finally { this.isProcessing = false; }
      }
      if ('requestVideoFrameCallback' in this.video) {
        this.video.requestVideoFrameCallback(processFrame);
      } else { requestAnimationFrame(processFrame); }
    };
    if ('requestVideoFrameCallback' in this.video) {
      this.video.requestVideoFrameCallback(processFrame);
    } else { requestAnimationFrame(processFrame); }
  }

  handleResults(results) {
    if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const now = performance.now();

    if (results.multiHandLandmarks?.length > 0) {
      const lm = results.multiHandLandmarks[0];
      this.isHandDetected = true; this.consecutiveMissingFrames = 0; this.isFallbackActive = false;

      const wrist = lm[0]; const indexMcp = lm[5]; const middleMcp = lm[9];
      const pinkyMcp = lm[17]; const middleTip = lm[12];

      const palmWidth  = Math.hypot(pinkyMcp.x - indexMcp.x, pinkyMcp.y - indexMcp.y, (pinkyMcp.z||0) - (indexMcp.z||0));
      const palmHeight = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y, (middleMcp.z||0) - (wrist.z||0));
      const palmScale  = Math.max((palmWidth * 1.2 + palmHeight * 1.0) / 2.2, 0.035);

      const isFront = this.currentFacingMode === 'user';
      const dirX = (isFront ? -1 : 1) * (middleMcp.x - wrist.x);
      const dirY = -(middleMcp.y - wrist.y);
      this.rawHandAngle = Math.atan2(dirX, -dirY);

      const deltaZK = (middleMcp.z||0) - (wrist.z||0);
      const deltaZT = (middleTip.z||0) - (wrist.z||0);
      this.rawHandPitch = Math.max(-1.0, Math.min(1.0, -((deltaZK * 0.4 + deltaZT * 0.6) / palmScale) * 1.3));

      this.rawHandScale = Math.max(0.7, Math.min(1.35, palmScale / 0.20));

      const fingerDefs = [
        { tip: 4, pip: 3, mcp: 2, isThumb: true },
        { tip: 8, pip: 6, mcp: 5 }, { tip: 12, pip: 10, mcp: 9 },
        { tip: 16, pip: 14, mcp: 13 }, { tip: 20, pip: 18, mcp: 17 }
      ];
      let fingerExtSum = 0;
      const fingerScores = fingerDefs.map(({ tip, pip, mcp, isThumb }) => {
        const tipPt = lm[tip]; const pipPt = lm[pip]; const mcpPt = lm[mcp];
        if (isThumb) {
          const dTP = Math.hypot(tipPt.x - pinkyMcp.x, tipPt.y - pinkyMcp.y, (tipPt.z||0) - (pinkyMcp.z||0));
          const dMP = Math.hypot(mcpPt.x - pinkyMcp.x, mcpPt.y - pinkyMcp.y, (mcpPt.z||0) - (pinkyMcp.z||0));
          const s = Math.max(0, Math.min(1, ((dTP - dMP * 0.7) / (palmScale * 0.9) - 0.1) / 0.85));
          fingerExtSum += s; return s;
        }
        const dTW = Math.hypot(tipPt.x - wrist.x, tipPt.y - wrist.y, (tipPt.z||0) - (wrist.z||0));
        const dPW = Math.hypot(pipPt.x - wrist.x, pipPt.y - wrist.y, (pipPt.z||0) - (wrist.z||0));
        const dMW = Math.hypot(mcpPt.x - wrist.x, mcpPt.y - wrist.y, (mcpPt.z||0) - (wrist.z||0));
        const s = Math.max(0, Math.min(1, ((dTW - dMW) / (Math.max(dPW - dMW, 0.01) * 1.65) - 0.15) / 0.75));
        fingerExtSum += s; return s;
      });
      this.fingerStates = fingerScores;

      const tips = [4, 8, 12, 16, 20];
      let totalTipDist = 0;
      tips.forEach(t => totalTipDist += Math.hypot(lm[t].x - wrist.x, lm[t].y - wrist.y, (lm[t].z||0) - (wrist.z||0)));
      const ratioScore = Math.max(0, Math.min(1, (totalTipDist / 5.0 / palmScale - 0.88) / 0.87));
      this.rawOpenness = Math.max(0, Math.min(1, (fingerExtSum / 5.0) * 0.6 + ratioScore * 0.4));

      const pp = [0, 5, 9, 13, 17];
      let sx = 0, sy = 0;
      pp.forEach(p => { sx += lm[p].x; sy += lm[p].y; });
      this.rawHandPosition.x = -(sx / pp.length * 2.0 - 1.0);
      this.rawHandPosition.y = -(sy / pp.length * 2.0 - 1.0);

      this.openness     = this.opennessFilter.filter(this.rawOpenness, now);
      this.handPosition.x = this.posXFilter.filter(this.rawHandPosition.x, now);
      this.handPosition.y = this.posYFilter.filter(this.rawHandPosition.y, now);
      this.handAngle    = this.angleFilter.filter(this.rawHandAngle, now);
      this.handPitch    = this.pitchFilter.filter(this.rawHandPitch, now);
      this.handScale    = this.scaleFilter.filter(this.rawHandScale, now);

      if (this.ctx && this.canvas) this.drawSkeleton(lm);

      this.onStateChange({
        status: 'TRACKED',
        message: `Tracking Active [Open: ${Math.round(this.openness * 100)}%]`,
        openness: this.openness, handPosition: this.handPosition,
        handAngle: this.handAngle, handPitch: this.handPitch, handScale: this.handScale,
        fingerStates: this.fingerStates, latency: this.latencyMs
      });
    } else {
      this.consecutiveMissingFrames++;
      if (this.consecutiveMissingFrames > 8) {
        this.isHandDetected = false;
        this.onStateChange({ status: 'DETECTING', message: 'Detecting Hand...', latency: this.latencyMs });
      }
    }
  }

  drawSkeleton(lm) {
    const ctx = this.ctx; const w = this.canvas.width; const h = this.canvas.height;
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0, 255, 179, 0.9)';
    ctx.shadowColor = '#00ffb3'; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) { ctx.moveTo(lm[a].x * w, lm[a].y * h); ctx.lineTo(lm[b].x * w, lm[b].y * h); }
    ctx.stroke();
    const tipIndices = [4, 8, 12, 16, 20];
    for (let i = 0; i < lm.length; i++) {
      const isTip = tipIndices.includes(i);
      ctx.beginPath(); ctx.arc(lm[i].x * w, lm[i].y * h, isTip ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#ffffff' : '#8a4fff';
      ctx.shadowColor = isTip ? '#ffffff' : '#8a4fff'; ctx.shadowBlur = 10; ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  setupTouchAndKeyboardFallback() {
    window.addEventListener('keydown', (e) => {
      const map = {
        Space:      () => { this.touchTargetOpenness = this.touchTargetOpenness > 0.5 ? 0 : 1; },
        ArrowUp:    () => { this.touchTargetPitch = Math.min(1, this.touchTargetPitch + 0.15); this.touchTargetScale = Math.min(1.35, this.touchTargetScale + 0.05); },
        ArrowDown:  () => { this.touchTargetPitch = Math.max(-1, this.touchTargetPitch - 0.15); this.touchTargetScale = Math.max(0.7, this.touchTargetScale - 0.05); },
        ArrowLeft:  () => { this.touchTargetAngle -= 0.15; this.touchTargetX = Math.max(-1, this.touchTargetX - 0.1); },
        ArrowRight: () => { this.touchTargetAngle += 0.15; this.touchTargetX = Math.min(1, this.touchTargetX + 0.1); },
        KeyW: () => { this.touchTargetPitch = Math.min(1, this.touchTargetPitch + 0.15); },
        KeyS: () => { this.touchTargetPitch = Math.max(-1, this.touchTargetPitch - 0.15); },
        KeyA: () => { this.touchTargetAngle -= 0.15; },
        KeyD: () => { this.touchTargetAngle += 0.15; }
      };
      if (map[e.code]) { e.preventDefault(); map[e.code](); this.isFallbackActive = true; }
    });

    let initDist = 0;
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const [t1, t2] = [e.touches[0], e.touches[1]];
        initDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        this.isFallbackActive = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initDist > 0) {
        const [t1, t2] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const ratio = dist / initDist;
        this.touchTargetOpenness = Math.max(0, Math.min(1, (ratio - 0.7) / 0.9));
        this.touchTargetScale = Math.max(0.7, Math.min(1.35, ratio));
      }
    }, { passive: true });
  }

  update() {
    const now = performance.now();
    if (this.isFallbackActive || !this.isHandDetected) {
      this.openness      = this.opennessFilter.filter(this.touchTargetOpenness, now);
      this.handPosition.x = this.posXFilter.filter(this.touchTargetX, now);
      this.handPosition.y = this.posYFilter.filter(this.touchTargetY, now);
      this.handAngle     = this.angleFilter.filter(this.touchTargetAngle, now);
      this.handPitch     = this.pitchFilter.filter(this.touchTargetPitch, now);
      this.handScale     = this.scaleFilter.filter(this.touchTargetScale, now);
    }
    return {
      openness: this.openness, handPosition: this.handPosition,
      handAngle: this.handAngle, handPitch: this.handPitch, handScale: this.handScale,
      isHandDetected: this.isHandDetected, isFallbackActive: this.isFallbackActive,
      fingerStates: this.fingerStates, latency: this.latencyMs
    };
  }

  destroy() {
    this.isCameraRunning = false;
    this.stream?.getTracks().forEach((t) => t.stop());
  }

  delay(ms) { return new Promise((r) => setTimeout(r, ms)); }
}
