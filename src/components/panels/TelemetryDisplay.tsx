'use client';

import { useSimulationStore } from '@/store/simulationStore';

export default function TelemetryDisplay() {
  const drone = useSimulationStore((s) => s.drone);
  const dist = useSimulationStore((s) => s.distanceToTarget);

  const toDeg = (r: number) => (r * 180) / Math.PI;

  const data = [
    { label: 'X', value: drone.x.toFixed(3), unit: 'm' },
    { label: 'Y', value: drone.y.toFixed(3), unit: 'm' },
    { label: 'Z', value: drone.z.toFixed(3), unit: 'm' },
    { label: 'Roll', value: toDeg(drone.roll).toFixed(1), unit: 'deg' },
    { label: 'Pitch', value: toDeg(drone.pitch).toFixed(1), unit: 'deg' },
    { label: 'Yaw', value: toDeg(drone.yaw).toFixed(1), unit: 'deg' },
    { label: 'Vx', value: drone.vx.toFixed(2), unit: 'm/s' },
    { label: 'Vy', value: drone.vy.toFixed(2), unit: 'm/s' },
    { label: 'Vz', value: drone.vz.toFixed(2), unit: 'm/s' },
  ];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-3 pt-2 pb-1.5">
        <span className="text-xs font-bold text-accent2">TELEMETRY</span>
      </div>

      <div className="px-3 pb-2 grid grid-cols-3 gap-x-3 gap-y-0.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between text-xs h-5">
            <span className="text-gray-400">{d.label}</span>
            <span className="font-mono font-bold text-accent2 tabular-nums">
              {d.value}
              <span className="text-gray-400 font-normal ml-0.5">{d.unit}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="h-px bg-border mx-3" />

      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">Distance to target</span>
        <span className="text-xs font-mono font-bold text-accent tabular-nums">{dist.toFixed(2)} m</span>
      </div>
    </div>
  );
}
