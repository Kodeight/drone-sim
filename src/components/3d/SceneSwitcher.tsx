'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { detectWebGL } from '@/lib/webglDetect';
import Fallback2DView from './Fallback2DView';
import type { SceneHandle } from './Scene';

// Dynamically import both scenes to avoid SSR
const Scene = dynamic(() => import('./Scene'), { ssr: false });
const SceneLowGPU = dynamic(() => import('./SceneLowGPU'), { ssr: false });

class SwitchErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('[SceneSwitcher] WebGL ErrorBoundary caught → switching to low-GPU/2D', error);
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function SceneSwitcherInner(_: unknown, ref: React.ForwardedRef<SceneHandle>) {
  const [mode, setMode] = useState<'checking' | 'normal' | 'low' | 'fallback2d'>('checking');
  const innerRef = useRef<SceneHandle>(null);

  useImperativeHandle(ref, () => ({
    fitCamera: () => innerRef.current?.fitCamera(),
  }));

  useEffect(() => {
    const info = detectWebGL();
    const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
    console.log('[SceneSwitcher] WebGL probe', info, 'isElectron:', isElectron);

    if (!info.available) {
      console.warn('[SceneSwitcher] WebGL not available → low-GPU SceneLowGPU');
      setMode('low');
      return;
    }

    // Test if we can actually get a context (Electron sandboxed D3D9 may report available but fail)
    try {
      const c = document.createElement('canvas');
      c.width = 2;
      c.height = 2;
      const gl: any =
        c.getContext('webgl2', { antialias: false } as any) ||
        c.getContext('webgl', { antialias: false } as any) ||
        c.getContext('experimental-webgl', { antialias: false } as any);
      if (!gl) throw new Error('test context null');
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      console.log('[SceneSwitcher] test context OK → normal Scene (high-GPU)');
      setMode('normal');
    } catch (e) {
      console.warn('[SceneSwitcher] test context failed → low-GPU', String(e));
      setMode('low');
    }
  }, []);

  if (mode === 'checking') {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Checking 3D capability…</div>
      </div>
    );
  }

  if (mode === 'low') {
    console.log('[SceneSwitcher] rendering SceneLowGPU (lightweight, same buttons, Y up x,z,-y)');
    return (
      <SwitchErrorBoundary onError={() => setMode('fallback2d')}>
        <SceneLowGPU ref={innerRef} />
      </SwitchErrorBoundary>
    );
  }

  if (mode === 'fallback2d') {
    return <Fallback2DView />;
  }

  return (
    <SwitchErrorBoundary onError={() => setMode('low')}>
      <Scene ref={innerRef} />
    </SwitchErrorBoundary>
  );
}

const SceneSwitcher = forwardRef(SceneSwitcherInner);
SceneSwitcher.displayName = 'SceneSwitcher';
export default SceneSwitcher;
