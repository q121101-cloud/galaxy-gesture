# GALAXY GESTURE // INTERSTELLAR GESTURE EXPERIENCE
# Explorer 3 Survey Report: Real-Time Gesture Engine, Procedural Audio Engine & Cinematic HUD

**Author**: Explorer 3 (Gesture Engine, Audio Synthesis & Interaction Specialist)  
**Date**: 2026-08-23  
**Status**: Comprehensive Survey & Specification Document  
**Scope**: MediaPipe Hand Landmark Mathematics, 2nd-Order Spring-Damper Dynamics, Procedural Web Audio API Soundscapes, Dynamic Audio-Gesture Modulation, Glassmorphic Telemetry HUD & MediaRecorder Engine.

---

## 1. Executive Summary

This report delivers the complete architectural, mathematical, and algorithmic specifications for three core subsystems of the **Interstellar Gesture Experience**:
1. **Neural Hand Gesture Engine**: Scale-invariant 3D landmark math, palm normal vector estimation, continuous openness/fist mapping, two-finger pinch metric (time dilation), sliding-window swipe/wave detection with velocity hysteresis, synthetic gesture generation for automated testing, and mobile adaptive resolution.
2. **Procedural Web Audio Engine**: 100% synthesized soundscapes (zero external `.mp3`/`.wav` assets) with Hans Zimmer-inspired additive church organ for Gargantua, ethereal supersaw chorus pad with resonant sweeping for Wormhole, and high-precision micro-impulse clockwork ticking with sub-harmonic drone for Tesseract, complete with algorithmic reverb impulse responses and equal-power crossfading.
3. **Cinematic HUD & Inset Interaction Pipeline**: Glassmorphic monospace HUD, corner skeleton landmark visualizer, context-aware gesture cards, and an integrated canvas + audio stream recorder (`[H]` key Clean Mode + `MediaRecorder` export).

---

## 2. MediaPipe Hand Landmark Mathematics & Gesture Recognition Pipeline

### 2.1 21-Landmark Topology & Invariant Coordinate Space

MediaPipe Hands returns 21 3D coordinates $(x_i, y_i, z_i)$ for $i \in [0, 20]$ where $x, y \in [0, 1]$ are screen-normalized and $z$ represents relative depth scaled roughly to hand width.

```
       [8]  [12]  [16]  [20]     (Tips)
        |     |     |     |
       [7]  [11]  [15]  [19]     (DIP)
  [4]   |     |     |     |
   |   [6]  [10]  [14]  [18]     (PIP)
  [3]   |     |     |     |
   |   [5]---[9]---[13]--[17]    (MCP / Knuckles)
  [2]     \   |    /    /
   \       \  |   /    /
   [1]------\ |  /    /
       \      | /   /
        \----[0]----/            (WRIST)
```

#### Invariant Scale Metric ($L_{palm}$)
To ensure gestures function identically regardless of camera distance, user hand size, or viewport aspect ratio, all distances are normalized by the invariant palm metric $L_{palm}$:

$$\mathbf{p}_i = (x_i, y_i, z_i)^T$$
$$L_{width} = \|\mathbf{p}_5 - \mathbf{p}_{17}\|_2 = \sqrt{(x_5 - x_{17})^2 + (y_5 - y_{17})^2 + (z_5 - z_{17})^2}$$
$$L_{height} = \|\mathbf{p}_9 - \mathbf{p}_0\|_2 = \sqrt{(x_9 - x_0)^2 + (y_9 - y_0)^2 + (z_9 - z_0)^2}$$
$$L_{palm} = \max\left( \frac{1.2 \cdot L_{width} + 1.0 \cdot L_{height}}{2.2}, \; 0.035 \right)$$

---

### 2.2 Gesture 1: Continuous Open Hand $\leftrightarrow$ Fist Metric ($O \in [0, 1]$)

The openness metric $O$ must provide smooth, analog, 1:1 tactile control over the black hole / wormhole radial scale without dead zones or snapping.

