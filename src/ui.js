export class UIManager {
  constructor({ onStartCamera, onStartKeyboard, onThemeChange, onToggleBloom }) {
    this.onStartCamera = onStartCamera;
    this.onStartKeyboard = onStartKeyboard;
    this.onThemeChange = onThemeChange;
    this.onToggleBloom = onToggleBloom;
    this.hudVisible = true;
    this.tiktokFrameActive = false;

    // Cache DOM Elements
    this.elements = {
      overlay: document.getElementById('prompt-overlay'),
      hudLayer: document.querySelector('.hud-layer'),
      btnStartCam: document.getElementById('btn-start-camera'),
      btnStartKeyboard: document.getElementById('btn-start-keyboard'),
      statusDot: document.getElementById('status-dot'),
      statusText: document.getElementById('status-text'),
      progressFill: document.getElementById('progress-fill'),
      progressMarker: document.getElementById('progress-marker'),
      valOpenness: document.getElementById('val-openness'),
      valHandX: document.getElementById('val-hand-x'),
      valHandY: document.getElementById('val-hand-y'),
      valHandRot: document.getElementById('val-hand-rot'),
      valHandPitch: document.getElementById('val-hand-pitch'),
      valZoom: document.getElementById('val-zoom'),
      valFps: document.getElementById('val-fps'),
      valLatency: document.getElementById('val-latency'),
      fingerDots: document.querySelectorAll('.finger-dot'),
      webcamContainer: document.getElementById('webcam-container'),
      btnTogglePip: document.getElementById('btn-toggle-pip'),
      btnToggleBloom: document.getElementById('btn-toggle-bloom'),
      btnToggleHud: document.getElementById('btn-toggle-hud'),
      btnToggleTiktok: document.getElementById('btn-toggle-tiktok'),
      tiktokFrame: document.getElementById('tiktok-frame-guide'),
      themeBtns: document.querySelectorAll('.theme-btn')
    };

    this.initEvents();
  }

  initEvents() {
    this.elements.btnStartCam?.addEventListener('click', async () => {
      this.elements.overlay?.classList.add('hidden');
      if (this.onStartCamera) await this.onStartCamera();
    });

    this.elements.btnStartKeyboard?.addEventListener('click', () => {
      this.elements.overlay?.classList.add('hidden');
      if (this.onStartKeyboard) this.onStartKeyboard();
    });

    this.elements.btnTogglePip?.addEventListener('click', () => {
      this.elements.webcamContainer?.classList.toggle('minimized');
    });

    this.elements.btnToggleBloom?.addEventListener('click', () => {
      if (this.onToggleBloom) {
        const isEnabled = this.onToggleBloom();
        this.elements.btnToggleBloom.classList.toggle('active', isEnabled);
        this.elements.btnToggleBloom.textContent = isEnabled ? '⚡ Bloom: ON' : '⚡ Bloom: OFF';
      }
    });

    // Clean Video Mode (Toggle HUD with button or 'H' key for TikTok Recording)
    this.elements.btnToggleHud?.addEventListener('click', () => {
      this.toggleHUD();
    });

    // 9:16 Vertical TikTok Frame Guide
    this.elements.btnToggleTiktok?.addEventListener('click', () => {
      this.tiktokFrameActive = !this.tiktokFrameActive;
      this.elements.tiktokFrame?.classList.toggle('active', this.tiktokFrameActive);
      this.elements.btnToggleTiktok?.classList.toggle('active', this.tiktokFrameActive);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' && !e.target.matches('input, textarea')) {
        this.toggleHUD();
      }
    });

    this.elements.themeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.elements.themeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.theme;
        if (this.onThemeChange) this.onThemeChange(theme);
      });
    });
  }

  toggleHUD(forceState) {
    this.hudVisible = forceState !== undefined ? forceState : !this.hudVisible;
    if (this.elements.hudLayer) {
      this.elements.hudLayer.classList.toggle('hud-hidden', !this.hudVisible);
    }
  }

  updateTrackerState(state) {
    if (!this.elements.statusText || !this.elements.statusDot) return;

    this.elements.statusText.textContent = state.message;
    this.elements.statusDot.className = 'status-dot';

    if (state.status === 'TRACKED') {
      this.elements.statusDot.classList.add('active');
    } else if (state.status === 'DETECTING' || state.status === 'ACTIVE') {
      this.elements.statusDot.classList.add('detecting');
    } else if (state.status === 'FALLBACK') {
      this.elements.statusDot.classList.add('fallback');
    }

    if (state.fingerStates && this.elements.fingerDots.length === 5) {
      state.fingerStates.forEach((score, idx) => {
        const dot = this.elements.fingerDots[idx];
        if (dot) {
          dot.classList.toggle('active', score > 0.45);
          dot.style.opacity = (0.3 + score * 0.7).toFixed(2);
        }
      });
    }

    if (state.latency && this.elements.valLatency) {
      this.elements.valLatency.textContent = `${state.latency}ms`;
    }
  }

  updateTelemetry({ openness, handPos, handAngle = 0, handPitch = 0, handScale = 1.0, fps }) {
    const openPct = Math.round(openness * 100);

    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${openPct}%`;
    }
    if (this.elements.progressMarker) {
      this.elements.progressMarker.style.left = `${openPct}%`;
    }
    if (this.elements.valOpenness) {
      this.elements.valOpenness.textContent = `${openPct}%`;
    }

    if (this.elements.valHandX && this.elements.valHandY) {
      this.elements.valHandX.textContent = (handPos.x >= 0 ? '+' : '') + handPos.x.toFixed(2);
      this.elements.valHandY.textContent = (handPos.y >= 0 ? '+' : '') + handPos.y.toFixed(2);
    }

    if (this.elements.valHandRot) {
      const deg = Math.round(handAngle * (180 / Math.PI));
      this.elements.valHandRot.textContent = (deg >= 0 ? '+' : '') + `${deg}°`;
    }

    if (this.elements.valHandPitch) {
      const pitchDeg = Math.round(handPitch * 45);
      this.elements.valHandPitch.textContent = (pitchDeg >= 0 ? '+' : '') + `${pitchDeg}°`;
    }

    if (this.elements.valZoom) {
      this.elements.valZoom.textContent = `${handScale.toFixed(2)}x`;
    }

    if (fps !== undefined && this.elements.valFps) {
      this.elements.valFps.textContent = `${fps} FPS`;
    }
  }
}
