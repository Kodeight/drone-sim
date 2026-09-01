'use client';

import { useRef, useState, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import DroneModel, { fitCameraToBox } from '@/components/3d/DroneModel';
import { useSimulationStore } from '@/store/simulationStore';

function usePreviewAnimationState() {
  useEffect(() => {
    const { drone, isRunning } = useSimulationStore.getState();
    const prevDrone = drone;
    const prevRunning = isRunning;
    useSimulationStore.setState({
      isRunning: true,
      drone: {
        ...prevDrone,
        x: 0,
        y: 0,
        z: 0,
        roll: 0,
        pitch: 0,
        yaw: 0,
        p: 0,
        q: 0,
        r: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        motorThrusts: [2.2, 2.2, 2.2, 2.2] as [number, number, number, number],
      },
    });
    return () => {
      useSimulationStore.setState({ isRunning: prevRunning, drone: prevDrone });
    };
  }, []);
}

function PreviewScene({ onBox }: { onBox: (b: THREE.Box3) => void }) {
  usePreviewAnimationState();
  const { camera } = useThree();
  const innerRef = useRef<any>(null);
  const handleBox = useCallback(
    (b: THREE.Box3) => {
      fitCameraToBox(camera as THREE.PerspectiveCamera, innerRef.current, b);
      onBox(b);
    },
    [camera, onBox]
  );

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <directionalLight position={[-8, 8, -8]} intensity={0.4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={0.25} color="#000000" />
      </mesh>
      <Grid
        args={[200, 200]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#8fa0b8"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#5a6a8a"
        fadeDistance={80}
        fadeStrength={1.2}
        position={[0, -0.015, 0]}
      />
      <axesHelper args={[2]} />
      <GizmoHelper alignment="bottom-left" margin={[60, 60]}>
        <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labels={['X', 'Z', 'Y']} labelColor="#0f172a" />
      </GizmoHelper>
      <DroneModel onLoaded={handleBox} />
      <OrbitControls
        ref={innerRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={0.5}
        maxDistance={80}
      />
    </>
  );
}

export default function DronePreviewPage() {
  const [box, setBox] = useState<THREE.Box3 | null>(null);
  const handleBox = useCallback((b: THREE.Box3) => setBox(b), []);
  const theme = useSimulationStore((s) => s.theme);

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-app)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, background: 'var(--bg-panel)', padding: '8px 12px', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>DroneModel Preview (isolated) — updated</div>
        <div style={{ color: 'var(--text-secondary)' }}>4 motors × 2 blades (8 total) — propellers driven by motorThrusts</div>
        <div style={{ color: 'var(--text-muted)' }}>OrbitControls · Grid · Axes · auto-framed · original display frame (x,z,-y) · Y is up</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{box ? `box ${box.min.x.toFixed(2)},${box.min.y.toFixed(2)},${box.min.z.toFixed(2)} → ${box.max.x.toFixed(2)},${box.max.y.toFixed(2)},${box.max.z.toFixed(2)}` : 'framing…'}</div>
        <a href="/" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
          ← Back to simulator
        </a>
      </div>
      <Canvas
        camera={{ position: [8, 6, 8], fov: 45 }}
        shadows
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <PreviewScene onBox={handleBox} />
        </Suspense>
      </Canvas>
    </div>
  );
}
