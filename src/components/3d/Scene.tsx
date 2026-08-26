'use client';

import { useState, useEffect, useRef, useCallback, Suspense, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '@/store/simulationStore';
import DroneModel, { fitCameraToBox } from './DroneModel';
import Environment from './Environment';
import TargetMarker from './TargetMarker';
import FlightPath from './FlightPath';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';
import WebGLFallback from './WebGLFallback';
import { detectWebGL } from '@/lib/webglDetect';

// ─── Visual scale: 1 sim meter = 1 scene unit ──────────────────────────────
const VISUAL_SCALE = 1;

// ─── Camera controller (inner R3F component) ────────────────────────────────

interface CameraControllerProps {
  fitTrigger: number;
  modelBox: THREE.Box3 | null;
}

function CameraController({ fitTrigger, modelBox }: CameraControllerProps) {
  const { camera, size } = useThree();
  const cameraMode = useSimulationStore((s) => s.cameraMode);
  const drone      = useSimulationStore((s) => s.drone);
  const controlsRef = useRef<any>(null);
  const fittedRef   = useRef(false);
  const prevSize    = useRef({ width: size.width, height: size.height });

  // Perform fit
  const doFit = useCallback(() => {
    if (!modelBox) return;
    fitCameraToBox(camera as THREE.PerspectiveCamera, controlsRef.current, modelBox);
  }, [camera, modelBox]);

  // Initial fit when model box arrives
  useEffect(() => {
    if (modelBox && !fittedRef.current) {
      fittedRef.current = true;
      doFit();
    }
  }, [modelBox, doFit]);

  // External fit trigger (Fit button)
  useEffect(() => {
    if (fitTrigger > 0) doFit();
  }, [fitTrigger, doFit]);

  // Viewport resize → update camera aspect + refit
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.aspect = size.width / size.height;
    cam.updateProjectionMatrix();

    // Refit if size changed significantly
    const dx = Math.abs(size.width  - prevSize.current.width);
    const dy = Math.abs(size.height - prevSize.current.height);
    if ((dx > 20 || dy > 20) && modelBox && fittedRef.current) {
      doFit();
    }
    prevSize.current = { width: size.width, height: size.height };
  }, [size, camera, modelBox, doFit]);

  // Set camera for named views
  useEffect(() => {
    if (!modelBox || !fittedRef.current) return;
    const center = new THREE.Vector3();
    modelBox.getCenter(center);
    const sphere = new THREE.Sphere();
    modelBox.getBoundingSphere(sphere);
    const r = sphere.radius * 2.5;

    const cam = camera as THREE.PerspectiveCamera;

    switch (cameraMode) {
      case 'front':
        cam.position.set(center.x, center.y, center.z + r);
        cam.lookAt(center);
        controlsRef.current?.target.copy(center);
        break;
      case 'rear':
        cam.position.set(center.x, center.y, center.z - r);
        cam.lookAt(center);
        controlsRef.current?.target.copy(center);
        break;
      case 'left':
        cam.position.set(center.x - r, center.y, center.z);
        cam.lookAt(center);
        controlsRef.current?.target.copy(center);
        break;
      case 'right':
        cam.position.set(center.x + r, center.y, center.z);
        cam.lookAt(center);
        controlsRef.current?.target.copy(center);
        break;
      case 'top':
        cam.position.set(center.x, center.y + r * 1.5, center.z);
        cam.lookAt(center);
        controlsRef.current?.target.copy(center);
        break;
      case 'iso':
        fitCameraToBox(cam, controlsRef.current, modelBox);
        break;
      case 'orbit':
      case 'follow':
      default:
        break;
    }

    if (controlsRef.current) controlsRef.current.update();
    cam.updateProjectionMatrix();
  }, [cameraMode, modelBox, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={0.5}
      maxDistance={80}
      enabled={cameraMode === 'orbit' || cameraMode === 'iso'}
      target={
        cameraMode === 'follow'
          ? [-drone.y, drone.z, -drone.x]
          : undefined
      }
    />
  );
}

// ─── Scene content ────────────────────────────────────────────────────────────

interface SceneContentProps {
  fitTrigger: number;
  onModelLoaded: (box: THREE.Box3) => void;
  modelBox: THREE.Box3 | null;
}

