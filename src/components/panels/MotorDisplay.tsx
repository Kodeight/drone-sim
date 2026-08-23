'use client';

import { useSimulationStore } from '@/store/simulationStore';

const MOTOR_NAMES = ['M1 FRONT-LEFT', 'M2 FRONT-RIGHT', 'M3 REAR-LEFT', 'M4 REAR-RIGHT'];
const MAX_THRUST = 6.0;

export default function MotorDisplay() {
  const drone = useSimulationStore((s) => s.drone);

  return (
    <div className="border border-border rounded-lg p-3">
      <h3 className="text-xs font-bold text-accent2 mb-2">MOTOR THRUST</h3>
      <div className="grid grid-cols-4 gap-3">
        {drone.motorThrusts.map((thrust, i) => {
          const saturated = thrust >= MAX_THRUST - 1e-6;
          const pct = (thrust / MAX_THRUST) * 100;
          return (
            <div key={i} className="text-center">
              <div className="text-xs font-bold text-gray-500 mb-1">{MOTOR_NAMES[i]}</div>
              <div className="w-full h-3 bg-white border border-border rounded overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${saturated ? 'bg-danger' : 'bg-accent2'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className={`text-sm font-bold mt-1 ${saturated ? 'text-danger' : 'text-accent2'}`}>
                {thrust.toFixed(2)} N
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-gray-400 mt-2 text-center">
        Red = motor at max thrust (control authority lost)
      </div>
    </div>
  );
}
