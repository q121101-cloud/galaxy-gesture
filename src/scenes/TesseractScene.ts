import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { GestureState } from '../core/types';
import { createLatticeMaterial } from '../shaders/lattice.frag';

/**
 * Custom GPU Particle Shader for Tesseract Quantum Motes & Gravitational Dust
 * Evaluates 5D Brownian suspension, nodal gravitational attraction to bookshelf
 * intersections, temporal coordinate pulses, and time dilation in the vertex shader.
 */
const TESSERACT_PARTICLE_VERT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uTimeDilation;
uniform float uGridSpacing;
uniform float uOpenness;
uniform float uPinchFactor;
uniform float uPixelRatio;

attribute vec3 aVelocity;
attribute vec3 aColor;
attribute float aSize;
attribute float aPhase;
attribute vec2 aCoord5D; // (w, v) 4th and 5th dimensional coordinates

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 p0 = position;
  float t = uTime * uTimeDilation;
  float L = uGridSpacing * (0.85 + uOpenness * 0.3);

  // 1. 5D Coordinate Projection & Brownian Suspension
  // p_5D = (x, y, z, w, v)
  float w = aCoord5D.x + sin(t * 0.4 + aPhase) * 1.5;
  float v = aCoord5D.y + cos(t * 0.35 + aPhase * 1.5) * 1.5;

  // Hyper-rotation projection into 3D spatial coordinates
  vec3 p = p0;
  p.x += sin(w * 0.2 + t * 0.2) * 2.5;
  p.y += cos(v * 0.2 + t * 0.25) * 2.5;
  p.z += sin((w + v) * 0.15 + t * 0.3) * 2.0;

  // 2. Gravitational Nodal Lensing (Attraction towards lattice beam intersections)
  vec3 cellPos = fract(p / L) - 0.5;
  vec3 snapForce = -cellPos * smoothstep(0.4, 0.05, length(cellPos)) * 1.8;
  p += snapForce;

  // 3. Longitudinal Temporal Coordinate Pulse
  float pulse = sin(p.x * 0.3 - t * 2.5 + aCoord5D.x) * 0.333
              + sin(p.y * 0.3 + t * 2.0 + aCoord5D.y) * 0.333
              + sin(p.z * 0.3 - t * 3.0 + aPhase) * 0.333 + 0.5;

  // Color blending across 5D dimensions
  vec3 colGold = vec3(1.0, 0.72, 0.25);
  vec3 colCyan = vec3(0.0, 0.94, 1.0);
  vec3 colViolet = vec3(0.75, 0.25, 1.0);

  vec3 particleColor = mix(colGold, colCyan, clamp(pulse + sin(w) * 0.3, 0.0, 1.0));
  particleColor = mix(particleColor, colViolet, clamp(sin(v + t * 0.5) * 0.5 + 0.5, 0.0, 1.0));

  // Energy boost on gesture pinch
  float energy = 1.0 + (1.0 - uPinchFactor) * 2.0;
  particleColor *= energy;

  vColor = particleColor;
  vAlpha = 0.75 * (0.6 + 0.4 * pulse);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float pointSize = aSize * (140.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(pointSize, 1.0, 36.0);
}
`;

const TESSERACT_PARTICLE_FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) {
    discard;
  }

  float core = exp(-dist * dist * 14.0);
  float rim = 1.0 - smoothstep(0.3, 0.5, dist);

  vec3 rgb = vColor * (core * 1.8 + rim * 0.3);
  gl_FragColor = vec4(rgb, vAlpha * rim);
}
`;

export interface TesseractSceneOptions {
  particleCount?: number;
  gridSpacing?: number;
  latticeExtent?: number;
}

/**
 * TesseractScene: Christopher Nolan-inspired 5D infinite bookshelf hyper-structure.
 * Features:
 * - 5D Hyper-cube infinite bookshelf lattice with periodic domain repeating
 * - Neon quantum timeline filaments in Interstellar Gold, Quantum Cyan & Deep Violet
 * - Longitudinal temporal coordinate pulses propagating through infinite corridors
 * - >= 300,000 GPU Quantum Motes suspended in 5D gravitational equilibrium
 * - Time dilation & timeline acceleration driven by two-finger pinch and hand gestures
 */
