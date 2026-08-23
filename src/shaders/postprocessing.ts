// src/shaders/postprocessing.ts
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export interface PostProcessingUniforms {
  tDiffuse: { value: THREE.Texture | null };
  uTime: { value: number };
  uResolution: { value: THREE.Vector2 };
  uChromaticAberration: { value: number };
  uVignetteDarkness: { value: number };
  uVignetteOffset: { value: number };
  uGrainIntensity: { value: number };
  uRippleCenter: { value: THREE.Vector2 };
  uRippleTime: { value: number };
  uRippleStrength: { value: number };
  uExposure: { value: number };
}

export const COMPOSITE_POST_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const COMPOSITE_POST_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform float uTime;
uniform vec2 uResolution;
uniform float uChromaticAberration;
uniform float uVignetteDarkness;
uniform float uVignetteOffset;
uniform float uGrainIntensity;
uniform vec2 uRippleCenter;
uniform float uRippleTime;
uniform float uRippleStrength;
uniform float uExposure;

varying vec2 vUv;

// Hash noise for fine 35mm film grain dithering
float random(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// ACES Filmic Tone Mapping curve (Narkowicz 2015)
vec3 ACESFilmicToneMapping(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  vec2 center = vec2(0.5);
  vec2 toCenter = uv - center;
  float dist = length(toCenter);

  // 1. Spacetime Gravitational Metric Ripple Pass
  if (uRippleStrength > 0.001) {
    vec2 ripDelta = uv - uRippleCenter;
    float ripDist = length(ripDelta);
    float wave = sin(ripDist * 35.0 - uRippleTime * 12.0);
    float decay = exp(-ripDist * 4.5) * max(0.0, 1.0 - uRippleTime * 0.8);
    uv += normalize(ripDelta + 0.0001) * wave * decay * uRippleStrength * 0.04;
  }

  // 2. Relativistic Radial Chromatic Aberration
  float ca = uChromaticAberration * (dist * dist * 1.5 + 0.2);
  vec2 dir = normalize(uv - center + 0.0001);
  
  float r = texture2D(tDiffuse, uv + dir * ca * 0.008).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - dir * ca * 0.008).b;
  vec3 color = vec3(r, g, b) * uExposure;

  // 3. Cinematic Vignette
  float vignette = smoothstep(uVignetteOffset, uVignetteOffset - 0.45, dist);
  color *= mix(1.0 - uVignetteDarkness, 1.0, vignette);

  // 4. Subtle Anamorphic Flare Glow Bleed
  vec3 bloomBleed = texture2D(tDiffuse, vec2(uv.x * 0.98 + 0.01, uv.y)).rgb * 0.08;
  color += bloomBleed;

  // 5. ACES Filmic Tone Mapping
  color = ACESFilmicToneMapping(color);

  // 6. 35mm Analog Film Grain
  float grain = (random(uv * uResolution + fract(uTime * 17.0)) - 0.5) * uGrainIntensity;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;

export class CinematicPostPipeline {
  public composer: EffectComposer;
  public renderer: THREE.WebGLRenderer;
  public renderPass: RenderPass;
  public bloomPass: UnrealBloomPass;
  public compositePass: ShaderPass;
  public isBloomEnabled: boolean = true;

  constructor(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.Camera) {
    const pixelRatio = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.25) : 1.0;
    const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const height = typeof window !== 'undefined' ? window.innerHeight : 720;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: true,
      precision: 'highp'
    });

    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;

    const renderTarget = new THREE.WebGLRenderTarget(
      Math.floor(width * pixelRatio),
      Math.floor(height * pixelRatio),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType
      }
    );

    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Quarter-resolution HDR bloom pass for 60-120 FPS throughput
    const bloomRes = new THREE.Vector2(
      Math.floor(width * 0.4),
      Math.floor(height * 0.4)
    );
    this.bloomPass = new UnrealBloomPass(bloomRes, 1.6, 0.45, 0.2);
    this.composer.addPass(this.bloomPass);

    // Final Composite Pass
    const compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uChromaticAberration: { value: 0.45 },
        uVignetteDarkness: { value: 0.55 },
        uVignetteOffset: { value: 1.15 },
        uGrainIntensity: { value: 0.025 },
        uRippleCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uRippleTime: { value: 0.0 },
        uRippleStrength: { value: 0.0 },
        uExposure: { value: 1.25 }
      },
      vertexShader: COMPOSITE_POST_VERTEX_SHADER,
      fragmentShader: COMPOSITE_POST_FRAGMENT_SHADER
    });

    this.compositePass = new ShaderPass(compositeMaterial);
    this.compositePass.renderToScreen = true;
    this.composer.addPass(this.compositePass);
  }

  public triggerRipple(center: THREE.Vector2 = new THREE.Vector2(0.5, 0.5)): void {
    const u = this.compositePass.uniforms;
    u.uRippleCenter.value.copy(center);
    u.uRippleTime.value = 0.0;
    u.uRippleStrength.value = 1.0;
  }

  public update(delta: number, elapsedTime: number, gestureIntensity: number = 0.0): void {
    const u = this.compositePass.uniforms;
    u.uTime.value = elapsedTime;
    
    // Dynamic chromatic aberration modulation based on hand motion energy
    u.uChromaticAberration.value = 0.35 + gestureIntensity * 0.85;

    // Decay ripple if active
    if (u.uRippleStrength.value > 0.001) {
      u.uRippleTime.value += delta;
      u.uRippleStrength.value = Math.max(0.0, u.uRippleStrength.value - delta * 0.9);
    }
  }

  public resize(width: number, height: number): void {
    const pixelRatio = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.25) : 1.0;
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(Math.floor(width * 0.4), Math.floor(height * 0.4));
    this.compositePass.uniforms.uResolution.value.set(width, height);
  }

  public render(): void {
    this.composer.render();
  }

  public dispose(): void {
    this.composer.dispose();
    this.renderer.dispose();
  }
}
