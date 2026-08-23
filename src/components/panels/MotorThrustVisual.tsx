'use client';

import { useSimulationStore } from '@/store/simulationStore';

const MAX_THRUST = 6.0;

// ─── Circular gauge ───────────────────────────────────────────────────────────

function MotorGauge({
  label, position, thrust, index,
}: {
  label: string; position: string; thrust: number; index: number;
}) {
  const pct = Math.min(thrust / MAX_THRUST, 1);
  const saturated = pct >= 0.99;
  const rpm = Math.round(pct * 8500);

  const SIZE = 64;
  const R = 26;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const strokeDashoffset = CIRCUMFERENCE * (1 - pct * 0.75); // 270° arc
  const strokeColor = saturated ? 'var(--danger)' : 'var(--accent)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {/* Position label */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>
        {label}
      </div>

      {/* Circular gauge */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: 'rotate(135deg)' }}>
          {/* Track */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="5"
            strokeDasharray={`${CIRCUMFERENCE * 0.75} ${CIRCUMFERENCE * 0.25}`}
            strokeLinecap="round"
          />
          {/* Fill */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke={strokeColor}
            strokeWidth="5"
            strokeDasharray={`${CIRCUMFERENCE * 0.75} ${CIRCUMFERENCE * 0.25}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.08s ease, stroke 0.1s' }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: saturated ? 'var(--danger)' : 'var(--success)' }}>
            {thrust.toFixed(2)}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>N</span>
        </div>
      </div>

      {/* Position name */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{position}</div>

      {/* RPM */}
      <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
        {rpm.toLocaleString()} rpm
      </div>

      {/* % bar */}
      <div style={{ width: 48, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: saturated ? 'var(--danger)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.08s' }} />
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{Math.round(pct * 100)}%</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MotorThrustVisual() {
  const drone = useSimulationStore((s) => s.drone);
  const thrusts = drone.motorThrusts;
  const totalThrust = thrusts.reduce((a, b) => a + b, 0);

  const motors = [
    { label: 'M1', position: 'Front Left',  thrust: thrusts[0], index: 0 },
    { label: 'M2', position: 'Front Right', thrust: thrusts[1], index: 1 },
    { label: 'M3', position: 'Rear Left',   thrust: thrusts[2], index: 2 },
    { label: 'M4', position: 'Rear Right',  thrust: thrusts[3], index: 3 },
  ];

  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          Motor Thrust (N)
        </span>
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
          Total: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{totalThrust.toFixed(2)} N</span>
        </span>
      </div>

      {/* X-config quadcopter visual */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gridTemplateRows: 'auto auto auto',
        gap: '6px 8px',
        alignItems: 'center',
        justifyItems: 'center',
      }}>
        {/* Row 1: M1, center connector, M2 */}
        <MotorGauge {...motors[0]} />

        {/* Center X arms */}
        <div style={{ gridRow: '1 / 3', position: 'relative', width: 36, height: 80 }}>
          <svg width="36" height="80" viewBox="0 0 36 80">
            <line x1="2"  y1="2"  x2="34" y2="78" stroke="var(--border)" strokeWidth="1.5"/>
            <line x1="34" y1="2"  x2="2"  y2="78" stroke="var(--border)" strokeWidth="1.5"/>
            <circle cx="18" cy="40" r="5" fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth="1.5"/>
          </svg>
        </div>

        <MotorGauge {...motors[1]} />

        {/* Row 2: total / body placeholder */}
        <div style={{ gridColumn: '1 / -1', textAlign: 'center' }} />

        {/* Row 3: M3, spacer, M4 */}
        <MotorGauge {...motors[2]} />
        <div />
        <MotorGauge {...motors[3]} />
      </div>
    </div>
  );
}
