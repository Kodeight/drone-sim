'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { PID_PRESETS, type PIDAxis } from '@/lib/simulation/types';
import SliderInput from '@/components/ui/SliderInput';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_WIDTH = 280;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 360;

const PID_AXES: PIDAxis[] = ['X', 'Y', 'Z', 'Roll', 'Pitch', 'Yaw'];
const KP_MAX: Record<PIDAxis, number> = { X: 5, Y: 5, Z: 8, Roll: 8, Pitch: 8, Yaw: 5 };
const KI_MAX: Record<PIDAxis, number> = { X: 3, Y: 3, Z: 5, Roll: 2, Pitch: 2, Yaw: 1 };
const KD_MAX: Record<PIDAxis, number> = { X: 5, Y: 5, Z: 5, Roll: 3, Pitch: 3, Yaw: 2 };

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children, collapsed, onToggle }: {
  children: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0 6px 0',
        border: 'none',
        background: 'transparent',
        cursor: onToggle ? 'pointer' : 'default',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
        {children}
      </span>
      {onToggle && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ParametersPanel() {
  const panelWidth      = useSimulationStore((s) => s.paramsPanelWidth);
  const setPanelWidth   = useSimulationStore((s) => s.setParamsPanelWidth);
  const physicalParams  = useSimulationStore((s) => s.physicalParams);
  const simParams       = useSimulationStore((s) => s.simParams);
  const updatePhysical  = useSimulationStore((s) => s.updatePhysicalParam);
  const updateSim       = useSimulationStore((s) => s.updateSimParam);
  const pid             = useSimulationStore((s) => s.pid);
  const updatePID       = useSimulationStore((s) => s.updatePID);
  const applyPreset     = useSimulationStore((s) => s.applyPreset);
  const target          = useSimulationStore((s) => s.target);
  const updateTarget    = useSimulationStore((s) => s.updateTarget);

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

  const maxFor = (axis: PIDAxis, param: 'kp' | 'ki' | 'kd') =>
    param === 'kp' ? KP_MAX[axis] : param === 'ki' ? KI_MAX[axis] : KD_MAX[axis];

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
            Parameters
          </span>
        </div>

        {/* ── Content ──────────────────────────────────────────────── */}
        <div style={{ padding: '0 14px 14px', overflowY: 'auto' }}>

          {/* Physical Parameters */}
          <SectionHeader>Physical Parameters</SectionHeader>
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 6, marginBottom: 4 }}>
            <SliderInput label="Mass" value={physicalParams.mass} min={0.1} max={10} step={0.01} unit="kg" onChange={(v) => updatePhysical('mass', v)} />
            <SliderInput label="Arm Length" value={physicalParams.armLength} min={0.05} max={1} step={0.01} unit="m" onChange={(v) => updatePhysical('armLength', v)} />
            <SliderInput label="Ixx" value={physicalParams.ixx} min={0.0001} max={1} step={0.0001} unit="kg·m²" decimals={4} onChange={(v) => updatePhysical('ixx', v)} />
            <SliderInput label="Iyy" value={physicalParams.iyy} min={0.0001} max={1} step={0.0001} unit="kg·m²" decimals={4} onChange={(v) => updatePhysical('iyy', v)} />
            <SliderInput label="Izz" value={physicalParams.izz} min={0.0001} max={1} step={0.0001} unit="kg·m²" decimals={4} onChange={(v) => updatePhysical('izz', v)} />
            <SliderInput label="Gravity" value={physicalParams.gravity} min={0} max={20} step={0.01} unit="m/s²" onChange={(v) => updatePhysical('gravity', v)} />
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

          {/* Environment */}
          <SectionHeader>Environment</SectionHeader>
          <div style={{ paddingTop: 6, marginBottom: 4 }}>
            <SliderInput label="Air Density" value={physicalParams.airDensity} min={0.1} max={2} step={0.001} unit="kg/m³" decimals={3} onChange={(v) => updatePhysical('airDensity', v)} />
            <SliderInput label="Wind Speed" value={physicalParams.windSpeed} min={0} max={20} step={0.1} unit="m/s" onChange={(v) => updatePhysical('windSpeed', v)} />
            <SliderInput label="Wind Direction" value={physicalParams.windDirection} min={0} max={360} step={1} unit="°" decimals={0} onChange={(v) => updatePhysical('windDirection', v)} />
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

          {/* Simulation */}
          <SectionHeader>Simulation</SectionHeader>
          <div style={{ paddingTop: 6, marginBottom: 4 }}>
            <SliderInput label="Time Step" value={simParams.timeStep} min={0.1} max={10} step={0.1} unit="ms" decimals={1} onChange={(v) => updateSim('timeStep', v)} />
            <SliderInput label="Solver Iterations" value={simParams.solverIterations} min={1} max={50} step={1} unit="" decimals={0} onChange={(v) => updateSim('solverIterations', v)} />
            <SliderInput label="Substeps" value={simParams.substeps} min={1} max={10} step={1} unit="" decimals={0} onChange={(v) => updateSim('substeps', v)} />
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

          {/* Target Position */}
          <SectionHeader>Target Position</SectionHeader>
          <div style={{ paddingTop: 6, marginBottom: 4 }}>
            <SliderInput label="X" value={target.x} min={-10} max={10} step={0.1} unit="m" onChange={(v) => updateTarget('x', v)} />
            <SliderInput label="Y" value={target.y} min={-10} max={10} step={0.1} unit="m" onChange={(v) => updateTarget('y', v)} />
            <SliderInput label="Z" value={target.z} min={0} max={10} step={0.1} unit="m" onChange={(v) => updateTarget('z', v)} />
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

          {/* Target Attitude */}
          <SectionHeader>Target Attitude</SectionHeader>
          <div style={{ paddingTop: 6, marginBottom: 4 }}>
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
              Auto heading follows travel direction
            </label>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

          {/* PID Parameters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionHeader>PID Parameters</SectionHeader>
            <div style={{ display: 'flex', gap: 4, paddingBottom: 4 }}>
              {Object.keys(PID_PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => applyPreset(PID_PRESETS[name as keyof typeof PID_PRESETS])}
                  style={{
                    padding: '2px 7px',
                    fontSize: 10,
                    fontWeight: 500,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* PID with sliders */}
          <div style={{ paddingTop: 2 }}>
            {PID_AXES.map((axis) => (
              <div key={axis} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {axis}
                </div>
                {(['kp', 'ki', 'kd'] as const).map((param) => {
                  const max = maxFor(axis, param);
                  const val = pid[axis][param];
                  return (
                    <SliderInput
                      key={param}
                      label={param.toUpperCase()}
                      value={val}
                      min={0}
                      max={max}
                      step={max * 0.005}
                      decimals={3}
                      onChange={(v) => updatePID(axis, param, v)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
