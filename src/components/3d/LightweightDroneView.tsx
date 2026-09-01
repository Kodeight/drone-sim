'use client';

import { useRef, useState, useCallback, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import DroneModel, { fitCameraToBox } from './DroneModel';
import { useSimulationStore } from '@/store/simulationStore';
import Fallback2DView from './Fallback2DView';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';
import { detectWebGL } from '@/lib/webglDetect';

/**
 * LightweightDroneView — fallback renderer for low-GPU / Electron WebGL failures.
 * Reuses exact Preview rendering approach: same DroneModel, same simulation state,
 * minimal lighting, no shadows, low-power context. Used automatically when
 * normal Three.js WebGLRenderer cannot initialize.
 *
 * Y/Z mapping: original (x,z,-y) — Y is up, preserved.
 * Propellers: 4×2 blades, spin around local +Y via motorThrusts.
 */

function FallbackCameraFramer({ box }: { box: THREE.Box3 | null }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // expose for DroneModel follow mode? not needed
  useEffect(() => {
    if (!box) return;
    const ctrl = (controlsRef as any).current;
    // Defer to next frame so controls are mounted
    const id = requestAnimationFrame(() => {
      fitCameraToBox(camera as THREE.PerspectiveCamera, ctrl ?? null, box);
      console.log('[LightweightFallback] auto-framed camera to box', box.min, box.max);
    });
    return () => cancelAnimationFrame(id);
  }, [box, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={0.5}
      maxDistance={80}
    />
  );
}

function FallbackSceneContent({ onBox }: { onBox: (b: THREE.Box3) => void }) {
  // No store mutation — fallback consumes exact same frontend state as normal view
  // DroneModel internally reads useSimulationStore for drone, isRunning, motorThrusts
  return (
    <>
      {/* Minimal lighting — no shadows, low cost */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 15, 10]} intensity={1.0} />
      <directionalLight position={[-8, 8, -8]} intensity={0.35} color="#ffffff" />

      {/* Ground plane without shadowMaterial (cheaper) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#e6eaf2" transparent opacity={0.95} />
      </mesh>

      <Grid
        args={[200, 200]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#c8cdd8"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#8fa0b8"
        fadeDistance={80}
        fadeStrength={1.2}
        position={[0, -0.015, 0]}
      />
      <axesHelper args={[2]} />
      <GizmoHelper alignment="bottom-left" margin={[60, 60]}>
        <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labels={['X', 'Z', 'Y']} labelColor="#0f172a" />
      </GizmoHelper>

      <DroneModel onLoaded={onBox} />
    </>
  );
}

export default function LightweightDroneView() {
  const [box, setBox] = useState<THREE.Box3 | null>(null);
  const [use2D, setUse2D] = useState(false);
  const handleBox = useCallback((b: THREE.Box3) => setBox(b), []);
  const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
  const theme = useSimulationStore((s) => s.theme);
  const bgColor = theme === 'dark' ? '#050B14' : '#f0f4f8';

  useEffect(() => {
    console.log('[LightweightFallback] mounted — isElectron:', isElectron, 'using Preview-compatible lightweight renderer (no shadows, low-power)');
    const info = detectWebGL();
    console.log('[LightweightFallback] WebGL probe', info);
    if (!info.available) {
      console.warn('[LightweightFallback] WebGL not available → switching to 2D canvas fallback');
      setUse2D(true);
    }
  }, [isElectron]);

  if (use2D) {
    console.log('[LightweightFallback] rendering Fallback2DView (guaranteed 2D)');
    return <Fallback2DView />;
  }

  return (
    <WebGLErrorBoundary fallback={<Fallback2DView />}>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg-app)' }}>
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 5,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            padding: '6px 10px',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 10,
            color: 'var(--text-muted)',
          }}
        >
          Low-GPU fallback — Preview rendering
        </div>
        <Canvas
          camera={{ position: [8, 6, 8], fov: 45 }}
          shadows={false}
          dpr={[1, 1.2]}
          gl={{
            antialias: false,
            alpha: true,
            depth: true,
            stencil: false,
            powerPreference: 'low-power',
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: false,
          }}
          style={{ width: '100%', height: '100%', background: bgColor }}
          fallback={<Fallback2DView />}
          onCreated={({ gl }) => {
            console.log('[LightweightFallback] WebGLRenderer created', {
              isElectron,
              vendor: (gl as any).getParameter?.((gl as any).VERSION),
              shadowMap: gl.shadowMap.enabled,
            });
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
            gl.shadowMap.enabled = false;
          }}
        >
          <Suspense fallback={null}>
            <FallbackSceneContent onBox={handleBox} />
            <FallbackCameraFramer box={box} />
          </Suspense>
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
