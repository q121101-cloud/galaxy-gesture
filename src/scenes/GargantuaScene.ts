import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { GestureState } from '../core/types';
import { createAccretionMaterial } from '../shaders/accretion.frag';
import { createLensingMaterial } from '../shaders/lensing.glsl';

/**
 * Custom GPU Particle Shader for Gargantua
 * Evaluates Keplerian orbital mechanics, relativistic polar jets,
 * Doppler beaming, and time-dilation in the vertex shader.
 */
const GARGANTUA_PARTICLE_VERT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uTimeDilation;
uniform float uOpenness;
uniform float uRs; // Schwarzschild radius
uniform float uPixelRatio;

attribute vec3 aVelocity;
attribute vec3 aColor;
attribute float aSize;
attribute float aOrbitRadius;
attribute float aOrbitSpeed;
attribute float aOrbitAngle;
attribute float aType; // 0: Inner ISCO, 1: Accretion Disk, 2: Polar Jets, 3: Halo Stardust
attribute float aPhase;

varying vec3 vColor;
varying float vAlpha;
varying float vSpeed;

vec3 rotateAxis(vec3 v, vec3 axis, float angle) {
  return v * cos(angle) + cross(axis, v) * sin(angle) + axis * dot(axis, v) * (1.0 - cos(angle));
}

