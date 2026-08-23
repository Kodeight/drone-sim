'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useSimulationStore } from '@/store/simulationStore';

const COLORS = {
  teal: '#0e8f83',
  amber: '#d97706',
  blue: '#2f6fed',
};

interface ChartConfig {
  title: string;
  dataKeys: { key: string; color: string; name: string; dashed?: boolean }[];
  unit: string;
}

const CHARTS: ChartConfig[] = [
  {
    title: 'Position',
    unit: 'm',
    dataKeys: [
      { key: 'x', color: COLORS.teal, name: 'X' },
      { key: 'y', color: COLORS.amber, name: 'Y' },
      { key: 'z', color: COLORS.blue, name: 'Z' },
      { key: 'targetX', color: COLORS.teal, name: 'X ref', dashed: true },
      { key: 'targetY', color: COLORS.amber, name: 'Y ref', dashed: true },
      { key: 'targetZ', color: COLORS.blue, name: 'Z ref', dashed: true },
    ],
  },
  {
    title: 'Attitude',
    unit: 'deg',
    dataKeys: [
      { key: 'roll', color: COLORS.teal, name: 'Roll' },
      { key: 'pitch', color: COLORS.amber, name: 'Pitch' },
      { key: 'yaw', color: COLORS.blue, name: 'Yaw' },
      { key: 'targetRoll', color: COLORS.teal, name: 'Roll ref', dashed: true },
      { key: 'targetPitch', color: COLORS.amber, name: 'Pitch ref', dashed: true },
      { key: 'targetYaw', color: COLORS.blue, name: 'Yaw ref', dashed: true },
    ],
  },
  {
    title: 'Velocity',
    unit: 'm/s',
    dataKeys: [
      { key: 'vx', color: COLORS.teal, name: 'Vx' },
      { key: 'vy', color: COLORS.amber, name: 'Vy' },
      { key: 'vz', color: COLORS.blue, name: 'Vz' },
    ],
  },
];

function MiniChart({ config, data, showXAxis }: { config: ChartConfig; data: any[]; showXAxis: boolean }) {
  return (
    <div className="border border-border rounded-lg p-2">
      <div className="text-xs font-bold text-gray-700 mb-1">{config.title} ({config.unit})</div>
      <ResponsiveContainer width="100%" height={showXAxis ? 160 : 130}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: showXAxis ? 5 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ef" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 8, fill: '#6b7280' }}
            tickFormatter={(v: number) => v.toFixed(0)}
            hide={!showXAxis}
          />
          <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} width={40} />
          <Tooltip
            contentStyle={{ fontSize: 10, background: '#fff', border: '1px solid #d7dce6' }}
            labelFormatter={(v: number) => `t=${v.toFixed(1)}s`}
          />
          <Legend wrapperStyle={{ fontSize: 8 }} />
          {config.dataKeys.map((dk) => (
            <Line
              key={dk.key}
              type="monotone"
              dataKey={dk.key}
              name={dk.name}
              stroke={dk.color}
              strokeDasharray={dk.dashed ? '5 5' : undefined}
              strokeOpacity={dk.dashed ? 0.5 : 1}
              dot={false}
              strokeWidth={dk.dashed ? 1 : 1.5}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OverviewCharts() {
  const history = useSimulationStore((s) => s.history);

  const data = history.time.map((t, i) => ({
    time: t,
    x: history.x[i], y: history.y[i], z: history.z[i],
    targetX: history.targetX[i], targetY: history.targetY[i], targetZ: history.targetZ[i],
    roll: history.roll[i], pitch: history.pitch[i], yaw: history.yaw[i],
    targetRoll: history.targetRoll[i], targetPitch: history.targetPitch[i], targetYaw: history.targetYaw[i],
    vx: history.vx[i], vy: history.vy[i], vz: history.vz[i],
  }));

  return (
    <div className="space-y-2">
      {CHARTS.map((config, i) => (
        <MiniChart key={config.title} config={config} data={data} showXAxis={i === CHARTS.length - 1} />
      ))}
      <div className="text-xs text-gray-400 text-center">Scroll to zoom</div>
    </div>
  );
}

export function FullCharts() {
  const history = useSimulationStore((s) => s.history);

  const data = history.time.map((t, i) => ({
    time: t,
    x: history.x[i], y: history.y[i], z: history.z[i],
    targetX: history.targetX[i], targetY: history.targetY[i], targetZ: history.targetZ[i],
    roll: history.roll[i], pitch: history.pitch[i], yaw: history.yaw[i],
    targetRoll: history.targetRoll[i], targetPitch: history.targetPitch[i], targetYaw: history.targetYaw[i],
    vx: history.vx[i], vy: history.vy[i], vz: history.vz[i],
  }));

  return (
    <div className="space-y-3">
      {CHARTS.map((config, i) => (
        <MiniChart key={config.title} config={config} data={data} showXAxis={i === CHARTS.length - 1} />
      ))}
    </div>
  );
}
