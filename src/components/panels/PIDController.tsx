'use client';

import { useSimulationStore } from '@/store/simulationStore';
import { PID_PRESETS, DRONE_PRESETS, type PIDAxis } from '@/lib/simulation/types';
import SliderInput from '@/components/ui/SliderInput';

const AXES: PIDAxis[] = ['X', 'Y', 'Z', 'Roll', 'Pitch', 'Yaw'];

const KP_MAX: Record<PIDAxis, number> = { X: 5, Y: 5, Z: 8, Roll: 8, Pitch: 8, Yaw: 5 };
const KI_MAX: Record<PIDAxis, number> = { X: 3, Y: 3, Z: 5, Roll: 2, Pitch: 2, Yaw: 1 };
const KD_MAX: Record<PIDAxis, number> = { X: 5, Y: 5, Z: 5, Roll: 3, Pitch: 3, Yaw: 2 };

const AXIS_COLORS: Record<PIDAxis, string> = {
  X: '#06b6d4', Y: '#10b981', Z: '#f59e0b',
  Roll: '#3b82f6', Pitch: '#a855f7', Yaw: '#ef4444',
};

function detectActivePreset(pid: Record<PIDAxis, { kp: number; ki: number; kd: number }>): string | null {
  for (const [name, preset] of Object.entries(PID_PRESETS)) {
    let match = true;
    for (const axis of AXES) {
      const p = preset[axis as keyof typeof preset];
      const c = pid[axis];
      if (Math.abs(p.kp - c.kp) > 0.001 || Math.abs(p.ki - c.ki) > 0.001 || Math.abs(p.kd - c.kd) > 0.001) {
        match = false;
        break;
      }
    }
    if (match) return name;
  }
  return null;
}

export default function PIDController() {
  const pid = useSimulationStore((s) => s.pid);
  const updatePID = useSimulationStore((s) => s.updatePID);
  const applyPreset = useSimulationStore((s) => s.applyPreset);
  const currentDroneId = useSimulationStore((s) => s.currentDroneId);
  const droneConfig = useSimulationStore((s) => s.droneConfig);
  const selectDrone = useSimulationStore((s) => s.selectDrone);

  const activePreset = detectActivePreset(pid);

  const maxFor = (axis: PIDAxis, param: 'kp' | 'ki' | 'kd') =>
    param === 'kp' ? KP_MAX[axis] : param === 'ki' ? KI_MAX[axis] : KD_MAX[axis];

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', height: '100%' }}>

      {/* ════════════════════════════════════════════════════════════════
          HEADER: Preset buttons + active indicator
         ════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>PID Tuning</span>
          {activePreset && (
            <span style={{
              padding: '3px 10px', fontSize: 10, fontWeight: 700,
              background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)',
              borderRadius: 4, color: 'var(--accent)',
            }}>
              {activePreset} Preset Active
            </span>
          )}
          {activePreset === null && (
            <span style={{
              padding: '3px 10px', fontSize: 10, fontWeight: 700,
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 4, color: 'var(--warning)',
            }}>
              Custom Values
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 4 }}>Presets:</span>
          {Object.keys(PID_PRESETS).map((name) => {
            const isActive = activePreset === name;
            return (
              <button
                key={name}
                onClick={() => applyPreset(PID_PRESETS[name as keyof typeof PID_PRESETS])}
                style={{
                  padding: '5px 14px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: isActive ? 'var(--accent)' : 'var(--bg-secondary)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 5,
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          CENTER: Active drone info (always visible)
         ════════════════════════════════════════════════════════════════ */}
      <div style={{
        marginBottom: 16, padding: '10px 16px', borderRadius: 8,
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          Active Drone
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
          {droneConfig.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {droneConfig.mass} kg &middot; TWR {(4 * droneConfig.motor.maxThrust / (droneConfig.mass * 9.81)).toFixed(1)} &middot; {droneConfig.motor.maxThrust}N/motor
        </div>
        <div style={{ flex: 1 }} />
        {/* Mini drone type selector inline */}
        <div style={{ display: 'flex', gap: 3 }}>
          {Object.entries(DRONE_PRESETS).map(([id, cfg]) => {
            const active = currentDroneId === id;
            return (
              <button
                key={id}
                onClick={() => selectDrone(id)}
                title={cfg.name}
                style={{
                  padding: '3px 8px', fontSize: 9, fontWeight: 600,
                  background: active ? 'var(--accent)' : 'transparent',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 3,
                  color: active ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {cfg.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          PID GAIN CARDS: 2-column grid, each axis color-coded
         ════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {AXES.map((axis) => (
          <div key={axis} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, marginBottom: 8,
              color: AXIS_COLORS[axis],
              textTransform: 'uppercase', letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: AXIS_COLORS[axis] }} />
              {axis}
              <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 'auto', textTransform: 'none' }}>
                P:{pid[axis].kp.toFixed(3)} I:{pid[axis].ki.toFixed(3)} D:{pid[axis].kd.toFixed(3)}
              </span>
            </div>
            {(['kp', 'ki', 'kd'] as const).map((param) => (
              <SliderInput
                key={param}
                label={param.toUpperCase()}
                value={pid[axis][param]}
                min={0}
                max={maxFor(axis, param)}
                step={maxFor(axis, param) * 0.005}
                decimals={3}
                onChange={(v) => updatePID(axis, param, v)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
