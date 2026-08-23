import { HandLandmark, Vec3 } from '../core/types';
import { GestureMetrics, GestureRecognizer } from './GestureRecognizer';

export type SyntheticGestureMode = 'idle' | 'fist_cycle' | 'pinch' | 'swipe_right' | 'swipe_left' | 'tilt_cycle';

/**
 * SyntheticGestureSimulator
 * Programmatic hand skeleton and landmark generator for deterministic headless testing,
 * stress verification, and automated playback.
 */
export class SyntheticGestureSimulator {
  public mode: SyntheticGestureMode = 'idle';
  public time: number = 0;

  constructor(initialMode: SyntheticGestureMode = 'idle') {
    this.mode = initialMode;
    this.time = 0;
  }

  public setMode(mode: SyntheticGestureMode): void {
    this.mode = mode;
  }

  public reset(): void {
    this.time = 0;
    this.mode = 'idle';
  }

  /**
   * Generates standard 21-landmark open palm facing forward.
   */
  public static createOpenHand(center: Vec3 = { x: 0.5, y: 0.5, z: 0.0 }): HandLandmark[] {
    const landmarks: HandLandmark[] = [];
    const wrist: HandLandmark = { x: center.x, y: center.y + 0.12, z: center.z };
    landmarks.push(wrist); // 0: Wrist

    // Thumb (1..4)
    landmarks.push({ x: center.x - 0.04, y: center.y + 0.08, z: center.z - 0.01 }); // 1: CMC
    landmarks.push({ x: center.x - 0.07, y: center.y + 0.04, z: center.z - 0.02 }); // 2: MCP
    landmarks.push({ x: center.x - 0.09, y: center.y + 0.01, z: center.z - 0.03 }); // 3: IP
    landmarks.push({ x: center.x - 0.11, y: center.y - 0.02, z: center.z - 0.03 }); // 4: Tip

    // Index (5..8)
    landmarks.push({ x: center.x - 0.04, y: center.y + 0.01, z: center.z }); // 5: MCP
    landmarks.push({ x: center.x - 0.04, y: center.y - 0.06, z: center.z }); // 6: PIP
    landmarks.push({ x: center.x - 0.04, y: center.y - 0.11, z: center.z }); // 7: DIP
    landmarks.push({ x: center.x - 0.04, y: center.y - 0.15, z: center.z }); // 8: Tip

    // Middle (9..12)
    landmarks.push({ x: center.x, y: center.y, z: center.z }); // 9: MCP
    landmarks.push({ x: center.x, y: center.y - 0.08, z: center.z }); // 10: PIP
    landmarks.push({ x: center.x, y: center.y - 0.13, z: center.z }); // 11: DIP
    landmarks.push({ x: center.x, y: center.y - 0.17, z: center.z }); // 12: Tip

    // Ring (13..16)
    landmarks.push({ x: center.x + 0.04, y: center.y + 0.02, z: center.z }); // 13: MCP
    landmarks.push({ x: center.x + 0.04, y: center.y - 0.05, z: center.z }); // 14: PIP
    landmarks.push({ x: center.x + 0.05, y: center.y - 0.10, z: center.z }); // 15: DIP
    landmarks.push({ x: center.x + 0.05, y: center.y - 0.14, z: center.z }); // 16: Tip

    // Pinky (17..20)
    landmarks.push({ x: center.x + 0.07, y: center.y + 0.04, z: center.z }); // 17: MCP
    landmarks.push({ x: center.x + 0.08, y: center.y - 0.02, z: center.z }); // 18: PIP
    landmarks.push({ x: center.x + 0.09, y: center.y - 0.06, z: center.z }); // 19: DIP
    landmarks.push({ x: center.x + 0.09, y: center.y - 0.10, z: center.z }); // 20: Tip

    return landmarks;
  }

