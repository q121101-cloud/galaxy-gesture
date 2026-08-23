// src/shaders/portal.vert.ts
export const PORTAL_VERTEX_SHADER = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uTimeDilation;
uniform float uPinchFactor;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;

  // Gentle quantum throat breathing & pinch pulsation
  float pulse = sin(uTime * 2.5 * uTimeDilation + pos.y * 3.0) * 0.025 * (1.0 + (1.0 - uPinchFactor) * 2.0);
  pos += normal * pulse;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  
  vec4 mvPosition = viewMatrix * worldPos;
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}
`;
