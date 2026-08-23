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
      <div className="px-4 pt-2.5 pb-2">
        <span className="text-[11px] font-bold text-accent2 uppercase tracking-wide">Telemetry</span>
      </div>

      <div className="px-4 pb-2.5 grid grid-cols-3 gap-x-4 gap-y-1">
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

      <div className="h-px bg-border mx-4" />

      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">Distance to target</span>
        <span className="text-xs font-mono font-bold text-accent tabular-nums">{dist.toFixed(2)} m</span>
      </div>
    </div>
  );
}
