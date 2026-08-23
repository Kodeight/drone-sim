'use client';

import React from 'react';

export default function HelpPage() {
  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Help & Keyboard Shortcuts</span>

      <div style={cardStyle}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          Simulation Controls
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Start / Pause Simulation</span>
            <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>Space</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Reset Simulation</span>
            <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>R</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Increase Speed</span>
            <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>+</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Decrease Speed</span>
            <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>-</kbd>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          3D Camera Navigation
        </span>
        <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li><strong>Left Click + Drag:</strong> Orbit / Rotate around the drone target</li>
          <li><strong>Right Click + Drag:</strong> Pan camera view</li>
          <li><strong>Scroll Wheel:</strong> Zoom in / out</li>
          <li><strong>Fit Button:</strong> Recenter camera around drone geometry bounds</li>
        </ul>
      </div>
    </div>
  );
}
