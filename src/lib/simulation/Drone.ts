import { clamp, wrapAngle, rad } from '@/lib/utils/math';
import type { DroneState } from './types';

export class Drone {
  state: DroneState;

  readonly mass = 1.0;
  readonly g = 9.81;
  readonly Ix = 0.025;
  readonly Iy = 0.025;
  readonly Iz = 0.045;
  readonly dragX = 0.30;
  readonly dragY = 0.30;
  readonly dragZ = 0.35;
  readonly angularDrag = 0.08;
  readonly armLength = 0.20;
  readonly motorYawCoefficient = 0.02;
  readonly maxMotorThrust = 6.0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): DroneState {
    return {
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      roll: 0, pitch: 0, yaw: 0,
      p: 0, q: 0, r: 0,
      motorThrusts: [0, 0, 0, 0],
    };
  }

  reset(): void {
    this.state = this.createInitialState();
  }

  // Rotation matrix body -> world (ZYX Euler)
  private rotationMatrix(): number[][] {
    const { roll, pitch, yaw } = this.state;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);

    return [
      [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
      [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
      [-sp, cp * sr, cp * cr],
    ];
  }

  private matVecMul(mat: number[][], vec: number[]): number[] {
    return [
      mat[0][0] * vec[0] + mat[0][1] * vec[1] + mat[0][2] * vec[2],
      mat[1][0] * vec[0] + mat[1][1] * vec[1] + mat[1][2] * vec[2],
      mat[2][0] * vec[0] + mat[2][1] * vec[1] + mat[2][2] * vec[2],
    ];
  }

  mixAndSaturate(
    thrust: number,
    rollTorque: number,
    pitchTorque: number,
    yawTorque: number
  ): { thrust: number; rollTorque: number; pitchTorque: number; yawTorque: number } {
    const l = this.armLength;
    const k = this.motorYawCoefficient;

    const m1 = thrust / 4 - rollTorque / (4 * l) + pitchTorque / (4 * l) + yawTorque / (4 * k);
    const m2 = thrust / 4 + rollTorque / (4 * l) + pitchTorque / (4 * l) - yawTorque / (4 * k);
    const m3 = thrust / 4 - rollTorque / (4 * l) - pitchTorque / (4 * l) - yawTorque / (4 * k);
    const m4 = thrust / 4 + rollTorque / (4 * l) - pitchTorque / (4 * l) + yawTorque / (4 * k);

    const motors: [number, number, number, number] = [
      clamp(m1, 0, this.maxMotorThrust),
      clamp(m2, 0, this.maxMotorThrust),
      clamp(m3, 0, this.maxMotorThrust),
      clamp(m4, 0, this.maxMotorThrust),
    ];

    this.state.motorThrusts = motors;

    const thrustActual = motors[0] + motors[1] + motors[2] + motors[3];
    const rollActual = l * (-motors[0] + motors[1] - motors[2] + motors[3]);
    const pitchActual = l * (motors[0] + motors[1] - motors[2] - motors[3]);
    const yawActual = k * (motors[0] - motors[1] - motors[2] + motors[3]);

    return { thrust: thrustActual, rollTorque: rollActual, pitchTorque: pitchActual, yawTorque: yawActual };
  }

  update(
    thrust: number,
    rollTorque: number,
    pitchTorque: number,
    yawTorque: number,
    distX: number,
    distY: number,
    distZ: number,
    distRoll: number,
    distPitch: number,
    distYaw: number,
    dt: number
  ): void {
    const d = this.state;

    const mixed = this.mixAndSaturate(thrust, rollTorque, pitchTorque, yawTorque);

    // Rotational dynamics
    const rollAcc =
      (mixed.rollTorque + distRoll - this.angularDrag * d.p + (this.Iy - this.Iz) * d.q * d.r) / this.Ix;
    const pitchAcc =
      (mixed.pitchTorque + distPitch - this.angularDrag * d.q + (this.Iz - this.Ix) * d.p * d.r) / this.Iy;
    const yawAcc =
      (mixed.yawTorque + distYaw - this.angularDrag * d.r + (this.Ix - this.Iy) * d.p * d.q) / this.Iz;

    d.p = clamp(d.p + rollAcc * dt, -25, 25);
    d.q = clamp(d.q + pitchAcc * dt, -25, 25);
    d.r = clamp(d.r + yawAcc * dt, -25, 25);

    // Body rates -> Euler angle rates
    let cosPitch = Math.cos(d.pitch);
    if (Math.abs(cosPitch) < 1e-3) cosPitch = cosPitch >= 0 ? 1e-3 : -1e-3;
    const sinRoll = Math.sin(d.roll);
    const cosRoll = Math.cos(d.roll);
    const tanPitch = Math.sin(d.pitch) / cosPitch;

    const rollDot = d.p + sinRoll * tanPitch * d.q + cosRoll * tanPitch * d.r;
    const pitchDot = cosRoll * d.q - sinRoll * d.r;
    const yawDot = (sinRoll / cosPitch) * d.q + (cosRoll / cosPitch) * d.r;

    d.roll = wrapAngle(d.roll + rollDot * dt);
    d.pitch = clamp(d.pitch + pitchDot * dt, rad(-89), rad(89));
    d.yaw = wrapAngle(d.yaw + yawDot * dt);

    // Thrust -> world frame
    const R = this.rotationMatrix();
    const thrustWorld = this.matVecMul(R, [0, 0, mixed.thrust]);

    // Translational forces
    const fx = thrustWorld[0] - this.dragX * d.vx + distX;
    const fy = thrustWorld[1] - this.dragY * d.vy + distY;
    const fz = thrustWorld[2] - this.mass * this.g - this.dragZ * d.vz + distZ;

    d.vx = clamp(d.vx + (fx / this.mass) * dt, -15, 15);
    d.vy = clamp(d.vy + (fy / this.mass) * dt, -15, 15);
    d.vz = clamp(d.vz + (fz / this.mass) * dt, -10, 10);

    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.z += d.vz * dt;

    // Ground contact
    if (d.z < 0) {
      d.z = 0;
      if (d.vz < 0) d.vz = 0;
    }
  }
}
