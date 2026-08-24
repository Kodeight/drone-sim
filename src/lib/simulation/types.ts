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

// ─── Drone config types (matching PID2.py) ───────────────────────────────────

export interface MotorConfig {
  maxThrust: number;
  timeConstant: number;
  yawCoefficient: number;
  armLength: number;
}

export interface InertiaConfig {
  ix: number;
  iy: number;
  iz: number;
}

export interface DragConfig {
  linearXY: number;
  linearZ: number;
  angular: number;
  quadraticXY: number;
  quadraticZ: number;
}

export interface ControlLimits {
  maxTiltAngle: number;
  maxRateRoll: number;
  maxRatePitch: number;
  maxRateYaw: number;
  maxThrustRate: number;
}

export interface DroneConfig {
  id: string;
  name: string;
  description: string;
  mass: number;
  inertia: InertiaConfig;
  motor: MotorConfig;
  drag: DragConfig;
  controlLimits: ControlLimits;
  groundEffectStrength: number;
  groundEffectHeight: number;
  pidGains: Record<string, [number, number, number]>;
}

export interface EnvironmentPreset {
  id: string;
  name: string;
  description: string;
  gravity: number;
  airDensity: number;
  windSpeed: number;
  windDirection: number;
}

// ─── Drone presets (from PID2.py) ────────────────────────────────────────────

export const DRONE_PRESETS: Record<string, DroneConfig> = {
  tiny_whoop: {
    id: 'tiny_whoop',
    name: 'Tiny Whoop',
    description: '45mm micro drone for indoor FPV',
    mass: 0.022,
    inertia: { ix: 0.0002, iy: 0.0002, iz: 0.0004 },
    motor: { maxThrust: 0.05, timeConstant: 0.005, yawCoefficient: 0.001, armLength: 0.03 },
    drag: { linearXY: 0.05, linearZ: 0.06, angular: 0.01, quadraticXY: 0, quadraticZ: 0 },
    controlLimits: { maxTiltAngle: 45, maxRateRoll: 35, maxRatePitch: 35, maxRateYaw: 30, maxThrustRate: 8 },
    groundEffectStrength: 0.3, groundEffectHeight: 0.5,
    pidGains: { x: [0.5, 0.01, 0.3], y: [0.5, 0.01, 0.3], z: [2.0, 0.5, 1.5], roll: [3.0, 0.05, 0.3], pitch: [3.0, 0.05, 0.3], yaw: [1.5, 0.01, 0.2] },
  },
  racing_5inch: {
    id: 'racing_5inch',
    name: '5" Racing Drone',
    description: 'High-performance FPV racing quad',
    mass: 0.8,
    inertia: { ix: 0.008, iy: 0.008, iz: 0.014 },
    motor: { maxThrust: 2.5, timeConstant: 0.008, yawCoefficient: 0.015, armLength: 0.12 },
    drag: { linearXY: 0.4, linearZ: 0.5, angular: 0.05, quadraticXY: 0.03, quadraticZ: 0.04 },
    controlLimits: { maxTiltAngle: 65, maxRateRoll: 45, maxRatePitch: 45, maxRateYaw: 35, maxThrustRate: 15 },
    groundEffectStrength: 0.3, groundEffectHeight: 0.5,
    pidGains: { x: [2.0, 0.01, 1.5], y: [2.0, 0.01, 1.5], z: [6.0, 0.8, 3.5], roll: [15.0, 0.02, 2.0], pitch: [15.0, 0.02, 2.0], yaw: [8.0, 0.01, 1.2] },
  },
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic Drone',
    description: 'Professional camera drone, smooth and stable',
    mass: 0.895,
    inertia: { ix: 0.012, iy: 0.012, iz: 0.022 },
    motor: { maxThrust: 4.5, timeConstant: 0.010, yawCoefficient: 0.025, armLength: 0.18 },
    drag: { linearXY: 0.2, linearZ: 0.25, angular: 0.03, quadraticXY: 0.01, quadraticZ: 0.015 },
    controlLimits: { maxTiltAngle: 25, maxRateRoll: 15, maxRatePitch: 15, maxRateYaw: 10, maxThrustRate: 8 },
    groundEffectStrength: 0.3, groundEffectHeight: 0.5,
    pidGains: { x: [0.5, 0.03, 0.3], y: [0.5, 0.03, 0.3], z: [3.0, 0.5, 1.5], roll: [2.5, 0.05, 0.3], pitch: [2.5, 0.05, 0.3], yaw: [1.5, 0.02, 0.2] },
  },
  agricultural: {
    id: 'agricultural',
    name: 'Agricultural Drone',
    description: 'Heavy-lift crop spraying drone',
    mass: 25.0,
    inertia: { ix: 1.2, iy: 1.2, iz: 2.5 },
    motor: { maxThrust: 80.0, timeConstant: 0.015, yawCoefficient: 0.08, armLength: 0.5 },
    drag: { linearXY: 1.5, linearZ: 2.0, angular: 0.2, quadraticXY: 0.1, quadraticZ: 0.12 },
    controlLimits: { maxTiltAngle: 20, maxRateRoll: 10, maxRatePitch: 10, maxRateYaw: 5, maxThrustRate: 8 },
    groundEffectStrength: 0.3, groundEffectHeight: 0.5,
    pidGains: { x: [0.3, 0.05, 0.2], y: [0.3, 0.05, 0.2], z: [2.0, 0.3, 1.0], roll: [2.0, 0.03, 0.2], pitch: [2.0, 0.03, 0.2], yaw: [1.0, 0.01, 0.1] },
  },
  cargo: {
    id: 'cargo',
    name: 'Cargo Drone',
    description: 'Package delivery drone with extended range',
    mass: 15.0,
    inertia: { ix: 0.8, iy: 0.8, iz: 1.5 },
    motor: { maxThrust: 50.0, timeConstant: 0.020, yawCoefficient: 0.05, armLength: 0.6 },
    drag: { linearXY: 1.0, linearZ: 1.2, angular: 0.15, quadraticXY: 0.06, quadraticZ: 0.08 },
    controlLimits: { maxTiltAngle: 20, maxRateRoll: 8, maxRatePitch: 8, maxRateYaw: 5, maxThrustRate: 8 },
    groundEffectStrength: 0.3, groundEffectHeight: 0.5,
    pidGains: { x: [0.2, 0.03, 0.15], y: [0.2, 0.03, 0.15], z: [1.5, 0.2, 0.8], roll: [1.5, 0.02, 0.15], pitch: [1.5, 0.02, 0.15], yaw: [0.8, 0.01, 0.08] },
  },
  folding_backpack: {
    id: 'folding_backpack',
    name: 'Folding Backpack Drone',
    description: 'Ultra-compact travel drone',
    mass: 0.249,
    inertia: { ix: 0.003, iy: 0.003, iz: 0.006 },
    motor: { maxThrust: 1.2, timeConstant: 0.006, yawCoefficient: 0.008, armLength: 0.08 },
    drag: { linearXY: 0.15, linearZ: 0.18, angular: 0.02, quadraticXY: 0, quadraticZ: 0 },
    controlLimits: { maxTiltAngle: 30, maxRateRoll: 25, maxRatePitch: 25, maxRateYaw: 20, maxThrustRate: 8 },
    groundEffectStrength: 0.3, groundEffectHeight: 0.5,
    pidGains: { x: [0.6, 0.02, 0.5], y: [0.6, 0.02, 0.5], z: [2.5, 0.5, 1.8], roll: [3.0, 0.05, 0.4], pitch: [3.0, 0.05, 0.4], yaw: [2.0, 0.02, 0.3] },
  },
  custom: {
    id: 'custom',
    name: 'Custom Drone',
    description: 'User-defined configuration',
    mass: 0.895,
    inertia: { ix: 0.012, iy: 0.012, iz: 0.022 },
    motor: { maxThrust: 4.5, timeConstant: 0.010, yawCoefficient: 0.025, armLength: 0.18 },
    drag: { linearXY: 0.2, linearZ: 0.25, angular: 0.03, quadraticXY: 0.01, quadraticZ: 0.015 },
    controlLimits: { maxTiltAngle: 25, maxRateRoll: 15, maxRatePitch: 15, maxRateYaw: 10, maxThrustRate: 8 },
    groundEffectStrength: 0.3, groundEffectHeight: 0.5,
    pidGains: { x: [0.5, 0.03, 0.3], y: [0.5, 0.03, 0.3], z: [3.0, 0.5, 1.5], roll: [2.5, 0.05, 0.3], pitch: [2.5, 0.05, 0.3], yaw: [1.5, 0.02, 0.2] },
  },
};

