'use client';

import { Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useSimulationStore } from '@/store/simulationStore';

export default function Environment() {
  const showGrid = useSimulationStore((s) => s.showGrid);
  const showAxes = useSimulationStore((s) => s.showAxes);
  const theme    = useSimulationStore((s) => s.theme);

  const isDark = theme === 'dark';

  return (
    <>
      {/* ── Lighting ───────────────────────────────────────────────── */}
      <ambientLight intensity={isDark ? 0.4 : 0.7} />
      <directionalLight
        position={[10, 20, 10]}
        castShadow
        intensity={isDark ? 0.8 : 1.2}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-8, 8, -8]}
        intensity={isDark ? 0.3 : 0.4}
        color={isDark ? '#3080ff' : '#ffffff'}
      />
      <directionalLight
        position={[0, -5, 0]}
        intensity={isDark ? 0.1 : 0.05}
        color={isDark ? '#0a4080' : '#c0d8f0'}
      />

      {/* ── Ground / shadow receiver ───────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={isDark ? 0.4 : 0.25} color={isDark ? '#001030' : '#000000'} />
      </mesh>

      {/* ── Grid ───────────────────────────────────────────────────── */}
      {showGrid && (
        <Grid
          args={[200, 200]}
          cellSize={1}
          cellThickness={0.4}
          cellColor={isDark ? '#0f2a4a' : '#c8cdd8'}
          sectionSize={5}
          sectionThickness={0.8}
          sectionColor={isDark ? '#1a4a7a' : '#8fa0b8'}
          fadeDistance={80}
          fadeStrength={1.2}
          position={[0, -0.015, 0]}
        />
      )}

      {/* ── World axes gizmo ───────────────────────────────────────── */}
      {showAxes && (
        <GizmoHelper alignment="bottom-left" margin={[60, 60]} size={1.5}>
          <GizmoViewport
            axisColors={['#ef4444', '#22c55e', '#3b82f6']}
            labels={['X', 'Z', 'Y']}
            labelColor={isDark ? '#e2e8f0' : '#0f172a'}
            lineThickness={1}
          />
        </GizmoHelper>
      )}
    </>
  );
}