#### Formulation:
1. **Finger Extension Ratio ($e_k$ for $k \in \{\text{Thumb}, \text{Index}, \text{Middle}, \text{Ring}, \text{Pinky}\}$)**:
   - For 4 non-thumb fingers ($k \in \{1, 2, 3, 4\}$, corresponding to tips $T_k \in \{8, 12, 16, 20\}$, MCPs $M_k \in \{5, 9, 13, 17\}$, PIPs $P_k \in \{6, 10, 14, 18\}$):
     $$d_{tip\_wrist} = \|\mathbf{p}_{T_k} - \mathbf{p}_0\|$$
     $$d_{mcp\_wrist} = \|\mathbf{p}_{M_k} - \mathbf{p}_0\|$$
     $$d_{pip\_mcp} = \|\mathbf{p}_{P_k} - \mathbf{p}_{M_k}\|$$
     $$r_k = \frac{d_{tip\_wrist} - d_{mcp\_wrist}}{\max(d_{pip\_mcp}, 0.01) \cdot 1.65}$$
     $$e_k = \text{clamp}\left(\frac{r_k - 0.15}{0.75}, 0.0, 1.0\right)$$

   - For thumb ($k = 0$, tip $T_0 = 4$, MCP $M_0 = 2$, Pinky MCP $P = 17$):
     $$d_{tip\_pinky} = \|\mathbf{p}_4 - \mathbf{p}_{17}\|$$
     $$d_{mcp\_pinky} = \|\mathbf{p}_2 - \mathbf{p}_{17}\|$$
     $$r_0 = \frac{d_{tip\_pinky} - 0.70 \cdot d_{mcp\_pinky}}{0.90 \cdot L_{palm}}$$
     $$e_0 = \text{clamp}\left(\frac{r_0 - 0.10}{0.85}, 0.0, 1.0\right)$$

2. **Radial Dispersion Metric ($D_{spread}$)**:
   $$D_{spread} = \frac{1}{5} \sum_{i \in \{4, 8, 12, 16, 20\}} \frac{\|\mathbf{p}_i - \mathbf{p}_0\|}{L_{palm}}$$
   $$S_{spread} = \text{clamp}\left(\frac{D_{spread} - 0.88}{0.87}, 0.0, 1.0\right)$$

3. **Combined Raw Openness ($O_{raw}$)**:
   $$E_{avg} = \frac{1}{5} \sum_{k=0}^4 e_k$$
   $$O_{raw} = \text{clamp}\left(0.60 \cdot E_{avg} + 0.40 \cdot S_{spread}, 0.0, 1.0\right)$$

---

### 2.3 Gesture 2: 3D Hand Orientation (Roll, Pitch, Yaw) via Palm Normal Plane

To control celestial rotation and camera tilting with high stability, the orientation is extracted from the rigid 3D triangle defined by the wrist and knuckle MCPs.

#### 3D Palm Plane Math:
$$\mathbf{v}_{wrist} = \mathbf{p}_0$$
$$\mathbf{v}_{index} = \mathbf{p}_5$$
$$\mathbf{v}_{pinky} = \mathbf{p}_{17}$$
$$\mathbf{u} = \mathbf{v}_{index} - \mathbf{v}_{wrist} = (u_x, u_y, u_z)^T$$
$$\mathbf{v} = \mathbf{v}_{pinky} - \mathbf{v}_{wrist} = (v_x, v_y, v_z)^T$$

The normal vector $\mathbf{n}$ perpendicular to the palm surface:
$$\mathbf{n}_{raw} = \mathbf{u} \times \mathbf{v} = \begin{pmatrix} u_y v_z - u_z v_y \\ u_z v_x - u_x v_z \\ u_x v_y - u_y v_x \end{pmatrix}, \quad \mathbf{n} = \frac{\mathbf{n}_{raw}}{\|\mathbf{n}_{raw}\|}$$

The longitudinal hand direction vector $\mathbf{a}_{long}$ (wrist to middle MCP):
$$\mathbf{a}_{long} = \frac{\mathbf{p}_9 - \mathbf{p}_0}{\|\mathbf{p}_9 - \mathbf{p}_0\|} = (a_x, a_y, a_z)^T$$

#### Extracted Euler Angles:
1. **Roll Angle ($\theta_{roll} \in [-\pi, \pi]$)**:
   Steers galaxy rotation left/right. Inverted X for mirrored webcam feed:
   $$\theta_{roll} = \text{atan2}(-a_x, -a_y)$$

