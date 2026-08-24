'use client';

import { useSimulationStore } from '@/store/simulationStore';
import { PID_PRESETS, DRONE_PRESETS } from '@/lib/simulation/types';
import SliderInput from '@/components/ui/SliderInput';

export default function TargetControls() {
  const target          = useSimulationStore((s) => s.target);
  const updateTarget    = useSimulationStore((s) => s.updateTarget);
  const applyPreset     = useSimulationStore((s) => s.applyPreset);
  const currentDroneId  = useSimulationStore((s) => s.currentDroneId);
  const selectDrone     = useSimulationStore((s) => s.selectDrone);
  const droneConfig     = useSimulationStore((s) => s.droneConfig);

  return (
    <div style={{
      width: 300, flexShrink: 0,
      background: 'var(--bg-panel)',
      borderLeft: '1px solid var(--border)',
      overflowY: 'auto',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg-panel)',
        position: 'sticky', top: 0, zIndex: 2,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
          Target Controls
        </span>
      </div>

      <div style={{ padding: '0 14px 14px', overflowY: 'auto' }}>

        {/* ── Target Position ─────────────────────────────────────────── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', padding: '8px 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Target Position
        </div>
        <div style={{ paddingTop: 2 }}>
          <SliderInput label="X" value={target.x} min={-10} max={10} step={0.1} unit="m" onChange={(v) => updateTarget('x', v)} />
          <SliderInput label="Y" value={target.y} min={-10} max={10} step={0.1} unit="m" onChange={(v) => updateTarget('y', v)} />
          <SliderInput label="Z" value={target.z} min={0} max={10} step={0.1} unit="m" onChange={(v) => updateTarget('z', v)} />
        </div>

        {/* ── Target Attitude ──────────────────────────────────────────── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', padding: '8px 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Target Attitude
        </div>
        <div style={{ paddingTop: 2 }}>
          <SliderInput label="Roll" value={target.roll} min={-30} max={30} step={1} unit="°" decimals={0} onChange={(v) => updateTarget('roll', v)} />
          <SliderInput label="Pitch" value={target.pitch} min={-30} max={30} step={1} unit="°" decimals={0} onChange={(v) => updateTarget('pitch', v)} />
          <SliderInput label="Yaw" value={target.yaw} min={-180} max={180} step={1} unit="°" decimals={0} onChange={(v) => updateTarget('yaw', v)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={target.autoHeading}
              onChange={(e) => updateTarget('autoHeading', e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            Auto heading
          </label>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

        {/* ── PID Presets ──────────────────────────────────────────────── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', padding: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          PID Tuning
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {Object.keys(PID_PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(PID_PRESETS[name as keyof typeof PID_PRESETS])}
              style={{
                flex: 1,
                padding: '5px 4px',
                fontSize: 10,
                fontWeight: 600,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

        {/* ── Drone Type ───────────────────────────────────────────────── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', padding: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Drone Type
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
          {Object.entries(DRONE_PRESETS).map(([id, cfg]) => {
            const active = currentDroneId === id;
            return (
              <button
                key={id}
                onClick={() => selectDrone(id)}
                style={{
                  padding: '5px 4px',
                  fontSize: 10,
                  fontWeight: 600,
                  background: active ? 'var(--accent)' : 'var(--bg-secondary)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 4,
                  color: active ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {cfg.name}
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop: 6, padding: '6px 8px', borderRadius: 5,
          background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
          fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{droneConfig.name}</span>
          {' — '}
          {droneConfig.mass} kg, {droneConfig.motor.maxThrust}N max
        </div>

      </div>
    </div>
  );
}
