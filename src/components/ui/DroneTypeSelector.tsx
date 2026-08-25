'use client';

import { useState } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { DRONE_PRESETS } from '@/lib/simulation/types';
import SliderInput from '@/components/ui/SliderInput';

export default function DroneTypeSelector() {
  const currentDroneId = useSimulationStore((s) => s.currentDroneId);
  const droneConfig = useSimulationStore((s) => s.droneConfig);
  const selectDrone = useSimulationStore((s) => s.selectDrone);
  const customDrone = useSimulationStore((s) => s.customDrone);
  const updateCustomDrone = useSimulationStore((s) => s.updateCustomDrone);
  const applyCustomDrone = useSimulationStore((s) => s.applyCustomDrone);
  const [showCustom, setShowCustom] = useState(false);

  const isCustom = currentDroneId === 'custom';
  const twr = (4 * droneConfig.motor.maxThrust / (droneConfig.mass * 9.81)).toFixed(1);

  const handleSelect = (id: string) => {
    if (id === 'custom') {
      setShowCustom(true);
      // Don't apply yet, let user configure first
      return;
    }
    setShowCustom(false);
    selectDrone(id);
  };

  const handleApplyCustom = () => {
    applyCustomDrone();
  };

  return (
    <div>
      {/* ── Dropdown ──────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <select
          value={isCustom ? 'custom' : currentDroneId}
          onChange={(e) => handleSelect(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: 12,
            fontWeight: 600,
            background: isCustom ? 'rgba(37,99,235,0.1)' : 'var(--bg-secondary)',
            border: `1px solid ${isCustom ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`,
            borderRadius: 5,
            color: isCustom ? 'var(--accent)' : 'var(--text-primary)',
            cursor: 'pointer',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        >
          {Object.entries(DRONE_PRESETS).filter(([id]) => id !== 'custom').map(([id, cfg]) => (
            <option key={id} value={id}>{cfg.name}</option>
          ))}
          <option value="custom">Custom...</option>
        </select>
        <div style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', fontSize: 10, color: 'var(--text-muted)',
        }}>
          &#9662;
        </div>
      </div>

      {/* ── Active drone info ─────────────────────────────────── */}
      <div style={{
        padding: '5px 8px', borderRadius: 5,
        background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
        fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 4,
      }}>
        <span style={{ fontWeight: 700, color: isCustom ? 'var(--accent)' : 'var(--accent2)' }}>
          {droneConfig.name}
        </span>
        {' — '}
        {droneConfig.mass} kg, TWR {twr}, {droneConfig.motor.maxThrust}N
      </div>

      {/* ── Custom editor ─────────────────────────────────────── */}
      {showCustom && (
        <div style={{
          padding: '8px 0',
          borderTop: '1px solid var(--border)',
          marginTop: 4,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 6 }}>
            Custom Configuration
          </div>

          {/* Mass & Motor */}
          <SliderInput label="Mass" value={customDrone.mass} min={0.05} max={20} step={0.01} unit="kg" onChange={(v) => updateCustomDrone('mass', v)} />
          <SliderInput label="Arm Length" value={customDrone.motor.armLength} min={0.05} max={1} step={0.01} unit="m" onChange={(v) => updateCustomDrone('motor.armLength', v)} />
          <SliderInput label="Max Thrust" value={customDrone.motor.maxThrust} min={0.5} max={50} step={0.1} unit="N" onChange={(v) => updateCustomDrone('motor.maxThrust', v)} />
          <SliderInput label="Motor τ" value={customDrone.motor.timeConstant} min={0.001} max={0.1} step={0.001} unit="s" decimals={3} onChange={(v) => updateCustomDrone('motor.timeConstant', v)} />
          <SliderInput label="Yaw Coeff" value={customDrone.motor.yawCoefficient} min={0.005} max={0.1} step={0.001} decimals={3} onChange={(v) => updateCustomDrone('motor.yawCoefficient', v)} />

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* Inertia */}
          <SliderInput label="Ix" value={customDrone.inertia.ix} min={0.0001} max={2} step={0.0001} unit="kg·m²" decimals={4} onChange={(v) => updateCustomDrone('inertia.ix', v)} />
          <SliderInput label="Iy" value={customDrone.inertia.iy} min={0.0001} max={2} step={0.0001} unit="kg·m²" decimals={4} onChange={(v) => updateCustomDrone('inertia.iy', v)} />
          <SliderInput label="Iz" value={customDrone.inertia.iz} min={0.0001} max={3} step={0.0001} unit="kg·m²" decimals={4} onChange={(v) => updateCustomDrone('inertia.iz', v)} />

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* Drag */}
          <SliderInput label="Drag XY" value={customDrone.drag.linearXY} min={0} max={2} step={0.01} decimals={2} onChange={(v) => updateCustomDrone('drag.linearXY', v)} />
          <SliderInput label="Drag Z" value={customDrone.drag.linearZ} min={0} max={2} step={0.01} decimals={2} onChange={(v) => updateCustomDrone('drag.linearZ', v)} />
          <SliderInput label="Quad Drag" value={customDrone.drag.quadraticXY} min={0} max={0.5} step={0.001} decimals={3} onChange={(v) => updateCustomDrone('drag.quadraticXY', v)} />
          <SliderInput label="Ang Drag" value={customDrone.drag.angular} min={0} max={0.2} step={0.001} decimals={3} onChange={(v) => updateCustomDrone('drag.angular', v)} />

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* Control Limits */}
          <SliderInput label="Max Tilt" value={customDrone.controlLimits.maxTiltAngle} min={5} max={60} step={1} unit="°" decimals={0} onChange={(v) => updateCustomDrone('controlLimits.maxTiltAngle', v)} />
          <SliderInput label="Max Rate R/P" value={customDrone.controlLimits.maxRateRoll} min={10} max={500} step={5} unit="°/s" decimals={0} onChange={(v) => { updateCustomDrone('controlLimits.maxRateRoll', v); updateCustomDrone('controlLimits.maxRatePitch', v); }} />
          <SliderInput label="Max Rate Y" value={customDrone.controlLimits.maxRateYaw} min={10} max={300} step={5} unit="°/s" decimals={0} onChange={(v) => updateCustomDrone('controlLimits.maxRateYaw', v)} />

          {/* Apply button */}
          <button
            onClick={handleApplyCustom}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
            style={{
              width: '100%', marginTop: 8,
              padding: '7px 0', fontSize: 11, fontWeight: 700,
              background: 'var(--accent)',
              border: 'none', borderRadius: 5,
              color: '#fff', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            Apply Custom Drone
          </button>
        </div>
      )}
    </div>
  );
}
