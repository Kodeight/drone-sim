'use client';

import { useSimulationStore } from '@/store/simulationStore';
import { PID_PRESETS, PIDAxis } from '@/lib/simulation/types';

const AXES: PIDAxis[] = ['X', 'Y', 'Z', 'Roll', 'Pitch', 'Yaw'];

export default function PIDController() {
  const pid = useSimulationStore((s) => s.pid);
  const updatePID = useSimulationStore((s) => s.updatePID);
  const applyPreset = useSimulationStore((s) => s.applyPreset);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="px-3 pt-2 pb-1.5 flex items-center justify-between">
        <span className="text-xs font-bold text-accent2">PID PARAMETERS</span>
        <div className="flex gap-1">
          {Object.keys(PID_PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(PID_PRESETS[name as keyof typeof PID_PRESETS])}
              className="px-2 py-0.5 text-[10px] font-medium border border-border rounded hover:bg-gray-100 text-gray-600"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_1fr_1fr_1fr] gap-1 px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase">
        <div className="text-center">Axis</div>
        <div className="text-center">Kp</div>
        <div className="text-center">Ki</div>
        <div className="text-center">Kd</div>
      </div>

      {/* Table rows */}
      <div className="px-3 pb-2 space-y-0.5">
        {AXES.map((axis) => (
          <div key={axis} className="grid grid-cols-[56px_1fr_1fr_1fr] gap-1 items-center h-7">
            <div className="text-center text-xs font-bold text-gray-600">{axis}</div>
            {(['kp', 'ki', 'kd'] as const).map((param) => (
              <div key={param} className="flex items-center gap-1">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.01}
                  value={pid[axis][param]}
                  onChange={(e) => updatePID(axis, param, parseFloat(e.target.value))}
                  className="flex-1 h-1"
                />
                <input
                  type="number"
                  value={pid[axis][param] < 0.1 ? pid[axis][param].toFixed(3) : pid[axis][param].toFixed(2)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) updatePID(axis, param, Math.max(0, Math.min(10, v)));
                  }}
                  className="w-12 text-center text-[10px] border border-border rounded px-0.5 py-0.5 bg-white tabular-nums"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