function SceneContent({ fitTrigger, onModelLoaded, modelBox }: SceneContentProps) {
  const drone         = useSimulationStore((s) => s.drone);
  const target        = useSimulationStore((s) => s.target);
  const history       = useSimulationStore((s) => s.history);
  const showTarget    = useSimulationStore((s) => s.showTarget);
  const showTrajectory = useSimulationStore((s) => s.showTrajectory);

  const flightPathPoints = history.x.length > 2
    ? history.x.slice(-500).map((x, i) => {
        const idx = history.x.length - 500 + i;
        // Same mapping as DroneModel: scene.x = -sim.y, scene.y = sim.z, scene.z = -sim.x
        return [-history.y[idx] * VISUAL_SCALE, history.z[idx] * VISUAL_SCALE, -x * VISUAL_SCALE] as [number, number, number];
      })
    : [];

  return (
    <>
      <Environment />

      {/* ── Real GLB Drone ──────────────────────────────────────────── */}
      <DroneModel onLoaded={onModelLoaded} />

      {/* ── Target marker ───────────────────────────────────────────── */}
      {showTarget && (
        <TargetMarker
          position={[
            -target.y * VISUAL_SCALE,
            target.z * VISUAL_SCALE,
            -target.x * VISUAL_SCALE,
          ]}
        />
      )}

      {/* ── Flight path ─────────────────────────────────────────────── */}
      {showTrajectory && flightPathPoints.length > 1 && (
        <FlightPath points={flightPathPoints} />
      )}

      {/* ── Drone → target dashed line ──────────────────────────────── */}
      {showTarget && history.x.length > 0 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                -drone.y * VISUAL_SCALE, drone.z * VISUAL_SCALE, -drone.x * VISUAL_SCALE,
                -target.y * VISUAL_SCALE, target.z * VISUAL_SCALE, -target.x * VISUAL_SCALE,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineDashedMaterial color="#22c55e" dashSize={0.3} gapSize={0.15} transparent opacity={0.5} />
        </line>
      )}

      {/* ── Camera controller ───────────────────────────────────────── */}
      <CameraController fitTrigger={fitTrigger} modelBox={modelBox} />
    </>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function SceneLoading() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--bg-app)' }}>
      <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent)' }} />
      <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
        Loading 3D model…
      </div>
    </div>
  );
}

// ─── Public imperative handle ─────────────────────────────────────────────────

export interface SceneHandle {
  fitCamera: () => void;
}

// ─── Suppress THREE.js console.error spam during context creation failure ─────

function SuppressThreeErrors({ children }: { children: React.ReactNode }) {
  const suppressRef = useRef(false);

  useEffect(() => {
    suppressRef.current = true;
    const orig = console.error;
    const timer = setTimeout(() => { suppressRef.current = false; }, 2000);
    console.error = (...args: any[]) => {
      if (suppressRef.current) {
        const msg = String(args[0] ?? '');
        if (msg.includes('THREE.WebGLRenderer') || msg.includes('WebGL context')) return;
      }
      orig(...args);
    };
    return () => { clearTimeout(timer); console.error = orig; };
  }, []);

  return <>{children}</>;
}

// ─── Main exported Scene ──────────────────────────────────────────────────────

const Scene = forwardRef<SceneHandle>((_, ref) => {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [modelBox, setModelBox] = useState<THREE.Box3 | null>(null);
  const theme = useSimulationStore((s) => s.theme);

  useEffect(() => {
    setWebglAvailable(detectWebGL().available);
  }, []);

  useImperativeHandle(ref, () => ({
    fitCamera: () => setFitTrigger((t) => t + 1),
  }));

  const handleModelLoaded = useCallback((box: THREE.Box3) => {
    setModelBox(box);
    setFitTrigger((t) => t + 1);
  }, []);

  const bgColor = theme === 'dark' ? '#050B14' : '#f0f4f8';

  if (webglAvailable === null) return <SceneLoading />;
  if (!webglAvailable)         return <WebGLFallback />;

  return (
    <WebGLErrorBoundary fallback={<WebGLFallback />}>
      <SuppressThreeErrors>
        <Canvas
          camera={{ position: [8, 6, 8], fov: 45 }}
          shadows
          style={{ background: bgColor, width: '100%', height: '100%' }}
          gl={{ antialias: true, powerPreference: 'default' }}
          onCreated={({ gl }) => {
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
          }}
        >
          <Suspense fallback={null}>
            <SceneContent
              fitTrigger={fitTrigger}
              onModelLoaded={handleModelLoaded}
              modelBox={modelBox}
            />
          </Suspense>
        </Canvas>
      </SuppressThreeErrors>
    </WebGLErrorBoundary>
  );
});

Scene.displayName = 'Scene';

export default Scene;
