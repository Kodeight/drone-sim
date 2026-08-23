import { create } from 'zustand';
import { Drone } from '@/lib/simulation/Drone';
import { PID } from '@/lib/simulation/PID';
import { deg, rad, hypot } from '@/lib/utils/math';
import {
  DroneState,
  TargetState,
  PIDState,
  PIDParams,
  DisturbanceState,
  HistoryData,
  SimulationStatus,
  MAX_HISTORY,
} from '@/lib/simulation/types';

interface SimulationStore {
  drone: DroneState;
  target: TargetState;
  pid: PIDState;
  disturbances: DisturbanceState;
  isRunning: boolean;
  speed: number;
  time: number;
  status: SimulationStatus;
  distanceToTarget: number;
  history: HistoryData;
  activeTab: 'overview' | 'graphs';

  startSimulation: () => void;
  pauseSimulation: () => void;
  toggleSimulation: () => void;
  resetSimulation: () => void;
  setSpeed: (speed: number) => void;
  updateTarget: (axis: string, value: number) => void;
  updatePID: (axis: string, param: string, value: number) => void;
  updateDisturbance: (axis: string, value: number) => void;
  applyPreset: (preset: Record<string, PIDParams>) => void;
  step: (dt: number) => void;
  exportCSV: () => void;
  setActiveTab: (tab: 'overview' | 'graphs') => void;
}

function createEmptyHistory(): HistoryData {
  return {
    time: [], x: [], y: [], z: [],
    targetX: [], targetY: [], targetZ: [],
    roll: [], pitch: [], yaw: [],
    targetRoll: [], targetPitch: [], targetYaw: [],
    vx: [], vy: [], vz: [],
    motor1: [], motor2: [], motor3: [], motor4: [],
  };
}

const drone = new Drone();

const pidControllers = {
  X: new PID(0.8, 0.02, 0.8, 3, 4),
  Y: new PID(0.8, 0.02, 0.8, 3, 4),
  Z: new PID(4.0, 1.0, 2.5, 5, 8),
  Roll: new PID(4.0, 0.08, 0.5, 1, 1),
  Pitch: new PID(4.0, 0.08, 0.5, 1, 1),
  Yaw: new PID(2.5, 0.03, 0.4, 1, 1, true),
};

