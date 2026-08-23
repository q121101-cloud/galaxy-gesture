// src/shaders/portal.frag.ts
import * as THREE from 'three';
import { PORTAL_VERTEX_SHADER } from './portal.vert';

export interface PortalUniforms {
  tSkyboxUniverse1: { value: THREE.CubeTexture | THREE.Texture | null };
  tSkyboxUniverse2: { value: THREE.CubeTexture | THREE.Texture | null };
  uTime: { value: number };
  uTimeDilation: { value: number };
  uThroatRadius: { value: number };
  uRefractionIndex: { value: number };
  uDispersion: { value: number };
  uShimmerIntensity: { value: number };
  uRingColor: { value: THREE.Color };
  uPinchFactor: { value: number };
  uTravelProgress: { value: number };
}

export const PORTAL_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform samplerCube tSkyboxUniverse1; // Saturn / Milky Way
uniform samplerCube tSkyboxUniverse2; // Gargantua Cosmos
uniform float uTime;
uniform float uTimeDilation;
uniform float uThroatRadius;
uniform float uRefractionIndex;
uniform float uDispersion;
uniform float uShimmerIntensity;
uniform vec3 uRingColor;
uniform float uPinchFactor;
uniform float uTravelProgress;
uniform vec3 cameraPosition;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float NdotV = max(dot(N, V), 0.0);

  // 1. Chromatic Dispersion Vector Refractions
  float etaG = uRefractionIndex;
  float etaR = etaG - uDispersion;
  float etaB = etaG + uDispersion;

  vec3 refrR = refract(-V, N, 1.0 / max(0.01, etaR));
  vec3 refrG = refract(-V, N, 1.0 / max(0.01, etaG));
  vec3 refrB = refract(-V, N, 1.0 / max(0.01, etaB));

  // Dual starfield cubemap sampling for transmitted rays (Universe 2)
  vec3 col2R = textureCube(tSkyboxUniverse2, refrR).rgb;
  vec3 col2G = textureCube(tSkyboxUniverse2, refrG).rgb;
  vec3 col2B = textureCube(tSkyboxUniverse2, refrB).rgb;
  vec3 transmittedColor = vec3(col2R.r, col2G.g, col2B.b);

  // Reflected rays (Universe 1)
  vec3 reflDir = reflect(-V, N);
  vec3 reflectedColor = textureCube(tSkyboxUniverse1, reflDir).rgb;

  // 2. Fresnel & Throat Curvature Blend
  float fresnel = pow(1.0 - NdotV, 3.5);
  
  // Transition ratio governed by travel progress and throat aperture
  float universeBlend = smoothstep(0.15, 0.95, 1.0 - fresnel + uTravelProgress);
  vec3 compositeCosmos = mix(reflectedColor, transmittedColor, universeBlend);

  // 3. Einstein Boundary Shimmer Ring
  float rim = pow(1.0 - NdotV, 4.0);
  float wave = sin(uTime * 5.0 * uTimeDilation + vWorldPosition.y * 12.0 + vWorldPosition.x * 10.0);
  float shimmer = rim * (1.2 + 0.6 * wave) * uShimmerIntensity;
  vec3 shimmerColor = uRingColor * shimmer;

  // 4. Quantum Gravitational Micro-Lensing Ring
  float ringDist = abs(NdotV - 0.28);
  float ringGlow = exp(-ringDist * 40.0) * 1.5;
  vec3 ringEmission = vec3(0.4, 0.8, 1.0) * ringGlow * (1.0 + (1.0 - uPinchFactor) * 1.5);

  vec3 finalColor = compositeCosmos + shimmerColor + ringEmission;
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export function createPortalMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tSkyboxUniverse1: { value: null },
      tSkyboxUniverse2: { value: null },
      uTime: { value: 0.0 },
      uTimeDilation: { value: 1.0 },
      uThroatRadius: { value: 1.5 },
      uRefractionIndex: { value: 1.24 },
      uDispersion: { value: 0.035 },
      uShimmerIntensity: { value: 1.8 },
      uRingColor: { value: new THREE.Color(0.2, 0.85, 1.0) }, // Electric Cyan
      uPinchFactor: { value: 1.0 },
      uTravelProgress: { value: 0.0 }
    },
    vertexShader: PORTAL_VERTEX_SHADER,
    fragmentShader: PORTAL_FRAGMENT_SHADER,
    transparent: false,
    side: THREE.FrontSide
  });
}
