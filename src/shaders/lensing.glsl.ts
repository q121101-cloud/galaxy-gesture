import * as THREE from 'three';

export interface LensingUniforms {
  tDiffuse: { value: THREE.Texture | null };
  tStarfield: { value: THREE.CubeTexture | THREE.Texture | null };
  uBlackHoleScreenPos: { value: THREE.Vector2 };
  uBlackHoleWorldPos: { value: THREE.Vector3 };
  uSchwarzschildRadius: { value: number };
  uPhotonSphereRadius: { value: number };
  uAspectRatio: { value: number };
  uDistortionStrength: { value: number };
  uEinsteinRingSize: { value: number };
  uGlowColor: { value: THREE.Color };
  uTime: { value: number };
  uTimeDilation: { value: number };
  uCameraMatrixWorld: { value: THREE.Matrix4 };
  uProjectionInverse: { value: THREE.Matrix4 };
}

export const LENSING_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const LENSING_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uBlackHoleScreenPos;
uniform float uSchwarzschildRadius;
uniform float uPhotonSphereRadius;
uniform float uAspectRatio;
uniform float uDistortionStrength;
uniform float uEinsteinRingSize;
uniform vec3 uGlowColor;
uniform float uTime;
uniform float uTimeDilation;

varying vec2 vUv;

// Relativistic deflection approximation
void main() {
  vec2 aspectVec = vec2(uAspectRatio, 1.0);
  vec2 delta = (vUv - uBlackHoleScreenPos) * aspectVec;
  float dist = length(delta);

  // Scaled radii in screen space
  float rs = uSchwarzschildRadius * uEinsteinRingSize;
  float rph = uPhotonSphereRadius * uEinsteinRingSize;
  float bcrit = 2.598076 * rs; // 3 * sqrt(3) / 2 * Rs

  // 1. Inside Event Horizon -> Absolute Black Void
  if (dist < rs) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // 2. Gravitational Deflection Vector
  vec2 dir = normalize(delta);
  
  // Relativistic deflection angle: diverges near bcrit, falls off as 2*Rs/dist far away
  float excess = max(dist - rs, 0.0001);
  float deflectionFactor = (uDistortionStrength * rs) / excess;
  
  // Logarithmic photon winding near photon sphere
  if (dist > rs && dist < bcrit * 1.6) {
    float photonWinding = -log(clamp((dist - rs) / (bcrit * 0.6), 0.001, 1.0)) * 0.12;
    deflectionFactor += photonWinding * uDistortionStrength;
  }

  // Deflect UV sampling coordinate towards center
  vec2 distortedUv = vUv - (dir / aspectVec) * deflectionFactor * 0.15;
  distortedUv = clamp(distortedUv, vec2(0.001), vec2(0.999));

  vec4 sceneColor = texture2D(tDiffuse, distortedUv);

  // 3. Photon Ring & Einstein Ring Glowing Shimmer
  float photonDist = abs(dist - rph);
  float photonGlow = exp(-photonDist * 90.0 / uEinsteinRingSize) * 2.2;
  
  // Secondary subtle outer ring
  float outerRing = exp(-abs(dist - bcrit) * 45.0 / uEinsteinRingSize) * 0.8;

  // Quantum boundary Hawking / accretion shimmer (slowed down by 45% for cinematic glow)
  float shimmer = sin(uTime * 2.2 * uTimeDilation + atan(delta.y, delta.x) * 8.0) * 0.15 + 0.85;
  vec3 totalGlow = uGlowColor * (photonGlow + outerRing) * shimmer;

  // 4. Soft inner horizon edge feathering (anti-aliased event horizon)
  float horizonAlpha = smoothstep(rs, rs + 0.003, dist);

  vec3 finalColor = (sceneColor.rgb + totalGlow) * horizonAlpha;
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export function createLensingMaterial(options?: {
  aspectRatio?: number;
  distortionStrength?: number;
  einsteinRingSize?: number;
}): THREE.ShaderMaterial {
  const aspect = options?.aspectRatio ?? (typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 16 / 9);
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      tStarfield: { value: null },
      uBlackHoleScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
      uBlackHoleWorldPos: { value: new THREE.Vector3(0, 0, 0) },
      uSchwarzschildRadius: { value: 0.08 },
      uPhotonSphereRadius: { value: 0.12 },
      uAspectRatio: { value: aspect },
      uDistortionStrength: { value: options?.distortionStrength ?? 1.0 },
      uEinsteinRingSize: { value: options?.einsteinRingSize ?? 1.0 },
      uGlowColor: { value: new THREE.Color(1.0, 0.72, 0.28) }, // Nolan Amber-Gold
      uTime: { value: 0.0 },
      uTimeDilation: { value: 1.0 },
      uCameraMatrixWorld: { value: new THREE.Matrix4() },
      uProjectionInverse: { value: new THREE.Matrix4() }
    },
    vertexShader: LENSING_VERTEX_SHADER,
    fragmentShader: LENSING_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
    transparent: true
  });
}
