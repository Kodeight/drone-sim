'use client';

interface TargetMarkerProps {
  position: [number, number, number];
}

export default function TargetMarker({ position }: TargetMarkerProps) {
  return (
    <group position={position}>
      {/* X marker */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.5, 0.15, 0.15]} />
        <meshStandardMaterial color="#1f9d55" emissive="#1f9d55" emissiveIntensity={0.3} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[1.5, 0.15, 0.15]} />
        <meshStandardMaterial color="#1f9d55" emissive="#1f9d55" emissiveIntensity={0.3} />
      </mesh>
      {/* Vertical pole down to ground */}
      {position[1] > 0.1 && (
        <mesh position={[0, -position[1] / 2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, position[1], 8]} />
          <meshStandardMaterial color="#1f9d55" transparent opacity={0.25} />
        </mesh>
      )}
    </group>
  );
}
