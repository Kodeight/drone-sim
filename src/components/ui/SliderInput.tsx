'use client';

import { useCallback, useRef } from 'react';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  onChange: (v: number) => void;
}

export default function SliderInput({ label, value, min, max, step, unit, decimals, onChange }: SliderInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const dec = decimals ?? (step < 0.01 ? 4 : step < 0.1 ? 3 : step < 1 ? 2 : step <= 1 ? 1 : 0);

  const clamp = useCallback((v: number) => {
    if (isNaN(v) || !isFinite(v)) return min;
    return Math.max(min, Math.min(max, v));
  }, [min, max]);

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) onChange(v);
  }, [onChange]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) onChange(clamp(v));
  }, [onChange, clamp]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (isNaN(v) || !isFinite(v)) {
      onChange(min);
    }
  }, [onChange, min]);

  return (
    <div className="slider-input-row">
      <div className="slider-input-header">
        <span className="slider-input-label">{label}</span>
        {unit && <span className="slider-input-unit">{unit}</span>}
      </div>
      <div className="slider-input-controls">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSlider}
          className="slider-input-range"
        />
        <input
          ref={inputRef}
          type="number"
          value={value.toFixed(dec)}
          min={min}
          max={max}
          step={step}
          onChange={handleInput}
          onBlur={handleBlur}
          className="slider-input-number"
        />
      </div>
      <div className="slider-input-bounds">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
