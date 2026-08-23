'use client';

import { useSimulationStore } from '@/store/simulationStore';

export default function Header() {
  const isRunning      = useSimulationStore((s) => s.isRunning);
  const status         = useSimulationStore((s) => s.status);
  const theme          = useSimulationStore((s) => s.theme);
  const toggleTheme    = useSimulationStore((s) => s.toggleTheme);

  const connected = true; // always connected in desktop app

  return (
    <header
      style={{
        height: 46,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        paddingLeft: 14,
        paddingRight: 14,
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        zIndex: 50,
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
          {/* Drone icon */}
          <circle cx="20" cy="20" r="5" fill="var(--accent)" opacity="0.9"/>
          <line x1="20" y1="15" x2="8"  y2="8"  stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="20" y1="15" x2="32" y2="8"  stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="20" y1="25" x2="8"  y2="32" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="20" y1="25" x2="32" y2="32" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="8"  cy="8"  r="4" fill="var(--accent)" opacity="0.6"/>
          <circle cx="32" cy="8"  r="4" fill="var(--accent)" opacity="0.6"/>
          <circle cx="8"  cy="32" r="4" fill="var(--accent)" opacity="0.6"/>
          <circle cx="32" cy="32" r="4" fill="var(--accent)" opacity="0.6"/>
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            DRONE SIMULATOR
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', lineHeight: 1.4 }}>
            6-DOF QUADROTOR SIMULATOR
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0 }} />

      {/* ── Connection status ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: connected ? 'var(--success)' : 'var(--danger)',
          boxShadow: `0 0 6px ${connected ? 'var(--success)' : 'var(--danger)'}`,
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: connected ? 'var(--success)' : 'var(--danger)' }}>
          {connected ? 'CONNECTED' : 'OFFLINE'}
        </span>
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0 }} />

      <div style={{ flex: 1 }} />

      {/* ── Status badge ──────────────────────────────────────────── */}
      <div style={{
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
      }}
        className={
          isRunning ? 'badge-running' :
          status === 'PAUSED' ? 'badge-paused' : 'badge-stopped'
        }
      >
        {isRunning ? '● Running' : status === 'PAUSED' ? '⏸ Paused' : '■ Stopped'}
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0 }} />

      {/* ── Theme toggle ──────────────────────────────────────────── */}
      <button
        id="header-theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={{
          width: 30, height: 30,
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {theme === 'dark' ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      {/* ── Utility buttons ───────────────────────────────────────── */}
      <button
        id="header-screenshot"
        title="Screenshot"
        style={{
          width: 30, height: 30,
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
      <button
        id="header-fullscreen"
        title="Fullscreen"
        style={{
          width: 30, height: 30,
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      </button>
    </header>
  );
}