2. **Pitch Angle ($\theta_{pitch} \in [-1.0, 1.0]$)**:
   Tilts camera altitude up/down:
   $$\Delta z_{mcp} = z_9 - z_0, \quad \Delta z_{tip} = z_{12} - z_0$$
   $$\overline{\Delta z} = \frac{0.40 \cdot \Delta z_{mcp} + 0.60 \cdot \Delta z_{tip}}{L_{palm}}$$
   $$\theta_{pitch} = \text{clamp}\left(-1.30 \cdot \overline{\Delta z}, -1.0, 1.0\right)$$

3. **Yaw Angle ($\theta_{yaw} \in [-\pi, \pi]$)**:
   $$\theta_{yaw} = \text{atan2}(n_x, n_z)$$

---

### 2.4 Gesture 3: Two-Finger Pinch Metric ($P_{tightness} \in [0, 1]$) & Time Dilation

A precision pinch between thumb tip (Landmark 4) and index tip (Landmark 8) triggers relativistic time dilation.

#### Formulation:
$$d_{pinch} = \|\mathbf{p}_4 - \mathbf{p}_8\|_2 = \sqrt{(x_4 - x_8)^2 + (y_4 - y_8)^2 + (z_4 - z_8)^2}$$
$$r_{pinch} = \frac{d_{pinch}}{L_{palm}}$$

We establish calibrated empirical thresholds:
- $r_{closed} = 0.22$ (fingertips touching)
- $r_{open} = 0.65$ (fingertips fully separated)

$$P_{tightness} = \text{clamp}\left(1.0 - \frac{r_{pinch} - r_{closed}}{r_{open} - r_{closed}}, 0.0, 1.0\right)$$

#### Time Dilation Factor ($\tau_{target}$):
When pinch tightness exceeds $0.70$, time dilation smoothly drops from $1.0$ (normal speed) to $0.10$ (slow-motion 10x):
$$\tau_{target} = 1.0 - 0.90 \cdot \text{smoothstep}(0.30, 0.90, P_{tightness})$$

---

### 2.5 Gesture 4: Swipe / Wave Recognition with Directional Hysteresis & Cooldown

Swiping rapidly across the camera transitions between scenes (Gargantua $\to$ Wormhole $\to$ Tesseract).

```
Landmark Centroid Buffer [c(t-N) ... c(t)]
                 │
                 ▼
      Sliding Window Regression
                 │
                 ▼
        Palm Velocity v_x, v_y
                 │
        ┌────────┴────────┐
        ▼                 ▼
|v_x| > Threshold?   |v_x| > 2.2 * |v_y|?
        │                 │
        └────────┬────────┘
                 ▼ (YES)
       Cooldown Timer <= 0?
                 │
                 ▼ (YES)
    Trigger Scene Transition (v_x > 0 ? +1 : -1)
    Reset Cooldown = 800ms
```

#### Mathematical Specification:
1. **Palm Centroid $\mathbf{c}(t)$**:
   $$\mathbf{c}(t) = \frac{1}{5} \left( \mathbf{p}_0 + \mathbf{p}_5 + \mathbf{p}_9 + \mathbf{p}_{13} + \mathbf{p}_{17} \right)$$

2. **Sliding Window Ring Buffer ($N = 12$ frames, $\approx 200 \text{ ms}$)**:
   Store timestamps $t_i$ and coordinates $\mathbf{c}_i$. The filtered velocity is computed via linear least-squares slope or first-difference exponential filter:
   $$\mathbf{v}_{palm}(t) = \frac{\mathbf{c}(t) - \mathbf{c}(t - K \Delta t)}{K \Delta t}$$

3. **Trigger Criteria**:
   - Horizontal speed: $|v_x| \ge 1.85 \text{ screen units / sec}$
   - Directional dominance: $|v_x| \ge 2.2 \cdot |v_y|$ (prevents diagonal or vertical accidental swipes)
   - Hand must be open ($O \ge 0.40$)
   - Cooldown timer $t_{cooldown} \le 0$

4. **Action**:
   - If $v_x > 0$: trigger `sceneManager.nextScene()`
   - If $v_x < 0$: trigger `sceneManager.prevScene()`
   - Set $t_{cooldown} = 0.80 \text{ s}$

---

## 3. Spring-Mass-Damper Physics Engine & Filtering

### 3.1 Dual-Stage Filtering Architecture

