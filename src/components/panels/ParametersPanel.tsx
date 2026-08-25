'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { PID_PRESETS } from '@/lib/simulation/types';
import SliderInput from '@/components/ui/SliderInput';
import DroneTypeSelector from '@/components/ui/DroneTypeSelector';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_WIDTH = 280;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 360;

// ─── Main component ───────────────────────────────────────────────────────────

export default function ParametersPanel() {
  const panelWidth      = useSimulationStore((s) => s.paramsPanelWidth);
  const setPanelWidth   = useSimulationStore((s) => s.setParamsPanelWidth);
  const target          = useSimulationStore((s) => s.target);
  const updateTarget    = useSimulationStore((s) => s.updateTarget);
  const applyPreset     = useSimulationStore((s) => s.applyPreset);

  const currentDroneId  = useSimulationStore((s) => s.currentDroneId);

  // Load persisted width
  useEffect(() => {
    const stored = localStorage.getItem('drone-sim-params-width');
    if (stored) {
      const w = parseInt(stored, 10);
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setPanelWidth(w);
    }
  }, []); // eslint-disable-line

  // Persist on change
  useEffect(() => {
    try { localStorage.setItem('drone-sim-params-width', String(panelWidth)); } catch {}
  }, [panelWidth]);

  // ── Draggable resize ───────────────────────────────────────────────────────
  const dragRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(panelWidth);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = panelWidth;
    e.preventDefault();
  }, [panelWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = startXRef.current - e.clientX;
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWRef.current + dx));
      setPanelWidth(newW);
    };
    const onUp = () => { dragRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setPanelWidth]);

  return (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      {/* ── Drag handle ────────────────────────────────────────────── */}
      <div
        className="drag-handle"
        onMouseDown={onMouseDown}
        title="Drag to resize"
      />

      {/* ── Panel body ─────────────────────────────────────────────── */}
      <div
        style={{
          width: panelWidth,
          flexShrink: 0,
          background: 'var(--bg-panel)',
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px 8px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--bg-panel)',
          position: 'sticky', top: 0, zIndex: 2,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
            Controls
          </span>
        </div>

        {/* ── Content ──────────────────────────────────────────────── */}
        <div style={{ padding: '0 14px 14px', overflowY: 'auto' }}>

          {/* ── Target Position ───────────────────────────────────── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', padding: '8px 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Target Position
          </div>
          <div style={{ paddingTop: 2 }}>
            <SliderInput label="X" value={target.x} min={-10} max={10} step={0.1} unit="m" onChange={(v) => updateTarget('x', v)} />
            <SliderInput label="Y" value={target.y} min={-10} max={10} step={0.1} unit="m" onChange={(v) => updateTarget('y', v)} />
            <SliderInput label="Z" value={target.z} min={0} max={10} step={0.1} unit="m" onChange={(v) => updateTarget('z', v)} />
          </div>

          {/* ── Target Attitude ────────────────────────────────────── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', padding: '8px 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Target Attitude
          </div>
          <div style={{ paddingTop: 2 }}>
            <SliderInput label="Roll" value={target.roll} min={-30} max={30} step={1} unit="°" decimals={0} onChange={(v) => updateTarget('roll', v)} />
            <SliderInput label="Pitch" value={target.pitch} min={-30} max={30} step={1} unit="°" decimals={0} onChange={(v) => updateTarget('pitch', v)} />
            <SliderInput label="Yaw" value={target.yaw} min={-180} max={180} step={1} unit="°" decimals={0} onChange={(v) => updateTarget('yaw', v)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={target.autoHeading}
                onChange={(e) => updateTarget('autoHeading', e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Auto heading
            </label>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

          {/* ── PID Presets ────────────────────────────────────────── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', padding: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            PID Tuning
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {Object.keys(PID_PRESETS).map((name) => (
              <button
                key={name}
                onClick={() => applyPreset(PID_PRESETS[name as keyof typeof PID_PRESETS])}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 5,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {name}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

          {/* ── Drone Type ─────────────────────────────────── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', padding: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Drone Type
          </div>
          <DroneTypeSelector />

        </div>
      </div>
    </div>
  );
}
