'use client';

import { useEffect, useState } from 'react';

function ShimmerBar({ width, height = 12, delay = 0 }: { width: string; height?: number; delay?: number }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: 'var(--bg-secondary)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 60%, transparent 100%)',
        animation: `shimmer 1.8s ease-in-out ${delay}s infinite`,
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
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg-app)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
    }}>
      <style>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
      `}</style>

      {/* Drone icon */}
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ color: 'var(--accent)' }}>
          <rect x="24" y="24" width="16" height="16" rx="3" fill="currentColor" opacity="0.2" />
          <rect x="24" y="24" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <line x1="24" y1="32" x2="10" y2="22" stroke="currentColor" strokeWidth="1.5" />
          <line x1="40" y1="32" x2="54" y2="22" stroke="currentColor" strokeWidth="1.5" />
          <line x1="24" y1="32" x2="10" y2="42" stroke="currentColor" strokeWidth="1.5" />
          <line x1="40" y1="32" x2="54" y2="42" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="22" r="5" fill="currentColor" opacity="0.15" style={{ animation: 'pulse-ring 1.2s ease-in-out infinite' }} />
          <circle cx="54" cy="22" r="5" fill="currentColor" opacity="0.15" style={{ animation: 'pulse-ring 1.2s ease-in-out 0.3s infinite' }} />
          <circle cx="10" cy="42" r="5" fill="currentColor" opacity="0.15" style={{ animation: 'pulse-ring 1.2s ease-in-out 0.6s infinite' }} />
          <circle cx="54" cy="42" r="5" fill="currentColor" opacity="0.15" style={{ animation: 'pulse-ring 1.2s ease-in-out 0.9s infinite' }} />
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          {message ?? 'Loading Drone Simulator'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {dots || '\u00A0'}
        </div>
      </div>

      {/* Skeleton layout preview */}
      <div style={{ width: 400, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ShimmerBar width="100%" height={8} delay={0} />
        <div style={{ display: 'flex', gap: 8 }}>
          <ShimmerBar width="60px" height={28} delay={0.1} />
          <ShimmerBar width="60px" height={28} delay={0.15} />
          <ShimmerBar width="60px" height={28} delay={0.2} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ShimmerBar width="100%" height={40} delay={0.25} />
          <ShimmerBar width="100%" height={40} delay={0.3} />
          <ShimmerBar width="100%" height={40} delay={0.35} />
        </div>
        <ShimmerBar width="100%" height={8} delay={0.4} />
      </div>
    </div>
  );
}
