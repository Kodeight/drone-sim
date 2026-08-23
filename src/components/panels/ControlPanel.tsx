'use client';

import { useSimulationStore } from '@/store/simulationStore';

function SliderInput({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  unit = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-16 text-xs text-gray-500 font-medium">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-accent2"
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
      {unit && <span className="text-xs text-gray-400 w-6">{unit}</span>}
    </div>
  );
}

export default function ControlPanel() {
  const target = useSimulationStore((s) => s.target);
  const updateTarget = useSimulationStore((s) => s.updateTarget);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const speed = useSimulationStore((s) => s.speed);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const toggleSimulation = useSimulationStore((s) => s.toggleSimulation);
  const resetSimulation = useSimulationStore((s) => s.resetSimulation);
  const exportCSV = useSimulationStore((s) => s.exportCSV);

  return (
    <div className="space-y-3">
      {/* Top bar buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={toggleSimulation}
          className={`px-4 py-1.5 rounded font-bold text-sm ${
            isRunning
              ? 'bg-danger text-white hover:bg-red-600'
              : 'bg-success text-white hover:bg-green-600'
          }`}
        >
          {isRunning ? '⏸ PAUSE' : '▶ START'}
        </button>
        <button
          onClick={resetSimulation}
          className="px-4 py-1.5 rounded font-bold text-sm bg-white border border-border hover:bg-gray-100"
        >
          ↻ RESET
        </button>
        <button
          onClick={exportCSV}
          className="px-4 py-1.5 rounded font-bold text-sm bg-white border border-border hover:bg-gray-100"
        >
          ⤓ SAVE CSV
        </button>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-gray-500">Speed:</span>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-24 h-1 accent-accent2"
          />
          <span className="text-xs text-gray-500 w-8">{speed.toFixed(1)}x</span>
        </div>
      </div>

      {/* Target Position */}
      <div className="border border-border rounded-lg p-3">
        <h3 className="text-xs font-bold text-accent2 mb-2">TARGET POSITION (m)</h3>
        <SliderInput label="X" value={target.x} min={-10} max={10} onChange={(v) => updateTarget('x', v)} />
        <SliderInput label="Y" value={target.y} min={-10} max={10} onChange={(v) => updateTarget('y', v)} />
        <SliderInput label="Z" value={target.z} min={0} max={10} onChange={(v) => updateTarget('z', v)} />
      </div>

      {/* Target Attitude */}
      <div className="border border-border rounded-lg p-3">
        <h3 className="text-xs font-bold text-accent2 mb-2">TARGET ATTITUDE (deg)</h3>
        <SliderInput label="Roll" value={target.roll} min={-30} max={30} onChange={(v) => updateTarget('roll', v)} />
        <SliderInput label="Pitch" value={target.pitch} min={-30} max={30} onChange={(v) => updateTarget('pitch', v)} />
        <SliderInput label="Yaw" value={target.yaw} min={-180} max={180} onChange={(v) => updateTarget('yaw', v)} />
        <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={target.autoHeading}
            onChange={(e) => updateTarget('autoHeading', e.target.checked ? true : false)}
            className="accent-accent"
          />
          Heading follows direction of travel
        </label>
      </div>
    </div>
  );
}
