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

// ─── Extra types ────────────────────────────────────────────────────────────

export interface LogEntry {
  id: number;
  timestamp: number;
  level: 'INFO' | 'SYSTEM' | 'SIMULATION' | 'CONTROL' | 'WARNING' | 'ERROR';
  message: string;
}

export interface SimPreset {
  id: string;
  name: string;
  createdAt: number;
  pid: PIDState;
  target: Omit<TargetState, 'autoHeading'>;
}

export type CameraMode = 'orbit' | 'follow' | 'front' | 'rear' | 'left' | 'right' | 'top' | 'iso';
export type ActivePage = 'dashboard' | '3dview' | 'parameters' | 'pid' | 'plots' | 'logs' | 'presets' | 'settings';
export type Theme = 'dark' | 'light';

// ─── Physical params (exposed in Parameters panel) ───────────────────────────
export interface PhysicalParams {
  mass: number;
  armLength: number;
  ixx: number;
  iyy: number;
  izz: number;
  gravity: number;
  airDensity: number;
  windSpeed: number;
  windDirection: number;
}

export interface SimParams {
  timeStep: number;
  solverIterations: number;
  substeps: number;
  updateRate: number;
}

// ─── Store interface ─────────────────────────────────────────────────────────

interface SimulationStore {
  // Core simulation
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
  controllerOutputs: { roll: number; pitch: number; yaw: number; throttle: number };

  // UI state
  theme: Theme;
  sidebarCollapsed: boolean;
  activePage: ActivePage;
  activeTab: 'overview' | 'graphs'; // kept for compat
  cameraMode: CameraMode;
  showGrid: boolean;
  showAxes: boolean;
  showTrajectory: boolean;
  showTarget: boolean;
  paramsPanelWidth: number;

  // Physical + sim params
  physicalParams: PhysicalParams;
  simParams: SimParams;

  // Logs
  logs: LogEntry[];

  // Presets
  presets: SimPreset[];

  // ── Actions ──────────────────────────────────────────────────────────────

  // Simulation
  startSimulation: () => void;
  pauseSimulation: () => void;
  toggleSimulation: () => void;
  resetSimulation: () => void;
  setSpeed: (speed: number) => void;
  updateTarget: (axis: string, value: number | boolean) => void;
  updatePID: (axis: string, param: string, value: number) => void;
  updateDisturbance: (axis: string, value: number) => void;
  applyPreset: (preset: Record<string, PIDParams>) => void;
  step: (dt: number) => void;
  exportCSV: () => void;
  setActiveTab: (tab: 'overview' | 'graphs') => void;

  // UI
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setActivePage: (page: ActivePage) => void;
  setCameraMode: (mode: CameraMode) => void;
  setShowGrid: (v: boolean) => void;
  setShowAxes: (v: boolean) => void;
  setShowTrajectory: (v: boolean) => void;
  setShowTarget: (v: boolean) => void;
  setParamsPanelWidth: (w: number) => void;

  // Physical params
  updatePhysicalParam: (key: keyof PhysicalParams, value: number) => void;
  updateSimParam: (key: keyof SimParams, value: number) => void;

  // Logs
  addLog: (level: LogEntry['level'], message: string) => void;
  clearLogs: () => void;

  // Presets
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
}

// ─── History ─────────────────────────────────────────────────────────────────

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

// ─── Singleton physics objects ────────────────────────────────────────────────

const drone = new Drone();

const pidControllers = {
  X:     new PID(0.8,  0.02, 0.8,  3, 4),
  Y:     new PID(0.8,  0.02, 0.8,  3, 4),
  Z:     new PID(4.0,  1.0,  2.5,  5, 8),
  Roll:  new PID(4.0,  0.08, 0.5,  1, 1),
  Pitch: new PID(4.0,  0.08, 0.5,  1, 1),
  Yaw:   new PID(2.5,  0.03, 0.4,  1, 1, true),
};

