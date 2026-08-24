import { clamp, wrapAngle, rad } from '@/lib/utils/math';
import type { DroneState, DroneConfig, MotorConfig, InertiaConfig, DragConfig, ControlLimits } from './types';

function smoothDth(dt: number, tau: number): number {
  if (tau <= 0) return 1.0;
  return dt / (dt + tau);
}

export class Drone {
  state: DroneState;

  config: DroneConfig;

  // Derived from config
  mass: number;
  g: number;
  Ix: number;
  Iy: number;
  Iz: number;
  dragX: number;
  dragY: number;
  dragZ: number;
  angularDrag: number;
  quadraticDragXY: number;
  quadraticDragZ: number;
  armLength: number;
  motorYawCoefficient: number;
  maxMotorThrust: number;
  motorTimeConstant: number;
  groundEffectStrength: number;
  groundEffectHeight: number;
  controlLimits: ControlLimits;

  constructor(config?: DroneConfig) {
    this.config = config ?? {
      id: 'default', name: 'Default', description: '',
      mass: 1.0,
      inertia: { ix: 0.025, iy: 0.025, iz: 0.045 },
      motor: { maxThrust: 6.0, timeConstant: 0.008, yawCoefficient: 0.02, armLength: 0.20 },
      drag: { linearXY: 0.30, linearZ: 0.35, angular: 0.08, quadraticXY: 0.02, quadraticZ: 0.03 },
      controlLimits: { maxTiltAngle: 35, maxRateRoll: 25, maxRatePitch: 25, maxRateYaw: 25, maxThrustRate: 8 },
      groundEffectStrength: 0.3,
      groundEffectHeight: 0.5,
      pidGains: {},
    };

    this.mass = this.config.mass;
    this.g = 9.81;
    this.Ix = this.config.inertia.ix;
    this.Iy = this.config.inertia.iy;
    this.Iz = this.config.inertia.iz;
    this.dragX = this.config.drag.linearXY;
    this.dragY = this.config.drag.linearXY;
    this.dragZ = this.config.drag.linearZ;
    this.angularDrag = this.config.drag.angular;
    this.quadraticDragXY = this.config.drag.quadraticXY;
    this.quadraticDragZ = this.config.drag.quadraticZ;
    this.armLength = this.config.motor.armLength;
    this.motorYawCoefficient = this.config.motor.yawCoefficient;
    this.maxMotorThrust = this.config.motor.maxThrust;
    this.motorTimeConstant = this.config.motor.timeConstant;
    this.groundEffectStrength = this.config.groundEffectStrength;
    this.groundEffectHeight = this.config.groundEffectHeight;
    this.controlLimits = this.config.controlLimits;

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

  applyConfig(config: DroneConfig): void {
    this.config = config;
    this.mass = config.mass;
    this.Ix = config.inertia.ix;
    this.Iy = config.inertia.iy;
    this.Iz = config.inertia.iz;
    this.dragX = config.drag.linearXY;
    this.dragY = config.drag.linearXY;
    this.dragZ = config.drag.linearZ;
    this.angularDrag = config.drag.angular;
    this.quadraticDragXY = config.drag.quadraticXY;
    this.quadraticDragZ = config.drag.quadraticZ;
    this.armLength = config.motor.armLength;
    this.motorYawCoefficient = config.motor.yawCoefficient;
    this.maxMotorThrust = config.motor.maxThrust;
    this.motorTimeConstant = config.motor.timeConstant;
    this.groundEffectStrength = config.groundEffectStrength;
    this.groundEffectHeight = config.groundEffectHeight;
    this.controlLimits = config.controlLimits;
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

  private computeDrag(vx: number, vy: number, vz: number): [number, number, number] {
    const vH = Math.hypot(vx, vy);
    const dragXLin = this.dragX * vx;
    const dragYLin = this.dragY * vy;
    const dragZLin = this.dragZ * vz;

    let dragXQuad = 0, dragYQuad = 0, dragZQuad = 0;
    if (vH > 0.001) {
      dragXQuad = this.quadraticDragXY * vH * vx;
      dragYQuad = this.quadraticDragXY * vH * vy;
    }
    if (Math.abs(vz) > 0.001) {
      dragZQuad = this.quadraticDragZ * Math.abs(vz) * vz;
    }

    return [
      -(dragXLin + dragXQuad),
      -(dragYLin + dragYQuad),
      -(dragZLin + dragZQuad),
    ];
  }

  private computeGroundEffect(): number {
    if (this.state.z <= 0) return 1.0;
    if (this.state.z < this.groundEffectHeight) {
      return 1.0 + this.groundEffectStrength * (1.0 - this.state.z / this.groundEffectHeight);
    }
    return 1.0;
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

    const commands: [number, number, number, number] = [
      clamp(m1, 0, this.maxMotorThrust),
      clamp(m2, 0, this.maxMotorThrust),
      clamp(m3, 0, this.maxMotorThrust),
      clamp(m4, 0, this.maxMotorThrust),
    ];

    // Motor dynamics: low-pass filter
    const alpha = smoothDth(0.01, this.motorTimeConstant);
    for (let i = 0; i < 4; i++) {
      this.state.motorThrusts[i] += (commands[i] - this.state.motorThrusts[i]) * alpha;
    }

    // Re-derive actual forces from filtered values
    const motors = this.state.motorThrusts;
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

    d.p = clamp(d.p + rollAcc * dt, -this.controlLimits.maxRateRoll, this.controlLimits.maxRateRoll);
    d.q = clamp(d.q + pitchAcc * dt, -this.controlLimits.maxRatePitch, this.controlLimits.maxRatePitch);
    d.r = clamp(d.r + yawAcc * dt, -this.controlLimits.maxRateYaw, this.controlLimits.maxRateYaw);

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

    const maxTilt = rad(this.controlLimits.maxTiltAngle);
    d.pitch = clamp(d.pitch + pitchDot * dt, -maxTilt, maxTilt);
    d.yaw = wrapAngle(d.yaw + yawDot * dt);

    // Thrust -> world frame
    const R = this.rotationMatrix();
    const thrustWorld = this.matVecMul(R, [0, 0, mixed.thrust]);

    // Ground effect
    const groundEffect = this.computeGroundEffect();
    thrustWorld[2] *= groundEffect;

    // Non-linear drag
    const [dragFx, dragFy, dragFz] = this.computeDrag(d.vx, d.vy, d.vz);

    // Translational forces
    const fx = thrustWorld[0] + dragFx + distX;
    const fy = thrustWorld[1] + dragFy + distY;
    const fz = thrustWorld[2] - this.mass * this.g + dragFz + distZ;

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
