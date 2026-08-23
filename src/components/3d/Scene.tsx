'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSimulationStore } from '@/store/simulationStore';
import DroneModel from './DroneModel';
import Environment from './Environment';
import TargetMarker from './TargetMarker';
import FlightPath from './FlightPath';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';
import WebGLFallback from './WebGLFallback';
import { detectWebGL } from '@/lib/webglDetect';

const VISUAL_SCALE = 6;

function SceneContent() {
  const drone = useSimulationStore((s) => s.drone);
  const target = useSimulationStore((s) => s.target);
  const history = useSimulationStore((s) => s.history);

  const flightPathPoints = history.x.length > 2
    ? history.x.slice(-500).map((x, i) => {
        const idx = history.x.length - 500 + i;
        return [x * VISUAL_SCALE, history.z[idx] * VISUAL_SCALE, history.y[idx] * VISUAL_SCALE] as [number, number, number];
      })
    : [];

  return (
    <>
      <Environment />

      <group scale={[VISUAL_SCALE, VISUAL_SCALE, VISUAL_SCALE]}>
        <DroneModel
          position={[drone.x, drone.z, drone.y]}
          rotation={[drone.roll, drone.yaw, drone.pitch]}
          motorSpeeds={[...drone.motorThrusts]}
        />
      </group>

      <TargetMarker
        position={[
          target.x * VISUAL_SCALE,
          target.z * VISUAL_SCALE,
          target.y * VISUAL_SCALE,
        ]}
      />

      {flightPathPoints.length > 1 && (
        <FlightPath points={flightPathPoints} />
      )}

      {history.x.length > 0 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                drone.x * VISUAL_SCALE, drone.z * VISUAL_SCALE, drone.y * VISUAL_SCALE,
                target.x * VISUAL_SCALE, target.z * VISUAL_SCALE, target.y * VISUAL_SCALE,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineDashedMaterial color="#1f9d55" dashSize={0.5} gapSize={0.25} transparent opacity={0.6} />
        </line>
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        target={[drone.x * VISUAL_SCALE, drone.z * VISUAL_SCALE, drone.y * VISUAL_SCALE]}
      />
    </>
  );
}

function SceneLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 animate-pulse">
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200/60 via-gray-100/40 to-gray-200/60" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-200/80" />
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="w-2 h-2 rounded-full bg-gray-300 [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-gray-300 [animation-delay:300ms]" />
          </div>
          <div className="space-y-1.5 text-center">
            <div className="h-2 w-24 bg-gray-200 rounded" />
            <div className="h-1.5 w-16 bg-gray-200/60 rounded mx-auto" />
          </div>
        </div>

        <div className="absolute bottom-3 left-3 flex gap-2">
          <div className="h-5 w-14 bg-gray-200 rounded" />
          <div className="h-5 w-10 bg-gray-200 rounded" />
          <div className="h-5 w-12 bg-gray-200 rounded" />
        </div>

        <div className="absolute top-3 right-3">
          <div className="h-4 w-20 bg-gray-200/60 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function Scene() {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const info = detectWebGL();
    setWebglAvailable(info.available);
  }, []);

  if (webglAvailable === null) return <SceneLoading />;
  if (!webglAvailable) return <WebGLFallback />;

  return (
    <WebGLErrorBoundary fallback={<WebGLFallback />}>
      <Canvas
        camera={{ position: [12, 10, 12], fov: 45 }}
        shadows
        style={{ background: '#f4f6fb' }}
        gl={{ antialias: true, powerPreference: 'default' }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </WebGLErrorBoundary>
  );
}
