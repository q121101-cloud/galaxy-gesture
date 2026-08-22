# 🌌 GALAXY GESTURE // Interactive 3D Neural Cosmos

[![Three.js](https://img.shields.io/badge/Three.js-r160+-black?logo=three.js)](https://threejs.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands%20AI-00ffb3?logo=google)](https://developers.google.com/mediapipe)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?logo=vite)](https://vitejs.dev/)
[![FPS](https://img.shields.io/badge/Target%20FPS-120%20FPS-8a4fff)](#)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An interactive, high-performance **3D WebGL cosmic particle simulation** containing **100,000 GPU-accelerated particles**, controlled in real-time via **Webcam Hand Gestures** (MediaPipe Hands AI + 1€ Filter + Three.js GLSL Shaders).

---

## ✨ Features

- **⚡ 100,000 Dynamic GPU Particles:**
  - **30% Singularity Core (30,000 particles):** Dense plasma core with harmonic wave pulsation.
  - **70% Accretion Disc (70,000 particles):** Logarithmic spiral ring with gentle Keplerian orbital dynamics.
- **🖐️ Neural Hand Gesture Tracking:**
  - **✊ Clench Fist:** Shrinks into a dense, breathing Singularity Core.
  - **🖐️ Open Palm:** Blooms outward into an expansive Supernova Galaxy ring with quintic smootherstep interpolation.
  - **↺ / ↻ Roll Hand Left / Right:** Steer and gracefully roll the galaxy in 3D space.
  - **↕️ Pitch Tilt:** Tilt fingers down to pitch the galaxy downward, tilt back/up to pitch upward.
  - **🔍 Hand Distance Zoom:** Move hand closer/further from the webcam to smoothly adjust depth.
- **🌊 Liquid-Smooth Motion Filtering:**
  - Integrated **1€ (One Euro) Filter** combined with dual-stage critically damped springs ($1 - e^{-8.0 \Delta t}$) for zero-jitter, analog responsiveness.
- **💎 Cyberpunk Glassmorphism 2.0 HUD:**
  - Real-time telemetry: `EXPANSION %`, `PITCH ±°`, `ROLL ±°`, `ZOOM x`, `120 FPS`, and `LATENCY ms`.
  - **Finger Status Matrix `[T] [I] [M] [R] [P]`:** Active neon LED feedback for each individual finger extension.
  - **Large Neural Tracker Preview (480px × 340px):** Neon bone skeleton overlay with multi-state detection.
- **🎬 TikTok & Video Creator Tools:**
  - **Clean View Mode (`[H]` key):** Instantly hide all UI overlays for clean screen recording.
  - **9:16 Frame Guide:** Built-in vertical guide overlay for framing TikTok, Reels, and Shorts.
  - **4 Runtime Themes:** `🟢 Emerald` (Default), `● Nebula`, `🔥 Supernova`, `⚡ Cyber`.
  - **Optimized Bloom Pipeline:** Downsampled UnrealBloomPass buffer rendering at $< 0.8\text{ms}$ frame time.

---

## 🎮 Hand Gestures & Controls

| Gesture / Input | Action |
| :--- | :--- |
| **✊ Close Fist** | Coalesce particles into the high-density **Singularity Core** |
| **🖐️ Open Palm** | Bloom particles outward into the radiant **Supernova Galaxy** |
| **↺ / ↻ Roll Hand** | Steer cosmic disk rotation Left / Right |
| **↕️ Pitch Hand** | Tilt galaxy plane Up / Down |
| **🔍 Hand Distance** | Move hand towards / away from webcam to Zoom In / Out |
| **`H` Key / 🎬 Clean View** | Toggle HUD visibility for clean video recording |
| **`SPACE` Key** | Toggle morph state in Keyboard fallback mode |
| **`↑ / ↓` & `← / →`** | Manual Pitch, Zoom, and Roll in Keyboard mode |
| **Mouse Drag** | Free 3D Orbit camera around the cosmos |

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone git@github.com:q121101-cloud/galaxy-gesture.git
cd galaxy-gesture
```

### 2. Install dependencies
```bash
npm install
```

### 3. Launch Development Server
```bash
npm run dev
```
Open **`http://localhost:3000/`** in Chrome, Edge, or Safari, allow webcam permissions, and start controlling the cosmos with your hands!

### 4. Production Build
```bash
npm run build
npm run preview
```

---

## 🛠️ Project Structure

```
galaxy-gesture/
├── index.html              # HTML5 Shell, HUD Glassmorphism, MediaPipe CDN
├── styles.css              # Cyberpunk glassmorphism 2.0 styles & video overlays
├── package.json            # Vite configuration & Three.js dependencies
└── src/
    ├── main.js             # Application entrypoint & 120 FPS animation loop
    ├── particles.js        # 100,000 Particle GLSL shader & harmonic turbulence
    ├── tracker.js          # MediaPipe Hands AI, 1€ Filter & 3D gesture kinematics
    ├── postprocessing.js   # EffectComposer & half-resolution UnrealBloomPass
    └── ui.js               # HUD telemetry controller & creator tools
```

---

## 📜 License

MIT License © 2026. Built with Three.js & Google MediaPipe.
