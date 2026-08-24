'use client';

import { useSimulationStore } from '@/store/simulationStore';
import type { ActivePage } from '@/store/simulationStore';

// ─── Icons (inline SVG) ──────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const Icon3D = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconParams = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93a10 10 0 0 0 14.14 14.14"/>
  </svg>
);
const IconPID = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconPlots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const IconLogs = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconPresets = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconChevron = ({ collapsed }: { collapsed: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

// ─── Nav items config ─────────────────────────────────────────────────────────

const NAV_ITEMS: { id: ActivePage; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',  label: 'Dashboard',   icon: <IconDashboard /> },
  { id: '3dview',     label: '3D View',      icon: <Icon3D /> },
  { id: 'parameters', label: 'Parameters',   icon: <IconParams /> },
  { id: 'pid',        label: 'PID Tuning',   icon: <IconPID /> },
  { id: 'plots',      label: 'Plots',        icon: <IconPlots /> },
  { id: 'logs',       label: 'Logs',         icon: <IconLogs /> },
  { id: 'presets',    label: 'Presets',      icon: <IconPresets /> },
  { id: 'settings',   label: 'Settings',     icon: <IconSettings /> },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Sidebar() {
  const collapsed       = useSimulationStore((s) => s.sidebarCollapsed);
  const toggleSidebar   = useSimulationStore((s) => s.toggleSidebar);
  const activePage      = useSimulationStore((s) => s.activePage);
  const setActivePage   = useSimulationStore((s) => s.setActivePage);
  const isRunning       = useSimulationStore((s) => s.isRunning);
  const time            = useSimulationStore((s) => s.time);
  const status          = useSimulationStore((s) => s.status);

  const formatTime = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const statusColor: Record<string, string> = {
    STOPPED:   'var(--text-muted)',
    PAUSED:    'var(--warning)',
    TRACKING:  'var(--warning)',
    ON_TARGET: 'var(--success)',
  };

  return (
    <aside
      style={{
        width:      collapsed ? 52 : 200,
        minWidth:   collapsed ? 52 : 200,
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        display:    'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow:   'hidden',
        flexShrink: 0,
      }}
    >
      {/* ── Collapse toggle ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', padding: '8px' }}>
        <button
          id="sidebar-collapse-btn"
          onClick={toggleSidebar}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: 28, height: 28,
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconChevron collapsed={collapsed} />
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '4px 6px', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActivePage(item.id)}
              title={collapsed ? item.label : undefined}
              className={`nav-item${isActive ? ' active' : ''}`}
              style={{
                width: '100%',
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: 2,
                border: isActive ? '1px solid rgba(6,182,212,0.2)' : '1px solid transparent',
                background: isActive ? 'var(--accent-glow)' : 'transparent',
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && (
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500 }}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Simulation status ─────────────────────────────────────── */}
      {!collapsed && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
            Simulation
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isRunning ? 'var(--success)' : 'var(--text-muted)',
              boxShadow: isRunning ? '0 0 6px var(--success)' : 'none',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: statusColor[status] ?? 'var(--text-muted)' }}>
              {isRunning ? 'Running' : status.charAt(0) + status.slice(1).toLowerCase()}
            </span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 6 }}>
            {formatTime(time)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>TIME STEP &nbsp;1.0 ms (1000 Hz)</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>UPDATE RATE &nbsp;60 FPS</div>
        </div>
      )}

      {/* ── Version ───────────────────────────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--text-muted)' }}>v2.0.0</div>
      )}
    </aside>
  );
}