export class TesseractScene extends BaseScene {
  public readonly name: string = 'tesseract';

  public readonly gridSpacing: number;
  public readonly latticeExtent: number;

  private latticeMesh!: THREE.Mesh;
  private latticeMaterial!: THREE.ShaderMaterial;
  private particleMaterial!: THREE.ShaderMaterial;
  private particlePoints!: THREE.Points;

  // Instanced Bookshelf Slat Grid
  private bookshelfInstances!: THREE.InstancedMesh;

  private simulationTime: number = 0;

  constructor(options?: TesseractSceneOptions) {
    super();
    this._particleCount = options?.particleCount ?? 300000;
    this.gridSpacing = options?.gridSpacing ?? 12.0;
    this.latticeExtent = options?.latticeExtent ?? 180.0;

    // Camera Rig framing
    this.cameraRig = {
      defaultPosition: new THREE.Vector3(0, 0, 75),
      targetLookAt: new THREE.Vector3(0, 0, 0),
      fov: 65,
      minDistance: 5,
      maxDistance: 600,
    };
  }

  protected setupScene(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    this.scene.fog = new THREE.FogExp2(0x04030a, 0.003);

    // 1. Build 5D Infinite Lattice Hyper-Structure & Neon Filaments
    this.buildLatticeHyperStructure();

    // 2. Build Instanced Bookshelf Grid Partitions
    this.buildBookshelfPartitions();

    // 3. Build >= 300,000 GPU Quantum Motes & Dust System
    this.buildGpuParticles();
  }

  /**
   * Build 5D Infinite Lattice Mesh and Neon Filament Shader
   */
  private buildLatticeHyperStructure(): void {
    this.latticeMaterial = this.registerDisposable(createLatticeMaterial());
    this.latticeMaterial.uniforms.uGridSpacing.value = this.gridSpacing;
    this.latticeMaterial.uniforms.uBeamRadius.value = 0.12;
    this.latticeMaterial.uniforms.uFogDensity.value = 0.003;

    // Enclosing volumetric bounding box for raymarched lattice SDF shader
    const latticeGeo = this.registerDisposable(
      new THREE.BoxGeometry(this.latticeExtent * 2, this.latticeExtent * 2, this.latticeExtent * 2)
    );
    this.latticeMesh = new THREE.Mesh(latticeGeo, this.latticeMaterial);
    this.scene.add(this.latticeMesh);
  }

  /**
   * Build Instanced Bookshelf Timeline Partitions (Murph's bedroom books / filaments)
   */
  private buildBookshelfPartitions(): void {
    const slatGeo = this.registerDisposable(new THREE.BoxGeometry(0.18, 2.4, 0.8));
    const slatMat = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: 0xd4af37, // Interstellar Gold
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    const step = this.gridSpacing;
    const halfExt = this.latticeExtent * 0.4;
    const countPerAxis = Math.floor((halfExt * 2) / step);
    const totalInstances = countPerAxis * countPerAxis * countPerAxis;
    const clampedInstances = Math.min(totalInstances, 1000);

    this.bookshelfInstances = new THREE.InstancedMesh(slatGeo, slatMat, clampedInstances);

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let x = -halfExt; x <= halfExt && idx < clampedInstances; x += step) {
      for (let y = -halfExt; y <= halfExt && idx < clampedInstances; y += step) {
        for (let z = -halfExt; z <= halfExt && idx < clampedInstances; z += step) {
          dummy.position.set(x, y, z);
          // Alternating orientations along orthogonal axes
          dummy.rotation.set((idx % 3 === 0 ? Math.PI / 2 : 0), (idx % 2 === 0 ? Math.PI / 2 : 0), 0);
          dummy.scale.set(1.0, 1.0 + Math.sin(idx) * 0.3, 1.0);
          dummy.updateMatrix();
          this.bookshelfInstances.setMatrixAt(idx, dummy.matrix);
          idx++;
        }
      }
    }

