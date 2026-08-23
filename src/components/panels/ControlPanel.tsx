'use client';

import { useSimulationStore } from '@/store/simulationStore';

function SliderRow({
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
    <div className="flex items-center gap-2 h-6">
      <span className="w-12 text-xs text-gray-500 text-right">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
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

export default function ControlPanel() {
  const target = useSimulationStore((s) => s.target);
  const updateTarget = useSimulationStore((s) => s.updateTarget);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Position */}
      <div className="px-3 pt-2 pb-2">
        <div className="text-xs font-bold text-accent2 mb-1.5">TARGET POSITION (m)</div>
        <div className="space-y-0.5">
          <SliderRow label="X" value={target.x} min={-10} max={10} onChange={(v) => updateTarget('x', v)} />
          <SliderRow label="Y" value={target.y} min={-10} max={10} onChange={(v) => updateTarget('y', v)} />
          <SliderRow label="Z" value={target.z} min={0} max={10} onChange={(v) => updateTarget('z', v)} />
        </div>
      </div>

      <div className="h-px bg-border mx-3" />

      {/* Attitude */}
      <div className="px-3 pt-2 pb-3">
        <div className="text-xs font-bold text-accent2 mb-1.5">TARGET ATTITUDE (deg)</div>
        <div className="space-y-0.5">
          <SliderRow label="Roll" value={target.roll} min={-30} max={30} onChange={(v) => updateTarget('roll', v)} />
          <SliderRow label="Pitch" value={target.pitch} min={-30} max={30} onChange={(v) => updateTarget('pitch', v)} />
          <SliderRow label="Yaw" value={target.yaw} min={-180} max={180} onChange={(v) => updateTarget('yaw', v)} />
        </div>
        <label className="flex items-center gap-2 mt-2 text-xs text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={target.autoHeading}
            onChange={(e) => updateTarget('autoHeading', e.target.checked ? true : false)}
            className="accent-accent rounded"
          />
          Heading follows direction of travel
        </label>
      </div>
    </div>
  );
}
