// src/shaders/lattice.vert.ts
export const LATTICE_VERTEX_SHADER = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uTimeDilation;
uniform float uPinchFactor;
uniform mat4 uHyperRotation;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vTimeCoordinate;

void main() {
  vUv = uv;
  vec3 pos = position;

  // Pulsing 5D dimensional coordinate oscillation
  float wCoord = sin(pos.x * 0.15 + uTime * 0.8 * uTimeDilation) * 2.0;
  float vCoord = cos(pos.z * 0.15 - uTime * 0.6 * uTimeDilation) * 2.0;
  vTimeCoordinate = wCoord + vCoord;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;