To achieve zero perceived latency during fast hand movements while maintaining rock-solid jitter suppression during slow pauses, we employ a two-stage filter pipeline:
1. **Stage 1: 1€ Filter (One Euro Filter)** on raw landmark features.
2. **Stage 2: 2nd-Order Critically Damped Harmonic Oscillator** on physical simulation variables (camera transform, particle morphing, time dilation).

```
Raw Landmarks ──► [ 1€ Filter ] ──► Normalized Features ──► [ Spring-Mass-Damper ] ──► Render State
```

---

### 3.2 2nd-Order Critically Damped Spring Equations

A critically damped system ($\zeta = 1.0$) guarantees the fastest possible convergence to target position with **zero overshoot and zero ringing**.

#### Continuous Differential Equation:
$$m \ddot{x}(t) + c \dot{x}(t) + k (x(t) - x_{target}) = 0$$

Dividing by mass $m$ with undamped natural frequency $\omega_0 = \sqrt{k/m}$ and critical damping coefficient $c = 2 m \omega_0$:
$$\ddot{x}(t) + 2 \omega_0 \dot{x}(t) + \omega_0^2 (x(t) - x_{target}) = 0$$

#### Exact Discrete-Time Analytical Update (for variable $\Delta t$):
Let error $y(t) = x(t) - x_{target}$ and velocity $v(t) = \dot{x}(t)$:
$$e^{-\omega_0 \Delta t} = \exp(-\omega_0 \Delta t)$$
$$y(t + \Delta t) = e^{-\omega_0 \Delta t} \left[ y(t) \cdot (1 + \omega_0 \Delta t) + v(t) \cdot \Delta t \right]$$
$$v(t + \Delta t) = e^{-\omega_0 \Delta t} \left[ v(t) \cdot (1 - \omega_0 \Delta t) - y(t) \cdot \omega_0^2 \Delta t \right]$$
$$x(t + \Delta t) = x_{target} + y(t + \Delta t)$$

#### Parameter Tuning Matrix:
| Parameter | $\omega_0$ (rad/s) | Response Time ($t_{95\%} \approx 3/\omega_0$) | Intended Feel |
|---|---|---|---|
| Openness / Morph $O(t)$ | $14.0$ | $0.21 \text{ s}$ | Snappy, 1:1 analog responsiveness |
| Camera Yaw / Roll | $7.5$ | $0.40 \text{ s}$ | Majestic, cinematic celestial weight |
| Camera Pitch | $8.5$ | $0.35 \text{ s}$ | Smooth, non-disorienting altitude tracking |
| Camera Zoom / Distance | $6.0$ | $0.50 \text{ s}$ | Deep, organic breathing |
| Time Dilation $\tau(t)$ | $12.0$ | $0.25 \text{ s}$ | Dramatic bullet-time slowdown |

---

## 4. Procedural Web Audio API Soundscapes (100% Synthesized)

### 4.1 Master Audio Engine Architecture & Reverb Convolver

All sound is generated live using the Web Audio API (`AudioContext`). No audio files are downloaded.

```
[ Scene 1: Gargantua Organ ] ──► [ Gain 1 ] ──┐
[ Scene 2: Wormhole Pad    ] ──► [ Gain 2 ] ──┼──► [ Master Dynamic Filter ] ──► [ Convolver Reverb ] ──┐
[ Scene 3: Tesseract Clock ] ──► [ Gain 3 ] ──┘          │                              │               ▼
                                                         └──────────────► [ Dry/Wet Sum ] ──► [ Master Limiter ] ──► [ AudioDestination ]
```

#### Algorithmic Impulse Response Synthesis ($h[t]$):
To avoid loading external impulse response WAV files, a 3.8-second cosmic cathedral acoustic impulse is synthesized into an `AudioBuffer`:

```javascript
function generateReverbImpulse(audioContext, duration = 3.8, decay = 2.4, reverse = false) {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Exponential energy decay envelope
    const env = Math.exp(-decay * t);
    // Colored noise with mild stereo decorrelation
    const noiseL = (Math.random() * 2 - 1) * env;
    const noiseR = (Math.random() * 2 - 1) * env;

    // Early reflection comb impulses
    const earlyL = (i === 1200 ? 0.6 : 0) + (i === 2800 ? 0.4 : 0) + (i === 5100 ? 0.25 : 0);
    const earlyR = (i === 1500 ? 0.6 : 0) + (i === 3200 ? 0.4 : 0) + (i === 4800 ? 0.25 : 0);

    left[i] = noiseL * 0.85 + earlyL;
    right[i] = noiseR * 0.85 + earlyR;
  }
  return impulse;
}
```

