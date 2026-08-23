// src/shaders/accretion.frag.ts
import * as THREE from 'three';
import { ACCRETION_VERTEX_SHADER } from './accretion.vert';

export interface AccretionUniforms {
  uTime: { value: number };
  uTimeDilation: { value: number };
  uSchwarzschildRadius: { value: number };
  uInnerRadius: { value: number };
  uOuterRadius: { value: number };
  uDiskThickness: { value: number };
  uBaseColorHot: { value: THREE.Color };
  uBaseColorMid: { value: THREE.Color };
  uBaseColorCool: { value: THREE.Color };
  uDopplerStrength: { value: number };
  uBeamingExponent: { value: number };
  uTurbulenceDensity: { value: number };
  uOpacity: { value: number };
}

export const ACCRETION_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform vec3 cameraPosition;
uniform float uTime;
uniform float uTimeDilation;
uniform float uSchwarzschildRadius;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform vec3 uBaseColorHot;   // Blazing White-Cyan (Inner ISCO)
uniform vec3 uBaseColorMid;   // Nolan Amber-Gold (Mid)
uniform vec3 uBaseColorCool;  // Deep Blood Orange / Crimson (Outer)
uniform float uDopplerStrength;
uniform float uBeamingExponent; // Default = 4.0 (g^4)
uniform float uTurbulenceDensity;
uniform float uOpacity;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vRadius;
varying vec3 vVelocity;
varying float vOrbitalSpeed;

// Procedural high-frequency plasma turbulence noise
float hash(vec2 p) {
  p = 50.0 * fract(p * 0.3183099 + vec2(0.71, 0.113));
  return -1.0 + 2.0 * fract(16.0 * sin(p.x * p.y * (p.x + p.y)));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float f = 0.0;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  f += 0.5000 * noise(p); p = m * p;
  f += 0.2500 * noise(p); p = m * p;
  f += 0.1250 * noise(p); p = m * p;
  f += 0.0625 * noise(p); p = m * p;
  return 0.5 + 0.5 * f;
}

void main() {
  float r = vRadius;
  if (r < uInnerRadius || r > uOuterRadius) {
    discard;
  }

  // 1. Shakura-Sunyaev Radial Temperature Factor (0.0 to 1.0)
  float normR = clamp((r - uInnerRadius) / max(0.001, uOuterRadius - uInnerRadius), 0.0, 1.0);
  float tempFactor = pow(1.0 - normR, 0.75) * pow(max(0.001, normR), 0.25) * 1.75;
  tempFactor = clamp(tempFactor, 0.0, 1.0);

  // 2. Relativistic Kinematics: Line-of-Sight & Velocity Vectors
  vec3 los = normalize(cameraPosition - vWorldPosition); // Line of sight to camera
  
  // Normalized velocity beta = v / c (in simulation units c = 3.2)
  float speedOfLight = 3.2;
  vec3 beta = (vVelocity / speedOfLight) * uDopplerStrength;
  float betaMag = clamp(length(beta), 0.0, 0.95);
  float betaDotLos = dot(normalize(beta + 0.0001), los) * betaMag;

  // Lorentz Factor: gamma = 1 / sqrt(1 - beta^2)
  float gamma = 1.0 / sqrt(max(0.01, 1.0 - betaMag * betaMag));

  // Gravitational Redshift: kappa = sqrt(1 - Rs / r)
  float kappaGrav = sqrt(max(0.01, 1.0 - uSchwarzschildRadius / max(r, uSchwarzschildRadius + 0.01)));

  // Doppler Shift Factor: g = kappa_grav / (gamma * (1 - beta . los))
  float dopplerG = kappaGrav / (gamma * max(0.05, 1.0 - betaDotLos));

  // 3. Bolometric Relativistic Beaming: I_obs = g^4 * I_em
  float beaming = pow(max(0.01, dopplerG), uBeamingExponent);
  beaming = clamp(beaming, 0.08, 12.0); // Soft clamp for HDR stability

  // 4. Spectral Color Temperature Shift
  // Blueshifted (g > 1) shifts towards white/cyan, redshifted (g < 1) shifts towards dark crimson
  vec3 baseColor;
  if (normR < 0.28) {
    baseColor = mix(uBaseColorHot, uBaseColorMid, normR / 0.28);
  } else {
    baseColor = mix(uBaseColorMid, uBaseColorCool, (normR - 0.28) / 0.72);
  }

  // Dynamic Doppler color modulation
  if (dopplerG > 1.0) {
    // Blueshift: add blazing cyan/white
    float blueShift = clamp((dopplerG - 1.0) * 0.8, 0.0, 1.0);
    baseColor = mix(baseColor, vec3(0.7, 0.9, 1.0) * 1.5, blueShift);
  } else {
    // Redshift: deepen into blood red
    float redShift = clamp((1.0 - dopplerG) * 1.2, 0.0, 1.0);
    baseColor = mix(baseColor, vec3(0.6, 0.05, 0.01), redShift);
  }

  // 5. Magneto-Hydrodynamic (MHD) Spiral Plasma Filaments
  float spiralAngle = atan(vWorldPosition.z, vWorldPosition.x) * 4.0 - (r * 0.45) + uTime * 0.4 * uTimeDilation;
  vec2 noiseUv = vec2(r * 0.35, spiralAngle * 0.15);
  float plasmaFbm = fbm(noiseUv * uTurbulenceDensity);
  float plasmaFilaments = smoothstep(0.3, 0.85, plasmaFbm);

  // 6. Alpha Edge Falloffs (Smooth ISCO inner edge and outer diffuse edge)
  float innerAlpha = smoothstep(uInnerRadius, uInnerRadius + 0.35, r);
  float outerAlpha = smoothstep(uOuterRadius, uOuterRadius - 1.2, r);
  float diskAlpha = innerAlpha * outerAlpha * uOpacity;

  // 7. Final HDR Radiance
  vec3 finalRgb = baseColor * (0.6 + 0.8 * plasmaFilaments) * beaming * (0.5 + 1.2 * tempFactor);
  gl_FragColor = vec4(finalRgb, diskAlpha * (0.6 + 0.4 * plasmaFilaments));
}
`;

export function createAccretionMaterial(options?: {
  innerRadius?: number;
  outerRadius?: number;
  diskThickness?: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uTimeDilation: { value: 1.0 },
      uSchwarzschildRadius: { value: 1.0 },
      uInnerRadius: { value: options?.innerRadius ?? 3.0 },
      uOuterRadius: { value: options?.outerRadius ?? 14.0 },
      uDiskThickness: { value: options?.diskThickness ?? 0.35 },
      uBaseColorHot: { value: new THREE.Color(1.0, 0.96, 0.85) }, // Pure White-Gold
      uBaseColorMid: { value: new THREE.Color(1.0, 0.62, 0.12) }, // Nolan Solar Amber
      uBaseColorCool: { value: new THREE.Color(0.85, 0.18, 0.02) }, // Deep Blood Orange
      uDopplerStrength: { value: 1.0 },
      uBeamingExponent: { value: 4.0 }, // g^4 bolometric beaming
      uTurbulenceDensity: { value: 3.5 },
      uOpacity: { value: 0.95 }
    },
    vertexShader: ACCRETION_VERTEX_SHADER,
    fragmentShader: ACCRETION_FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}
