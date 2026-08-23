'use client';

import { useSimulationStore } from '@/store/simulationStore';

export default function SettingsPage() {
  const theme = useSimulationStore((s) => s.theme);
  const toggleTheme = useSimulationStore((s) => s.toggleTheme);
  const showGrid = useSimulationStore((s) => s.showGrid);
  const setShowGrid = useSimulationStore((s) => s.setShowGrid);
  const showAxes = useSimulationStore((s) => s.showAxes);
  const setShowAxes = useSimulationStore((s) => s.setShowAxes);
  const showTrajectory = useSimulationStore((s) => s.showTrajectory);
  const setShowTrajectory = useSimulationStore((s) => s.setShowTrajectory);
  const showTarget = useSimulationStore((s) => s.showTarget);
  const setShowTarget = useSimulationStore((s) => s.setShowTarget);
  const simParams = useSimulationStore((s) => s.simParams);
  const updateSim = useSimulationStore((s) => s.updateSimParam);

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Settings</span>

      {/* Appearance Settings */}
      <div style={cardStyle}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          Appearance
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={labelStyle}>
            <span>Dark Theme</span>
            <input
              type="checkbox"
              checked={theme === 'dark'}
              onChange={toggleTheme}
              style={{ accentColor: 'var(--accent)' }}
            />
          </label>
        </div>
      </div>

      {/* 3D Settings */}
      <div style={cardStyle}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          3D Viewport
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={labelStyle}>
            <span>Render Grid</span>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
          </label>
          <label style={labelStyle}>
            <span>Render Axes</span>
            <input
              type="checkbox"
              checked={showAxes}
              onChange={(e) => setShowAxes(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
          </label>
          <label style={labelStyle}>
            <span>Render Trajectory Path</span>
            <input
              type="checkbox"
              checked={showTrajectory}
              onChange={(e) => setShowTrajectory(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
          </label>
          <label style={labelStyle}>
            <span>Render Target Marker</span>
            <input
              type="checkbox"
              checked={showTarget}
              onChange={(e) => setShowTarget(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
          </label>
        </div>
      </div>

      {/* Simulation engine settings */}
      <div style={cardStyle}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          Simulation Engine
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Physics Update Rate (FPS)</span>
            <input
              type="number"
              value={simParams.updateRate}
              min={10}
              max={240}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) updateSim('updateRate', Math.max(10, Math.min(240, v)));
              }}
              className="input-field"
              style={{ width: 80 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
