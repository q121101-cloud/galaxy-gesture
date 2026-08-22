import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PostProcessingPipeline } from './postprocessing.js';
import { ParticleSystem } from './particles.js';
import { NeuralTracker } from './tracker.js';
import { UIManager } from './ui.js';

class GalaxyGestureApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.videoElement = document.getElementById('webcam-video');
    this.landmarkCanvas = document.getElementById('landmark-canvas');

    this.initScene();
    this.initSystems();
    this.setupResizeListener();

    this.clock = new THREE.Clock();
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.currentFps = 120;

    // Dual-stage continuous spring state for butter-smooth zooming & morphing
    this.renderedOpenness = 0.0;
    this.renderedCamX = 0.0;
    this.renderedCamY = 60.0;
    this.renderedCamZ = 330.0;

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030307, 0.0008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1.0,
      2000
    );
    this.camera.position.set(0, 60, 330);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 800;
    this.controls.minDistance = 30;
    this.controls.autoRotate = false;
    this.controls.enablePan = false;

    this.postprocessing = new PostProcessingPipeline(this.canvas, this.scene, this.camera);
    // 100,000 particles!
    this.particles = new ParticleSystem(this.scene, 100000);
  }

  initSystems() {
    this.tracker = new NeuralTracker({
      videoElement: this.videoElement,
      canvasElement: this.landmarkCanvas,
      onStateChange: (state) => this.ui.updateTrackerState(state)
    });

    this.ui = new UIManager({
      onStartCamera: async () => {
        await this.tracker.init();
      },
      onStartKeyboard: () => {
        this.tracker.isFallbackActive = true;
        this.ui.updateTrackerState({
          status: 'FALLBACK',
          message: 'Keyboard / Touch Mode: Chạm hoặc dùng phím điều khiển'
        });
      },
      onSwitchCamera: async () => {
        await this.tracker.switchCamera();
      },
      onThemeChange: (theme) => {
        this.particles.setTheme(theme);
      },
      onToggleBloom: () => {
        return this.postprocessing.toggleBloom();
      }
    });
  }

  setupResizeListener() {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.postprocessing.resize(width, height);
      this.particles.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. High-Precision Tracking Parameters
    const tracking = this.tracker.update();
    const openness = tracking.openness;
    const handPos = tracking.handPosition;
    const handAngle = tracking.handAngle;
    const handPitch = tracking.handPitch;
    const handScale = tracking.handScale;

    // 2. Liquid-Smooth Dual-Stage Openness Interpolation
    // Provides 1:1 analog response to hand opening & closing with zero jitter
    const morphDampSpeed = 1.0 - Math.exp(-8.0 * delta);
    this.renderedOpenness += (openness - this.renderedOpenness) * morphDampSpeed;

    // 3. Gentle Camera Navigation
    if (tracking.isHandDetected || tracking.isFallbackActive) {
      const targetCamX = handPos.x * 16;
      const targetCamY = 60 + handPos.y * 12 - handPitch * 15;

      // Soft natural depth breathing
      const targetCamZ = 330 - (handScale - 1.0) * 45.0 - this.renderedOpenness * 15.0;

      const camDampSpeed = 1.0 - Math.exp(-5.5 * delta);
      this.renderedCamX += (targetCamX - this.renderedCamX) * camDampSpeed;
      this.renderedCamY += (targetCamY - this.renderedCamY) * camDampSpeed;
      this.renderedCamZ += (targetCamZ - this.renderedCamZ) * camDampSpeed;

      this.camera.position.set(this.renderedCamX, this.renderedCamY, this.renderedCamZ);
    }

    this.controls.update();

    // 4. Update 100,000 Particle Simulation with Gentle Rotation & Silky Morphing
    this.particles.update(elapsedTime, delta, this.renderedOpenness, handPos, handAngle, handPitch);

    // 5. Real-time Telemetry & Uncapped 120 FPS
    this.frameCount++;
    if (elapsedTime - this.lastFpsUpdate >= 0.4) {
      this.currentFps = Math.round(this.frameCount / (elapsedTime - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = elapsedTime;
    }
    this.ui.updateTelemetry({
      openness: this.renderedOpenness,
      handPos,
      handAngle,
      handPitch,
      handScale,
      fps: this.currentFps
    });

    // 6. Postprocessing Render
    this.postprocessing.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GalaxyGestureApp();
});
