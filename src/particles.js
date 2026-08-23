import * as THREE from 'three';

// Ultra-gentle slow GPU Harmonic Wave Turbulence
const TURBULENCE_GLSL = `
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

const VERTEX_SHADER = `
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
attribute float aType; // 0: Core (30%), 1: Accretion Ring (70%)
attribute float aOrbitSpeed;
attribute float aOrbitRadius;
attribute float aOrbitAngle;
attribute float aPhase;
attribute vec3 aWarpVelocity;

varying vec3 vColor;
varying float vAlpha;

vec3 rotateAxis(vec3 v, vec3 axis, float angle) {
  return v * cos(angle) + cross(axis, v) * sin(angle) + axis * dot(axis, v) * (1.0 - cos(angle));
}

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

  // 1. Target Geometry A: Fist (Singularity Core + Accretion Disc)
  vec3 fistPos = aTargetFist;
  
  if (aType > 0.5) {
    // 70% Accretion Disc: Ultra-slow, serene, meditative orbital flow
    vec3 discNormal = normalize(vec3(0.0, 0.848, 0.530));
    float orbitAngle = uTime * aOrbitSpeed * (1.0 - uOpenness * 0.35);
    fistPos = rotateAxis(aTargetFist, discNormal, orbitAngle);
    
    // Very soft ripples
    float ripple = sin(aOrbitRadius * 0.08 - uTime * 0.2) * 0.5;
    fistPos += discNormal * ripple;
  } else {
    // 30% Singularity Core: Ultra-gentle breathing
    float pulse = sin(uTime * 0.65 + aPhase) * 0.6;
    vec3 radialDir = normalize(aTargetFist + vec3(0.0001));
    vec3 coreTurb = getCosmicTurbulence(aTargetFist * 1.0, uTime * 0.1) * 0.8;
    fistPos += radialDir * pulse + coreTurb;
  }

  // 2. Target Geometry B: Open Hand (Peaceful, Radiant Supernova Disc Expansion)
  vec3 openPos = aTargetOpen;
  
  float warpTravel = mod(uTime * 20.0 * (1.0 + length(aWarpVelocity) * 0.15), 350.0) - 120.0;
  openPos.z += warpTravel * 0.08;
  
  vec3 warpBurstDir = normalize(openPos);
  vec3 warpTurb = getCosmicTurbulence(openPos * 0.2, uTime * 0.15) * 3.5;
  openPos += warpBurstDir * warpTurb.x + warpTurb * 0.25;

  // 3. Quintic Ultra-Smooth Morphing (Zero jerk, analog linear feel)
  float morphFactor = smootherstep(0.0, 1.0, uOpenness);
  vec3 currentPos = mix(fistPos, openPos, morphFactor);

  // 4. Soft Ambient Cosmic Waves
  vec3 waveTurb = getCosmicTurbulence(currentPos * 0.18, uTime * 0.1);
  float turbAmp = mix(1.0, 3.5, morphFactor);
  currentPos += waveTurb * turbAmp;

  // Subtle Hand Position Tilt Influence
  currentPos.x += uHandPos.x * 8.0 * (1.0 + morphFactor * 0.15);
  currentPos.y += uHandPos.y * 8.0 * (1.0 + morphFactor * 0.15);

  // 5. Transform to Camera View
  vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // 6. Point Size Attenuation & Crisp HD Shimmer
  float depth = -mvPosition.z;
  float sizeBoost = mix(1.0, 1.22, morphFactor);
  if (aType < 0.5) {
    sizeBoost *= (1.0 + 0.1 * sin(uTime * 1.2 + aPhase));
  }
  
  gl_PointSize = aSize * sizeBoost * (360.0 / max(depth, 1.0)) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 1.0, 36.0);

  // Depth Fade
  vAlpha = clamp(1.0 - (depth - 140.0) / 900.0, 0.40, 1.0);
}
`;

const FRAGMENT_SHADER = `
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
  float innerGlow = exp(-dist * 13.5) * 1.6;
  float outerGlow = smoothstep(0.5, 0.05, dist);
  
  vec3 finalColor = vColor * outerGlow + vec3(innerGlow);
  float finalAlpha = outerGlow * vAlpha * 0.95;
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

export class ParticleSystem {
  constructor(scene, particleCount = 500000) {
    this.scene = scene;
    this.particleCount = particleCount; // 500,000 particles!
    this.currentTheme = 'emerald';
    this.currentRotationX = 0;
    this.currentRotationY = 0;
    this.currentRotationZ = 0;
    this.spinVelocity = 0;

    this.init();
  }

