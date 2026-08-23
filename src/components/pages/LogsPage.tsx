'use client';

import { useState } from 'react';
import { useSimulationStore, type LogEntry } from '@/store/simulationStore';

const LEVELS = ['ALL', 'INFO', 'SYSTEM', 'SIMULATION', 'CONTROL', 'WARNING', 'ERROR'] as const;

const LEVEL_COLORS: Record<LogEntry['level'], string> = {
  INFO:       'var(--accent)',
  SYSTEM:     'var(--text-secondary)',
  SIMULATION: 'var(--success)',
  CONTROL:    '#a78bfa',
  WARNING:    'var(--warning)',
  ERROR:      'var(--danger)',
};

const LEVEL_BG: Record<LogEntry['level'], string> = {
  INFO:       'rgba(6,182,212,0.06)',
  SYSTEM:     'transparent',
  SIMULATION: 'rgba(34,197,94,0.04)',
  CONTROL:    'rgba(167,139,250,0.04)',
  WARNING:    'rgba(245,158,11,0.06)',
  ERROR:      'rgba(239,68,68,0.08)',
};

export default function LogsPage() {
  const [filterLevel, setFilterLevel] = useState<typeof LEVELS[number]>('ALL');
  const [search, setSearch] = useState('');
  const logs     = useSimulationStore((s) => s.logs);
  const clearLogs = useSimulationStore((s) => s.clearLogs);

  const filtered = logs
    .filter((l) => filterLevel === 'ALL' || l.level === filterLevel)
    .filter((l) => !search || l.message.toLowerCase().includes(search.toLowerCase()))
    .slice().reverse();

  const fmt = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${String(d.getMilliseconds()).padStart(3,'0')}`;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>System Logs</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 7px' }}>
          {logs.length} entries
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={clearLogs}
          style={{
            padding: '4px 12px', fontSize: 11, fontWeight: 500,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 5, color: 'var(--danger)', cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
        {LEVELS.map((lvl) => (
          <button
            key={lvl}
            onClick={() => setFilterLevel(lvl)}
            style={{
              padding: '3px 10px', fontSize: 10, fontWeight: filterLevel === lvl ? 700 : 400,
              border: `1px solid ${filterLevel === lvl ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 4,
              background: filterLevel === lvl ? 'var(--accent-glow)' : 'var(--bg-secondary)',
              color: filterLevel === lvl ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {lvl}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            fontSize: 11,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 5,
            color: 'var(--text-primary)',
            outline: 'none',
            width: 180,
          }}
        />
      </div>

      {/* Log entries */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No log entries</div>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '4px 10px',
                background: LEVEL_BG[log.level],
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>
                {fmt(log.timestamp)}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: LEVEL_COLORS[log.level],
                flexShrink: 0, marginTop: 1,
                minWidth: 64,
              }}>
                [{log.level}]
              </span>
              <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
