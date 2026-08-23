'use client';

import { useSimulationStore } from '@/store/simulationStore';
import { PID_PRESETS, PIDAxis } from '@/lib/simulation/types';

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
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-4 pt-2.5 pb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-accent2 uppercase tracking-wide">PID Parameters</span>
        <div className="flex gap-1">
          {Object.keys(PID_PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(PID_PRESETS[name as keyof typeof PID_PRESETS])}
              className="px-2.5 py-0.5 text-[10px] font-medium border border-border rounded hover:bg-gray-100 text-gray-600"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[44px_1fr_1fr_1fr] gap-2 px-4 pb-1 text-[10px] font-bold text-gray-400 uppercase">
        <div className="text-center">Axis</div>
        <div className="text-center">Kp</div>
        <div className="text-center">Ki</div>
        <div className="text-center">Kd</div>
      </div>

      {/* Table rows */}
      <div className="px-4 pb-2.5 space-y-1">
        {AXES.map((axis) => (
          <div key={axis} className="grid grid-cols-[44px_1fr_1fr_1fr] gap-2 items-center">
            <div className="text-center text-xs font-bold text-gray-600">{axis}</div>
            {(['kp', 'ki', 'kd'] as const).map((param) => {
              const max = maxFor(axis, param);
              const val = pid[axis][param];
              return (
                <div key={param} className="flex items-center gap-1">
                  <input
                    type="range"
                    min={0}
                    max={max}
                    step={max * 0.002}
                    value={val}
                    onChange={(e) => updatePID(axis, param, parseFloat(e.target.value))}
                    className="flex-1 h-1 min-w-0"
                  />
                  <input
                    type="number"
                    value={val < 0.1 ? val.toFixed(3) : val.toFixed(2)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) updatePID(axis, param, Math.max(0, Math.min(max, v)));
                    }}
                    className="w-14 text-center text-[10px] border border-border rounded px-0.5 py-1 bg-white tabular-nums shrink-0"
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
