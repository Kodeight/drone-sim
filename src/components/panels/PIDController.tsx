'use client';

import { useSimulationStore } from '@/store/simulationStore';
import { PID_PRESETS, PIDAxis } from '@/lib/simulation/types';
import SliderInput from '@/components/ui/SliderInput';

const AXES: PIDAxis[] = ['X', 'Y', 'Z', 'Roll', 'Pitch', 'Yaw'];

const KP_MAX: Record<PIDAxis, number> = { X: 5, Y: 5, Z: 8, Roll: 8, Pitch: 8, Yaw: 5 };
const KI_MAX: Record<PIDAxis, number> = { X: 3, Y: 3, Z: 5, Roll: 2, Pitch: 2, Yaw: 1 };
const KD_MAX: Record<PIDAxis, number> = { X: 5, Y: 5, Z: 5, Roll: 3, Pitch: 3, Yaw: 2 };

export default function PIDController() {
  const pid = useSimulationStore((s) => s.pid);
  const updatePID = useSimulationStore((s) => s.updatePID);
  const applyPreset = useSimulationStore((s) => s.applyPreset);

  const maxFor = (axis: PIDAxis, param: 'kp' | 'ki' | 'kd') =>
    param === 'kp' ? KP_MAX[axis] : param === 'ki' ? KI_MAX[axis] : KD_MAX[axis];

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>PID Tuning</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {Object.keys(PID_PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(PID_PRESETS[name as keyof typeof PID_PRESETS])}
              style={{
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 600,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {AXES.map((axis) => (
          <div key={axis} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {axis}
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