  init() {
    const count = this.particleCount;
    const geometry = new THREE.BufferGeometry();

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

    // 30% Core (150,000), 70% Accretion Disc (350,000)
    const coreCount = Math.floor(count * 0.30);

    const discEuler = new THREE.Euler(THREE.MathUtils.degToRad(32), 0, THREE.MathUtils.degToRad(15), 'XYZ');
    const discMatrix = new THREE.Matrix4().makeRotationFromEuler(discEuler);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const isCore = i < coreCount;

      types[i] = isCore ? 0.0 : 1.0;
      phases[i] = Math.random() * Math.PI * 2;

      // ==========================================
      // TARGET A: FIST (30% CORE R:5-25, 70% ACCRETION DISC R:50-175)
      // ==========================================
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
        sizes[i] = 1.5 + Math.random() * 1.8;

      } else {
        // 70% Accretion Disc: Ultra-gentle, slow celestial glide
        const rMin = 50.0;
        const rMax = 175.0;
        const u = Math.random();
        const r = Math.sqrt(rMin * rMin + u * (rMax * rMax - rMin * rMin));

        const armOffset = (i % 2 === 0 ? 0 : Math.PI);
        const spiralAngle = Math.log(r / rMin) * 2.2 + armOffset + (Math.random() - 0.5) * 0.45;
        const theta = spiralAngle;

        // Ultra-gentle, peaceful orbital speed (1.1)
        const speed = (1.1 / Math.sqrt(r)) * (0.9 + Math.random() * 0.2);
        orbitSpeeds[i] = speed * (Math.random() < 0.05 ? -0.8 : 1.0);
        orbitRadii[i] = r;
        orbitAngles[i] = theta;

        const heightSpread = (1.0 - (r - rMin) / (rMax - rMin) * 0.5) * 3.2;
        const yLocal = (Math.random() - 0.5 + Math.random() - 0.5) * heightSpread;

        const localPos = new THREE.Vector3(r * Math.cos(theta), yLocal, r * Math.sin(theta));
        localPos.applyMatrix4(discMatrix);

        targetFist[i3] = localPos.x;
        targetFist[i3 + 1] = localPos.y;
        targetFist[i3 + 2] = localPos.z;

        sizes[i] = 1.1 + Math.random() * 1.5;
      }

      // ==========================================
      // TARGET B: OPEN PALM (BLOOMING GALAXY EXPANSION)
      // ==========================================
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

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uOpenness: { value: 0.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.25) },
        uHandPos: { value: new THREE.Vector2(0, 0) },
        uIsRainbow: { value: 0.0 }
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    this.setTheme('emerald');
  }

  /**
   * Update particle simulation with ultra-slow, peaceful rotation
   * @param {number} time
   * @param {number} delta
   * @param {number} openness
   * @param {{x: number, y: number}} handPos
   * @param {number} handAngle - Hand Roll Angle in Radians (Left < 0, Right > 0)
   * @param {number} handPitch - Hand Pitch Angle (-1.0 Down to +1.0 Up)
   */
  update(time, delta, openness, handPos, handAngle = 0.0, handPitch = 0.0) {
    if (!this.material) return;

    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uOpenness.value = openness;
    this.material.uniforms.uHandPos.value.set(handPos.x, handPos.y);

    // 1. Soft Hand Pitch Tilt (Chúi xuống -> chúi xuống, chúi ra sau -> xoay ngửa lên)
    const targetPitchX = handPitch * 0.4;
    this.currentRotationX += (targetPitchX - this.currentRotationX) * Math.min(1.0, 3.5 * delta);
    this.points.rotation.x = this.currentRotationX;

    // 2. Ultra-gentle Hand Roll Rotation Control
    const isSteering = Math.abs(handAngle) > 0.08;
    if (isSteering) {
      const targetSpinSpeed = handAngle * 0.16; // Ultra-gentle steering speed
      this.spinVelocity += (targetSpinSpeed - this.spinVelocity) * Math.min(1.0, 2.5 * delta);
    } else {
      this.spinVelocity += (0.0 - this.spinVelocity) * Math.min(1.0, 1.8 * delta);
    }

    // Ultra-slow, serene idle rotation
    this.currentRotationY += (this.spinVelocity + 0.0006) * delta;
    this.points.rotation.y = this.currentRotationY;

    // 3. Ultra-gentle banking tilt roll on Z axis
    const targetRollZ = -handAngle * 0.18;
    this.currentRotationZ += (targetRollZ - this.currentRotationZ) * Math.min(1.0, 3.5 * delta);
    this.points.rotation.z = this.currentRotationZ + time * 0.0003;
  }

  setPixelRatio(pixelRatio) {
    if (this.material) {
      this.material.uniforms.uPixelRatio.value = Math.min(pixelRatio, 1.25);
    }
  }

  setTheme(theme) {
    this.currentTheme = theme;

    if (theme === 'rainbow' || theme === 'rgb') {
      if (this.material) {
        this.material.uniforms.uIsRainbow.value = 1.0;
      }
      return;
    }

    if (this.material) {
      this.material.uniforms.uIsRainbow.value = 0.0;
    }

    const count = this.particleCount;
    const colorAttr = this.points.geometry.getAttribute('aColor');
    const colors = colorAttr.array;
    const types = this.points.geometry.getAttribute('aType').array;
    const radii = this.points.geometry.getAttribute('aOrbitRadius').array;

    let cCore = new THREE.Color('#ffffff');
    let cMid, cEdge;

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
}
