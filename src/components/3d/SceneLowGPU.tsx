'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense, forwardRef, useImperativeHandle } from 'react';
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
import Fallback2DView from './Fallback2DView';
import { detectWebGL } from '@/lib/webglDetect';

const VISUAL_SCALE = 1;

function CameraController({ fitTrigger, modelBox }: { fitTrigger: number; modelBox: THREE.Box3 | null }) {
  const { camera, size } = useThree();
  const cameraMode = useSimulationStore((s) => s.cameraMode);
  const drone = useSimulationStore((s) => s.drone);
  const controlsRef = useRef<any>(null);
  const fittedRef = useRef(false);
  const prevSize = useRef({ width: size.width, height: size.height });
  const doFit = useCallback(() => {
    if (!modelBox) return;
    fitCameraToBox(camera as THREE.PerspectiveCamera, controlsRef.current, modelBox);
  }, [camera, modelBox]);
  useEffect(() => {
    if (modelBox && !fittedRef.current) {
      fittedRef.current = true;
      doFit();
    }
  }, [modelBox, doFit]);
  useEffect(() => {
    if (fitTrigger > 0) doFit();
  }, [fitTrigger, doFit]);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.aspect = size.width / size.height;
    cam.updateProjectionMatrix();
    const dx = Math.abs(size.width - prevSize.current.width);
    const dy = Math.abs(size.height - prevSize.current.height);
    if ((dx > 20 || dy > 20) && modelBox && fittedRef.current) {
      doFit();
    }
    prevSize.current = { width: size.width, height: size.height };
  }, [size, camera, modelBox, doFit]);
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
        cam.position.y -= 1.0;
        if (controlsRef.current) controlsRef.current.target.y -= 1.0;
        break;
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
      enabled={true}
      target={cameraMode === 'follow' ? [drone.x, drone.z, -drone.y] : undefined}
    />
  );
}

function DroneTargetLine({ drone, target }: { drone: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } }) {
  const lineObj = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      drone.x * VISUAL_SCALE, drone.z * VISUAL_SCALE, -drone.y * VISUAL_SCALE,
      target.x * VISUAL_SCALE, target.z * VISUAL_SCALE, -target.y * VISUAL_SCALE,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineDashedMaterial({ color: '#22c55e', dashSize: 0.3, gapSize: 0.15, transparent: true, opacity: 0.5 });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }, [drone.x, drone.y, drone.z, target.x, target.y, target.z]);
  return <primitive object={lineObj} />;
}

function SceneContent({ fitTrigger, onModelLoaded, modelBox }: { fitTrigger: number; onModelLoaded: (box: THREE.Box3) => void; modelBox: THREE.Box3 | null }) {
  const drone = useSimulationStore((s) => s.drone);
  const target = useSimulationStore((s) => s.target);
  const history = useSimulationStore((s) => s.history);
  const showTarget = useSimulationStore((s) => s.showTarget);
  const showTrajectory = useSimulationStore((s) => s.showTrajectory);
  const flightPathPoints = history.x.length > 2
    ? history.x.slice(-500).map((x, i) => {
        const idx = history.x.length - 500 + i;
        return [x * VISUAL_SCALE, history.z[idx] * VISUAL_SCALE, -history.y[idx] * VISUAL_SCALE] as [number, number, number];
      })
    : [];
  return (
    <>
      <Environment />
      <DroneModel onLoaded={onModelLoaded} />
      {showTarget && (
        <TargetMarker
          position={[target.x * VISUAL_SCALE, target.z * VISUAL_SCALE, -target.y * VISUAL_SCALE]}
        />
      )}
      {showTrajectory && flightPathPoints.length > 1 && (
        <FlightPath points={flightPathPoints} />
      )}
      {showTarget && history.x.length > 0 && (
        <DroneTargetLine drone={drone} target={target} />
      )}
      <CameraController fitTrigger={fitTrigger} modelBox={modelBox} />
    </>
  );
}

function SceneLoading() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-app)' }}>
      <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
      <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading 3D model…</div>
    </div>
  );
}

export interface SceneHandle {
  fitCamera: () => void;
}

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

const SceneLowGPU = forwardRef<SceneHandle>((_, ref) => {
  const [fitTrigger, setFitTrigger] = useState(0);
  const [modelBox, setModelBox] = useState<THREE.Box3 | null>(null);
  const theme = useSimulationStore((s) => s.theme);
  useImperativeHandle(ref, () => ({
    fitCamera: () => setFitTrigger((t) => t + 1),
  }));
  const handleModelLoaded = useCallback((box: THREE.Box3) => {
    setModelBox(box);
    setFitTrigger((t) => t + 1);
  }, []);
  const bgColor = theme === 'dark' ? '#050B14' : '#f0f4f8';
  return (
    <WebGLErrorBoundary fallback={<Fallback2DView />}>
      <SuppressThreeErrors>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 5, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', padding: '4px 8px', borderRadius: 6, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>
            Low-GPU mode — lightweight
          </div>
          <Canvas
            camera={{ position: [8, 6, 8], fov: 45 }}
            shadows={false}
            dpr={[1, 1]}
            style={{ background: bgColor, width: '100%', height: '100%' }}
            gl={{
              antialias: false,
              alpha: true,
              depth: true,
              stencil: false,
              powerPreference: 'low-power',
              failIfMajorPerformanceCaveat: false,
              precision: 'lowp' as any,
            }}
            fallback={<Fallback2DView />}
          onCreated={({ gl }) => {
            console.log('[SceneLowGPU] WebGLRenderer created low-power');
              gl.setPixelRatio(Math.min(window.devicePixelRatio, 1));
              (gl as any).shadowMap.enabled = false;
            }}
          >
            <Suspense fallback={null}>
              <SceneContent fitTrigger={fitTrigger} onModelLoaded={handleModelLoaded} modelBox={modelBox} />
            </Suspense>
          </Canvas>
        </div>
      </SuppressThreeErrors>
    </WebGLErrorBoundary>
  );
});

SceneLowGPU.displayName = 'SceneLowGPU';
export default SceneLowGPU;
