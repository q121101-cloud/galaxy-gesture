import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { GestureState } from '../core/types';

// Ultra-gentle slow GPU Harmonic Wave Turbulence
const TURBULENCE_GLSL = /* glsl */ `
vec3 getCosmicTurbulence(vec3 p, float t) {
  vec3 k1 = vec3(0.015, 0.018, 0.012);
  vec3 k2 = vec3(0.025, 0.022, 0.030);

  vec3 v1 = vec3(
    sin(p.y * k1.y + t * 0.15) + cos(p.z * k1.z - t * 0.12),
    sin(p.z * k1.z + t * 0.18) + cos(p.x * k1.x - t * 0.14),
    sin(p.x * k1.x + t * 0.15) + cos(p.y * k1.y - t * 0.12)
  );

  vec3 v2 = vec3(
    cos(p.y * k2.y - t * 0.25) + sin(p.z * k2.z + t * 0.2),
    cos(p.z * k2.z - t * 0.22) + sin(p.x * k2.x + t * 0.26),
    cos(p.x * k2.x - t * 0.25) + sin(p.y * k2.y + t * 0.2)
  );

  return v1 * 0.65 + v2 * 0.35;
}

// Quintic smootherstep for buttery smooth zero-acceleration endpoints
float smootherstep(float edge0, float edge1, float x) {
  x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}
`;

const GALAXY_VERTEX_SHADER = /* glsl */ `
${TURBULENCE_GLSL}

uniform float uTime;
uniform float uOpenness;
uniform float uPixelRatio;
uniform vec2 uHandPos;
uniform float uIsRainbow;

attribute vec3 aTargetFist;
attribute vec3 aTargetOpen;
attribute vec3 aColor;
attribute float aSize;
attribute float aType; // 0: Core (30%), 1: Accretion Ring / Background Stars (70%)
attribute float aOrbitSpeed;
attribute float aOrbitRadius;
attribute float aOrbitAngle;
attribute float aPhase;
attribute vec3 aWarpVelocity;

varying vec3 vColor;
varying float vAlpha;

// Full 7-color RGB Rainbow Spectrum HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  if (uIsRainbow > 0.5) {
    if (aType < 0.5) {
      // 30% Core: Radiant pulsating rainbow singularity with white hot core
      float hueCore = fract(uTime * 0.16 + length(aTargetFist) * 0.03 + aPhase * 0.08);
      vec3 colCore = hsv2rgb(vec3(hueCore, 0.88, 1.0));
      vColor = mix(vec3(1.0, 1.0, 1.0), colCore, clamp(length(aTargetFist) / 22.0, 0.0, 0.85));
    } else {
      // 70% Accretion Disc: Flowing 7-color rainbow waves rippling through space
      float hueDisc = fract(uTime * 0.12 - (aOrbitRadius - 50.0) * 0.0035 + aOrbitAngle * 0.22 + aPhase * 0.06);
      vColor = hsv2rgb(vec3(hueDisc, 0.95, 1.0));
    }
  } else {
    vColor = aColor;
  }

  vec3 currentPos;
  float sizeBoost = 1.0;

  if (aType < 0.5) {
    // 30% Singularity Core: Ultra-gentle breathing
    float pulse = sin(uTime * 0.65 + aPhase) * 0.6;
    vec3 radialDir = normalize(aTargetFist + vec3(0.0001));
    vec3 coreTurb = getCosmicTurbulence(aTargetFist * 1.0, uTime * 0.1) * 0.8;
    vec3 fistPos = aTargetFist + radialDir * pulse + coreTurb;

    // Target Geometry B: Open Hand (Peaceful, Radiant Supernova Expansion)
    vec3 openPos = aTargetOpen;
    float warpTravel = mod(uTime * 20.0 * (1.0 + length(aWarpVelocity) * 0.15), 350.0) - 120.0;
    openPos.z += warpTravel * 0.08;

    vec3 warpBurstDir = normalize(openPos);
    vec3 warpTurb = getCosmicTurbulence(openPos * 0.2, uTime * 0.15) * 3.5;
    openPos += warpBurstDir * warpTurb.x + warpTurb * 0.25;

    // Quintic Ultra-Smooth Morphing driven by uOpenness
    float morphFactor = smootherstep(0.0, 1.0, uOpenness);
    currentPos = mix(fistPos, openPos, morphFactor);

    // Soft Ambient Cosmic Waves for core
    vec3 waveTurb = getCosmicTurbulence(currentPos * 0.18, uTime * 0.1);
    float turbAmp = mix(1.0, 3.5, morphFactor);
    currentPos += waveTurb * turbAmp;

    // Subtle Hand Position Tilt Influence on core
    currentPos.x += uHandPos.x * 8.0 * (1.0 + morphFactor * 0.15);
    currentPos.y += uHandPos.y * 8.0 * (1.0 + morphFactor * 0.15);

    sizeBoost = mix(1.0, 1.22, morphFactor) * (1.0 + 0.1 * sin(uTime * 1.2 + aPhase));
  } else {
    // 70% Outer disc / star particles: Static background stars frozen at aTargetFist, unaffected by uOpenness
    currentPos = aTargetFist;
    sizeBoost = 1.0;
  }

  // Transform to Camera View
  vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Point Size Attenuation & Crisp HD Shimmer
  float depth = -mvPosition.z;
  gl_PointSize = aSize * sizeBoost * (360.0 / max(depth, 1.0)) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 1.2, 40.0);

  // Depth Fade
  vAlpha = clamp(1.0 - (depth - 140.0) / 900.0, 0.45, 1.0);
}
`;

