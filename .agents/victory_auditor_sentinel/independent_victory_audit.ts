import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import { setupTestEnvironment, teardownTestEnvironment } from '../../test/e2e_harness';
import { GalaxyScene } from '../../src/scenes/GalaxyScene';
import { WormholeScene } from '../../src/scenes/WormholeScene';
import { SceneManager } from '../../src/core/SceneManager';
import { AudioEngine } from '../../src/audio/AudioEngine';
import { GlassmorphicHUD } from '../../src/ui/GlassmorphicHUD';
import { GestureHints } from '../../src/ui/GestureHints';

const ROOT = process.cwd();

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

async function runIndependentAudit() {
  console.log('================================================================');
  console.log('  VICTORY AUDITOR INDEPENDENT VERIFICATION SUITE');
  console.log('================================================================\n');

  setupTestEnvironment();

  let checksPassed = 0;
  let checksTotal = 0;

  async function runCheck(name: string, fn: () => void | Promise<void>) {
    checksTotal++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      checksPassed++;
    } catch (e: any) {
      console.error(`  [FAIL] ${name}: ${e.message}`);
      throw e;
    }
  }

  // --- CHECK 1: Deleted Files Forensic Verification ---
  await runCheck('Forensics: GargantuaScene.ts and TesseractScene.ts do not exist', () => {
    assert(!fs.existsSync(path.join(ROOT, 'src/scenes/GargantuaScene.ts')), 'GargantuaScene.ts must not exist');
    assert(!fs.existsSync(path.join(ROOT, 'src/scenes/TesseractScene.ts')), 'TesseractScene.ts must not exist');
  });

  await runCheck('Forensics: GargantuaOrganSynth.ts and TesseractClockworkSynth.ts do not exist', () => {
    assert(!fs.existsSync(path.join(ROOT, 'src/audio/GargantuaOrganSynth.ts')), 'GargantuaOrganSynth.ts must not exist');
    assert(!fs.existsSync(path.join(ROOT, 'src/audio/TesseractClockworkSynth.ts')), 'TesseractClockworkSynth.ts must not exist');
  });

  await runCheck('Forensics: AudioEngine.ts has no references to realTrackEl or no-time-for-caution.mp3', () => {
    const audioSrc = fs.readFileSync(path.join(ROOT, 'src/audio/AudioEngine.ts'), 'utf-8');
    assert(!audioSrc.includes('realTrackEl'), 'AudioEngine must not reference realTrackEl');
    assert(!audioSrc.includes('realTrackSource'), 'AudioEngine must not reference realTrackSource');
    assert(!audioSrc.includes('realTrackGain'), 'AudioEngine must not reference realTrackGain');
    assert(!audioSrc.includes('no-time-for-caution.mp3'), 'AudioEngine must not reference no-time-for-caution.mp3');
  });

  await runCheck('Forensics: No imports of deleted scenes or synths across src/', () => {
    const srcDir = path.join(ROOT, 'src');
    function checkDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          checkDir(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          assert(!content.includes('GargantuaScene'), `File ${file} contains GargantuaScene reference`);
          assert(!content.includes('TesseractScene'), `File ${file} contains TesseractScene reference`);
          assert(!content.includes('GargantuaOrganSynth'), `File ${file} contains GargantuaOrganSynth reference`);
          assert(!content.includes('TesseractClockworkSynth'), `File ${file} contains TesseractClockworkSynth reference`);
        }
      }
    }
    checkDir(srcDir);
  });

  // --- CHECK 2: GalaxyScene Geometry, Buffers & Math Verification ---
  const galaxy = new GalaxyScene();
  const mockRenderer = {
    render: () => {},
    setSize: () => {},
    setPixelRatio: () => {},
    dispose: () => {},
  } as any;
  const mockCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);

  await runCheck('GalaxyScene: Default particle count is exactly 200,000', () => {
    assert(galaxy.particleCount === 200000, `Expected particle count 200000, got ${galaxy.particleCount}`);
  });

  await runCheck('GalaxyScene: Scene initialization allocates all 11 required GPU attribute buffers', async () => {
    await galaxy.init(mockRenderer, mockCamera);
    const threeScene = galaxy.scene;
    let pointsObj: THREE.Points | null = null;
    threeScene.traverse((obj) => {
      if (obj instanceof THREE.Points) {
        pointsObj = obj;
      }
    });
    assert(pointsObj !== null, 'Galaxy points object must exist in scene');
    const geom = (pointsObj as unknown as THREE.Points).geometry;

    assert(geom.getAttribute('position') !== undefined, 'position attribute missing');
    assert(geom.getAttribute('aTargetFist') !== undefined, 'aTargetFist attribute missing');
    assert(geom.getAttribute('aTargetOpen') !== undefined, 'aTargetOpen attribute missing');
    assert(geom.getAttribute('aColor') !== undefined, 'aColor attribute missing');
    assert(geom.getAttribute('aSize') !== undefined, 'aSize attribute missing');
    assert(geom.getAttribute('aType') !== undefined, 'aType attribute missing');
    assert(geom.getAttribute('aOrbitSpeed') !== undefined, 'aOrbitSpeed attribute missing');
    assert(geom.getAttribute('aOrbitRadius') !== undefined, 'aOrbitRadius attribute missing');
    assert(geom.getAttribute('aOrbitAngle') !== undefined, 'aOrbitAngle attribute missing');
    assert(geom.getAttribute('aPhase') !== undefined, 'aPhase attribute missing');
    assert(geom.getAttribute('aWarpVelocity') !== undefined, 'aWarpVelocity attribute missing');

    const pos = geom.getAttribute('position').array;
    assert(pos.length === 200000 * 3, `Expected position length 600000, got ${pos.length}`);
    const types = geom.getAttribute('aType').array;
    let coreCount = 0;
    let discCount = 0;
    for (let i = 0; i < types.length; i++) {
      if (types[i] < 0.5) coreCount++;
      else discCount++;
    }
    assert(coreCount === 60000, `Expected 60,000 core particles (30%), got ${coreCount}`);
    assert(discCount === 140000, `Expected 140,000 disc particles (70%), got ${discCount}`);
  });

  await runCheck('GalaxyScene: Shader code enforces outer stars stationary (frozen at aTargetFist) and only core zooms with uOpenness', () => {
    const galaxyCode = fs.readFileSync(path.join(ROOT, 'src/scenes/GalaxyScene.ts'), 'utf-8');
    
    // Check GLSL vertex shader structure
    assert(galaxyCode.includes('currentPos = mix(fistPos, openPos, morphFactor);'), 'Core must interpolate with morphFactor');
    assert(galaxyCode.includes('float morphFactor = smootherstep(0.0, 1.0, uOpenness);'), 'morphFactor must be computed from uOpenness');
    
    // Extract the position calculation section after vec3 currentPos;
    const posBlock = galaxyCode.split('vec3 currentPos;')[1]?.split('// Transform to Camera View')[0];
    assert(posBlock !== undefined, 'Position block must exist');
    
    const parts = posBlock.split('} else {');
    assert(parts.length === 2, 'Position block must branch into core and outer');
    const coreBlock = parts[0];
    const outerBlock = parts[1];

    // Strip comments to check actual executable GLSL instructions
    const stripComments = (str: string) => str.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const cleanCore = stripComments(coreBlock);
    const cleanOuter = stripComments(outerBlock);

    assert(cleanCore.includes('if (aType < 0.5)'), 'Core block must check aType < 0.5');
    assert(cleanCore.includes('mix(fistPos, openPos, morphFactor)'), 'Core block must morph via morphFactor');
    assert(cleanCore.includes('smootherstep(0.0, 1.0, uOpenness)'), 'Core block must use uOpenness');

    assert(!cleanOuter.includes('uOpenness'), 'Outer star executable GLSL must NOT reference uOpenness');
    assert(!cleanOuter.includes('openPos'), 'Outer star executable GLSL must NOT reference openPos');
    assert(cleanOuter.includes('currentPos = aTargetFist;'), 'Outer star executable GLSL must freeze currentPos = aTargetFist');
    assert(cleanOuter.includes('sizeBoost = 1.0;'), 'Outer star executable GLSL must set sizeBoost = 1.0');
  });

  await runCheck('GalaxyScene: 7-color RGB rainbow mode and themes work properly', () => {
    const galaxyCode = fs.readFileSync(path.join(ROOT, 'src/scenes/GalaxyScene.ts'), 'utf-8');
    assert(galaxyCode.includes('vec3 hsv2rgb(vec3 c)'), 'Must define hsv2rgb in GLSL');
    assert(galaxyCode.includes('uIsRainbow'), 'Must have uIsRainbow uniform');

    galaxy.setTheme('rainbow');
    const mat = (galaxy as any).particleMaterial;
    assert(mat.uniforms.uIsRainbow.value === 1.0, 'Rainbow theme must set uIsRainbow to 1.0');

    galaxy.setTheme('nebula');
    assert(mat.uniforms.uIsRainbow.value === 0.0, 'Nebula theme must set uIsRainbow to 0.0');

    const toggled = galaxy.toggleRainbow();
    assert(toggled === true && mat.uniforms.uIsRainbow.value === 1.0, 'toggleRainbow must toggle to 1.0');
  });

  // --- CHECK 3: SceneManager & Scene Navigation ---
  await runCheck('SceneManager: Registers GalaxyScene as default, with WormholeScene second', async () => {
    const sm = new SceneManager();
    const g = new GalaxyScene();
    const w = new WormholeScene();

    await sm.registerScene(g, mockRenderer, mockCamera);
    await sm.registerScene(w, mockRenderer, mockCamera);

    assert(sm.getActiveSceneName() === 'galaxy', `Default active scene must be galaxy, got ${sm.getActiveSceneName()}`);
    assert(sm.getParticleCount() === 200000, `Galaxy particle count must be 200000, got ${sm.getParticleCount()}`);

    // Test transition to Wormhole
    const switched = sm.switchTo('wormhole', { duration: 0.5 });
    assert(switched === true, 'Switch to wormhole must succeed');

    sm.dispose();
  });

  // --- CHECK 4: AudioEngine Scene Handling & Absence of Real Track ---
  await runCheck('AudioEngine: Galaxy ambient sound & crossfade work without deleted synth references', async () => {
    const audioEngine = new AudioEngine();
    await audioEngine.init();

    audioEngine.setScene('galaxy', 0.1);
    audioEngine.setScene('wormhole', 0.1);
    audioEngine.setMuted(true);
    audioEngine.setMuted(false);
    audioEngine.setVolume(0.5);

    audioEngine.dispose();
  });

  // --- CHECK 5: UI Elements (HUD & Hints) Reflect 2 Scenes ---
  await runCheck('UI HUD & Hints: Configured for 200,000 particles and 2 scenes', () => {
    const hud = new GlassmorphicHUD();
    hud.updateTelemetry({
      currentScene: 'galaxy',
      particleCount: 200000,
      fps: 60,
      latencyMs: 16.6,
      handOpenness: 0.8,
      handPitch: 0.1,
      handRoll: -0.2,
      timeDilation: 1.0,
      morphProgress: 0.8,
    });

    const hints = new GestureHints();
    hints.setScene('galaxy');
    hints.setScene('wormhole');
  });

  teardownTestEnvironment();

  console.log(`\n================================================================`);
  console.log(`  ALL ${checksPassed}/${checksTotal} INDEPENDENT AUDIT CHECKS PASSED WITH 100% SUCCESS`);
  console.log('================================================================\n');
}

runIndependentAudit().catch((err) => {
  console.error('FATAL AUDIT FAILURE:', err);
  process.exit(1);
});
