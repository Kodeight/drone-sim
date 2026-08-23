'use client';

import { useSimulationStore } from '@/store/simulationStore';

export default function TelemetryDisplay() {
  const drone = useSimulationStore((s) => s.drone);
  const distanceToTarget = useSimulationStore((s) => s.distanceToTarget);
  const time = useSimulationStore((s) => s.time);
  const status = useSimulationStore((s) => s.status);

  const statusColor: Record<string, string> = {
    STOPPED: 'text-gray-400',
    PAUSED: 'text-warning',
    TRACKING: 'text-warning',
    ON_TARGET: 'text-success',
  };

  const rows = [
    ['X', drone.x.toFixed(3), 'm', 'Roll', (drone.roll * 180 / Math.PI).toFixed(1), '°'],
    ['Y', drone.y.toFixed(3), 'm', 'Pitch', (drone.pitch * 180 / Math.PI).toFixed(1), '°'],
    ['Z', drone.z.toFixed(3), 'm', 'Yaw', (drone.yaw * 180 / Math.PI).toFixed(1), '°'],
    ['Vx', drone.vx.toFixed(2), 'm/s', '', '', ''],
    ['Vy', drone.vy.toFixed(2), 'm/s', '', '', ''],
    ['Vz', drone.vz.toFixed(2), 'm/s', '', '', ''],
  ];

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-accent2">TELEMETRY</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${statusColor[status]}`}>● {status}</span>
          <span className="text-xs text-gray-400">t = {time.toFixed(1)}s</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {rows.map(([l1, v1, u1, l2, v2, u2], i) => (
          <div key={i} className="contents">
            <div className="flex justify-between text-xs py-0.5">
              <span className="text-gray-500">{l1} ({u1})</span>
              <span className="font-bold text-accent2">{v1}</span>
            </div>
            {l2 ? (
              <div className="flex justify-between text-xs py-0.5">
                <span className="text-gray-500">{l2} ({u2})</span>
                <span className="font-bold text-accent2">{v2}</span>
              </div>
            ) : (
              <div />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-2 pt-2 border-t border-border text-xs">
        <span className="text-gray-500">Distance to target</span>
        <span className="font-bold text-accent">{distanceToTarget.toFixed(2)} m</span>
      </div>
    </div>
  );
}
