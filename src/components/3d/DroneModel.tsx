'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DroneModelProps {
  position: [number, number, number];
  rotation: [number, number, number];
  motorSpeeds: number[];
}

export default function DroneModel({ position, rotation, motorSpeeds }: DroneModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const propRefs = useRef<THREE.Mesh[]>([]);

  useFrame((_, delta) => {
    propRefs.current.forEach((prop, i) => {
      if (prop) {
        prop.rotation.y += motorSpeeds[i] * 15 * delta;
      }
    });
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.3, 0.08, 0.3]} />
        <meshStandardMaterial color="#2f6fed" />
      </mesh>

      {/* Arms and motors */}
      {[
        { pos: [0.25, 0, 0.25] as [number, number, number], label: 'FL' },
        { pos: [-0.25, 0, 0.25] as [number, number, number], label: 'FR' },
        { pos: [0.25, 0, -0.25] as [number, number, number], label: 'RL' },
        { pos: [-0.25, 0, -0.25] as [number, number, number], label: 'RR' },
      ].map(({ pos }, i) => (
        <group key={i} position={pos}>
          {/* Arm */}
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          {/* Motor housing */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.06, 12]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          {/* Propeller */}
          <mesh
            ref={(el) => { if (el) propRefs.current[i] = el; }}
            position={[0, 0.08, 0]}
          >
            <boxGeometry args={[0.3, 0.01, 0.04]} />
            <meshStandardMaterial color="#0e8f83" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}

      {/* LED indicators */}
      {[
        [0.15, 0.01, 0.15],
        [-0.15, 0.01, 0.15],
        [0.15, 0.01, -0.15],
        [-0.15, 0.01, -0.15],
      ].map((pos, i) => (
        <mesh key={`led-${i}`} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial
            color={i < 2 ? '#1f9d55' : '#dc2626'}
            emissive={i < 2 ? '#1f9d55' : '#dc2626'}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