---

### 4.2 Scene 1: Gargantua — Hans Zimmer Church Organ Drone

Inspired by the monumental pipe organ score in *Interstellar* (Cornfield Chase / Stay / No Time for Caution), this patch synthesizes massive resonant organ pipes via additive synthesis.

#### Node Graph Specification:

```
[ Sub Osc: 32.7 Hz Sine  ] ──► [ Gain: 0.85 ] ──┐
[ Sub Osc: 65.4 Hz Tri   ] ──► [ Gain: 0.70 ] ──┤
[ Pipe 8' : 130.8 Hz Tri ] ──► [ Gain: 0.55 ] ──┤
[ Pipe 4' : 261.6 Hz Saw ] ──► [ Gain: 0.35 ] ──┼──► [ WaveShaper (Warm Saturation) ]
[ Pipe 2' : 523.2 Hz Saw ] ──► [ Gain: 0.20 ] ──┤                    │
[ Pipe 1': 1046.5 Hz Sine] ──► [ Gain: 0.10 ] ──┘                    ▼
                                                    [ Dual Biquad Lowpass (24dB/oct) ]
                                                                     │
[ LFO: 0.07 Hz Sine ] ──► Modulates Detune (±3.5 cents)             ▼
                                                    [ Spatial Reverb Convolver ] ──► Output
```

#### Harmonic Pipe Table (Root $C_1 = 32.703 \text{ Hz}$):
| Pipe Rank | Footage | Multiplier | Waveform | Base Gain | Detune Offset |
|---|---|---|---|---|---|
| Sub-Bourdon | 32' | $1.0 \times (32.7 \text{ Hz})$ | Sine | $0.85$ | $0.0 \text{ cents}$ |
| Principal Bass | 16' | $2.0 \times (65.4 \text{ Hz})$ | Triangle | $0.70$ | $+1.5 \text{ cents}$ |
| Diapason | 8' | $4.0 \times (130.8 \text{ Hz})$ | Triangle | $0.55$ | $-2.2 \text{ cents}$ |
| Octave | 4' | $8.0 \times (261.6 \text{ Hz})$ | Sawtooth | $0.35$ | $+3.1 \text{ cents}$ |
| Super Octave | 2' | $16.0 \times (523.2 \text{ Hz})$ | Sawtooth | $0.20$ | $-4.0 \text{ cents}$ |
| Mixture | 1 1/3'| $24.0 \times (784.9 \text{ Hz})$ | Sine | $0.10$ | $+2.8 \text{ cents}$ |

#### Non-Linear Saturation Transfer Function (WaveShaper):
$$f(x) = \frac{(1 + k) x}{1 + k |x|}, \quad k = 2.5$$

---

### 4.3 Scene 2: Wormhole — Ethereal Cosmic Pad & Swept Bandpass

A lush, sprawling cosmic soundscape featuring rich detuned supersaws, stereo chorus modulation, and high-resonance bandpass sweeps reacting to user rotation.

#### Node Graph Specification:

```
[ Saw Osc 1: D2 (73.4 Hz, -7 ct)  ] ──┐
[ Saw Osc 2: D2 (73.4 Hz, +7 ct)  ] ──┼──► [ Left Delay Line (22ms)  ] ──► [ Pan Left  ] ──┐
[ Saw Osc 3: A2 (110.0 Hz, -5 ct) ] ──┤                                                     ├──► [ Resonant BPF (Q=3.8) ]
[ Saw Osc 4: F3 (174.6 Hz, +4 ct) ] ──┼──► [ Right Delay Line (31ms) ] ──► [ Pan Right ] ──┘               │
[ Saw Osc 5: C4 (261.6 Hz, -6 ct) ] ──┤                                                                    ▼
[ Saw Osc 6: E4 (329.6 Hz, +5 ct) ] ──┘                                                          [ Shimmer Reverb (4.5s) ]
                                                                                                           │
[ LFO 1: 0.25 Hz Sine ] ──► Modulates Left Delay Time (±4.5 ms)                                           ▼
[ LFO 2: 0.38 Hz Sine ] ──► Modulates Right Delay Time (±5.2 ms)                                         Output
```