// ─── Environment presets ─────────────────────────────────────────────────────

export const ENVIRONMENT_PRESETS: Record<string, EnvironmentPreset> = {
  calm: {
    id: 'calm', name: 'Calm', description: 'Still air, standard gravity',
    gravity: 9.81, airDensity: 1.225, windSpeed: 0, windDirection: 0,
  },
  breezy: {
    id: 'breezy', name: 'Breezy', description: 'Light breeze from the east',
    gravity: 9.81, airDensity: 1.225, windSpeed: 3, windDirection: 90,
  },
  windy: {
    id: 'windy', name: 'Windy', description: 'Strong crosswind',
    gravity: 9.81, airDensity: 1.225, windSpeed: 8, windDirection: 270,
  },
  storm: {
    id: 'storm', name: 'Storm', description: 'Heavy wind and turbulence',
    gravity: 9.81, airDensity: 1.15, windSpeed: 15, windDirection: 180,
  },
  high_altitude: {
    id: 'high_altitude', name: 'High Altitude', description: 'Thin air, reduced lift',
    gravity: 9.81, airDensity: 0.9, windSpeed: 5, windDirection: 0,
  },
  mars: {
    id: 'mars', name: 'Mars', description: 'Low gravity, thin atmosphere',
    gravity: 3.72, airDensity: 0.02, windSpeed: 7, windDirection: 45,
  },
};

// ─── PID presets ─────────────────────────────────────────────────────────────

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
