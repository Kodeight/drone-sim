'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
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

    // Direct 2D fallback for known blocklisted Intel D3D9 on Electron (your log: ANGLE D3D9Ex vs_3_0, Sandboxed=yes, BindToCurrentSequence failed)
    const rendererStr = `${info.renderer || ''} ${info.version || ''} ${info.vendor || ''}`;
    const isProblematicIntelD3D9 =
      rendererStr.includes('Intel') && (rendererStr.includes('D3D9') || rendererStr.includes('Direct3D9Ex') || info.version?.includes('WebGL 1'));
    if (isProblematicIntelD3D9 && isElectron) {
      console.warn('[SceneSwitcher] Detected Intel HD + D3D9Ex on Electron → direct 2D fallback (no WebGL attempt)');
      setMode('fallback2d');
      return;
    }

    if (!info.available) {
      console.warn('[SceneSwitcher] WebGL not available → low-GPU SceneLowGPU');
      setMode('low');
      return;
    }

    // Realistic test: try to create a WebGLRenderer like Scene will (antialias, 800x600) — 2x2 canvas lies
    try {
      const c = document.createElement('canvas');
      c.width = 800;
      c.height = 600;
      // Try WebGLRenderer creation, not just getContext
      const testRenderer: any = new (THREE as any).WebGLRenderer({
        canvas: c,
        antialias: true,
        alpha: true,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      });
      testRenderer.dispose();
      const gl: any = c.getContext('webgl') || c.getContext('experimental-webgl');
      const lose = gl?.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      console.log('[SceneSwitcher] realistic WebGLRenderer test OK → normal Scene (high-GPU)');
      setMode('normal');
    } catch (e) {
      console.warn('[SceneSwitcher] realistic WebGLRenderer test failed → fallback', String(e));
      // On Electron, go straight to 2D to avoid double WebGL failure loop (normal→low both fail)
      if (isElectron) {
        setMode('fallback2d');
      } else {
        setMode('low');
      }
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
