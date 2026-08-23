'use client';

import { useSimulationStore } from '@/store/simulationStore';

const MOTOR_LABELS = ['M1 Front-Left', 'M2 Front-Right', 'M3 Rear-Left', 'M4 Rear-Right'];
const MAX_THRUST = 6.0;

export default function MotorDisplay() {
  const drone = useSimulationStore((s) => s.drone);

  return (
    <div className="border border-border rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-accent2">MOTOR THRUST</span>
        <span className="text-[10px] text-gray-400">Red = saturated</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {drone.motorThrusts.map((thrust, i) => {
          const saturated = thrust >= MAX_THRUST - 1e-6;
          const pct = (thrust / MAX_THRUST) * 100;
          return (
            <div key={i}>
              <div className="text-[10px] text-gray-400 text-center mb-0.5 truncate">{MOTOR_LABELS[i]}</div>
              <div className="w-full h-2 bg-gray-100 border border-border rounded-sm overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-75 ${saturated ? 'bg-danger' : 'bg-accent2'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className={`text-xs font-mono font-bold text-center mt-0.5 tabular-nums ${saturated ? 'text-danger' : 'text-accent2'}`}>
                {thrust.toFixed(2)} N
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