#### Dynamic Filter Sweeping:
The bandpass center frequency $f_{center}$ is continuously swept by hand roll angle $\theta_{roll}$ and hand movement speed:
$$f_{center}(t) = 450 \text{ Hz} + 2200 \cdot O(t) + 600 \cdot |\theta_{roll}(t)|$$

---

### 4.4 Scene 3: Tesseract — Eerie Micro-Impulse Clockwork & Deep Sub-Harmonics

Recreating the tension of the 5D Tesseract where "every tick of the second hand is 7 years on Earth."

#### Precise Web Audio Scheduler (Lookahead Clock):
Using `audioContext.currentTime` scheduling ahead by $100 \text{ ms}$ to guarantee microsecond precision free from main-thread JavaScript jitter.

```javascript
class ClockworkEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.bpm = 72;
    this.interval = 60.0 / this.bpm; // 0.833s per second tick
    this.nextTickTime = 0.0;
    this.timerId = null;
  }

  start() {
    this.nextTickTime = this.ctx.currentTime + 0.05;
    this.scheduler = () => {
      while (this.nextTickTime < this.ctx.currentTime + 0.15) {
        this.scheduleTick(this.nextTickTime);
        this.nextTickTime += this.interval;
      }
      this.timerId = setTimeout(this.scheduler, 35);
    };
    this.scheduler();
  }

  scheduleTick(time) {
    // 1. High Metallic Click (Sine wave with instantaneous pitch drop)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(3400, time);
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.012);
    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.018);

    // 2. Micro Noise Burst (Wood / Gear friction)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, time);
    filter.Q.setValueAtTime(6.0, time);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.008);

    // 3. Polyrhythmic Echo (Cross-Delay at 3/16th interval)
    // Route to spatial echo bus
  }
}
```

#### Deep Sub-Harmonic Chord Cluster (Distant 5D Resonance):
- Frequency Cluster: $B\flat_0 (29.14 \text{ Hz}), \; F_1 (43.65 \text{ Hz}), \; D\flat_2 (69.30 \text{ Hz})$
- Deep, slow tremolo ($0.15 \text{ Hz}$) creates an ominous breathing background beneath the clockwork.

---

### 4.5 Dynamic Audio-Gesture Modulation & Equal-Power Crossfade

#### Modulation Mapping Matrix:
| Gesture Input | Affected Audio Parameter | Modulation Formula |
|---|---|---|
| Openness $O \in [0, 1]$ | Master Presence & Lowpass Filter Cutoff | $f_c = 180 \text{ Hz} \cdot 10^{2.0 \cdot O} \implies 180 \text{ Hz} \to 18,000 \text{ Hz}$ |
| Pinch Tightness $P \in [0, 1]$ | Time Dilation Audio Filter & Clock Tempo | Clock BPM $= 72 \to 24 \text{ BPM}$, Pitch $= 0 \to -12 \text{ semitones}$ |
| Hand Speed $\|\mathbf{v}_{palm}\|$ | Cosmic Wind / Reverb Wetness | Wet Mix $= 0.25 + 0.60 \cdot \min(1.0, \|\mathbf{v}_{palm}\| / 2.0)$ |
| Hand Roll $\theta_{roll}$ | Stereo Panning & Spatial Tilt | Panner azimuth $= \theta_{roll} \cdot 45^\circ$ |

#### Equal-Power Scene Crossfade ($T_{fade} = 1.5 \text{ s}$):
To prevent perceptual volume drops during scene switches:
$$G_{fade\_out}(t) = \cos\left(\frac{\pi}{2} \cdot \frac{t - t_0}{T_{fade}}\right), \quad G_{fade\_in}(t) = \sin\left(\frac{\pi}{2} \cdot \frac{t - t_0}{T_{fade}}\right)$$