const GALAXY_FRAGMENT_SHADER = /* glsl */ `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float distSq = dot(coord, coord);
  
  if (distSq > 0.25) {
    discard;
  }
  
  float dist = sqrt(distSq);
  // Crisp neon core with clean gaussian glow (HD video recording)
  float innerGlow = exp(-dist * 13.0) * 1.8;
  float outerGlow = smoothstep(0.5, 0.05, dist);
  
  vec3 finalColor = vColor * outerGlow + vec3(innerGlow);
  float finalAlpha = outerGlow * vAlpha;
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

export interface GalaxySceneOptions {
  particleCount?: number;
  theme?: string;
}

/**
 * GalaxyScene: 200,000 GPU particle spiral galaxy simulation.
 * Features:
 * - 30% Central glowing core that morphs/zooms with gesture openness
 * - 70% Outer star/accretion disc background that remains stationary and frozen in space
 * - 7-color RGB rainbow HSV cycling
 * - Multi-theme color palette support (Emerald, Nebula, Supernova, Cyber, Rainbow)
 */
export class GalaxyScene extends BaseScene {
  public readonly name: string = 'galaxy';

  private particleMaterial!: THREE.ShaderMaterial;
  private particlePoints!: THREE.Points;
  private simulationTime: number = 0;
  private currentTheme: string = 'emerald';

  constructor(options?: GalaxySceneOptions) {
    super();
    this._particleCount = options?.particleCount ?? 200000;
    this.currentTheme = options?.theme ?? 'emerald';

    // Camera Rig framing
    this.cameraRig = {
      defaultPosition: new THREE.Vector3(0, 0, 100),
      targetLookAt: new THREE.Vector3(0, 0, 0),
      fov: 60,
      minDistance: 10,
      maxDistance: 800,
    };
  }

  protected setupScene(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    const count = this._particleCount;
    const geometry = this.registerDisposable(new THREE.BufferGeometry());

    const positions = new Float32Array(count * 3);
    const targetFist = new Float32Array(count * 3);
    const targetOpen = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const types = new Float32Array(count);
    const orbitSpeeds = new Float32Array(count);
    const orbitRadii = new Float32Array(count);
    const orbitAngles = new Float32Array(count);
    const phases = new Float32Array(count);
    const warpVelocities = new Float32Array(count * 3);

    // 30% Core (e.g. 60,000 of 200k), 70% Accretion Disc / Background Stars (140,000 of 200k)
    const coreCount = Math.floor(count * 0.30);

    const discEuler = new THREE.Euler(THREE.MathUtils.degToRad(32), 0, THREE.MathUtils.degToRad(15), 'XYZ');
    const discMatrix = new THREE.Matrix4().makeRotationFromEuler(discEuler);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const isCore = i < coreCount;

      types[i] = isCore ? 0.0 : 1.0;
      phases[i] = Math.random() * Math.PI * 2;

      // TARGET A: FIST (30% CORE R:5-25, 70% ACCRETION DISC R:50-175)
      if (isCore) {
        const u = Math.random();
        const r = 5.0 + 20.0 * Math.pow(u, 1.8);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2.0 * Math.random() - 1.0);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        targetFist[i3] = x;
        targetFist[i3 + 1] = y;
        targetFist[i3 + 2] = z;

        orbitRadii[i] = r;
        orbitSpeeds[i] = 0;
        sizes[i] = 2.0 + Math.random() * 2.4;
      } else {
        // 70% Accretion Disc: Static background stars
        const rMin = 50.0;
        const rMax = 175.0;
        const u = Math.random();
        const r = Math.sqrt(rMin * rMin + u * (rMax * rMax - rMin * rMin));

        const armOffset = i % 2 === 0 ? 0 : Math.PI;
        const spiralAngle = Math.log(r / rMin) * 2.2 + armOffset + (Math.random() - 0.5) * 0.45;
        const theta = spiralAngle;

        const speed = (1.1 / Math.sqrt(r)) * (0.9 + Math.random() * 0.2);
        orbitSpeeds[i] = speed * (Math.random() < 0.05 ? -0.8 : 1.0);
        orbitRadii[i] = r;
        orbitAngles[i] = theta;

        const heightSpread = (1.0 - ((r - rMin) / (rMax - rMin)) * 0.5) * 3.2;
        const yLocal = (Math.random() - 0.5 + Math.random() - 0.5) * heightSpread;

        const localPos = new THREE.Vector3(r * Math.cos(theta), yLocal, r * Math.sin(theta));
        localPos.applyMatrix4(discMatrix);

        targetFist[i3] = localPos.x;
        targetFist[i3 + 1] = localPos.y;
        targetFist[i3 + 2] = localPos.z;

        sizes[i] = 1.4 + Math.random() * 2.0;
      }

      // TARGET B: OPEN PALM (BLOOMING GALAXY EXPANSION)
      const warpRadius = 70.0 + Math.pow(Math.random(), 1.35) * 140.0;
      const warpAngle = Math.random() * Math.PI * 2;
      const warpZ = -90.0 + Math.random() * 200.0;
      const spreadFactor = 1.0 + ((warpZ + 90.0) / 200.0) * 0.35;

      const openX = warpRadius * Math.cos(warpAngle) * spreadFactor;
      const openY = warpRadius * Math.sin(warpAngle) * spreadFactor;
      const openZ = warpZ;

      targetOpen[i3] = openX;
      targetOpen[i3 + 1] = openY;
      targetOpen[i3 + 2] = openZ;

      const warpDir = new THREE.Vector3(openX, openY, openZ + 80).normalize();
      warpVelocities[i3] = warpDir.x;
      warpVelocities[i3 + 1] = warpDir.y;
      warpVelocities[i3 + 2] = warpDir.z;

      positions[i3] = targetFist[i3];
      positions[i3 + 1] = targetFist[i3 + 1];
      positions[i3 + 2] = targetFist[i3 + 2];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aTargetFist', new THREE.BufferAttribute(targetFist, 3));
    geometry.setAttribute('aTargetOpen', new THREE.BufferAttribute(targetOpen, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aType', new THREE.BufferAttribute(types, 1));
    geometry.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(orbitSpeeds, 1));
    geometry.setAttribute('aOrbitRadius', new THREE.BufferAttribute(orbitRadii, 1));
    geometry.setAttribute('aOrbitAngle', new THREE.BufferAttribute(orbitAngles, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aWarpVelocity', new THREE.BufferAttribute(warpVelocities, 3));

    this.particleMaterial = this.registerDisposable(
      new THREE.ShaderMaterial({
        vertexShader: GALAXY_VERTEX_SHADER,
        fragmentShader: GALAXY_FRAGMENT_SHADER,
        uniforms: {
          uTime: { value: 0.0 },
          uOpenness: { value: 0.0 },
          uPixelRatio: { value: typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.25) : 1.0 },
          uHandPos: { value: new THREE.Vector2(0, 0) },
          uIsRainbow: { value: 0.0 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
      })
    );

    this.particlePoints = new THREE.Points(geometry, this.particleMaterial);
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.particlePoints);

    this.setTheme(this.currentTheme);
  }

  public setTheme(theme: string): void {
    this.currentTheme = theme;

    if (theme === 'rainbow' || theme === 'rgb') {
      if (this.particleMaterial) {
        this.particleMaterial.uniforms.uIsRainbow.value = 1.0;
      }
      return;
    }

    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uIsRainbow.value = 0.0;
    }

    if (!this.particlePoints) return;

    const count = this._particleCount;
    const colorAttr = this.particlePoints.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    if (!colorAttr) return;

    const colors = colorAttr.array as Float32Array;
    const types = (this.particlePoints.geometry.getAttribute('aType') as THREE.BufferAttribute).array;
    const radii = (this.particlePoints.geometry.getAttribute('aOrbitRadius') as THREE.BufferAttribute).array;

    const cCore = new THREE.Color('#ffffff');
    let cMid: THREE.Color;
    let cEdge: THREE.Color;

    if (theme === 'nebula') {
      cMid = new THREE.Color('#bd00ff');
      cEdge = new THREE.Color('#4b0082');
    } else if (theme === 'supernova') {
      cMid = new THREE.Color('#ff8800');
      cEdge = new THREE.Color('#aa1100');
    } else if (theme === 'cyber') {
      cMid = new THREE.Color('#00f0ff');
      cEdge = new THREE.Color('#0011ff');
    } else {
      // Default: Emerald
      cMid = new THREE.Color('#00ffb3');
      cEdge = new THREE.Color('#006655');
    }

    const tempColor = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const isCore = types[i] < 0.5;

      if (isCore) {
        const normR = Math.min(1.0, (radii[i] - 5.0) / 20.0);
        tempColor.copy(cCore).lerp(cMid, normR * 0.85);
      } else {
        const rMin = 50.0;
        const rMax = 175.0;
        const normR = Math.max(0.0, Math.min(1.0, (radii[i] - rMin) / (rMax - rMin)));
        const rand = Math.random();

        if (rand < 0.85) {
          tempColor.copy(cMid).lerp(cEdge, normR);
        } else if (rand < 0.96) {
          tempColor.copy(cMid).lerp(cCore, Math.random() * 0.6);
        } else {
          tempColor.copy(cCore);
        }
      }

      colors[i3] = tempColor.r;
      colors[i3 + 1] = tempColor.g;
      colors[i3 + 2] = tempColor.b;
    }

    colorAttr.needsUpdate = true;
  }

  public toggleRainbow(): boolean {
    if (!this.particleMaterial) return false;
    const isRainbow = this.particleMaterial.uniforms.uIsRainbow.value > 0.5;
    this.particleMaterial.uniforms.uIsRainbow.value = isRainbow ? 0.0 : 1.0;
    return !isRainbow;
  }

  public update(delta: number, timeDilation: number, gestureState: GestureState): void {
    const effectiveDelta = delta * timeDilation;
    this.simulationTime += effectiveDelta;

    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uTime.value = this.simulationTime;
      const openness = gestureState?.hasHand ? gestureState.openness : 0.0;
      this.particleMaterial.uniforms.uOpenness.value = openness;
      if (gestureState?.position) {
        this.particleMaterial.uniforms.uHandPos.value.set(gestureState.position.x, gestureState.position.y);
      }
    }
  }

  public override resize(width: number, height: number, pixelRatio: number): void {
    super.resize(width, height, pixelRatio);
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uPixelRatio.value = Math.min(pixelRatio, 1.25);
    }
  }
}
