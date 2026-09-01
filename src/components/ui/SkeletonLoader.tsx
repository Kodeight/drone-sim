'use client';

import { useEffect, useState } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

function Shimmer({ style }: { style?: React.CSSProperties }) {
  const theme = useSimulationStore((s) => s.theme);
  const isDark = theme === 'dark';
  return (
    <div style={{
      borderRadius: 4,
      background: 'var(--bg-secondary)',
      position: 'relative', overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: isDark
          ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 60%, transparent 100%)'
          : 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.03) 40%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.03) 60%, transparent 100%)',
        animation: 'shimmer 1.8s ease-in-out infinite',
      }} />
    </div>
  );
}

export default function SkeletonLoader({ message }: { message?: string }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'var(--bg-app)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: 'var(--text-primary)',
    }}>
      <style>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        height: 44, flexShrink: 0,
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
      }}>
        <Shimmer style={{ width: 28, height: 28 }} />
        <Shimmer style={{ width: 100, height: 14 }} />
        <div style={{ flex: 1 }} />
        <Shimmer style={{ width: 60, height: 12 }} />
        <Shimmer style={{ width: 60, height: 12 }} />
        <Shimmer style={{ width: 60, height: 12 }} />
        <div style={{ flex: 1 }} />
        <Shimmer style={{ width: 20, height: 20 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar ──────────────────────────────────────── */}
        <div style={{
          width: 200, flexShrink: 0,
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', padding: '8px 6px', gap: 4,
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Shimmer key={i} style={{ width: '100%', height: 32 }} />
          ))}
          <div style={{ flex: 1 }} />
          <Shimmer style={{ width: '60%', height: 10, margin: '0 auto' }} />
          <Shimmer style={{ width: '40%', height: 10, margin: '0 auto' }} />
        </div>

        {/* ── Main content ─────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* 3D viewport area — follows theme (was hardcoded #0f1117 dark-only) */}
            <div style={{ flex: 1, position: 'relative', background: 'var(--bg-tertiary)' }}>
              {/* Viewport controls bar */}
              <div style={{
                position: 'absolute', top: 8, left: 8, right: 8,
                display: 'flex', gap: 6, zIndex: 1,
              }}>
                <Shimmer style={{ width: 28, height: 24, borderRadius: 4 }} />
                <Shimmer style={{ width: 28, height: 24, borderRadius: 4 }} />
                <Shimmer style={{ width: 28, height: 24, borderRadius: 4 }} />
              </div>
              {/* Bottom quick controls */}
              <div style={{
                position: 'absolute', bottom: 8, left: 8, right: 8,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Shimmer style={{ width: 32, height: 24, borderRadius: 4 }} />
                <Shimmer style={{ width: 24, height: 24, borderRadius: 4 }} />
                <Shimmer style={{ width: 80, height: 6, borderRadius: 3 }} />
                <Shimmer style={{ width: 40, height: 12 }} />
              </div>
            </div>

            {/* Telemetry plots area */}
            <div style={{
              height: 220, flexShrink: 0,
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-panel)',
              padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Shimmer style={{ width: 50, height: 10 }} />
                <Shimmer style={{ width: 50, height: 10 }} />
                <Shimmer style={{ width: 50, height: 10 }} />
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                    <Shimmer style={{ width: '100%', height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 10}px`, borderRadius: '2px 2px 0 0' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right panel (Controls) ────────────────────── */}
          <div style={{
            width: 360, flexShrink: 0,
            background: 'var(--bg-panel)',
            borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Panel header */}
            <div style={{
              padding: '10px 14px 8px',
              borderBottom: '1px solid var(--border)',
            }}>
              <Shimmer style={{ width: 60, height: 10 }} />
            </div>

            <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
              {/* Target Position */}
              <Shimmer style={{ width: 90, height: 10 }} />
              {[1, 2, 3].map((i) => (
                <div key={`pos-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shimmer style={{ width: 16, height: 10 }} />
                  <Shimmer style={{ flex: 1, height: 6 }} />
                  <Shimmer style={{ width: 40, height: 16, borderRadius: 3 }} />
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              {/* Target Attitude */}
              <Shimmer style={{ width: 100, height: 10 }} />
              {[1, 2, 3].map((i) => (
                <div key={`att-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shimmer style={{ width: 24, height: 10 }} />
                  <Shimmer style={{ flex: 1, height: 6 }} />
                  <Shimmer style={{ width: 40, height: 16, borderRadius: 3 }} />
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              {/* PID Presets */}
              <Shimmer style={{ width: 80, height: 10 }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3].map((i) => (
                  <Shimmer key={`pid-${i}`} style={{ flex: 1, height: 26, borderRadius: 4 }} />
                ))}
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              {/* Drone Type dropdown */}
              <Shimmer style={{ width: 70, height: 10 }} />
              <Shimmer style={{ width: '100%', height: 30, borderRadius: 4 }} />
              <Shimmer style={{ width: '80%', height: 10 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Loading message */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        padding: '8px 20px', borderRadius: 8,
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        {message || 'Loading'}{dots || '\u00A0'}
      </div>
    </div>
  );
}
