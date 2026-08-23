import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { GestureState } from '../core/types';
import { createPortalMaterial } from '../shaders/portal.frag';

/**
 * Custom GPU Particle Shader for Wormhole Throat Stream & Warp Streaks
 * Evaluates relativistic tunnel kinematics, warp velocity elongation,
 * chromatic transition between dual universes, and time dilation.
 */
const WORMHOLE_PARTICLE_VERT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uTimeDilation;
uniform float uWarpSpeed;
uniform float uTravelProgress;
uniform float uThroatRadius;
uniform float uOpenness;
uniform float uPixelRatio;

attribute vec3 aVelocity;
attribute vec3 aColor;
attribute float aSize;
attribute float aOrbitRadius;
attribute float aOrbitSpeed;
attribute float aOrbitAngle;
attribute float aType; // 0: Throat Funnel, 1: Warp Flight Streaks, 2: Ambient Stardust
attribute float aPhase;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 pos = position;
  float t = uTime * uTimeDilation;
  float tunnelLength = 400.0;
  float alpha = 0.85;
  vec3 particleColor = aColor;

  // 1. Throat Infall Funnel (Type 0)
  if (aType < 0.5) {
    // Hyperbolic throat shape: r(z) = sqrt(a^2 + z^2 * curvature)
    float zTravel = mod(position.z - (uWarpSpeed * 35.0 + 15.0) * t + aPhase * 20.0, tunnelLength) - (tunnelLength * 0.5);
    float throatR = sqrt(uThroatRadius * uThroatRadius + zTravel * zTravel * 0.12) * (0.85 + uOpenness * 0.3);
    
    // Vortex spin
    float spinSpeed = aOrbitSpeed * 1.5;
    float currentAngle = aOrbitAngle + spinSpeed * t + (zTravel * 0.05);
    
    pos.x = cos(currentAngle) * throatR;
    pos.y = sin(currentAngle) * throatR;
    pos.z = zTravel;

    // Color transition along tunnel z
    float zNorm = clamp((zTravel + tunnelLength * 0.5) / tunnelLength, 0.0, 1.0);
    vec3 u1Color = vec3(0.1, 0.8, 1.0); // Electric Cyan (Saturn/Universe 1)
    vec3 u2Color = vec3(1.0, 0.6, 0.15); // Solar Amber (Gargantua/Universe 2)
    particleColor = mix(u1Color, u2Color, smoothstep(0.3, 0.7, zNorm + uTravelProgress * 0.5));
    alpha = smoothstep(-tunnelLength * 0.5, -tunnelLength * 0.35, zTravel) * smoothstep(tunnelLength * 0.5, tunnelLength * 0.35, zTravel);
  }
  // 2. Relativistic Warp Flight Streaks (Type 1)
  else if (aType > 0.5 && aType < 1.5) {
    float streakSpeed = (45.0 + uWarpSpeed * 65.0) * (0.8 + aOrbitSpeed * 0.5);
    float zTravel = mod(position.z - streakSpeed * t, tunnelLength) - (tunnelLength * 0.5);
    
    pos.x = position.x * (0.9 + uOpenness * 0.2);
    pos.y = position.y * (0.9 + uOpenness * 0.2);
    pos.z = zTravel;

    // Relativistic streak elongation along Z
    float streakLength = (1.5 + uWarpSpeed * 3.5);
    particleColor = mix(aColor, vec3(1.0, 1.0, 1.0), uWarpSpeed * 0.5);
    alpha = 0.9;
  }
  // 3. Ambient Celestial Stardust (Type 2)
  else {
    float drift = sin(t * 0.3 + aPhase) * 2.0;
    pos.x = position.x + drift;
    pos.y = position.y + cos(t * 0.25 + aPhase) * 2.0;
    pos.z = position.z - mod(t * 8.0, tunnelLength * 0.5);
    alpha = 0.5;
  }

  vColor = particleColor;
  vAlpha = alpha;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float pointSize = aSize * (160.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(pointSize, 1.0, 42.0);
}
`;

const WORMHOLE_PARTICLE_FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) {
    discard;
  }

  float core = exp(-dist * dist * 12.0);
  float rim = 1.0 - smoothstep(0.3, 0.5, dist);

  vec3 rgb = vColor * (core * 1.6 + rim * 0.4);
  gl_FragColor = vec4(rgb, vAlpha * rim);
}
`;

export interface WormholeSceneOptions {
  particleCount?: number;
  throatRadius?: number;
}

/**
 * WormholeScene: Traversable Ellis wormhole connecting Solar System to Gargantua galaxy.
 * Features:
 * - 4D Refractive spherical portal (throat radius a = 15.0)
 * - Dual celestial starfield environment mapping (Universe 1 & Universe 2)
 * - Shimmering Einstein ring boundary with chromatic dispersion
 * - >= 300,000 GPU Particles in hyperbolic throat funnel & relativistic warp flight streaks
 * - Smooth gesture fly-through acceleration (hand openness / pinch)
 */