void main() {
  vec3 pos = position;
  float t = uTime * uTimeDilation;
  vec3 particleColor = aColor;
  float alpha = 0.85;

  // 1. Accretion Disk & ISCO Infall (Types 0 & 1)
  if (aType < 1.5) {
    // Keplerian angular velocity Omega proportional to r^(-1.5)
    float omega = aOrbitSpeed;
    float currentAngle = aOrbitAngle + omega * t;
    
    // Breathing/expansion driven by hand openness [0.0 = clutched fist, 1.0 = wide open]
    float currentRadius = aOrbitRadius * (0.85 + uOpenness * 0.35);

    // Inward spiral precession towards ISCO (slowed down by 45% for majestic cinematic flow)
    float spiral = sin(currentRadius * 0.15 - t * 0.22 + aPhase) * 0.35;
    
    pos.x = cos(currentAngle) * currentRadius;
    pos.z = sin(currentAngle) * currentRadius;
    pos.y = position.y + spiral;

    // Relativistic Doppler frequency shift approximation for particles
    // Tangential velocity vector: v = (-sin(theta), 0, cos(theta)) * omega * r
    vec3 tangentVel = vec3(-sin(currentAngle), 0.0, cos(currentAngle)) * (omega * currentRadius * 0.2);
    vec3 viewDir = normalize((modelViewMatrix * vec4(pos, 1.0)).xyz);
    float dopplerCos = dot(normalize(tangentVel + 0.001), -viewDir);

    if (dopplerCos > 0.0) {
      // Blueshift: Approaching side
      particleColor = mix(particleColor, vec3(0.8, 0.95, 1.0), dopplerCos * 0.7);
    } else {
      // Redshift: Receding side
      particleColor = mix(particleColor, vec3(0.7, 0.1, 0.02), abs(dopplerCos) * 0.6);
    }
  }
  // 2. Relativistic Polar Jets (Type 2)
  else if (aType > 1.5 && aType < 2.5) {
    float jetSign = sign(position.y);
    if (abs(jetSign) < 0.1) jetSign = 1.0;
    
    // Relativistic jet ejection speed along +/- Y (slowed down by 45% for heavy cinematic feel)
    float jetSpeed = 15.4 + aOrbitSpeed * 5.5;
    float maxJetHeight = 90.0;
    float jetProgress = mod(abs(position.y) + jetSpeed * t + aPhase * 10.0, maxJetHeight);
    
    // Helical magnetic confinement envelope: r_helix = r0 * sqrt(y)
    float helixRadius = (1.5 + sqrt(jetProgress) * 0.8) * (0.9 + uOpenness * 0.3);
    float helixAngle = jetProgress * 0.45 + aOrbitAngle + t * 2.2;
    
    pos.x = cos(helixAngle) * helixRadius;
    pos.z = sin(helixAngle) * helixRadius;
    pos.y = jetSign * (uRs * 0.95 + jetProgress);

    // Fade near jet extremities
    alpha = smoothstep(maxJetHeight, maxJetHeight * 0.7, jetProgress) * smoothstep(0.0, 5.0, jetProgress) * 0.95;
    particleColor = mix(vec3(0.6, 0.85, 1.0), vec3(1.0, 0.95, 0.8), sin(jetProgress * 0.2) * 0.5 + 0.5);
  }
  // 3. Gravitational Halo Stardust (Type 3)
  else {
    float orbitAngle = aOrbitAngle + aOrbitSpeed * t * 0.165;
    vec3 orbitAxis = normalize(aVelocity);
    pos = rotateAxis(position * (0.9 + uOpenness * 0.2), orbitAxis, orbitAngle);
    
    // Gravitational lens deflection puff
    float dist = length(pos);
    if (dist < uRs * 1.5) {
      pos = normalize(pos) * (uRs * 1.5);
    }
    alpha = 0.55;
  }

  vColor = particleColor;
  vAlpha = alpha;
  vSpeed = aOrbitSpeed;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Adaptive point size calculation with distance attenuation
  float pointSize = aSize * (150.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(pointSize, 1.0, 48.0);
}
`;

const GARGANTUA_PARTICLE_FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Soft circular particle point profile with glowing center
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) {
    discard;
  }

  // Gaussian-like core glow
  float intensity = exp(-dist * dist * 10.0);
  float rim = 1.0 - smoothstep(0.35, 0.5, dist);

  vec3 rgb = vColor * (intensity * 1.5 + rim * 0.5);
  gl_FragColor = vec4(rgb, vAlpha * rim);
}
`;

export interface GargantuaSceneOptions {
  particleCount?: number;
  schwarzschildRadius?: number;
  innerDiskRadius?: number;
  outerDiskRadius?: number;
}

/**
 * GargantuaScene: Christopher Nolan-inspired supermassive black hole.
 * Features:
 * - Schwarzschild Event Horizon void sphere (Rs = 4.0)
 * - Photon Sphere boundary (Rph = 1.5 Rs = 6.0)
 * - Relativistic Doppler accretion disk with Shakura-Sunyaev temperature gradient
 * - Gravitationally warped upper and lower lensing halo crown arches
 * - Exactly 200,000 GPU Keplerian particles with relativistic polar jets
 * - Dynamic gesture responsiveness (openness, pinch time-dilation, tilt/pitch)
 */
export class GargantuaScene extends BaseScene {
  public readonly name: string = 'gargantua';

  public readonly schwarzschildRadius: number;
  public readonly photonSphereRadius: number;
  public readonly innerDiskRadius: number;
  public readonly outerDiskRadius: number;

  // Scene Meshes & Materials
  private eventHorizonMesh!: THREE.Mesh;
  private photonRingMesh!: THREE.Mesh;
  private primaryDiskMesh!: THREE.Mesh;
  private upperWarpedArchMesh!: THREE.Mesh;
  private lowerWarpedArchMesh!: THREE.Mesh;

  private accretionMaterial!: THREE.ShaderMaterial;
  private warpedArchMaterial!: THREE.ShaderMaterial;
  private particleMaterial!: THREE.ShaderMaterial;
  private particlePoints!: THREE.Points;

  // Gravitational Lensing Screen Pass
  private lensingMaterial?: THREE.ShaderMaterial;

  private simulationTime: number = 0;

  constructor(options?: GargantuaSceneOptions) {
    super();
    this._particleCount = options?.particleCount ?? 200000;
    this.schwarzschildRadius = options?.schwarzschildRadius ?? 4.0;
    this.photonSphereRadius = this.schwarzschildRadius * 1.5; // 6.0
    this.innerDiskRadius = options?.innerDiskRadius ?? this.schwarzschildRadius * 3.0; // 12.0 (ISCO)
    this.outerDiskRadius = options?.outerDiskRadius ?? 48.0;

    // Camera Rig framing
    this.cameraRig = {
      defaultPosition: new THREE.Vector3(0, 18, 95),
      targetLookAt: new THREE.Vector3(0, 0, 0),
      fov: 55,
      minDistance: 12,
      maxDistance: 600,
    };
  }

  protected setupScene(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    // 1. Ambient cosmic darkness fog
    this.scene.fog = new THREE.FogExp2(0x020205, 0.0006);

    // 2. Build Black Hole Event Horizon (Absolute Light Absorption)
    this.buildEventHorizon();

    // 3. Build Relativistic Doppler Accretion Disk (Equatorial & Warped Dual Lensing Arches)
    this.buildAccretionDisk();

    // 4. Build 200,000 GPU Keplerian Particle System & Relativistic Jets
    this.buildGpuParticles();

    // 5. Build Gravitational Lensing Screen Quad Material
    this.lensingMaterial = this.registerDisposable(
      createLensingMaterial({
        distortionStrength: 1.25,
        einsteinRingSize: 1.0,
      })
    );
  }

  /**
   * Build Event Horizon and glowing Photon Sphere ring
   */
  private buildEventHorizon(): void {
    // Event Horizon: Pure black absorber sphere
    const horizonGeo = this.registerDisposable(
      new THREE.SphereGeometry(this.schwarzschildRadius * 0.995, 64, 64)
    );
    const horizonMat = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        depthWrite: true,
      })
    );
    this.eventHorizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    this.eventHorizonMesh.renderOrder = 1;
    this.scene.add(this.eventHorizonMesh);

    // Photon Sphere Glowing Ring: r = 1.5 Rs
    const ringGeo = this.registerDisposable(
      new THREE.RingGeometry(this.photonSphereRadius * 0.96, this.photonSphereRadius * 1.04, 128)
    );
    const ringMat = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: 0xffd580,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.photonRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.photonRingMesh.rotation.x = Math.PI / 2;
    this.scene.add(this.photonRingMesh);
  }

  /**
   * Build Relativistic Accretion Disk with Dual Warped Lensing Arches
   */
  private buildAccretionDisk(): void {
    // Primary Equatorial Disk Material
    this.accretionMaterial = this.registerDisposable(
      createAccretionMaterial({
        innerRadius: this.innerDiskRadius,
        outerRadius: this.outerDiskRadius,
        diskThickness: 0.45,
      })
    );
    this.accretionMaterial.uniforms.uSchwarzschildRadius.value = this.schwarzschildRadius;

    // Equatorial Disk Geometry: Concentric Ring Plane
    const diskGeo = this.registerDisposable(
      new THREE.RingGeometry(this.innerDiskRadius, this.outerDiskRadius, 128, 64)
    );
    this.primaryDiskMesh = new THREE.Mesh(diskGeo, this.accretionMaterial);
    this.primaryDiskMesh.rotation.x = Math.PI / 2;
    this.scene.add(this.primaryDiskMesh);

    // Gravitationally Warped Upper Halo Crown Arch (Curved above horizon)
    const archRadius = (this.innerDiskRadius + this.outerDiskRadius) * 0.42;
    const archGeo = this.registerDisposable(
      new THREE.TorusGeometry(archRadius, (this.outerDiskRadius - this.innerDiskRadius) * 0.38, 32, 128, Math.PI)
    );
    
    this.warpedArchMaterial = this.registerDisposable(this.accretionMaterial.clone());
    this.warpedArchMaterial.uniforms.uTurbulenceDensity.value = 4.2;

    this.upperWarpedArchMesh = new THREE.Mesh(archGeo, this.warpedArchMaterial);
    this.upperWarpedArchMesh.position.set(0, 0, 0);
    this.upperWarpedArchMesh.rotation.x = 0;
    this.upperWarpedArchMesh.scale.set(1.0, 1.15, 0.4);
    this.scene.add(this.upperWarpedArchMesh);

    // Gravitationally Warped Lower Under-Arch (Curved below horizon)
    const lowerArchGeo = this.registerDisposable(
      new THREE.TorusGeometry(archRadius * 0.95, (this.outerDiskRadius - this.innerDiskRadius) * 0.32, 32, 128, Math.PI)
    );
    this.lowerWarpedArchMesh = new THREE.Mesh(lowerArchGeo, this.warpedArchMaterial);
    this.lowerWarpedArchMesh.rotation.x = Math.PI; // Inverted
    this.lowerWarpedArchMesh.scale.set(1.0, 1.05, 0.35);
    this.scene.add(this.lowerWarpedArchMesh);
  }

  /**
   * Build 200,000 GPU Keplerian Particle System
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
    // 0: Inner ISCO Core (15%)
    // 1: Accretion Disk Spiral Flow (55%)
    // 2: Relativistic Polar Jets (15%)
    // 3: Halo Stardust & Deflected Envelope (15%)
    const innerCount = Math.floor(count * 0.15);
    const diskCount = Math.floor(count * 0.55);
    const jetCount = Math.floor(count * 0.15);

    // Color definitions
    const colorWhiteGold = new THREE.Color(1.0, 0.96, 0.88);
    const colorSolarAmber = new THREE.Color(1.0, 0.65, 0.15);
    const colorCrimson = new THREE.Color(0.85, 0.15, 0.02);
    const colorJetCyan = new THREE.Color(0.5, 0.85, 1.0);
    const colorStardust = new THREE.Color(0.9, 0.75, 0.5);

    for (let i = 0; i < count; i++) {
      let type = 1;
      let r = 0;
      let theta = Math.random() * Math.PI * 2;
      let col = colorSolarAmber;
      let size = 1.0 + Math.random() * 2.2;
      let speed = 1.0;
      let posX = 0;
      let posY = (Math.random() - 0.5) * 0.6;
      let posZ = 0;
      let velX = 0;
      let velY = 0;
      let velZ = 0;

      if (i < innerCount) {
        // Inner ISCO Core (slowed down by 45%)
        type = 0;
        r = this.innerDiskRadius + Math.random() * (this.innerDiskRadius * 0.6);
        speed = 1.32 / Math.pow(r / this.innerDiskRadius, 1.5);
        col = colorWhiteGold;
        size = 1.4 + Math.random() * 2.8;
      } else if (i < innerCount + diskCount) {
        // Accretion Disk Spiral Arms (slowed down by 45%)
        type = 1;
        const norm = Math.random();
        r = this.innerDiskRadius + Math.pow(norm, 1.3) * (this.outerDiskRadius - this.innerDiskRadius);
        speed = 0.99 / Math.pow(r / this.innerDiskRadius, 1.5);
        if (norm < 0.3) {
          col = colorSolarAmber;
        } else if (norm < 0.7) {
          col = new THREE.Color().lerpColors(colorSolarAmber, colorCrimson, (norm - 0.3) / 0.4);
        } else {
          col = colorCrimson;
        }
        size = 1.0 + Math.random() * 2.0;
      } else if (i < innerCount + diskCount + jetCount) {
        // Relativistic Polar Jets (slowed down by 45%)
        type = 2;
        r = 1.0 + Math.random() * 3.0;
        const jetSign = Math.random() > 0.5 ? 1 : -1;
        posY = jetSign * (this.schwarzschildRadius + Math.random() * 80.0);
        speed = 0.825 + Math.random() * 1.375;
        col = colorJetCyan;
        size = 1.6 + Math.random() * 3.2;
        velY = jetSign * (13.75 + Math.random() * 8.25);
      } else {
        // Halo Stardust (slowed down by 45%)
        type = 3;
        const phi = Math.acos(2.0 * Math.random() - 1.0);
        r = this.innerDiskRadius * 1.2 + Math.random() * this.outerDiskRadius * 1.5;
        posX = r * Math.sin(phi) * Math.cos(theta);
        posY = r * Math.sin(phi) * Math.sin(theta);
        posZ = r * Math.cos(phi);
        speed = 0.33 / Math.sqrt(r);
        col = colorStardust;
        size = 0.8 + Math.random() * 1.5;
        velX = (Math.random() - 0.5);
        velY = (Math.random() - 0.5);
        velZ = (Math.random() - 0.5);
      }

      if (type !== 3) {
        posX = Math.cos(theta) * r;
        posZ = Math.sin(theta) * r;
      }

      const idx = i * 3;
      positions[idx] = posX;
      positions[idx + 1] = posY;
      positions[idx + 2] = posZ;

      velocities[idx] = velX;
      velocities[idx + 1] = velY;
      velocities[idx + 2] = velZ;

      colors[idx] = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;

      sizes[i] = size;
      orbitRadii[i] = r;
      orbitSpeeds[i] = speed;
      orbitAngles[i] = theta;
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
          uOpenness: { value: 0.0 },
          uRs: { value: this.schwarzschildRadius },
          uPixelRatio: { value: typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.5) : 1.0 },
        },
        vertexShader: GARGANTUA_PARTICLE_VERT,
        fragmentShader: GARGANTUA_PARTICLE_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.particlePoints = new THREE.Points(geometry, this.particleMaterial);
    this.scene.add(this.particlePoints);
  }

  /**
   * Update Black Hole accretion physics, shaders, and particle orbits
   */
  public update(delta: number, timeDilation: number, gestureState: GestureState): void {
    // Advance simulation time scaled by relativistic time dilation
    const effectiveDelta = delta * timeDilation;
    this.simulationTime += effectiveDelta;

    const openness = gestureState.hasHand ? gestureState.openness : 0.0;

    // 1. Update Accretion Disk Shader Uniforms
    if (this.accretionMaterial) {
      this.accretionMaterial.uniforms.uTime.value = this.simulationTime;
      this.accretionMaterial.uniforms.uTimeDilation.value = timeDilation;
      this.accretionMaterial.uniforms.uDopplerStrength.value = 1.0 + (1.0 - timeDilation) * 0.5;
    }

    if (this.warpedArchMaterial) {
      this.warpedArchMaterial.uniforms.uTime.value = this.simulationTime;
      this.warpedArchMaterial.uniforms.uTimeDilation.value = timeDilation;
    }

    // 2. Update GPU Particle System
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uTime.value = this.simulationTime;
      this.particleMaterial.uniforms.uTimeDilation.value = timeDilation;
      this.particleMaterial.uniforms.uOpenness.value = openness;
    }

    // 3. Subtle slow rotation of the photon sphere ring & warped arches (reduced by 45%)
    if (this.photonRingMesh) {
      this.photonRingMesh.rotation.z += effectiveDelta * 0.066;
    }

    // 4. Orient upper and lower warped arches towards camera for dynamic lensing silhouette
    if (this.parentCamera && this.upperWarpedArchMesh && this.lowerWarpedArchMesh) {
      const camPos = this.parentCamera.position;
      const angleY = Math.atan2(camPos.x, camPos.z);
      this.upperWarpedArchMesh.rotation.y = angleY;
      this.lowerWarpedArchMesh.rotation.y = angleY;
    }

    // 5. Update Gravitational Lensing Screen Pass Uniforms
    if (this.lensingMaterial && this.parentCamera && this.renderer) {
      this.lensingMaterial.uniforms.uTime.value = this.simulationTime;
      this.lensingMaterial.uniforms.uTimeDilation.value = timeDilation;

      // Project Black Hole world origin (0, 0, 0) into screen UV coordinates
      const screenPos = new THREE.Vector3(0, 0, 0).project(this.parentCamera);
      const uvX = screenPos.x * 0.5 + 0.5;
      const uvY = screenPos.y * 0.5 + 0.5;
      this.lensingMaterial.uniforms.uBlackHoleScreenPos.value.set(uvX, uvY);
    }
  }

  public override resize(width: number, height: number, pixelRatio: number): void {
    super.resize(width, height, pixelRatio);
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uPixelRatio.value = Math.min(pixelRatio, 1.5);
    }
    if (this.lensingMaterial && height > 0) {
      this.lensingMaterial.uniforms.uAspectRatio.value = width / height;
    }
  }
}
