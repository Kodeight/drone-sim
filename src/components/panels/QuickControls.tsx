'use client';

import { useSimulationStore } from '@/store/simulationStore';

export default function QuickControls() {
  const isRunning        = useSimulationStore((s) => s.isRunning);
  const toggleSimulation = useSimulationStore((s) => s.toggleSimulation);
  const resetSimulation  = useSimulationStore((s) => s.resetSimulation);
  const speed            = useSimulationStore((s) => s.speed);
  const setSpeed         = useSimulationStore((s) => s.setSpeed);

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 14px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
    transition: 'filter 0.15s, transform 0.1s',
    flexShrink: 0,
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 12px',
      background: 'var(--bg-panel)',
      borderTop: '1px solid var(--border)',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginRight: 4, flexShrink: 0 }}>
        Quick Controls
      </span>

      {/* Play / Pause */}
      <button
        id="quick-play-pause"
        onClick={toggleSimulation}
        style={{
          ...btnBase,
          background: isRunning ? 'rgba(245,158,11,0.15)' : 'rgba(6,182,212,0.15)',
          border: `1px solid ${isRunning ? 'rgba(245,158,11,0.4)' : 'rgba(6,182,212,0.4)'}`,
          color: isRunning ? 'var(--warning)' : 'var(--accent)',
        }}
      >
        {isRunning ? (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            Pause
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Play
          </>
        )}
      </button>

      {/* Stop */}
      <button
        id="quick-stop"
        onClick={() => useSimulationStore.getState().pauseSimulation()}
        style={{
          ...btnBase,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16"/></svg>
        Stop
      </button>

      {/* Reset */}
      <button
        id="quick-reset"
        onClick={resetSimulation}
        style={{
          ...btnBase,
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--danger)',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Reset
      </button>

      <div style={{ flex: 1, minWidth: 20 }} />

      {/* Speed slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Speed</span>
        <input
          id="quick-speed-slider"
          type="range"
          min={0.1} max={5} step={0.1}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          style={{ width: 80, accentColor: 'var(--accent)' }}
        />
        <span style={{
          fontSize: 12, fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--accent)',
          minWidth: 32,
        }}>
          {speed.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}
