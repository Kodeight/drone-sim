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
import LightweightDroneView from './LightweightDroneView';
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
        // Lower the camera slightly to bring ground closer
        cam.position.y -= 1.0;
        if (controlsRef.current) controlsRef.current.target.y -= 1.0;
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
      enabled={true}
      target={
        cameraMode === 'follow'
          ? [drone.x, drone.z, -drone.y]
          : undefined
      }
    />
  );
}

// ─── Drone → target dashed line helper ───────────────────────────────────────

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
        return [x * VISUAL_SCALE, history.z[idx] * VISUAL_SCALE, -history.y[idx] * VISUAL_SCALE] as [number, number, number];
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
            target.x * VISUAL_SCALE,
            target.z * VISUAL_SCALE,
            -target.y * VISUAL_SCALE,
          ]}
        />
      )}

      {/* ── Flight path ─────────────────────────────────────────────── */}
      {showTrajectory && flightPathPoints.length > 1 && (
        <FlightPath points={flightPathPoints} />
      )}

      {/* ── Drone → target dashed line ──────────────────────────────── */}
      {showTarget && history.x.length > 0 && (
        <DroneTargetLine drone={drone} target={target} />
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
  const [renderMode, setRenderMode] = useState<'checking' | 'normal' | 'fallback'>('checking');
  const [webGLInfo, setWebGLInfo] = useState<ReturnType<typeof detectWebGL> | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [modelBox, setModelBox] = useState<THREE.Box3 | null>(null);
  const theme = useSimulationStore((s) => s.theme);

  useEffect(() => {
    const info = detectWebGL();
    setWebGLInfo(info);
    const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
    const isDevPreview = typeof window !== 'undefined' && window.location.pathname.includes('/preview');

    console.log('[Scene] WebGL probe', info);
    console.log('[Scene] isElectron:', isElectron, 'isDevPreview:', isDevPreview, 'userAgent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a');

    if (!info.available) {
      console.warn('[Scene] WebGL not available → using Preview-compatible lightweight fallback', info.error);
      setRenderMode('fallback');
      return;
    }

    // Lightweight test: can we actually get a context? (Electron GPU process may report available but fail to create)
    try {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 2;
      testCanvas.height = 2;
      const testGl =
        (testCanvas.getContext('webgl2', { antialias: false } as any) as any) ||
        testCanvas.getContext('webgl', { antialias: false } as any) ||
        testCanvas.getContext('experimental-webgl', { antialias: false } as any);
      if (!testGl) throw new Error('test WebGL context is null');
      // Try to get a renderer instance without actually rendering
      const lose = testGl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      console.log('[Scene] WebGL test context OK → using normal renderer', info.version, info.renderer);
      setRenderMode('normal');
    } catch (e) {
      console.warn('[Scene] WebGL test context failed → fallback', String(e));
      setRenderMode('fallback');
    }
  }, []);

  useImperativeHandle(ref, () => ({
    fitCamera: () => setFitTrigger((t) => t + 1),
  }));

  const handleModelLoaded = useCallback((box: THREE.Box3) => {
    setModelBox(box);
    setFitTrigger((t) => t + 1);
  }, []);

  const bgColor = theme === 'dark' ? '#050B14' : '#f0f4f8';

  if (renderMode === 'checking') return <SceneLoading />;
  if (renderMode === 'fallback') {
    console.log('[Scene] rendering LightweightDroneView (Preview-compatible) — same drone state, Y up (x,z,-y)');
    return <LightweightDroneView />;
  }

  // Normal high-GPU path — on error, fall back to lightweight instead of blank
  return (
    <WebGLErrorBoundary fallback={<LightweightDroneView />}>
      <SuppressThreeErrors>
        <Canvas
          camera={{ position: [8, 6, 8], fov: 45 }}
          shadows
          style={{ background: bgColor, width: '100%', height: '100%' }}
          gl={{
            antialias: true,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
          }}
          fallback={<LightweightDroneView />}
          onCreated={({ gl }) => {
            const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
            console.log('[Scene] Three.WebGLRenderer created — normal path', {
              isElectron,
              version: webGLInfo?.version,
              renderer: webGLInfo?.renderer,
            });
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
