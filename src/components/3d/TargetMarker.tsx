'use client';

import * as THREE from 'three';

interface TargetMarkerProps {
  position: [number, number, number];
}

export default function TargetMarker({ position }: TargetMarkerProps) {
  return (
    <group position={position}>
      {/* X marker */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.3, 0.06, 0.06]} />
        <meshStandardMaterial color="#1f9d55" />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.3, 0.06, 0.06]} />
        <meshStandardMaterial color="#1f9d55" />
      </mesh>
      {/* Vertical pole */}
      <mesh position={[0, -position[1] / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, position[1], 8]} />
        <meshStandardMaterial color="#1f9d55" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