  /**
   * Generates standard 21-landmark clenched fist.
   * Fingertips fold back tightly towards palm base.
   */
  public static createFist(center: Vec3 = { x: 0.5, y: 0.5, z: 0.0 }): HandLandmark[] {
    const landmarks: HandLandmark[] = [];
    const wrist: HandLandmark = { x: center.x, y: center.y + 0.12, z: center.z };
    landmarks.push(wrist); // 0: Wrist

    // Thumb curled over fingers (1..4)
    landmarks.push({ x: center.x - 0.03, y: center.y + 0.08, z: center.z + 0.01 });
    landmarks.push({ x: center.x - 0.04, y: center.y + 0.05, z: center.z + 0.02 });
    landmarks.push({ x: center.x - 0.01, y: center.y + 0.04, z: center.z + 0.03 });
    landmarks.push({ x: center.x + 0.01, y: center.y + 0.04, z: center.z + 0.03 }); // 4: Tip curled in

    // Index curled (5..8)
    landmarks.push({ x: center.x - 0.03, y: center.y + 0.02, z: center.z });
    landmarks.push({ x: center.x - 0.03, y: center.y - 0.01, z: center.z + 0.02 });
    landmarks.push({ x: center.x - 0.03, y: center.y + 0.03, z: center.z + 0.02 });
    landmarks.push({ x: center.x - 0.03, y: center.y + 0.06, z: center.z + 0.01 }); // 8: Tip curled to palm

    // Middle curled (9..12)
    landmarks.push({ x: center.x, y: center.y + 0.01, z: center.z });
    landmarks.push({ x: center.x, y: center.y - 0.02, z: center.z + 0.02 });
    landmarks.push({ x: center.x, y: center.y + 0.02, z: center.z + 0.02 });
    landmarks.push({ x: center.x, y: center.y + 0.05, z: center.z + 0.01 }); // 12: Tip curled to palm

    // Ring curled (13..16)
    landmarks.push({ x: center.x + 0.03, y: center.y + 0.02, z: center.z });
    landmarks.push({ x: center.x + 0.03, y: center.y - 0.01, z: center.z + 0.02 });
    landmarks.push({ x: center.x + 0.03, y: center.y + 0.03, z: center.z + 0.02 });
    landmarks.push({ x: center.x + 0.03, y: center.y + 0.06, z: center.z + 0.01 }); // 16: Tip curled to palm

    // Pinky curled (17..20)
    landmarks.push({ x: center.x + 0.05, y: center.y + 0.03, z: center.z });
    landmarks.push({ x: center.x + 0.05, y: center.y + 0.01, z: center.z + 0.02 });
    landmarks.push({ x: center.x + 0.05, y: center.y + 0.04, z: center.z + 0.02 });
    landmarks.push({ x: center.x + 0.05, y: center.y + 0.07, z: center.z + 0.01 }); // 20: Tip curled to palm

    return landmarks;
  }

  /**
   * Generates Two-Finger Pinch gesture between thumb (4) and index (8).
   * @param pinchAmount 0.0 = wide open, 1.0 = touching
   */
  public static createPinchHand(center: Vec3 = { x: 0.5, y: 0.5, z: 0.0 }, pinchAmount: number = 1.0): HandLandmark[] {
    const hand = SyntheticGestureSimulator.createOpenHand(center);
    const targetX = center.x - 0.06;
    const targetY = center.y - 0.05;

    hand[4].x = hand[4].x + (targetX - hand[4].x) * pinchAmount;
    hand[4].y = hand[4].y + (targetY - hand[4].y) * pinchAmount;

    hand[8].x = hand[8].x + (targetX - hand[8].x) * pinchAmount;
    hand[8].y = hand[8].y + (targetY - hand[8].y) * pinchAmount;

    return hand;
  }

