// src/shaders/lattice.frag.ts
import * as THREE from 'three';
import { LATTICE_VERTEX_SHADER } from './lattice.vert';

export interface LatticeUniforms {
  uTime: { value: number };
  uTimeDilation: { value: number };
  uGridSpacing: { value: number };
  uBeamRadius: { value: number };
  uFilamentGlowColorA: { value: THREE.Color };
  uFilamentGlowColorB: { value: THREE.Color };
  uFilamentGlowColorC: { value: THREE.Color };
  uPinchFactor: { value: number };
  uFogDensity: { value: number };
}

export const LATTICE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform vec3 cameraPosition;
uniform float uTime;
uniform float uTimeDilation;
uniform float uGridSpacing;
uniform float uBeamRadius;
uniform vec3 uFilamentGlowColorA; // Interstellar Gold
uniform vec3 uFilamentGlowColorB; // Quantum Cyan
uniform vec3 uFilamentGlowColorC; // Deep Violet
uniform float uPinchFactor;
uniform float uFogDensity;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vTimeCoordinate;

void main() {
  vec3 p = vWorldPosition;
  float L = max(0.1, uGridSpacing);

  // 1. Periodic Cell Coordinates
  vec3 cell = floor(p / L);
  vec3 u = fract(p / L) - 0.5;

  // Distance to the 3 orthogonal beam axes
  float dX = length(u.yz) * L;
  float dY = length(u.xz) * L;
  float dZ = length(u.xy) * L;
  float minD = min(dX, min(dY, dZ)) - uBeamRadius;

  // 2. Exponential Neon Glow Profile
  float glow = 1.0 / (1.0 + 35.0 * max(0.0, minD) * max(0.0, minD));
  float core = smoothstep(0.04, 0.0, minD) * 2.0;

  // 3. Longitudinal Temporal Pulses
  float pulseX = sin(p.x * 0.4 - uTime * 3.0 * uTimeDilation + cell.y);
  float pulseY = sin(p.y * 0.4 + uTime * 2.5 * uTimeDilation + cell.z);
  float pulseZ = sin(p.z * 0.4 - uTime * 3.5 * uTimeDilation + cell.x);
  float pulseWave = (pulseX + pulseY + pulseZ) * 0.333 + 0.5;

  // 4. Color Palette Modulation across 5D coordinates
  vec3 color = mix(uFilamentGlowColorA, uFilamentGlowColorB, clamp(pulseWave + vTimeCoordinate * 0.2, 0.0, 1.0));
  color = mix(color, uFilamentGlowColorC, clamp(sin(vWorldPosition.y * 0.08 + uTime) * 0.5 + 0.5, 0.0, 1.0));

  // Modulate with gesture pinch intensity
  float energyBoost = 1.0 + (1.0 - uPinchFactor) * 2.5;
  vec3 emission = color * (glow * 1.8 + core) * (0.6 + 0.8 * pulseWave) * energyBoost;

  // 5. Volumetric Cosmic Fog Falloff
  float distToCam = length(cameraPosition - vWorldPosition);
  float fog = exp(-distToCam * uFogDensity);

  vec3 finalRgb = emission * fog;
  gl_FragColor = vec4(finalRgb, clamp((glow + core) * fog, 0.0, 1.0));
}
`;

export function createLatticeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uTimeDilation: { value: 1.0 },
      uGridSpacing: { value: 8.0 },
      uBeamRadius: { value: 0.08 },
      uFilamentGlowColorA: { value: new THREE.Color(1.0, 0.72, 0.25) }, // Interstellar Gold
      uFilamentGlowColorB: { value: new THREE.Color(0.0, 0.94, 1.0) },  // Quantum Cyan
      uFilamentGlowColorC: { value: new THREE.Color(0.75, 0.25, 1.0) }, // Deep Violet
      uPinchFactor: { value: 1.0 },
      uFogDensity: { value: 0.0035 }
    },
    vertexShader: LATTICE_VERTEX_SHADER,
    fragmentShader: LATTICE_FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}
