'use client';

import { useSimulationStore } from '@/store/simulationStore';

function DistSlider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 h-7">
      <span className="w-12 text-xs text-gray-500 text-right shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 min-w-0"
      />
      <input
        type="number"
        value={parseFloat(value.toFixed(2))}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-16 text-center text-xs border border-border rounded px-1 py-1 bg-white tabular-nums shrink-0"
      />
    </div>
  );
}

export default function DisturbanceControls() {
  const d = useSimulationStore((s) => s.disturbances);
  const u = useSimulationStore((s) => s.updateDisturbance);

  const resetAll = () => {
    u('forceX', 0); u('forceY', 0); u('forceZ', 0);
    u('torqueRoll', 0); u('torquePitch', 0); u('torqueYaw', 0);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-4 pt-2.5 pb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-warning uppercase tracking-wide">Disturbances / Wind</span>
        <button
          onClick={resetAll}
          className="px-2.5 py-0.5 text-[10px] font-medium border border-border rounded hover:bg-gray-100 text-gray-600"
        >
          Reset All
        </button>
      </div>

      <div className="px-4 pb-2.5 grid grid-cols-2 gap-x-4">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Force (N)</div>
          <DistSlider label="X" value={d.forceX} min={-1} max={1} step={0.01} onChange={(v) => u('forceX', v)} />
          <DistSlider label="Y" value={d.forceY} min={-1} max={1} step={0.01} onChange={(v) => u('forceY', v)} />
          <DistSlider label="Z" value={d.forceZ} min={-1} max={1} step={0.01} onChange={(v) => u('forceZ', v)} />
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Torque (N&middot;m)</div>
          <DistSlider label="Roll" value={d.torqueRoll} min={-0.2} max={0.2} step={0.005} onChange={(v) => u('torqueRoll', v)} />
          <DistSlider label="Pitch" value={d.torquePitch} min={-0.2} max={0.2} step={0.005} onChange={(v) => u('torquePitch', v)} />
          <DistSlider label="Yaw" value={d.torqueYaw} min={-0.2} max={0.2} step={0.005} onChange={(v) => u('torqueYaw', v)} />
        </div>
      </div>
    </div>
  );
}
