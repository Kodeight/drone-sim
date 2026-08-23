'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSimulationStore } from '@/store/simulationStore';
import DroneModel from './DroneModel';
import Environment from './Environment';
import TargetMarker from './TargetMarker';
import FlightPath from './FlightPath';

export default function Scene() {
  const drone = useSimulationStore((s) => s.drone);
  const target = useSimulationStore((s) => s.target);
  const history = useSimulationStore((s) => s.history);

  const flightPathPoints = history.x.length > 2
    ? history.x.slice(-500).map((x, i) => {
        const idx = history.x.length - 500 + i;
        return [x, history.z[idx], history.y[idx]] as [number, number, number];
      })
    : [];

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 50 }}
      shadows
      style={{ background: '#f4f6fb' }}
    >
      <Environment />

      <DroneModel
        position={[drone.x, drone.z, drone.y]}
        rotation={[drone.roll, drone.yaw, drone.pitch]}
        motorSpeeds={[...drone.motorThrusts]}
      />

      <TargetMarker position={[target.x, target.z, target.y]} />

      {flightPathPoints.length > 1 && (
        <FlightPath points={flightPathPoints} />
      )}

      {/* Dashed line to target */}
      {flightPathPoints.length > 0 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                drone.x, drone.z, drone.y,
                target.x, target.z, target.y,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineDashedMaterial color="#1f9d55" dashSize={0.3} gapSize={0.15} transparent opacity={0.6} />
        </line>
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={30}
        target={[drone.x, drone.z, drone.y]}
      />
    </Canvas>
  );
}