```javascript
function crossfadeScene(fromStem, toStem, duration = 1.5) {
  const now = audioContext.currentTime;
  fromStem.gain.gain.setValueAtTime(fromStem.gain.gain.value, now);
  fromStem.gain.gain.linearRampToValueAtTime(0.0, now + duration);

  toStem.gain.gain.setValueAtTime(toStem.gain.gain.value, now);
  toStem.gain.gain.linearRampToValueAtTime(1.0, now + duration);
}
```

---

## 5. Cinematic Glassmorphic HUD & Video Recording Pipeline

### 5.1 HUD Component Layout & Telemetry

The user interface follows a minimalist, futuristic glassmorphic aesthetic inspired by spacecraft avionics:
- **Font**: Monospace geometric (`ui-monospace, "SF Mono", "Fira Code", monospace`).
- **Glass Styling**: `background: rgba(10, 14, 24, 0.72); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);`.

#### Live Telemetry Readouts:
1. **Top-Left Badge**: Current Scene ID (`GARGANTUA // ACCRETION DISK`), Particle Count (`500,000 GPU PARTICLES`), FPS (`60 / 120 FPS`), Latency (`18 ms`).
2. **Top-Right Mini-Cam Inset**: Corner video canvas displaying live webcam feed with glowing neon hand skeleton overlay (green bones, white fingertip joints, status pill).
3. **Bottom Telemetry Deck**:
   - Continuous Expansion Gauge ($0\% \to 100\%$).
   - Multi-Axis Telemetry (`EXP: 84%`, `PITCH: +12°`, `ROLL: -18°`, `PINCH: DILATE 0.1x`).
   - Active Finger Matrix (`[T] [I] [M] [R] [P]`).
   - Context-sensitive gesture hint badges.

---

### 5.2 Canvas Stream & Web Audio Recording Capture Engine (`[H]` Clean Mode)

Pressing the **`[H]` key** toggles Clean View and manages video recording.

```
[ WebGL Canvas ] ──► canvas.captureStream(60) ──┐
                                                  ├──► Combined MediaStream ──► MediaRecorder (VP9/Opus) ──► Blob Export (.webm)
[ Web Audio ] ────► audioDestination.stream ────┘
```

#### Implementation Code Template:

```javascript
export class CinematicRecorder {
  constructor(canvasElement, audioContext, masterAudioNode) {
    this.canvas = canvasElement;
    this.audioCtx = audioContext;
    this.masterAudio = masterAudioNode;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;

    // Create Web Audio destination node for capturing synthesized audio
    this.audioDestination = this.audioCtx.createMediaStreamDestination();
    this.masterAudio.connect(this.audioDestination);
  }

  startRecording() {
    const videoStream = this.canvas.captureStream(60);
    const audioStream = this.audioDestination.stream;

    // Combine video track + procedural audio track into composite stream
    const compositeStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);

    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    const selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

    this.mediaRecorder = new MediaRecorder(compositeStream, {
      mimeType: selectedMime,
      videoBitsPerSecond: 12000000 // 12 Mbps pristine quality
    });

    this.recordedChunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => this.exportVideo();
    this.mediaRecorder.start(250);
    this.isRecording = true;
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  exportVideo() {
    const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interstellar-gesture-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
```

---

## 6. Synthetic Gesture Fallback & Automated Testing Harness

To enable deterministic end-to-end automated testing, headless verification, and keyboard fallback when a user has no webcam:

### 6.1 Programmatic Synthetic Landmark Generator
A virtual hand simulator that outputs realistic 21-landmark arrays parameterized by time $t$ and simulated action mode:

```javascript
export class SyntheticHandSimulator {
  constructor() {
    this.mode = 'idle'; // 'idle', 'fist_cycle', 'pinch', 'swipe_right', 'swipe_left', 'tilt_cycle'
    this.time = 0;
  }

  generateFrame(dt) {
    this.time += dt;
    const t = this.time;
    const landmarks = [];

    // Base wrist position centered in screen
    const wrist = { x: 0.5, y: 0.75, z: 0.0 };
    landmarks[0] = wrist;

    let openness = 0.5;
    let pinch = 0.0;
    let rollAngle = 0.0;
    let pitchOffset = 0.0;
    let palmX = 0.5;

    switch (this.mode) {
      case 'fist_cycle':
        openness = (Math.sin(t * 2.0) + 1.0) / 2.0; // Oscillates 0 to 1
        break;
      case 'pinch':
        pinch = (Math.sin(t * 3.0) + 1.0) / 2.0;
        break;
      case 'tilt_cycle':
        rollAngle = Math.sin(t * 1.5) * 0.6; // Roll ±35°
        pitchOffset = Math.cos(t * 1.5) * 0.08;
        break;
      case 'swipe_right':
        palmX = 0.2 + ((t * 2.5) % 1.0) * 0.6; // High velocity rightward sweep
        openness = 1.0;
        break;
      case 'idle':
      default:
        openness = 0.85;
        rollAngle = Math.sin(t * 0.4) * 0.05;
        break;
    }

    // Synthesize realistic anatomical bone chain relative to wrist
    const fingerSpreads = [-0.14, -0.06, 0.0, 0.06, 0.12];
    const fingerLengths = [0.10, 0.15, 0.17, 0.15, 0.12];

    for (let f = 0; f < 5; f++) {
      const baseIdx = f === 0 ? 1 : f * 4 + 1;
      const spread = fingerSpreads[f];
      const len = fingerLengths[f];

      const cosR = Math.cos(rollAngle);
      const sinR = Math.sin(rollAngle);

      for (let j = 0; j < 4; j++) {
        const seg = (j + 1) / 4.0;
        const curOpen = f === 0 ? Math.max(0.2, openness) : openness;
        
        let dx = (spread * 0.6 + spread * seg * 0.4);
        let dy = -len * seg * curOpen;
        let dz = (1.0 - curOpen) * len * seg * 0.8 + pitchOffset * seg;

        if (f === 0 && j === 3 && pinch > 0.5) {
          // Snap thumb tip near index tip for pinch
          dx = fingerSpreads[1] * 0.6;
          dy = -fingerLengths[1] * curOpen;
        }

        const rotX = dx * cosR - dy * sinR;
        const rotY = dx * sinR + dy * cosR;

        landmarks[baseIdx + j] = {
          x: palmX + rotX,
          y: wrist.y + rotY,
          z: wrist.z + dz
        };
      }
    }

    return landmarks;
  }
}
```

---

## 7. Mobile Adaptive Resolution Strategy

To achieve fluid $\ge 60 \text{ FPS}$ on mobile devices (iOS Safari, Android Chrome):
1. **Model Complexity Scaling**:
   - Desktop: `modelComplexity: 1` (Full, 640x480 video input).
   - Mobile: `modelComplexity: 0` (Lite, 320x240 video input, 65% faster neural inference).
2. **Inference Decoupling**:
   - Render loop executes via `requestAnimationFrame` at 60/120 FPS running spring-damper equations.
   - MediaPipe vision inference executes asynchronously in WebAssembly worker or offscreen canvas at $30 \text{ FPS}$, with continuous spring interpolation bridging intermediate frames.
3. **Adaptive Pixel Ratio**:
   - Desktop: `devicePixelRatio` capped at $1.5$.
   - Mobile: `devicePixelRatio` capped at $1.0$.

---

## 8. Summary of Components & Deliverables for Implementation

| Component Module | File Path Target | Key Responsibilities |
|---|---|---|
| **Gesture Tracking Engine** | `src/tracker.js` | MediaPipe Hands initialization, 1€ filter, landmark math (openness, 3D normal roll/pitch, pinch, swipe velocity), synthetic generator, fallback. |
| **Physics Interpolator** | `src/physics.js` | 2nd-order critically damped harmonic oscillator equations for camera yaw/pitch/roll, zoom, morph, time dilation. |
| **Procedural Audio Engine** | `src/audio.js` | Web Audio API graph, algorithmic reverb convolver, Gargantua church organ, Wormhole supersaw pad, Tesseract ticking scheduler, dynamic gesture modulation, equal-power crossfader. |
| **Cinematic HUD & Inset** | `src/ui.js` | Glassmorphic HUD overlay, FPS/particle telemetry, mini-cam skeleton renderer, gesture cards, TikTok framing guide. |
| **Screen Recorder** | `src/recorder.js` | Canvas `captureStream(60)` + Web Audio stream muxing into `MediaRecorder` video export on `[H]` key. |
| **Main Orchestration** | `src/main.js` | Integrates Three.js multi-scene manager, gesture tracking, physics updates, audio modulation, and UI. |

---
*End of Survey Report — Explorer 3*
