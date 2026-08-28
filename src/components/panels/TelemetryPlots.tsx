'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useSimulationStore } from '@/store/simulationStore';

const TABS = ['Attitude', 'Rates', 'Position', 'Velocity', 'Motor Thrust'] as const;
type Tab = typeof TABS[number];

// ─── Chart configs ────────────────────────────────────────────────────────────

const CHART_CONFIG: Record<Tab, { keys: { key: string; name: string; color: string; dashed?: boolean }[]; unit: string }> = {
  Attitude: {
    unit: '°',
    keys: [
      { key: 'roll',        name: 'Roll',       color: 'var(--chart-1)' },
      { key: 'pitch',       name: 'Pitch',      color: 'var(--chart-2)' },
      { key: 'yaw',         name: 'Yaw',        color: 'var(--chart-3)' },
      { key: 'targetRoll',  name: 'Roll ref',   color: 'var(--chart-1)', dashed: true },
      { key: 'targetPitch', name: 'Pitch ref',  color: 'var(--chart-2)', dashed: true },
      { key: 'targetYaw',   name: 'Yaw ref',    color: 'var(--chart-3)', dashed: true },
    ],
  },
  Rates: {
    unit: '°/s',
    keys: [
      { key: 'p',  name: 'Roll Rate',  color: 'var(--chart-1)' },
      { key: 'q',  name: 'Pitch Rate', color: 'var(--chart-2)' },
      { key: 'r',  name: 'Yaw Rate',   color: 'var(--chart-3)' },
    ],
  },
  Position: {
    unit: 'm',
    keys: [
      { key: 'x',       name: 'X',      color: 'var(--chart-1)' },
      { key: 'y',       name: 'Y',      color: 'var(--chart-2)' },
      { key: 'z',       name: 'Z',      color: 'var(--chart-3)' },
      { key: 'targetX', name: 'X ref',  color: 'var(--chart-1)', dashed: true },
      { key: 'targetY', name: 'Y ref',  color: 'var(--chart-2)', dashed: true },
      { key: 'targetZ', name: 'Z ref',  color: 'var(--chart-3)', dashed: true },
    ],
  },
  Velocity: {
    unit: 'm/s',
    keys: [
      { key: 'vx', name: 'Vx', color: 'var(--chart-1)' },
      { key: 'vy', name: 'Vy', color: 'var(--chart-2)' },
      { key: 'vz', name: 'Vz', color: 'var(--chart-3)' },
    ],
  },
  'Motor Thrust': {
    unit: 'N',
    keys: [
      { key: 'motor1', name: 'M1', color: 'var(--chart-1)' },
      { key: 'motor2', name: 'M2', color: 'var(--chart-2)' },
      { key: 'motor3', name: 'M3', color: 'var(--chart-3)' },
      { key: 'motor4', name: 'M4', color: 'var(--chart-4)' },
    ],
  },
};

const CTRL_KEYS = [
  { key: 'ctrlRoll',     name: 'Roll Out',   color: 'var(--chart-1)' },
  { key: 'ctrlPitch',    name: 'Pitch Out',  color: 'var(--chart-2)' },
  { key: 'ctrlYaw',      name: 'Yaw Out',    color: 'var(--chart-3)' },
  { key: 'ctrlThrottle', name: 'Throttle',   color: 'var(--chart-4)' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────


const DOWNSAMPLE = 4; // keep every Nth point for performance

function downsample<T>(arr: T[]): T[] {
  if (arr.length <= 200) return arr;
  return arr.filter((_, i) => i % DOWNSAMPLE === 0);
}

// ─── Tooltip style ────────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: 'var(--chart-bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 10,
    color: 'var(--text-primary)',
    padding: '4px 8px',
  },
  labelStyle: { color: 'var(--text-muted)', fontSize: 9 },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TelemetryPlots() {
  const [activeTab, setActiveTab] = useState<Tab>('Attitude');
  const history          = useSimulationStore((s) => s.history);

  // Build chart data - uses authoritative Python backend history
  const raw = downsample(history.time.map((t, i) => ({
    time:        parseFloat(t.toFixed(1)),
    x:           history.x[i],
    y:           history.y[i],
    z:           history.z[i],
    targetX:     history.targetX[i],
    targetY:     history.targetY[i],
    targetZ:     history.targetZ[i],
    roll:        history.roll[i],
    pitch:       history.pitch[i],
    yaw:         history.yaw[i],
    targetRoll:  history.targetRoll[i],
    targetPitch: history.targetPitch[i],
    targetYaw:   history.targetYaw[i],
    p:           history.p[i] ?? 0,
    q:           history.q[i] ?? 0,
    r:           history.r[i] ?? 0,
    vx:          history.vx[i],
    vy:          history.vy[i],
    vz:          history.vz[i],
    motor1:      history.motor1[i],
    motor2:      history.motor2[i],
    motor3:      history.motor3[i],
    motor4:      history.motor4[i],
    ctrlRoll:     history.ctrlRoll[i] ?? 0,
    ctrlPitch:    history.ctrlPitch[i] ?? 0,
    ctrlYaw:      history.ctrlYaw[i] ?? 0,
    ctrlThrottle: history.ctrlThrottle[i] ?? 0,
  })));

  const cfg = CHART_CONFIG[activeTab];

  // Controller outputs chart data - authoritative backend values, history-based (not last-point fake)
  const ctrlData = raw;

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', minHeight: 0 }}>
      {/* ── Left: Telemetry plots ────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        borderRight: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          padding: '6px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginRight: 12 }}>
            Telemetry Plots
          </span>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: activeTab === tab ? 600 : 400,
                background: activeTab === tab ? 'var(--accent-glow)' : 'transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div style={{ flex: 1, padding: '6px 8px', minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={raw} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9 }}
                tickFormatter={(v: number) => `${v.toFixed(0)}`}
                label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -4, style: { fontSize: 9, fill: 'var(--text-muted)' } }}
              />
              <YAxis tick={{ fontSize: 9 }} width={36} />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(v: number) => `t = ${v.toFixed(1)}s`}
              />
              <Legend wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
              {cfg.keys.map((dk) => (
                <Line
                  key={dk.key}
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.name}
                  stroke={dk.color}
                  strokeDasharray={dk.dashed ? '4 4' : undefined}
                  strokeOpacity={dk.dashed ? 0.6 : 1}
                  dot={false}
                  strokeWidth={dk.dashed ? 1 : 1.5}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Right: Controller outputs ────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Controller Outputs
          </span>
          <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
            {CTRL_KEYS.map((k) => (
              <span key={k.key} style={{ fontSize: 9, color: k.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 12, height: 2, background: k.color, display: 'inline-block', borderRadius: 1 }} />
                {k.name}
              </span>
            ))}
          </div>
        </div>

        {/* Chart - controller outputs use authoritative backend history */}
        <div style={{ flex: 1, padding: '6px 8px', minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ctrlData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9 }}
                tickFormatter={(v: number) => `${v.toFixed(0)}`}
                label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -4, style: { fontSize: 9, fill: 'var(--text-muted)' } }}
              />
              <YAxis tick={{ fontSize: 9 }} width={36} />
              <Tooltip {...tooltipStyle} labelFormatter={(v: number) => `t = ${v.toFixed(1)}s`} />
              {CTRL_KEYS.map((k) => (
                <Line
                  key={k.key}
                  type="monotone"
                  dataKey={k.key}
                  name={k.name}
                  stroke={k.color}
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