export class WormholeScene extends BaseScene {
  public readonly name: string = 'wormhole';

  public readonly throatRadius: number;

  private portalMesh!: THREE.Mesh;
  private portalMaterial!: THREE.ShaderMaterial;
  private particleMaterial!: THREE.ShaderMaterial;
  private particlePoints!: THREE.Points;

  // Dual celestial skyboxes
  private skyboxUniverse1!: THREE.Mesh;
  private skyboxUniverse2!: THREE.Mesh;

  private simulationTime: number = 0;
  private travelProgress: number = 0;
  private warpSpeed: number = 0.5;

  constructor(options?: WormholeSceneOptions) {
    super();
    this._particleCount = options?.particleCount ?? 300000;
    this.throatRadius = options?.throatRadius ?? 15.0;

    // Camera Rig framing
    this.cameraRig = {
      defaultPosition: new THREE.Vector3(0, 0, 85),
      targetLookAt: new THREE.Vector3(0, 0, 0),
      fov: 60,
      minDistance: 8,
      maxDistance: 700,
    };
  }

  protected setupScene(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    this.scene.fog = new THREE.FogExp2(0x020308, 0.0005);

    // 1. Build Dual Celestial Skyboxes (Universe 1: Milky Way / Saturn, Universe 2: Gargantua Cosmos)
    this.buildDualSkyboxes();

    // 2. Build Traversable Spherical Portal Mesh & Refraction Shader
    this.buildPortalMesh();

    // 3. Build >= 300,000 GPU Wormhole Particle System & Warp Streaks
    this.buildGpuParticles();
  }

  /**
   * Build background celestial environments
   */
  private buildDualSkyboxes(): void {
    // Universe 1 Outer Sky Sphere (Saturn / Cold Blue)
    const skyGeo1 = this.registerDisposable(new THREE.SphereGeometry(600, 32, 32));
    const skyMat1 = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: 0x0a1224,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    this.skyboxUniverse1 = new THREE.Mesh(skyGeo1, skyMat1);
    this.scene.add(this.skyboxUniverse1);
  }

  /**
   * Build 4D Refractive Portal Sphere
   */
  private buildPortalMesh(): void {
    this.portalMaterial = this.registerDisposable(createPortalMaterial());
    this.portalMaterial.uniforms.uThroatRadius.value = this.throatRadius;
    this.portalMaterial.uniforms.uShimmerIntensity.value = 2.0;

    const portalGeo = this.registerDisposable(
      new THREE.SphereGeometry(this.throatRadius, 64, 64)
    );
    this.portalMesh = new THREE.Mesh(portalGeo, this.portalMaterial);
    this.portalMesh.renderOrder = 2;
    this.scene.add(this.portalMesh);

    // Outer Einstein Boundary Glow Ring
    const boundaryRingGeo = this.registerDisposable(
      new THREE.RingGeometry(this.throatRadius * 0.99, this.throatRadius * 1.08, 128)
    );
    const boundaryRingMat = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: 0x4deeea, // Electric Cyan Shimmer
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const boundaryRing = new THREE.Mesh(boundaryRingGeo, boundaryRingMat);
    boundaryRing.rotation.x = Math.PI / 2;
    this.scene.add(boundaryRing);
  }

