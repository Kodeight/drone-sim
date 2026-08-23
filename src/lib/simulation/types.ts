export interface DroneState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  roll: number;
  pitch: number;
  yaw: number;
  p: number;
  q: number;
  r: number;
  motorThrusts: [number, number, number, number];
}

export interface TargetState {
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
  autoHeading: boolean;
}

export interface PIDParams {
  kp: number;
  ki: number;
  kd: number;
}

export interface PIDState {
  X: PIDParams;
  Y: PIDParams;
  Z: PIDParams;
  Roll: PIDParams;
  Pitch: PIDParams;
  Yaw: PIDParams;
}

export interface DisturbanceState {
  forceX: number;
  forceY: number;
  forceZ: number;
  torqueRoll: number;
  torquePitch: number;
  torqueYaw: number;
}

export interface HistoryData {
  time: number[];
  x: number[];
  y: number[];
  z: number[];
  targetX: number[];
  targetY: number[];
  targetZ: number[];
  roll: number[];
  pitch: number[];
  yaw: number[];
  targetRoll: number[];
  targetPitch: number[];
  targetYaw: number[];
  vx: number[];
  vy: number[];
  vz: number[];
  motor1: number[];
  motor2: number[];
  motor3: number[];
  motor4: number[];
}

export type PIDAxis = 'X' | 'Y' | 'Z' | 'Roll' | 'Pitch' | 'Yaw';

export type SimulationStatus = 'STOPPED' | 'PAUSED' | 'TRACKING' | 'ON_TARGET';

export const PID_PRESETS = {
  Soft: {
    X: { kp: 0.5, ki: 0.0, kd: 0.6 },
    Y: { kp: 0.5, ki: 0.0, kd: 0.6 },
    Z: { kp: 3.0, ki: 0.5, kd: 2.0 },
    Roll: { kp: 2.5, ki: 0.02, kd: 0.35 },
    Pitch: { kp: 2.5, ki: 0.02, kd: 0.35 },
    Yaw: { kp: 1.5, ki: 0.01, kd: 0.30 },
  },
  Nominal: {
    X: { kp: 0.8, ki: 0.02, kd: 0.8 },
    Y: { kp: 0.8, ki: 0.02, kd: 0.8 },
    Z: { kp: 4.0, ki: 1.0, kd: 2.5 },
    Roll: { kp: 4.0, ki: 0.08, kd: 0.5 },
    Pitch: { kp: 4.0, ki: 0.08, kd: 0.5 },
    Yaw: { kp: 2.5, ki: 0.03, kd: 0.4 },
  },
  Aggressive: {
    X: { kp: 1.4, ki: 0.05, kd: 1.0 },
    Y: { kp: 1.4, ki: 0.05, kd: 1.0 },
    Z: { kp: 6.0, ki: 1.5, kd: 3.2 },
    Roll: { kp: 7.0, ki: 0.15, kd: 0.7 },
    Pitch: { kp: 7.0, ki: 0.15, kd: 0.7 },
    Yaw: { kp: 4.0, ki: 0.06, kd: 0.5 },
  },
} as const;

export const MAX_HISTORY = 12000;
