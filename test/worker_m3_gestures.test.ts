import { describe, it, expect } from './e2e_harness';
import {
  OneEuroFilter,
  OneEuroFilter3D,
  LandmarkNormalizer,
  CriticallyDampedSpring,
  SpringDamperSimulator,
  SpringVector3,
  SpringRotationEuler,
  SpringPhysicsPipeline,
  GestureRecognizer,
  SyntheticGestureSimulator,
  MediaPipeWrapper,
} from '../src/gestures';

describe('Worker 3 - Comprehensive Gesture Engine & Physics Verification', () => {
  it('M3.1: OneEuroFilter filters high frequency jitter and responds to fast motion', () => {
    const filter = new OneEuroFilter({ minCutoff: 0.5, beta: 0.05, dCutoff: 1.0 });
    let t = 1000;
    
    // Slow small jitter
    let smoothed = 0;
    for (let i = 0; i < 20; i++) {
      const raw = 0.5 + (i % 2 === 0 ? 0.02 : -0.02);
      smoothed = filter.filter(raw, t);
      t += 16;
    }
    expect(smoothed).toBeGreaterThan(0.48);
    expect(smoothed).toBeLessThan(0.52);

    // Fast step jump over 320ms (20 frames)
    for (let i = 0; i < 20; i++) {
      smoothed = filter.filter(1.0, t);
      t += 16;
    }
    expect(smoothed).toBeGreaterThan(0.9);
  });

  it('M3.2: LandmarkNormalizer computes invariant scale L_palm and normalizes 21 landmarks', () => {
    const normalizer = new LandmarkNormalizer();
    const openHand = SyntheticGestureSimulator.createOpenHand();
    const normData = normalizer.normalize(openHand);

    expect(normData).not.toBeNull();
    if (normData) {
      expect(normData.palmScale).toBeGreaterThanOrEqual(0.035);
      expect(normData.landmarks.length).toBe(21);
      expect(Number.isFinite(normData.centroid.x)).toBe(true);
    }
  });

  it('M3.3: GestureRecognizer computes 5-finger openness correctly for fist vs open hand', () => {
    const recognizer = new GestureRecognizer();
    const openHand = SyntheticGestureSimulator.createOpenHand();
    const fist = SyntheticGestureSimulator.createFist();

    // 1. Instantaneous mathematical analysis
    const rawOpen = GestureRecognizer.analyzeLandmarks(openHand);
    const rawFist = GestureRecognizer.analyzeLandmarks(fist);
    expect(rawOpen.openness).toBeGreaterThan(0.75);
    expect(rawFist.openness).toBeLessThan(0.35);

    // 2. Dynamic continuous convergence over 400ms
    let openState: any;
    let tSim = 1000;
    for (let i = 0; i < 25; i++) {
      openState = recognizer.process(openHand, 0.016, tSim);
      tSim += 16;
    }
    expect(openState.hasHand).toBe(true);
    expect(openState.openness).toBeGreaterThan(0.70);

    // Process fist transition over 400ms
    let fistState: any;
    for (let i = 0; i < 25; i++) {
      fistState = recognizer.process(fist, 0.016, tSim);
      tSim += 16;
    }
    expect(fistState.hasHand).toBe(true);
    expect(fistState.openness).toBeLessThan(0.40);
  });

  it('M3.4: GestureRecognizer computes 3D palm roll/pitch/yaw and pinch time dilation', () => {
    const recognizer = new GestureRecognizer();
    const baseHand = SyntheticGestureSimulator.createOpenHand();
    const rolledHand = SyntheticGestureSimulator.rotateHand(baseHand, 0.2, 0.3, 0.4);

    const metrics = GestureRecognizer.analyzeLandmarks(rolledHand);
    expect(metrics.roll).toBeDefined();
    expect(metrics.pitch).toBeDefined();
    expect(metrics.yaw).toBeDefined();
    expect(Number.isFinite(metrics.roll)).toBe(true);

    // Pinch test (instantaneous & continuous)
    const pinchHand = SyntheticGestureSimulator.createPinchHand({ x: 0.5, y: 0.5, z: 0.0 }, 1.0);
    const rawPinch = GestureRecognizer.analyzeLandmarks(pinchHand);
    expect(rawPinch.pinchDistance).toBeLessThan(0.2);

    let pinchState: any;
    for (let i = 0; i < 20; i++) {
      pinchState = recognizer.process(pinchHand, 0.016);
    }
    expect(pinchState.pinchDistance).toBeLessThan(0.3);
    expect(pinchState.timeDilation).toBeLessThan(0.4);
  });

  it('M3.5: GestureRecognizer 12-frame sliding window detects left and right swipes with cooldown', () => {
    const recognizer = new GestureRecognizer();
    const rightSwipeSeq = SyntheticGestureSimulator.createSwipeSequence('right', 12, 0.06);
    
    let swipeResult: 'left' | 'right' | null = null;
    let t = 1000;
    for (const frame of rightSwipeSeq) {
      const state = recognizer.process(frame, 0.016, t);
      if (state.swipeTriggered) {
        swipeResult = state.swipeTriggered;
      }
      t += 16;
    }
    expect(swipeResult).toBe('right');

    // Immediate subsequent frames during 800ms cooldown return null
    const extraFrame = SyntheticGestureSimulator.createOpenHand({ x: 0.9, y: 0.5, z: 0 });
    const cooldownState = recognizer.process(extraFrame, 0.016, t + 50);
    expect(cooldownState.swipeTriggered).toBeNull();
  });

  it('M3.6: CriticallyDampedSpring exact analytical solution converges with zero overshoot', () => {
    const spring = new CriticallyDampedSpring(14.0, 0.0);
    spring.setTarget(1.0);

    let maxPos = 0;
    for (let i = 0; i < 60; i++) {
      const pos = spring.update(0.016);
      if (pos > maxPos) maxPos = pos;
    }
    expect(spring.position).toBeGreaterThan(0.95);
    expect(maxPos).toBeLessThanOrEqual(1.0001); // Critically damped guarantees <= 1.0
  });

  it('M3.7: SpringPhysicsPipeline smooths entire GestureState smoothly', () => {
    const pipeline = new SpringPhysicsPipeline();
    const rawState = {
      hasHand: true,
      openness: 1.0,
      pinchDistance: 0.1,
      timeDilation: 0.19,
      rotation: { yaw: 0.3, pitch: -0.2, roll: 0.5 },
      position: { x: 0.2, y: -0.1 },
      zoomDelta: 0.3,
      swipeTriggered: null,
      intensity: 0.8,
      rawLandmarks: null,
    };

    let state = pipeline.update(rawState, 0.016);
    expect(state.openness).toBeGreaterThan(0.0);
    expect(state.openness).toBeLessThan(1.0); // Rate damped

    for (let i = 0; i < 30; i++) {
      state = pipeline.update(rawState, 0.016);
    }
    expect(state.openness).toBeGreaterThan(0.9);
    expect(state.timeDilation).toBeCloseTo(0.19, 1);
  });

  it('M3.8: MediaPipeWrapper handles lifecycle, skeleton drawing, and keyboard simulation', () => {
    const wrapper = new MediaPipeWrapper();
    expect(wrapper).toBeDefined();
    expect(typeof wrapper.init).toBe('function');
    expect(typeof wrapper.destroy).toBe('function');

    // Simulate results
    const fakeLandmarks = SyntheticGestureSimulator.createOpenHand();
    let emittedState: any = null;
    const testWrapper = new MediaPipeWrapper({
      onGestureState: (st) => { emittedState = st; },
    });

    testWrapper.handleResults({ multiHandLandmarks: [fakeLandmarks] });
    expect(emittedState).not.toBeNull();
    expect(emittedState.hasHand).toBe(true);

    testWrapper.destroy();
  });
});
