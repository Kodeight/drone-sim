'use client';

import { useSimulationStore } from '@/store/simulationStore';

function DisturbanceSlider({
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
    <div className="flex items-center gap-2 py-1">
      <span className="w-16 text-xs text-gray-500 font-medium">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-warning"
      />
      <input
        type="number"
        value={parseFloat(value.toFixed(2))}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-16 text-center text-xs border border-border rounded px-1 py-0.5 bg-white"
      />
    </div>
  );
}

export default function DisturbanceControls() {
  const disturbances = useSimulationStore((s) => s.disturbances);
  const updateDisturbance = useSimulationStore((s) => s.updateDisturbance);

  return (
    <div className="border border-border rounded-lg p-3">
      <h3 className="text-xs font-bold text-warning mb-2">DISTURBANCES / WIND</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <DisturbanceSlider label="Force X" value={disturbances.forceX} min={-3} max={3} onChange={(v) => updateDisturbance('forceX', v)} />
          <DisturbanceSlider label="Force Y" value={disturbances.forceY} min={-3} max={3} onChange={(v) => updateDisturbance('forceY', v)} />
          <DisturbanceSlider label="Force Z" value={disturbances.forceZ} min={-3} max={3} onChange={(v) => updateDisturbance('forceZ', v)} />
        </div>
        <div>
          <DisturbanceSlider label="Roll" value={disturbances.torqueRoll} min={-0.5} max={0.5} onChange={(v) => updateDisturbance('torqueRoll', v)} />
          <DisturbanceSlider label="Pitch" value={disturbances.torquePitch} min={-0.5} max={0.5} onChange={(v) => updateDisturbance('torquePitch', v)} />
          <DisturbanceSlider label="Yaw" value={disturbances.torqueYaw} min={-0.5} max={0.5} onChange={(v) => updateDisturbance('torqueYaw', v)} />
        </div>
      </div>
    </div>
  );
}
