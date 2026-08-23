'use client';

import React from 'react';

export default function AboutPage() {
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
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>About Flight-Dynamics Workstation</span>

      <div style={cardStyle}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Drone Simulator 6-DOF</span>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          A high-fidelity 6-Degrees-of-Freedom quadcopter flight simulation and PID controller design workstation.
          Built with Electron, Next.js, React, and Three.js/React Three Fiber.
        </p>
      </div>

      <div style={cardStyle}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          Environment Specifications
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Platform</span>
            <span>Desktop (Electron)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Graphics API</span>
            <span>WebGL 2.0 / Canvas</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>UI Framework</span>
            <span>TailwindCSS / Vanilla CSS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
