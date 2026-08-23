'use client';

import { useSimulationStore } from '@/store/simulationStore';
import { PID_PRESETS, PIDAxis } from '@/lib/simulation/types';

const AXES: PIDAxis[] = ['X', 'Y', 'Z', 'Roll', 'Pitch', 'Yaw'];

function PIDSlider({
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-accent2"
      />
      <input
        type="number"
        value={value < 0.1 ? value.toFixed(3) : value.toFixed(2)}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-14 text-center text-xs border border-border rounded px-0.5 py-0.5 bg-white"
      />
    </div>
  );
}

export default function PIDController() {
  const pid = useSimulationStore((s) => s.pid);
  const updatePID = useSimulationStore((s) => s.updatePID);
  const applyPreset = useSimulationStore((s) => s.applyPreset);

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-accent2">PID PARAMETERS</h3>
        <div className="flex gap-1">
          {Object.keys(PID_PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(PID_PRESETS[name as keyof typeof PID_PRESETS])}
              className="px-2 py-0.5 text-xs border border-border rounded hover:bg-gray-100"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-4 gap-2 text-xs font-bold text-gray-500 mb-1">
        <div className="text-center">AXIS</div>
        <div className="text-center">Kp</div>
        <div className="text-center">Ki</div>
        <div className="text-center">Kd</div>
      </div>

      {/* Rows */}
      {AXES.map((axis) => (
        <div key={axis} className="grid grid-cols-4 gap-2 items-center py-1">
          <div className="text-center text-xs font-bold text-gray-700">{axis}</div>
          <PIDSlider
            value={pid[axis].kp}
            min={0}
            max={10}
            onChange={(v) => updatePID(axis, 'kp', v)}
          />
          <PIDSlider
            value={pid[axis].ki}
            min={0}
            max={10}
            onChange={(v) => updatePID(axis, 'ki', v)}
          />
          <PIDSlider
            value={pid[axis].kd}
            min={0}
            max={10}
            onChange={(v) => updatePID(axis, 'kd', v)}
          />
        </div>
      ))}
    </div>
  );
}