function recordHistory(history: HistoryData, time: number, drone: DroneState, target: TargetState) {
  const h = history;
  h.time.push(time);
  h.x.push(drone.x); h.y.push(drone.y); h.z.push(drone.z);
  h.targetX.push(target.x); h.targetY.push(target.y); h.targetZ.push(target.z);
  h.roll.push(deg(drone.roll)); h.pitch.push(deg(drone.pitch)); h.yaw.push(deg(drone.yaw));
  h.targetRoll.push(target.roll); h.targetPitch.push(target.pitch); h.targetYaw.push(target.yaw);
  h.vx.push(drone.vx); h.vy.push(drone.vy); h.vz.push(drone.vz);
  h.motor1.push(drone.motorThrusts[0]); h.motor2.push(drone.motorThrusts[1]);
  h.motor3.push(drone.motorThrusts[2]); h.motor4.push(drone.motorThrusts[3]);

  if (h.time.length > MAX_HISTORY) {
    for (const key of Object.keys(h) as (keyof HistoryData)[]) {
      (h[key] as number[]) = (h[key] as number[]).slice(-MAX_HISTORY);
    }
  }
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  drone: drone.state,
  target: { x: 0, y: 0, z: 3, roll: 0, pitch: 0, yaw: 0, autoHeading: true },
  pid: {
    X: { kp: 0.8, ki: 0.02, kd: 0.8 },
    Y: { kp: 0.8, ki: 0.02, kd: 0.8 },
    Z: { kp: 4.0, ki: 1.0, kd: 2.5 },
    Roll: { kp: 4.0, ki: 0.08, kd: 0.5 },
    Pitch: { kp: 4.0, ki: 0.08, kd: 0.5 },
    Yaw: { kp: 2.5, ki: 0.03, kd: 0.4 },
  },
  disturbances: { forceX: 0, forceY: 0, forceZ: 0, torqueRoll: 0, torquePitch: 0, torqueYaw: 0 },
  isRunning: false,
  speed: 1.0,
  time: 0,
  status: 'STOPPED',
  distanceToTarget: 0,
  history: createEmptyHistory(),
  activeTab: 'overview',

  startSimulation: () => set({ isRunning: true }),
  pauseSimulation: () => set({ isRunning: false, status: 'PAUSED' }),
  toggleSimulation: () => {
    const { isRunning } = get();
    if (isRunning) {
      set({ isRunning: false, status: 'PAUSED' });
    } else {
      set({ isRunning: true });
    }
  },

  resetSimulation: () => {
    drone.reset();
    Object.values(pidControllers).forEach((p) => p.reset());
    set({
      isRunning: false,
      time: 0,
      status: 'STOPPED',
      drone: drone.state,
      history: createEmptyHistory(),
      distanceToTarget: 0,
    });
  },

  setSpeed: (speed) => set({ speed }),

  updateTarget: (axis, value) =>
    set((s) => ({
      target: { ...s.target, [axis]: value },
    })),

  updatePID: (axis, param, value) =>
    set((s) => {
      const controller = pidControllers[axis as keyof typeof pidControllers];
      if (controller) {
        (controller as any)[param] = value;
      }
      return {
        pid: {
          ...s.pid,
          [axis]: { ...s.pid[axis as keyof PIDState], [param]: value },
        },
      };
    }),

  updateDisturbance: (axis, value) =>
    set((s) => ({
      disturbances: { ...s.disturbances, [axis]: value },
    })),

  applyPreset: (preset) => {
    for (const [axis, params] of Object.entries(preset)) {
      const controller = pidControllers[axis as keyof typeof pidControllers];
      if (controller) {
        controller.kp = params.kp;
        controller.ki = params.ki;
        controller.kd = params.kd;
      }
    }
    set({ pid: preset as PIDState });
  },

  step: (dt: number) => {
    const { target, disturbances, history, time } = get();
    const d = drone.state;

    // Position control
    const axWorld = pidControllers.X.update(target.x, d.x, dt);
    const ayWorld = pidControllers.Y.update(target.y, d.y, dt);

    const cosYaw = Math.cos(d.yaw);
    const sinYaw = Math.sin(d.yaw);
    const axBody = cosYaw * axWorld + sinYaw * ayWorld;
    const ayBody = -sinYaw * axWorld + cosYaw * ayWorld;

    // Position -> attitude
    const desiredPitchPos = Math.max(-rad(30), Math.min(rad(30), axBody / drone.g));
    const desiredRollPos = Math.max(-rad(30), Math.min(rad(30), -ayBody / drone.g));

    const desiredRoll = Math.max(-rad(35), Math.min(rad(35), rad(target.roll) + desiredRollPos));
    const desiredPitch = Math.max(-rad(35), Math.min(rad(35), rad(target.pitch) + desiredPitchPos));

    // Attitude control
    const rollTorque = pidControllers.Roll.update(desiredRoll, d.roll, dt);
    const pitchTorque = pidControllers.Pitch.update(desiredPitch, d.pitch, dt);

    // Auto heading
    let yawTargetDeg = target.yaw;
    if (target.autoHeading) {
      const hSpeed = hypot(d.vx, d.vy);
      if (hSpeed > 0.05) {
        yawTargetDeg = deg(Math.atan2(d.vy, d.vx));
      } else {
        const dx = target.x - d.x;
        const dy = target.y - d.y;
        if (hypot(dx, dy) > 0.05) {
          yawTargetDeg = deg(Math.atan2(dy, dx));
        }
      }
    }

    const yawTorque = pidControllers.Yaw.update(rad(yawTargetDeg), d.yaw, dt);

    // Altitude
    const altitudeCommand = pidControllers.Z.update(target.z, d.z, dt);
    const thrust = Math.max(0, drone.mass * drone.g + altitudeCommand);

    // Step drone
    drone.update(
      thrust, rollTorque, pitchTorque, yawTorque,
      disturbances.forceX, disturbances.forceY, disturbances.forceZ,
      disturbances.torqueRoll, disturbances.torquePitch, disturbances.torqueYaw,
      dt
    );

    const newTime = time + dt;
    const dist = hypot(target.x - d.x, target.y - d.y, target.z - d.z);

    // Record history
    const newHistory = { ...history };
    recordHistory(newHistory, newTime, drone.state, target);

    let status: SimulationStatus = 'TRACKING';
    if (dist < 0.15) status = 'ON_TARGET';

    set({
      drone: { ...drone.state },
      time: newTime,
      distanceToTarget: dist,
      history: newHistory,
      status,
    });
  },

  exportCSV: () => {
    const { history } = get();
    if (history.time.length === 0) return;

    const keys = Object.keys(history) as (keyof HistoryData)[];
    const header = keys.join(',');
    const rows = history.time.map((_, i) =>
      keys.map((k) => (history[k] as number[])[i]).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drone-sim-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
}));
