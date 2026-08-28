import { create } from 'zustand';
import { deg, rad, hypot } from '@/lib/utils/math';
import {
  DroneState,
  DroneConfig,
  TargetState,
  PIDState,
  PIDParams,
  DisturbanceState,
  HistoryData,
  SimulationStatus,
  EnvironmentPreset,
  DRONE_PRESETS,
  ENVIRONMENT_PRESETS,
  MAX_HISTORY,
} from '@/lib/simulation/types';
import axios from 'axios';

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
  resetGeneration: number;

  // UI state
  theme: Theme;
  sidebarCollapsed: boolean;
  activePage: ActivePage;
  activeTab: 'overview' | 'graphs';
  cameraMode: CameraMode;
  showGrid: boolean;
  showAxes: boolean;
  showTrajectory: boolean;
  showTarget: boolean;
  paramsPanelWidth: number;

  // Physical + sim params
  physicalParams: PhysicalParams;
  simParams: SimParams;

  // Drone config
  currentDroneId: string;
  droneConfig: DroneConfig;
  customDrone: DroneConfig;

  // Environment config
  currentEnvId: string;

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

  // Drone config
  selectDrone: (droneId: string) => void;
  updateCustomDrone: (path: string, value: number) => void;
  applyCustomDrone: () => void;

  // Environment config
  selectEnvironment: (envId: string) => void;
  updateEnvironmentParam: (key: keyof PhysicalParams, value: number) => void;

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
    p: [], q: [], r: [],
    motor1: [], motor2: [], motor3: [], motor4: [],
    ctrlRoll: [], ctrlPitch: [], ctrlYaw: [], ctrlThrottle: [],
  };
}

// ─── Python backend URL ──────────────────────────────────────────────────────
const BACKEND_URL = 'http://127.0.0.1:8765';

// Request sequencing to prevent out-of-order responses
let requestGeneration = 0;

// Reset generation counter - increments on each reset to invalidate interpolation state
let resetGeneration = 0;

function recordHistory(
  history: HistoryData,
  time: number,
  drone: DroneState,
  target: TargetState,
  controllerOutputs?: { roll: number; pitch: number; yaw: number; throttle: number }
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
  h.p.push(deg(drone.p)); h.q.push(deg(drone.q)); h.r.push(deg(drone.r));
  h.motor1.push(drone.motorThrusts[0]);
  h.motor2.push(drone.motorThrusts[1]);
  h.motor3.push(drone.motorThrusts[2]);
  h.motor4.push(drone.motorThrusts[3]);
  if (controllerOutputs) {
    h.ctrlRoll.push(controllerOutputs.roll);
    h.ctrlPitch.push(controllerOutputs.pitch);
    h.ctrlYaw.push(controllerOutputs.yaw);
    h.ctrlThrottle.push(controllerOutputs.throttle);
  } else {
    h.ctrlRoll.push(0); h.ctrlPitch.push(0); h.ctrlYaw.push(0); h.ctrlThrottle.push(0);
  }

  if (h.time.length > MAX_HISTORY) {
    for (const key of Object.keys(h) as (keyof HistoryData)[]) {
      (h[key] as number[]) = (h[key] as number[]).slice(-MAX_HISTORY);
    }
  }
}