    this.bookshelfInstances.instanceMatrix.needsUpdate = true;
    this.scene.add(this.bookshelfInstances);
  }

  /**
   * Build >= 300,000 GPU Quantum Motes
   */
  private buildGpuParticles(): void {
    const count = this._particleCount;
    const geometry = this.registerDisposable(new THREE.BufferGeometry());

    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const coords5D = new Float32Array(count * 2);

    const halfExt = this.latticeExtent * 0.85;

    for (let i = 0; i < count; i++) {
      const posX = (Math.random() - 0.5) * halfExt * 2;
      const posY = (Math.random() - 0.5) * halfExt * 2;
      const posZ = (Math.random() - 0.5) * halfExt * 2;

      const idx = i * 3;
      positions[idx] = posX;
      positions[idx + 1] = posY;
      positions[idx + 2] = posZ;

      velocities[idx] = (Math.random() - 0.5) * 0.5;
      velocities[idx + 1] = (Math.random() - 0.5) * 0.5;
      velocities[idx + 2] = (Math.random() - 0.5) * 0.5;

      colors[idx] = 1.0;
      colors[idx + 1] = 0.75;
      colors[idx + 2] = 0.3;

      sizes[i] = 1.0 + Math.random() * 2.2;
      phases[i] = Math.random() * Math.PI * 2;

      // 4D (w) and 5D (v) temporal coordinates
      coords5D[i * 2] = (Math.random() - 0.5) * 20.0;
      coords5D[i * 2 + 1] = (Math.random() - 0.5) * 20.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aCoord5D', new THREE.BufferAttribute(coords5D, 2));

    this.particleMaterial = this.registerDisposable(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0.0 },
          uTimeDilation: { value: 1.0 },
          uGridSpacing: { value: this.gridSpacing },
          uOpenness: { value: 0.0 },
          uPinchFactor: { value: 1.0 },
          uPixelRatio: { value: typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.5) : 1.0 },
        },
        vertexShader: TESSERACT_PARTICLE_VERT,
        fragmentShader: TESSERACT_PARTICLE_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.particlePoints = new THREE.Points(geometry, this.particleMaterial);
    this.scene.add(this.particlePoints);
  }

  /**
   * Update Tesseract 5D lattice physics, longitudinal temporal pulses, and quantum motes
   */
  public update(delta: number, timeDilation: number, gestureState: GestureState): void {
    const effectiveDelta = delta * timeDilation;
    this.simulationTime += effectiveDelta;

    const openness = gestureState.hasHand ? gestureState.openness : 0.0;
    const pinchFactor = gestureState.hasHand ? gestureState.pinchDistance : 1.0;

    // 1. Update 5D Lattice Material Uniforms
    if (this.latticeMaterial) {
      this.latticeMaterial.uniforms.uTime.value = this.simulationTime;
      this.latticeMaterial.uniforms.uTimeDilation.value = timeDilation;
      this.latticeMaterial.uniforms.uPinchFactor.value = pinchFactor;
      this.latticeMaterial.uniforms.uGridSpacing.value = this.gridSpacing * (0.85 + openness * 0.3);
    }

    // 2. Update GPU Particle System Uniforms
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uTime.value = this.simulationTime;
      this.particleMaterial.uniforms.uTimeDilation.value = timeDilation;
      this.particleMaterial.uniforms.uOpenness.value = openness;
      this.particleMaterial.uniforms.uPinchFactor.value = pinchFactor;
    }

    // 3. Gentle slow hyper-rotation of the lattice structure
    if (this.latticeMesh) {
      this.latticeMesh.rotation.y += effectiveDelta * 0.03;
      this.latticeMesh.rotation.x += effectiveDelta * 0.02;
    }
  }

  public override resize(width: number, height: number, pixelRatio: number): void {
    super.resize(width, height, pixelRatio);
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uPixelRatio.value = Math.min(pixelRatio, 1.5);
    }
  }
}
