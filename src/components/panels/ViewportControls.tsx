'use client';

import { useSimulationStore, type CameraMode } from '@/store/simulationStore';

const CAMERA_MODES: { id: CameraMode; label: string; title: string }[] = [
  { id: 'orbit',  label: 'Orbit',  title: 'Free orbit camera' },
  { id: 'follow', label: 'Follow', title: 'Follow the drone' },
  { id: 'front',  label: 'Front',  title: 'Front view' },
  { id: 'rear',   label: 'Rear',   title: 'Rear view' },
  { id: 'left',   label: 'Left',   title: 'Left view' },
  { id: 'right',  label: 'Right',  title: 'Right view' },
  { id: 'top',    label: 'Top',    title: 'Top-down view' },
  { id: 'iso',    label: 'Iso',    title: 'Isometric view' },
];

interface ViewportControlsProps {
  onFit?: () => void;
}

export default function ViewportControls({ onFit }: ViewportControlsProps) {
  const cameraMode    = useSimulationStore((s) => s.cameraMode);
  const setCameraMode = useSimulationStore((s) => s.setCameraMode);
  const showGrid      = useSimulationStore((s) => s.showGrid);
  const showAxes      = useSimulationStore((s) => s.showAxes);
  const showTrajectory = useSimulationStore((s) => s.showTrajectory);
  const showTarget    = useSimulationStore((s) => s.showTarget);
  const setShowGrid   = useSimulationStore((s) => s.setShowGrid);
  const setShowAxes   = useSimulationStore((s) => s.setShowAxes);
  const setShowTrajectory = useSimulationStore((s) => s.setShowTrajectory);
  const setShowTarget = useSimulationStore((s) => s.setShowTarget);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 8px',
    borderRadius: 4,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-glow)' : 'var(--bg-secondary)',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.12s',
  });

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '2px 7px',
    borderRadius: 4,
    border: `1px solid ${active ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
    background: active ? 'rgba(34,197,94,0.08)' : 'var(--bg-secondary)',
    color: active ? 'var(--success)' : 'var(--text-muted)',
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.12s',
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap',
      flexShrink: 0,
    }}>
      {/* Camera modes */}
      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2, flexShrink: 0 }}>
        Camera
      </span>
      {CAMERA_MODES.map((m) => (
        <button
          key={m.id}
          id={`cam-mode-${m.id}`}
          title={m.title}
          onClick={() => setCameraMode(m.id)}
          style={btnStyle(cameraMode === m.id)}
        >
          {m.label}
        </button>
      ))}

      {/* Fit button */}
      <button
        id="cam-fit-btn"
        title="Fit camera to drone"
        onClick={onFit}
        style={{
          ...btnStyle(false),
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
          fontWeight: 600,
        }}
      >
        ⊙ Fit
      </button>

      <div style={{ width: 1, height: 16, background: 'var(--border)', marginLeft: 2, marginRight: 2, flexShrink: 0 }} />

      {/* Visibility toggles */}
      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2, flexShrink: 0 }}>
        Show
      </span>
      <button id="toggle-grid"     onClick={() => setShowGrid(!showGrid)}           style={toggleStyle(showGrid)}>Grid</button>
      <button id="toggle-axes"     onClick={() => setShowAxes(!showAxes)}           style={toggleStyle(showAxes)}>Axes</button>
      <button id="toggle-path"     onClick={() => setShowTrajectory(!showTrajectory)} style={toggleStyle(showTrajectory)}>Path</button>
      <button id="toggle-target"   onClick={() => setShowTarget(!showTarget)}       style={toggleStyle(showTarget)}>Target</button>
    </div>
  );
}
