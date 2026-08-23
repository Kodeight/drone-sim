'use client';

import { useSimulationStore } from '@/store/simulationStore';

function DistSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 h-6">
      <span className="w-12 text-xs text-gray-500 text-right">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1"
      />
      <input
        type="number"
        value={parseFloat(value.toFixed(2))}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-14 text-center text-xs border border-border rounded px-1 py-0.5 bg-white tabular-nums"
      />
    </div>
  );
}

export default function DisturbanceControls() {
  const d = useSimulationStore((s) => s.disturbances);
  const u = useSimulationStore((s) => s.updateDisturbance);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-3 pt-2 pb-1.5">
        <span className="text-xs font-bold text-warning">DISTURBANCES / WIND</span>
      </div>

      <div className="px-3 pb-2 grid grid-cols-2 gap-x-3">
        {/* Forces */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Force (N)</div>
          <DistSlider label="X" value={d.forceX} min={-3} max={3} onChange={(v) => u('forceX', v)} />
          <DistSlider label="Y" value={d.forceY} min={-3} max={3} onChange={(v) => u('forceY', v)} />
          <DistSlider label="Z" value={d.forceZ} min={-3} max={3} onChange={(v) => u('forceZ', v)} />
        </div>

        {/* Torques */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Torque (N&middot;m)</div>
          <DistSlider label="Roll" value={d.torqueRoll} min={-0.5} max={0.5} onChange={(v) => u('torqueRoll', v)} />
          <DistSlider label="Pitch" value={d.torquePitch} min={-0.5} max={0.5} onChange={(v) => u('torquePitch', v)} />
          <DistSlider label="Yaw" value={d.torqueYaw} min={-0.5} max={0.5} onChange={(v) => u('torqueYaw', v)} />
        </div>
      </div>
    </div>
  );
}