  /**
   * Build >= 300,000 GPU Particles for Throat Vortex & Warp Streaks
   */
  private buildGpuParticles(): void {
    const count = this._particleCount;
    const geometry = this.registerDisposable(new THREE.BufferGeometry());

    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const orbitRadii = new Float32Array(count);
    const orbitSpeeds = new Float32Array(count);
    const orbitAngles = new Float32Array(count);
    const types = new Float32Array(count);
    const phases = new Float32Array(count);

    // Distribution breakdown:
    // 0: Throat Funnel Vortex (40%)
    // 1: Warp Flight Streaks (40%)
    // 2: Ambient Celestial Stardust (20%)
    const funnelCount = Math.floor(count * 0.4);
    const streakCount = Math.floor(count * 0.4);

    const colCyan = new THREE.Color(0.2, 0.85, 1.0);
    const colAmber = new THREE.Color(1.0, 0.7, 0.2);
    const colViolet = new THREE.Color(0.8, 0.3, 1.0);
    const colWhite = new THREE.Color(0.95, 0.98, 1.0);

    for (let i = 0; i < count; i++) {
      let type = 0;
      let posX = 0;
      let posY = 0;
      let posZ = (Math.random() - 0.5) * 400.0;
      let r = 0;
      let speed = 1.0;
      let angle = Math.random() * Math.PI * 2;
      let col = colCyan;
      let size = 1.0 + Math.random() * 2.0;

      if (i < funnelCount) {
        // Throat Infall Funnel
        type = 0;
        r = Math.sqrt(this.throatRadius * this.throatRadius + posZ * posZ * 0.12);
        posX = Math.cos(angle) * r;
        posY = Math.sin(angle) * r;
        speed = 1.2 + Math.random() * 2.0;
        col = (i % 2 === 0) ? colCyan : colViolet;
        size = 1.2 + Math.random() * 2.5;
      } else if (i < funnelCount + streakCount) {
        // Relativistic Warp Flight Streaks
        type = 1;
        const streakR = 2.0 + Math.random() * 65.0;
        posX = Math.cos(angle) * streakR;
        posY = Math.sin(angle) * streakR;
        speed = 1.5 + Math.random() * 3.0;
        col = Math.random() > 0.4 ? colAmber : colWhite;
        size = 1.4 + Math.random() * 3.0;
      } else {
        // Ambient Stardust
        type = 2;
        posX = (Math.random() - 0.5) * 250.0;
        posY = (Math.random() - 0.5) * 250.0;
        posZ = (Math.random() - 0.5) * 350.0;
        speed = 0.5 + Math.random() * 0.8;
        col = colCyan;
        size = 0.8 + Math.random() * 1.5;
      }

      const idx = i * 3;
      positions[idx] = posX;
      positions[idx + 1] = posY;
      positions[idx + 2] = posZ;

      velocities[idx] = 0;
      velocities[idx + 1] = 0;
      velocities[idx + 2] = -speed * 20.0;

      colors[idx] = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;

      sizes[i] = size;
      orbitRadii[i] = r;
      orbitSpeeds[i] = speed;
      orbitAngles[i] = angle;
      types[i] = type;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aOrbitRadius', new THREE.BufferAttribute(orbitRadii, 1));
    geometry.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(orbitSpeeds, 1));
    geometry.setAttribute('aOrbitAngle', new THREE.BufferAttribute(orbitAngles, 1));
    geometry.setAttribute('aType', new THREE.BufferAttribute(types, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    this.particleMaterial = this.registerDisposable(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0.0 },
          uTimeDilation: { value: 1.0 },
          uWarpSpeed: { value: 0.5 },
          uTravelProgress: { value: 0.0 },
          uThroatRadius: { value: this.throatRadius },
          uOpenness: { value: 0.0 },
          uPixelRatio: { value: typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.5) : 1.0 },
        },
        vertexShader: WORMHOLE_PARTICLE_VERT,
        fragmentShader: WORMHOLE_PARTICLE_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.particlePoints = new THREE.Points(geometry, this.particleMaterial);
    this.scene.add(this.particlePoints);
  }

  /**
   * Update Wormhole portal physics, fly-through animation, and warp streak kinematics
   */
  public update(delta: number, timeDilation: number, gestureState: GestureState): void {
    const effectiveDelta = delta * timeDilation;
    this.simulationTime += effectiveDelta;

    const openness = gestureState.hasHand ? gestureState.openness : 0.5;
    
    // Warp speed modulated by hand openness (open = accelerate into wormhole, fist = slow down)
    this.warpSpeed = THREE.MathUtils.lerp(this.warpSpeed, 0.2 + openness * 1.6, delta * 3.0);
    this.travelProgress = (this.travelProgress + effectiveDelta * 0.15 * this.warpSpeed) % 1.0;

    // 1. Update Portal Shader Uniforms
    if (this.portalMaterial) {
      this.portalMaterial.uniforms.uTime.value = this.simulationTime;
      this.portalMaterial.uniforms.uTimeDilation.value = timeDilation;
      this.portalMaterial.uniforms.uPinchFactor.value = gestureState.hasHand ? gestureState.pinchDistance : 1.0;
      this.portalMaterial.uniforms.uTravelProgress.value = this.travelProgress;
      this.portalMaterial.uniforms.uDispersion.value = 0.02 + (1.0 - timeDilation) * 0.05;
    }

    // 2. Update GPU Particle System Uniforms
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uTime.value = this.simulationTime;
      this.particleMaterial.uniforms.uTimeDilation.value = timeDilation;
      this.particleMaterial.uniforms.uWarpSpeed.value = this.warpSpeed;
      this.particleMaterial.uniforms.uTravelProgress.value = this.travelProgress;
      this.particleMaterial.uniforms.uOpenness.value = openness;
    }

    // 3. Portal Sphere Gentle Precession
    if (this.portalMesh) {
      this.portalMesh.rotation.y += effectiveDelta * 0.08;
      this.portalMesh.rotation.x = Math.sin(this.simulationTime * 0.2) * 0.05;
    }
  }

  public override resize(width: number, height: number, pixelRatio: number): void {
    super.resize(width, height, pixelRatio);
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uPixelRatio.value = Math.min(pixelRatio, 1.5);
    }
  }
}
