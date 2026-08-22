import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class PostProcessingPipeline {
  constructor(canvas, scene, camera) {
    this.canvas = canvas;
    this.scene = scene;
    this.camera = camera;
    this.bloomEnabled = true;

    // Optimized pixel ratio for native 120 FPS high-refresh displays
    const pixelRatio = Math.min(window.devicePixelRatio, 1.25);

    // 1. High Performance WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // Turned off MSAA as bloom + points provide natural anti-aliasing
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: true,
      precision: 'highp'
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;

    // 2. High-speed HDR Render Target
    const renderTarget = new THREE.WebGLRenderTarget(
      Math.floor(window.innerWidth * pixelRatio),
      Math.floor(window.innerHeight * pixelRatio),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType
      }
    );

    this.composer = new EffectComposer(this.renderer, renderTarget);

    // 3. Render Pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // 4. Ultra-Fast Bloom Pass (Quarter resolution gives sub-millisecond GPU execution time for 120 FPS)
    const bloomResolution = new THREE.Vector2(
      Math.floor(window.innerWidth * 0.4),
      Math.floor(window.innerHeight * 0.4)
    );
    this.bloomPass = new UnrealBloomPass(bloomResolution, 1.8, 0.4, 0.15);
    this.composer.addPass(this.bloomPass);
  }

  resize(width, height) {
    const pixelRatio = Math.min(window.devicePixelRatio, 1.25);
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(Math.floor(width * 0.4), Math.floor(height * 0.4));
  }

  render() {
    if (this.bloomEnabled) {
      this.composer.render();
    } else {
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
    }
  }

  toggleBloom(forceState) {
    this.bloomEnabled = forceState !== undefined ? forceState : !this.bloomEnabled;
    return this.bloomEnabled;
  }
}
