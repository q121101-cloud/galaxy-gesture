## 2026-08-23T09:40:53Z
You are Explorer 2 (Shader & Visual Simulation Specialist) in the Survey Phase for the Interstellar Gesture Experience project.

Project Root: /Users/quan/.gemini/antigravity/scratch/galaxy-gesture
Your Working Directory: /Users/quan/.gemini/antigravity/scratch/galaxy-gesture/.agents/explorer_survey_2
Original Request Path: /Users/quan/.gemini/antigravity/scratch/galaxy-gesture/ORIGINAL_REQUEST.md

CRITICAL INSTRUCTIONS:
1. You MUST read /Users/quan/.gemini/antigravity/scratch/galaxy-gesture/ORIGINAL_REQUEST.md first.
2. Investigate and design the mathematical and GLSL shader architecture for all 3 scenes:
   - **Gargantua Scene**:
     * Physically-inspired gravitational lensing (Schwarzschild/Kerr metric approximation in GLSL, ray deflection around photon sphere r=1.5 Rs / event horizon r=1.0 Rs).
     * Accretion disk: upper and lower warped images visible simultaneously due to light bending over/under the black hole.
     * Relativistic Doppler beaming / shift: blue-shifted higher intensity on approaching matter (left/counterclockwise), red-shifted lower intensity on receding matter.
     * High-performance GPU Particle System: >= 300,000 particles using `THREE.InstancedMesh` or custom `THREE.BufferGeometry` with GPU simulation (FBO / GPGPU or analytic Keplerian orbit compute in vertex shader), relativistic polar jets.
   - **Wormhole Scene**:
     * Traversable Ellis wormhole spherical portal geometry.
     * 4D spherical distortion / celestial sphere ray refraction mapping to an alternate starfield texture/cube inside the portal throat.
     * Flight animation & particle streak pass-through effect when user triggers travel gesture.
   - **Tesseract Scene**:
     * 5D infinite bookshelf lattice: procedural 3D grid with animated 4th/5th dimensional coordinate shifts.
     * Neon light filaments / timeline threads spanning infinite orthogonal axes.
     * Volumetric dust motes and eerie glowing ambient lighting.
   - **Transition & Performance**:
     * Cinematic cross-fades / particle morphing (>= 0.5s duration).
     * Shader optimization to ensure solid >= 60 FPS on desktop WebGL.
3. Write your detailed technical and mathematical specifications, GLSL pseudocode, and performance analysis to:
   - `/Users/quan/.gemini/antigravity/scratch/galaxy-gesture/.agents/explorer_survey_2/survey_report.md`
   - `/Users/quan/.gemini/antigravity/scratch/galaxy-gesture/.agents/explorer_survey_2/handoff.md`
4. Report completion back to parent with a clear summary.
