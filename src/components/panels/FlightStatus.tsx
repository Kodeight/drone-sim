'use client';

import { useSimulationStore } from '@/store/simulationStore';

const toDeg = (r: number) => (r * 180) / Math.PI;

// ─── Mini compass ────────────────────────────────────────────────────────────

function CompassRose({ yawDeg }: { yawDeg: number }) {
  const r = 30;
  const cx = 34, cy = 34;
  const needleAngle = (-yawDeg * Math.PI) / 180;
  const nx = cx + Math.sin(needleAngle) * 18;
  const ny = cy - Math.cos(needleAngle) * 18;
  const sx = cx - Math.sin(needleAngle) * 12;
  const sy = cy + Math.cos(needleAngle) * 12;

  return (
    <svg width="68" height="68" viewBox="0 0 68 68">
      {/* Ring */}
      <circle cx={cx} cy={cy} r={r} fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth="1.5" />
      {/* Cardinal labels */}
      {[
        { label: 'N', x: cx,    y: cy - 22 },
        { label: 'S', x: cx,    y: cy + 26 },
        { label: 'E', x: cx + 24, y: cy + 4 },
        { label: 'W', x: cx - 24, y: cy + 4 },
      ].map((c) => (
        <text key={c.label} x={c.x} y={c.y} textAnchor="middle"
          style={{ fontSize: 8, fontWeight: 700, fill: c.label === 'N' ? 'var(--danger)' : 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
          {c.label}
        </text>
      ))}
      {/* Needle (north = red) */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round"/>
      {/* South half */}
      <line x1={cx} y1={cy} x2={sx} y2={sy} stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2.5} fill="var(--text-primary)" />
    </svg>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

function DataRow({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 3, paddingBottom: 3 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: color ?? 'var(--accent)' }}>
        {value}
        {unit && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 2 }}>{unit}</span>}
      </span>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--text-muted)', marginBottom: 4,
      }}>
        {title}
      </div>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 6,
        padding: '6px 10px',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FlightStatus() {
  const drone  = useSimulationStore((s) => s.drone);
  const dist   = useSimulationStore((s) => s.distanceToTarget);
  const time   = useSimulationStore((s) => s.time);
  const status = useSimulationStore((s) => s.status);
  const isRunning = useSimulationStore((s) => s.isRunning);

  const rollDeg  = toDeg(drone.roll);
  const pitchDeg = toDeg(drone.pitch);
  const yawDeg   = toDeg(drone.yaw);

  const formatTime = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const statusColor: Record<string, string> = {
    STOPPED:   'var(--text-muted)',
    PAUSED:    'var(--warning)',
    TRACKING:  'var(--warning)',
    ON_TARGET: 'var(--success)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Flight Status ────────────────────────────────────────── */}
      <Section title="Flight Status">
        <DataRow label="Time"    value={formatTime(time)} />
        <DataRow label="Mode"    value="Manual" color="var(--text-primary)" />
        <DataRow label="Armed"   value="Yes"    color="var(--success)" />
        <DataRow label="Battery" value="11.8 V" color="var(--text-primary)" />
        <div style={{ marginTop: 4 }}>
          <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: '78%', height: '100%', background: 'var(--success)', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textAlign: 'right' }}>78%</div>
        </div>
        <DataRow
          label="Status"
          value={status.charAt(0) + status.slice(1).toLowerCase()}
          color={statusColor[status]}
        />
      </Section>

      {/* ── Attitude ─────────────────────────────────────────────── */}
      <Section title="Attitude">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <DataRow label="Roll"  value={rollDeg.toFixed(1)}  unit="°" color={Math.abs(rollDeg)  > 15 ? 'var(--warning)' : 'var(--text-primary)'} />
            <DataRow label="Pitch" value={pitchDeg.toFixed(1)} unit="°" color={Math.abs(pitchDeg) > 15 ? 'var(--warning)' : 'var(--text-primary)'} />
            <DataRow label="Yaw"   value={yawDeg.toFixed(1)}   unit="°" color="var(--text-primary)" />
          </div>
          <CompassRose yawDeg={yawDeg} />
        </div>
      </Section>

      {/* ── Rates ────────────────────────────────────────────────── */}
      <Section title="Rates (°/s)">
        <DataRow label="Roll Rate"  value={(toDeg(drone.p)).toFixed(1)} unit="°/s"
          color={Math.abs(drone.p) > 1 ? 'var(--success)' : 'var(--text-primary)'} />
        <DataRow label="Pitch Rate" value={(toDeg(drone.q)).toFixed(1)} unit="°/s"
          color={Math.abs(drone.q) > 1 ? 'var(--danger)' : 'var(--text-primary)'} />
        <DataRow label="Yaw Rate"   value={(toDeg(drone.r)).toFixed(1)} unit="°/s"
          color="var(--text-primary)" />
      </Section>

      {/* ── Position ─────────────────────────────────────────────── */}
      <Section title="Position (m)">
        <DataRow label="X" value={drone.x.toFixed(2)} unit="m" />
        <DataRow label="Y" value={drone.y.toFixed(2)} unit="m" />
        <DataRow label="Z" value={drone.z.toFixed(2)} unit="m" />
        <div style={{ marginTop: 4, borderTop: '1px solid var(--border-subtle)', paddingTop: 4 }}>
          <DataRow label="Distance to Target" value={dist.toFixed(2)} unit="m"
            color={dist < 0.2 ? 'var(--success)' : dist < 1 ? 'var(--warning)' : 'var(--text-primary)'} />
        </div>
      </Section>
    </div>
  );
}