  /**
   * Applies 3D Euler rotation around wrist origin.
   */
  public static rotateHand(
    landmarks: HandLandmark[],
    yawRad: number = 0,
    pitchRad: number = 0,
    rollRad: number = 0
  ): HandLandmark[] {
    if (!landmarks || landmarks.length === 0) return [];
    const center = landmarks[0];

    return landmarks.map((lm) => {
      let dx = lm.x - center.x;
      let dy = lm.y - center.y;
      let dz = (lm.z ?? 0) - (center.z ?? 0);

      // 1. Pitch (X axis)
      if (pitchRad !== 0) {
        const cosP = Math.cos(pitchRad);
        const sinP = Math.sin(pitchRad);
        const yNew = dy * cosP - dz * sinP;
        const zNew = dy * sinP + dz * cosP;
        dy = yNew;
        dz = zNew;
      }

      // 2. Yaw (Y axis)
      if (yawRad !== 0) {
        const cosY = Math.cos(yawRad);
        const sinY = Math.sin(yawRad);
        const xNew = dx * cosY + dz * sinY;
        const zNew = -dx * sinY + dz * cosY;
        dx = xNew;
        dz = zNew;
      }

      // 3. Roll (Z axis)
      if (rollRad !== 0) {
        const cosR = Math.cos(rollRad);
        const sinR = Math.sin(rollRad);
        const xNew = dx * cosR - dy * sinR;
        const yNew = dx * sinR + dy * cosR;
        dx = xNew;
        dy = yNew;
      }

      return {
        x: center.x + dx,
        y: center.y + dy,
        z: center.z + dz,
      };
    });
  }

  /**
   * Generates a 12-frame sliding window swipe sequence.
   */
  public static createSwipeSequence(
    direction: 'left' | 'right',
    frames: number = 12,
    speed: number = 0.05
  ): HandLandmark[][] {
    const sequence: HandLandmark[][] = [];
    const dirSign = direction === 'right' ? 1 : -1;
    const startX = direction === 'right' ? 0.2 : 0.8;

    for (let i = 0; i < frames; i++) {
      const posX = startX + dirSign * (i * speed);
      const hand = SyntheticGestureSimulator.createOpenHand({ x: posX, y: 0.5, z: 0.0 });
      sequence.push(hand);
    }
    return sequence;
  }

  public static analyzeLandmarks(lm: HandLandmark[]): GestureMetrics {
    return GestureRecognizer.analyzeLandmarks(lm);
  }

  /**
   * Generates a single dynamic animation frame according to the current mode.
   */
  public generateFrame(dt: number): HandLandmark[] {
    this.time += dt;
    const t = this.time;

    let center = { x: 0.5, y: 0.5, z: 0.0 };
    let hand: HandLandmark[];

    switch (this.mode) {
      case 'fist_cycle': {
        const openScalar = (Math.sin(t * 2.0) + 1.0) / 2.0; // [0, 1]
        const openHand = SyntheticGestureSimulator.createOpenHand(center);
        const fistHand = SyntheticGestureSimulator.createFist(center);
        hand = openHand.map((pt, idx) => ({
          x: fistHand[idx].x + (pt.x - fistHand[idx].x) * openScalar,
          y: fistHand[idx].y + (pt.y - fistHand[idx].y) * openScalar,
          z: fistHand[idx].z + (pt.z - fistHand[idx].z) * openScalar,
        }));
        break;
      }
      case 'pinch': {
        const pinchAmount = (Math.sin(t * 3.0) + 1.0) / 2.0;
        hand = SyntheticGestureSimulator.createPinchHand(center, pinchAmount);
        break;
      }
      case 'tilt_cycle': {
        const rollAngle = Math.sin(t * 1.5) * 0.6; // Roll +/- 35 deg
        const pitchAngle = Math.cos(t * 1.5) * 0.4;
        const baseHand = SyntheticGestureSimulator.createOpenHand(center);
        hand = SyntheticGestureSimulator.rotateHand(baseHand, 0, pitchAngle, rollAngle);
        break;
      }
      case 'swipe_right': {
        const swipeX = 0.2 + ((t * 2.5) % 1.0) * 0.6;
        hand = SyntheticGestureSimulator.createOpenHand({ x: swipeX, y: 0.5, z: 0.0 });
        break;
      }
      case 'swipe_left': {
        const swipeX = 0.8 - ((t * 2.5) % 1.0) * 0.6;
        hand = SyntheticGestureSimulator.createOpenHand({ x: swipeX, y: 0.5, z: 0.0 });
        break;
      }
      case 'idle':
      default: {
        const subtleRoll = Math.sin(t * 0.4) * 0.05;
        const baseHand = SyntheticGestureSimulator.createOpenHand(center);
        hand = SyntheticGestureSimulator.rotateHand(baseHand, 0, 0, subtleRoll);
        break;
      }
    }

    return hand;
  }
}
