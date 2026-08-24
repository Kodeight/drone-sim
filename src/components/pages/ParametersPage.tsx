'use client';

import { useSimulationStore } from '@/store/simulationStore';
import { DRONE_PRESETS, ENVIRONMENT_PRESETS } from '@/lib/simulation/types';
import SliderInput from '@/components/ui/SliderInput';

export default function ParametersPage() {
  const currentDroneId = useSimulationStore((s) => s.currentDroneId);
  const droneConfig = useSimulationStore((s) => s.droneConfig);
  const selectDrone = useSimulationStore((s) => s.selectDrone);
  const currentEnvId = useSimulationStore((s) => s.currentEnvId);
  const selectEnvironment = useSimulationStore((s) => s.selectEnvironment);
  const physicalParams = useSimulationStore((s) => s.physicalParams);
  const updatePhysical = useSimulationStore((s) => s.updatePhysicalParam);

  const twr = (4 * droneConfig.motor.maxThrust / (droneConfig.mass * 9.81)).toFixed(1);
  const activeEnv = ENVIRONMENT_PRESETS[currentEnvId];

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', height: '100%' }}>

      {/* ════════════════════════════════════════════════════════════════
          HEADER: Current active selections summary
         ════════════════════════════════════════════════════════════════ */}
      <div style={{
        marginBottom: 16, padding: '12px 18px', borderRadius: 8,
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'stretch', gap: 0,
      }}>
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 3 }}>
            Active Drone
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
            {droneConfig.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.6 }}>
            {droneConfig.mass} kg &middot; TWR {twr} &middot; {droneConfig.motor.maxThrust}N/motor &middot; {(droneConfig.motor.armLength * 1000).toFixed(0)}mm arm
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
        <div style={{ flex: 1, paddingLeft: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 3 }}>
            Active Environment
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent2)' }}>
            {activeEnv?.name ?? 'Custom'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.6 }}>
            g={physicalParams.gravity} m/s² &middot; ρ={physicalParams.airDensity} kg/m³ &middot; wind={physicalParams.windSpeed} m/s @ {physicalParams.windDirection}°
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          DRONE TYPE SELECTION
         ════════════════════════════════════════════════════════════════ */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        Drone Type
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        Select a preset. Each configures mass, inertia, motor specs, drag, and default PID gains.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
        {Object.entries(DRONE_PRESETS).map(([id, cfg]) => {
          const active = currentDroneId === id;
          const cfgTwr = (4 * cfg.motor.maxThrust / (cfg.mass * 9.81)).toFixed(1);
          return (
            <button
              key={id}
              onClick={() => selectDrone(id)}
              style={{
                padding: '12px 10px',
                background: active ? 'var(--accent)' : 'var(--bg-secondary)',
                border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 8,
                color: active ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                  color: '#fff', background: 'rgba(255,255,255,0.25)',
                  borderRadius: 3, padding: '2px 6px',
                }}>
                  ACTIVE
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 700 }}>{cfg.name}</div>
              <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2, lineHeight: 1.4 }}>{cfg.description}</div>
              <div style={{
                marginTop: 6, paddingTop: 5,
                borderTop: active ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)',
                fontSize: 9, opacity: 0.6, lineHeight: 1.5,
              }}>
                {cfg.mass} kg &middot; TWR {cfgTwr}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Selected drone detail ─────────────────────────────────── */}
      <div style={{
        marginTop: 12, padding: '10px 14px', borderRadius: 8,
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        fontSize: 11, color: 'var(--text-secondary)',
      }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          {droneConfig.name} — {droneConfig.description}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '4px 12px', lineHeight: 1.7 }}>
          <span>Mass: <b style={{ color: 'var(--accent2)' }}>{droneConfig.mass} kg</b></span>
          <span>TWR: <b style={{ color: 'var(--accent2)' }}>{twr}</b></span>
          <span>Arm: <b style={{ color: 'var(--accent2)' }}>{(droneConfig.motor.armLength * 1000).toFixed(0)} mm</b></span>
          <span>Max Thrust: <b style={{ color: 'var(--accent2)' }}>{droneConfig.motor.maxThrust} N</b></span>
          <span>Ix: <b style={{ color: 'var(--accent2)' }}>{droneConfig.inertia.ix}</b></span>
          <span>Iy: <b style={{ color: 'var(--accent2)' }}>{droneConfig.inertia.iy}</b></span>
          <span>Iz: <b style={{ color: 'var(--accent2)' }}>{droneConfig.inertia.iz}</b></span>
          <span>Drag XY: <b style={{ color: 'var(--accent2)' }}>{droneConfig.drag.linearXY}</b></span>
          <span>Drag Z: <b style={{ color: 'var(--accent2)' }}>{droneConfig.drag.linearZ}</b></span>
          <span>Angular Drag: <b style={{ color: 'var(--accent2)' }}>{droneConfig.drag.angular}</b></span>
          <span>Max Tilt: <b style={{ color: 'var(--accent2)' }}>{droneConfig.controlLimits.maxTiltAngle}°</b></span>
          <span>Motor τ: <b style={{ color: 'var(--accent2)' }}>{droneConfig.motor.timeConstant}s</b></span>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

      {/* ════════════════════════════════════════════════════════════════
          ENVIRONMENT CONDITIONS
         ════════════════════════════════════════════════════════════════ */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        Environment Conditions
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        Select an environment preset, then adjust individual values below.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
        {Object.entries(ENVIRONMENT_PRESETS).map(([id, env]) => {
          const active = currentEnvId === id;
          return (
            <button
              key={id}
              onClick={() => selectEnvironment(id)}
              style={{
                padding: '12px 10px',
                background: active ? 'var(--accent2)' : 'var(--bg-secondary)',
                border: active ? '2px solid var(--accent2)' : '1px solid var(--border)',
                borderRadius: 8,
                color: active ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                  color: '#fff', background: 'rgba(255,255,255,0.25)',
                  borderRadius: 3, padding: '2px 6px',
                }}>
                  ACTIVE
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 700 }}>{env.name}</div>
              <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2, lineHeight: 1.4 }}>{env.description}</div>
              <div style={{
                marginTop: 6, paddingTop: 5,
                borderTop: active ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)',
                fontSize: 9, opacity: 0.6, lineHeight: 1.5,
              }}>
                g={env.gravity} &middot; ρ={env.airDensity} &middot; {env.windSpeed}m/s
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Environment sliders (adjustable) ──────────────────────── */}
      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>
          Environment Values — {activeEnv?.name ?? 'Custom'}
        </div>
        <SliderInput label="Gravity" value={physicalParams.gravity} min={0.5} max={15} step={0.01} unit="m/s²" onChange={(v) => updatePhysical('gravity', v)} />
        <SliderInput label="Air Density" value={physicalParams.airDensity} min={0.01} max={2} step={0.001} unit="kg/m³" decimals={3} onChange={(v) => updatePhysical('airDensity', v)} />
        <SliderInput label="Wind Speed" value={physicalParams.windSpeed} min={0} max={20} step={0.1} unit="m/s" onChange={(v) => updatePhysical('windSpeed', v)} />
        <SliderInput label="Wind Direction" value={physicalParams.windDirection} min={0} max={360} step={1} unit="°" decimals={0} onChange={(v) => updatePhysical('windDirection', v)} />
      </div>
    </div>
  );
}