let logIdCounter = 0;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  // ── Core state (fetched from Python backend) ────────────────────────────────
  drone: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, roll: 0, pitch: 0, yaw: 0, p: 0, q: 0, r: 0, motorThrusts: [0, 0, 0, 0] },
  target: { x: 0, y: 0, z: 3, roll: 0, pitch: 0, yaw: 0, autoHeading: true },
  pid: {
    X:     { kp: 0.5,  ki: 0.03, kd: 0.3  },
    Y:     { kp: 0.5,  ki: 0.03, kd: 0.3  },
    Z:     { kp: 3.0,  ki: 0.5,  kd: 1.5  },
    Roll:  { kp: 2.5,  ki: 0.05, kd: 0.3  },
    Pitch: { kp: 2.5,  ki: 0.05, kd: 0.3  },
    Yaw:   { kp: 1.5,  ki: 0.02, kd: 0.2  },
  },
  disturbances: { forceX: 0, forceY: 0, forceZ: 0, torqueRoll: 0, torquePitch: 0, torqueYaw: 0 },
  isRunning: false,
  speed: 1.0,
  time: 0,
  status: 'STOPPED',
  distanceToTarget: 0,
  history: createEmptyHistory(),
  controllerOutputs: { roll: 0, pitch: 0, yaw: 0, throttle: 0 },
  resetGeneration: 0,

  // ── UI state ─────────────────────────────────────────────────────────────
  theme: 'dark',
  sidebarCollapsed: false,
  activePage: 'dashboard',
  activeTab: 'overview',
  cameraMode: 'orbit',
  showGrid: true,
  showAxes: true,
  showTrajectory: false,
  showTarget: true,
  paramsPanelWidth: 360,

  // ── Physical + sim params ─────────────────────────────────────────────────
  physicalParams: {
    mass:         0.895,
    armLength:    0.18,
    ixx:          0.012,
    iyy:          0.012,
    izz:          0.022,
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

  // ── Drone config ───────────────────────────────────────────────────────────
  currentDroneId: 'cinematic',
  droneConfig: DRONE_PRESETS.cinematic,
  customDrone: { ...DRONE_PRESETS.cinematic, id: 'custom', name: 'Custom' },

  // ── Environment config ─────────────────────────────────────────────────────
  currentEnvId: 'calm',

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

  startSimulation: async () => {
    get().addLog('SIMULATION', 'Simulation started');
    set({ isRunning: true });

    // Wait for backend health check
    let backendReady = false;
    for (let i = 0; i < 10; i++) {
      try {
        const resp = await axios.get(`${BACKEND_URL}/health`, { timeout: 1000 });
        if (resp.data.ok) {
          backendReady = true;
          console.log('[startSimulation] Backend health check passed');
          break;
        }
      } catch (e) {
        console.log('[startSimulation] Waiting for backend...', i + 1);
        await new Promise(r => setTimeout(r, 500));
      }
    }
    if (!backendReady) {
      console.error('[startSimulation] Backend not ready after 5s');
      get().addLog('ERROR', 'Backend not ready');
      set({ isRunning: false });
      return;
    }

    try {
      const resp = await axios.post(`${BACKEND_URL}/api/command`, { command: 'start' }, { timeout: 2000 });
      console.log('[startSimulation] Backend response:', resp.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[startSimulation] Failed to start backend:', msg);
      get().addLog('ERROR', `Start failed: ${msg}`);
    }
  },

  pauseSimulation: async () => {
    get().addLog('SIMULATION', 'Simulation paused');
    set({ isRunning: false, status: 'PAUSED' });

    try {
      await axios.post(`${BACKEND_URL}/api/command`, { command: 'stop' });
    } catch (err) {
      console.error('Failed to pause backend', err);
    }
  },

  toggleSimulation: async () => {
    const { isRunning } = get();
    if (isRunning) {
      get().addLog('SIMULATION', 'Simulation paused');
      set({ isRunning: false, status: 'PAUSED' });

      try {
        await axios.post(`${BACKEND_URL}/api/command`, { command: 'stop' });
      } catch (err) {
        console.error('Failed to pause backend', err);
      }
    } else {
      get().addLog('SIMULATION', 'Simulation resumed');
      set({ isRunning: true });

      try {
        await axios.post(`${BACKEND_URL}/api/command`, { command: 'start' });
      } catch (err) {
        console.error('Failed to start backend', err);
      }
    }
  },

  resetSimulation: async () => {
    get().addLog('SIMULATION', 'Simulation reset');

    // 1) Invalidate all in-flight /api/state requests immediately
    requestGeneration++;
    const nextResetGen = get().resetGeneration + 1;
    // 2) Guard updates - pause frontend simulation flag
    set({ isRunning: false, resetGeneration: nextResetGen });

    // 3) Send reset to Python and 4) wait for acknowledgement
    try {
      await axios.post(`${BACKEND_URL}/api/command`, { command: 'reset' });
    } catch (err) {
      console.error('Failed to reset backend', err);
    }

    // 5) Receive authoritative reset state from backend
    let authoritative: any = null;
    try {
      const resp = await axios.get(`${BACKEND_URL}/api/state`, { timeout: 2000 });
      authoritative = resp.data;
    } catch (err) {
      console.error('Failed to fetch authoritative reset state', err);
    }

    // 6-7) Synchronize frontend to authoritative reset state & clear telemetry — PID kept per new spec
    const s = authoritative;
    set({
      isRunning: false,
      time: s?.time ?? 0,
      status: s?.status ?? 'STOPPED',
      target: s?.target ? { x: s.target.x ?? 0, y: s.target.y ?? 0, z: s.target.z ?? 3, roll: s.target.roll ?? 0, pitch: s.target.pitch ?? 0, yaw: s.target.yaw ?? 0, autoHeading: s.target.auto_heading ?? true } : { x: 0, y: 0, z: 3, roll: 0, pitch: 0, yaw: 0, autoHeading: true },
      // keep current PID gains — backend keeps them too
      disturbances: { forceX: 0, forceY: 0, forceZ: 0, torqueRoll: 0, torquePitch: 0, torqueYaw: 0 },
      drone: s ? {
        x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz,
        roll: s.roll, pitch: s.pitch, yaw: s.yaw, p: s.p, q: s.q, r: s.r,
        motorThrusts: [s.motor1 ?? 0, s.motor2 ?? 0, s.motor3 ?? 0, s.motor4 ?? 0],
        rollTorque: s.roll_torque ?? 0, pitchTorque: s.pitch_torque ?? 0, yawTorque: s.yaw_torque ?? 0,
        yawTarget: s.yaw_target ?? 0, rollControl: s.roll_control ?? 0, pitchControl: s.pitch_control ?? 0, yawControl: s.yaw_control ?? 0, throttle: s.throttle ?? 0,
      } : { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, roll: 0, pitch: 0, yaw: 0, p: 0, q: 0, r: 0, motorThrusts: [0, 0, 0, 0], rollTorque: 0, pitchTorque: 0, yawTorque: 0, yawTarget: 0, rollControl: 0, pitchControl: 0, yawControl: 0, throttle: 0 },
      history: createEmptyHistory(),
      distanceToTarget: s?.distanceToTarget ?? 0,
      controllerOutputs: s ? {
        roll: s.roll_control ?? s.roll_torque ?? 0,
        pitch: s.pitch_control ?? s.pitch_torque ?? 0,
        yaw: s.yaw_control ?? s.yaw_torque ?? 0,
        throttle: s.throttle ?? 0,
      } : { roll: 0, pitch: 0, yaw: 0, throttle: 0 },
      resetGeneration: nextResetGen,
    });
  },

  setSpeed: (speed) => set({ speed }),

  updateTarget: async (axis, value) => {
    set((s) => ({ target: { ...s.target, [axis]: value } }));

    // Send to Python backend (convert camelCase to snake_case)
    try {
      const backendKey = axis === 'autoHeading' ? 'auto_heading' : axis;
      await axios.post(`${BACKEND_URL}/api/target`, { [backendKey]: value });
    } catch (err) {
      console.error(`Failed to update target ${axis}`, err);
    }
  },

  updatePID: async (axis, param, value) => {
    // Update local PID state in store (for UI display only)
    set((s) => ({
      pid: {
        ...s.pid,
        [axis]: { ...s.pid[axis as keyof PIDState], [param]: value },
      },
    }));

    // Send updated gains to Python backend
    try {
      const axisKey = axis.toLowerCase();
      const pidAxis = axis as keyof PIDState;
      await axios.post(`${BACKEND_URL}/api/pid`, {
        axis: axisKey,
        params: {
          kp: get().pid[pidAxis].kp,
          ki: get().pid[pidAxis].ki,
          kd: get().pid[pidAxis].kd,
        },
      });
    } catch (err) {
      console.error(`Failed to update PID ${axis} on backend`, err);
    }
  },

  updateDisturbance: async (axis, value) => {
    set((s) => ({ disturbances: { ...s.disturbances, [axis]: value } }));

    // Send disturbance to Python backend
    try {
      const disturbances = { ...get().disturbances, [axis]: value };
      await axios.post(`${BACKEND_URL}/api/disturbance`, disturbances);
    } catch (err) {
      console.error(`Failed to update disturbance ${axis} on backend`, err);
    }
  },

  applyPreset: async (preset) => {
    // Send PID gains to Python backend (one axis at a time)
    try {
      for (const [axis, params] of Object.entries(preset)) {
        await axios.post(`${BACKEND_URL}/api/pid`, {
          axis: axis.toLowerCase(),
          params: { kp: params.kp, ki: params.ki, kd: params.kd },
        });
      }
    } catch (err) {
      console.error('Failed to apply preset on backend', err);
    }

    set({ pid: preset as unknown as PIDState });
    get().addLog('CONTROL', `PID preset applied`);
  },

  step: async (dt: number) => {
    // Request sequencing: increment generation and capture it
    const currentGeneration = ++requestGeneration;
    const currentResetGeneration = get().resetGeneration;

    try {
      const response = await axios.get(`${BACKEND_URL}/api/state`, { timeout: 2000 });

      // Discard stale responses (both from older requests AND from before a reset)
      if (currentGeneration !== requestGeneration) return;
      if (currentResetGeneration !== get().resetGeneration) return;

      const state = response.data;

      // Authoritative controller outputs - must use backend values, NOT drone state
      const ctrlOutputs = {
        roll: state.roll_control ?? state.roll_torque ?? 0,
        pitch: state.pitch_control ?? state.pitch_torque ?? 0,
        yaw: state.yaw_control ?? state.yaw_torque ?? 0,
        throttle: state.throttle ?? (state.thrust / (4 * (get().droneConfig?.motor?.maxThrust ?? 4.5))),
      };

      // Update drone state from backend (including controller outputs)
      set({
        drone: {
          x: state.x,
          y: state.y,
          z: state.z,
          vx: state.vx,
          vy: state.vy,
          vz: state.vz,
          roll: state.roll,
          pitch: state.pitch,
          yaw: state.yaw,
          p: state.p,
          q: state.q,
          r: state.r,
          motorThrusts: state.motor1 !== undefined ? [state.motor1, state.motor2, state.motor3, state.motor4] : [0, 0, 0, 0],
          rollTorque: state.roll_torque,
          pitchTorque: state.pitch_torque,
          yawTorque: state.yaw_torque,
          yawTarget: state.yaw_target,
          rollControl: state.roll_control,
          pitchControl: state.pitch_control,
          yawControl: state.yaw_control,
          throttle: state.throttle,
        },
        time: state.time,
        distanceToTarget: state.distanceToTarget,
        status: state.status,
        controllerOutputs: ctrlOutputs,
      });

      // Record history with authoritative controller outputs
      const newHistory: HistoryData = {
        time: [...get().history.time],
        x: [...get().history.x], y: [...get().history.y], z: [...get().history.z],
        targetX: [...get().history.targetX], targetY: [...get().history.targetY], targetZ: [...get().history.targetZ],
        roll: [...get().history.roll], pitch: [...get().history.pitch], yaw: [...get().history.yaw],
        targetRoll: [...get().history.targetRoll], targetPitch: [...get().history.targetPitch], targetYaw: [...get().history.targetYaw],
        vx: [...get().history.vx], vy: [...get().history.vy], vz: [...get().history.vz],
        p: [...get().history.p], q: [...get().history.q], r: [...get().history.r],
        motor1: [...get().history.motor1], motor2: [...get().history.motor2], motor3: [...get().history.motor3], motor4: [...get().history.motor4],
        ctrlRoll: [...get().history.ctrlRoll], ctrlPitch: [...get().history.ctrlPitch], ctrlYaw: [...get().history.ctrlYaw], ctrlThrottle: [...get().history.ctrlThrottle],
      };
      recordHistory(newHistory, state.time, {
        x: state.x, y: state.y, z: state.z,
        vx: state.vx, vy: state.vy, vz: state.vz,
        roll: state.roll, pitch: state.pitch, yaw: state.yaw,
        p: state.p, q: state.q, r: state.r,
        motorThrusts: state.motor1 !== undefined ? [state.motor1, state.motor2, state.motor3, state.motor4] : [0, 0, 0, 0],
      } as DroneState, get().target, ctrlOutputs);
      set({ history: newHistory });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Only log timeouts at debug level to avoid log spam
      if (!msg.includes('timeout')) {
        console.error('[step] Failed to fetch state:', msg);
        get().addLog('ERROR', `State fetch failed: ${msg}`);
      }
    }
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

  // ── Drone config ──────────────────────────────────────────────────────────
  selectDrone: async (droneId) => {
    const config = DRONE_PRESETS[droneId];
    if (!config) return;

    const wasRunning = get().isRunning;
    if (wasRunning) {
      get().addLog('SIMULATION', 'Simulation paused for drone change');
      set({ isRunning: false });
    }

    // Invalidate any stale state responses from previous drone
    requestGeneration++;
    const nextResetGen = get().resetGeneration + 1;

    const pidState: PIDState = {
      X:     { kp: config.pidGains.x?.[0] ?? 0.8,  ki: config.pidGains.x?.[1] ?? 0.02, kd: config.pidGains.x?.[2] ?? 0.8 },
      Y:     { kp: config.pidGains.y?.[0] ?? 0.8,  ki: config.pidGains.y?.[1] ?? 0.02, kd: config.pidGains.y?.[2] ?? 0.8 },
      Z:     { kp: config.pidGains.z?.[0] ?? 4.0,  ki: config.pidGains.z?.[1] ?? 1.0,  kd: config.pidGains.z?.[2] ?? 2.5 },
      Roll:  { kp: config.pidGains.roll?.[0] ?? 4.0,  ki: config.pidGains.roll?.[1] ?? 0.08, kd: config.pidGains.roll?.[2] ?? 0.5 },
      Pitch: { kp: config.pidGains.pitch?.[0] ?? 4.0, ki: config.pidGains.pitch?.[1] ?? 0.08, kd: config.pidGains.pitch?.[2] ?? 0.5 },
      Yaw:   { kp: config.pidGains.yaw?.[0] ?? 2.5,  ki: config.pidGains.yaw?.[1] ?? 0.03, kd: config.pidGains.yaw?.[2] ?? 0.4 },
    };

    // Send PID gains to Python backend (one axis at a time)
    try {
      for (const [axis, gains] of Object.entries(config.pidGains)) {
        await axios.post(`${BACKEND_URL}/api/pid`, {
          axis: axis.toLowerCase(),
          params: { kp: gains[0], ki: gains[1], kd: gains[2] },
        });
      }
    } catch (err) {
      console.error('Failed to send PID gains on drone change to backend', err);
    }

    get().addLog('CONTROL', `Drone changed to ${config.name}`);
    set({
      currentDroneId: droneId,
      droneConfig: config,
      drone: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, roll: 0, pitch: 0, yaw: 0, p: 0, q: 0, r: 0, motorThrusts: [0, 0, 0, 0], rollTorque: 0, pitchTorque: 0, yawTorque: 0, yawTarget: 0, rollControl: 0, pitchControl: 0, yawControl: 0, throttle: 0 },
      pid: pidState,
      time: 0,
      status: 'STOPPED',
      history: createEmptyHistory(),
      distanceToTarget: 0,
      controllerOutputs: { roll: 0, pitch: 0, yaw: 0, throttle: 0 },
      resetGeneration: nextResetGen,
      physicalParams: {
        mass: config.mass,
        armLength: config.motor.armLength,
        ixx: config.inertia.ix,
        iyy: config.inertia.iy,
        izz: config.inertia.iz,
        gravity: 9.81,
        airDensity: 1.225,
        windSpeed: 0,
        windDirection: 0,
      },
    });

    if (wasRunning) {
      set({ isRunning: true });
      get().addLog('SIMULATION', 'Simulation resumed');
    }
  },

  updateCustomDrone: (path, value) => {
    set((s) => {
      const drone = { ...s.customDrone };
      const parts = path.split('.');
      let obj: any = drone;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] };
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return { customDrone: drone };
    });
  },

  applyCustomDrone: async () => {
    const config = get().customDrone;
    const wasRunning = get().isRunning;
    if (wasRunning) {
      set({ isRunning: false });
    }

    requestGeneration++;
    const nextResetGen = get().resetGeneration + 1;

    const pidState: PIDState = {
      X:     { kp: config.pidGains.x?.[0] ?? 0.8,  ki: config.pidGains.x?.[1] ?? 0.02, kd: config.pidGains.x?.[2] ?? 0.8 },
      Y:     { kp: config.pidGains.y?.[0] ?? 0.8,  ki: config.pidGains.y?.[1] ?? 0.02, kd: config.pidGains.y?.[2] ?? 0.8 },
      Z:     { kp: config.pidGains.z?.[0] ?? 4.0,  ki: config.pidGains.z?.[1] ?? 1.0,  kd: config.pidGains.z?.[2] ?? 2.5 },
      Roll:  { kp: config.pidGains.roll?.[0] ?? 4.0,  ki: config.pidGains.roll?.[1] ?? 0.08, kd: config.pidGains.roll?.[2] ?? 0.5 },
      Pitch: { kp: config.pidGains.pitch?.[0] ?? 4.0, ki: config.pidGains.pitch?.[1] ?? 0.08, kd: config.pidGains.pitch?.[2] ?? 0.5 },
      Yaw:   { kp: config.pidGains.yaw?.[0] ?? 2.5,  ki: config.pidGains.yaw?.[1] ?? 0.03, kd: config.pidGains.yaw?.[2] ?? 0.4 },
    };

    // Send PID gains to Python backend (one axis at a time)
    try {
      for (const [axis, gains] of Object.entries(config.pidGains)) {
        await axios.post(`${BACKEND_URL}/api/pid`, {
          axis: axis.toLowerCase(),
          params: { kp: gains[0], ki: gains[1], kd: gains[2] },
        });
      }
    } catch (err) {
      console.error('Failed to apply custom drone on backend', err);
    }

    get().addLog('CONTROL', `Custom drone applied`);
    set({
      currentDroneId: 'custom',
      droneConfig: config,
      drone: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, roll: 0, pitch: 0, yaw: 0, p: 0, q: 0, r: 0, motorThrusts: [0, 0, 0, 0], rollTorque: 0, pitchTorque: 0, yawTorque: 0, yawTarget: 0, rollControl: 0, pitchControl: 0, yawControl: 0, throttle: 0 },
      pid: pidState,
      time: 0,
      status: 'STOPPED',
      history: createEmptyHistory(),
      distanceToTarget: 0,
      controllerOutputs: { roll: 0, pitch: 0, yaw: 0, throttle: 0 },
      resetGeneration: nextResetGen,
      physicalParams: {
        mass: config.mass,
        armLength: config.motor.armLength,
        ixx: config.inertia.ix,
        iyy: config.inertia.iy,
        izz: config.inertia.iz,
        gravity: 9.81,
        airDensity: 1.225,
        windSpeed: 0,
        windDirection: 0,
      },
    });

    if (wasRunning) {
      set({ isRunning: true });
      get().addLog('SIMULATION', 'Simulation resumed');
    }
  },

  // ── Environment config ────────────────────────────────────────────────────
  selectEnvironment: (envId) => {
    const preset = ENVIRONMENT_PRESETS[envId];
    if (!preset) return;
    set((s) => ({
      currentEnvId: envId,
      physicalParams: {
        ...s.physicalParams,
        gravity: preset.gravity,
        airDensity: preset.airDensity,
        windSpeed: preset.windSpeed,
        windDirection: preset.windDirection,
      },
    }));
    get().addLog('SYSTEM', `Environment: ${preset.name}`);
  },

  updateEnvironmentParam: (key, value) =>
    set((s) => ({ physicalParams: { ...s.physicalParams, [key]: value } })),

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
    get().applyPreset(preset.pid as unknown as Record<string, PIDParams>);
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