function recordHistory(
  history: HistoryData,
  time: number,
  drone: DroneState,
  target: TargetState
) {
  const h = history;
  h.time.push(time);
  h.x.push(drone.x);     h.y.push(drone.y);     h.z.push(drone.z);
  h.targetX.push(target.x); h.targetY.push(target.y); h.targetZ.push(target.z);
  h.roll.push(deg(drone.roll));
  h.pitch.push(deg(drone.pitch));
  h.yaw.push(deg(drone.yaw));
  h.targetRoll.push(target.roll);
  h.targetPitch.push(target.pitch);
  h.targetYaw.push(target.yaw);
  h.vx.push(drone.vx);   h.vy.push(drone.vy);   h.vz.push(drone.vz);
  h.motor1.push(drone.motorThrusts[0]);
  h.motor2.push(drone.motorThrusts[1]);
  h.motor3.push(drone.motorThrusts[2]);
  h.motor4.push(drone.motorThrusts[3]);

  if (h.time.length > MAX_HISTORY) {
    for (const key of Object.keys(h) as (keyof HistoryData)[]) {
      (h[key] as number[]) = (h[key] as number[]).slice(-MAX_HISTORY);
    }
  }
}

let logIdCounter = 0;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  // ── Core state ──────────────────────────────────────────────────────────
  drone: drone.state,
  target: { x: 0, y: 0, z: 3, roll: 0, pitch: 0, yaw: 0, autoHeading: true },
  pid: {
    X:     { kp: 0.8,  ki: 0.02, kd: 0.8  },
    Y:     { kp: 0.8,  ki: 0.02, kd: 0.8  },
    Z:     { kp: 4.0,  ki: 1.0,  kd: 2.5  },
    Roll:  { kp: 4.0,  ki: 0.08, kd: 0.5  },
    Pitch: { kp: 4.0,  ki: 0.08, kd: 0.5  },
    Yaw:   { kp: 2.5,  ki: 0.03, kd: 0.4  },
  },
  disturbances: { forceX: 0, forceY: 0, forceZ: 0, torqueRoll: 0, torquePitch: 0, torqueYaw: 0 },
  isRunning: false,
  speed: 1.0,
  time: 0,
  status: 'STOPPED',
  distanceToTarget: 0,
  history: createEmptyHistory(),
  controllerOutputs: { roll: 0, pitch: 0, yaw: 0, throttle: 0 },

  // ── UI state ─────────────────────────────────────────────────────────────
  theme: 'dark',
  sidebarCollapsed: false,
  activePage: 'dashboard',
  activeTab: 'overview',
  cameraMode: 'orbit',
  showGrid: true,
  showAxes: true,
  showTrajectory: true,
  showTarget: true,
  paramsPanelWidth: 360,

  // ── Physical + sim params ─────────────────────────────────────────────────
  physicalParams: {
    mass:         1.25,
    armLength:    0.25,
    ixx:          0.00580,
    iyy:          0.00580,
    izz:          0.00920,
    gravity:      9.81,
    airDensity:   1.225,
    windSpeed:    0.00,
    windDirection: 0,
  },
  simParams: {
    timeStep:          1.0,
    solverIterations:  10,
    substeps:          1,
    updateRate:        60,
  },

  // ── Logs ──────────────────────────────────────────────────────────────────
  logs: [
    { id: ++logIdCounter, timestamp: Date.now(), level: 'SYSTEM',  message: 'Drone Simulator initialized' },
    { id: ++logIdCounter, timestamp: Date.now(), level: 'INFO',    message: 'WebGL context detected' },
    { id: ++logIdCounter, timestamp: Date.now(), level: 'SYSTEM',  message: 'Physics engine ready' },
    { id: ++logIdCounter, timestamp: Date.now(), level: 'INFO',    message: 'PID controllers loaded — Nominal preset' },
  ],

  // ── Presets ───────────────────────────────────────────────────────────────
  presets: [],

  // ── Simulation actions ───────────────────────────────────────────────────

  startSimulation: () => {
    get().addLog('SIMULATION', 'Simulation started');
    set({ isRunning: true });
  },

  pauseSimulation: () => {
    get().addLog('SIMULATION', 'Simulation paused');
    set({ isRunning: false, status: 'PAUSED' });
  },

  toggleSimulation: () => {
    const { isRunning } = get();
    if (isRunning) {
      get().addLog('SIMULATION', 'Simulation paused');
      set({ isRunning: false, status: 'PAUSED' });
    } else {
      get().addLog('SIMULATION', 'Simulation resumed');
      set({ isRunning: true });
    }
  },

  resetSimulation: () => {
    drone.reset();
    Object.values(pidControllers).forEach((p) => p.reset());
    get().addLog('SIMULATION', 'Simulation reset');
    set({
      isRunning: false,
      time: 0,
      status: 'STOPPED',
      drone: { ...drone.state },
      history: createEmptyHistory(),
      distanceToTarget: 0,
      controllerOutputs: { roll: 0, pitch: 0, yaw: 0, throttle: 0 },
    });
  },

  setSpeed: (speed) => set({ speed }),

  updateTarget: (axis, value) =>
    set((s) => ({ target: { ...s.target, [axis]: value } })),

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
    set((s) => ({ disturbances: { ...s.disturbances, [axis]: value } })),

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
    get().addLog('CONTROL', `PID preset applied`);
  },

  step: (dt: number) => {
    const { target, disturbances, history, time } = get();
    const d = drone.state;

    // Position control
    const axWorld = pidControllers.X.update(target.x, d.x, dt);
    const ayWorld = pidControllers.Y.update(target.y, d.y, dt);

    const cosYaw = Math.cos(d.yaw);
    const sinYaw = Math.sin(d.yaw);
    const axBody =  cosYaw * axWorld + sinYaw * ayWorld;
    const ayBody = -sinYaw * axWorld + cosYaw * ayWorld;

    // Position → attitude setpoints
    const desiredPitchPos = Math.max(-rad(30), Math.min(rad(30),  axBody / drone.g));
    const desiredRollPos  = Math.max(-rad(30), Math.min(rad(30), -ayBody / drone.g));

    const desiredRoll  = Math.max(-rad(35), Math.min(rad(35), rad(target.roll)  + desiredRollPos));
    const desiredPitch = Math.max(-rad(35), Math.min(rad(35), rad(target.pitch) + desiredPitchPos));

    // Attitude control
    const rollTorque  = pidControllers.Roll.update(desiredRoll, d.roll, dt);
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

    // Step drone physics
    drone.update(
      thrust, rollTorque, pitchTorque, yawTorque,
      disturbances.forceX, disturbances.forceY, disturbances.forceZ,
      disturbances.torqueRoll, disturbances.torquePitch, disturbances.torqueYaw,
      dt
    );

    const newTime = time + dt;
    const dist = hypot(target.x - d.x, target.y - d.y, target.z - d.z);

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
      controllerOutputs: {
        roll:     rollTorque,
        pitch:    pitchTorque,
        yaw:      yawTorque,
        throttle: thrust / (drone.mass * drone.g),
      },
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
    get().addLog('SYSTEM', 'CSV exported');
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ── UI actions ───────────────────────────────────────────────────────────

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActivePage: (page) => set({ activePage: page }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setShowGrid: (v) => set({ showGrid: v }),
  setShowAxes: (v) => set({ showAxes: v }),
  setShowTrajectory: (v) => set({ showTrajectory: v }),
  setShowTarget: (v) => set({ showTarget: v }),
  setParamsPanelWidth: (w) => set({ paramsPanelWidth: w }),

  // ── Physical params ──────────────────────────────────────────────────────
  updatePhysicalParam: (key, value) =>
    set((s) => ({ physicalParams: { ...s.physicalParams, [key]: value } })),

  updateSimParam: (key, value) =>
    set((s) => ({ simParams: { ...s.simParams, [key]: value } })),

  // ── Logs ──────────────────────────────────────────────────────────────────
  addLog: (level, message) =>
    set((s) => ({
      logs: [
        ...s.logs.slice(-999),
        { id: ++logIdCounter, timestamp: Date.now(), level, message },
      ],
    })),
  clearLogs: () => set({ logs: [] }),

  // ── Presets ───────────────────────────────────────────────────────────────
  savePreset: (name) => {
    const { pid, target } = get();
    const preset: SimPreset = {
      id: `preset-${Date.now()}`,
      name,
      createdAt: Date.now(),
      pid: { ...pid },
      target: { x: target.x, y: target.y, z: target.z, roll: target.roll, pitch: target.pitch, yaw: target.yaw },
    };
    set((s) => ({ presets: [...s.presets, preset] }));
    get().addLog('SYSTEM', `Preset "${name}" saved`);
  },

  loadPreset: (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;
    get().applyPreset(preset.pid as Record<string, PIDParams>);
    set((s) => ({
      target: { ...s.target, ...preset.target },
    }));
    get().addLog('SYSTEM', `Preset "${preset.name}" loaded`);
  },

  deletePreset: (id) => {
    const preset = get().presets.find((p) => p.id === id);
    set((s) => ({ presets: s.presets.filter((p) => p.id !== id) }));
    if (preset) get().addLog('SYSTEM', `Preset "${preset.name}" deleted`);
  },
}));
