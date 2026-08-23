'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DroneModelProps {
  position: [number, number, number];
  rotation: [number, number, number];
  motorSpeeds: number[];
}

const ARM_LENGTH = 0.25;
const BODY_SIZE = 0.18;
const BODY_HEIGHT = 0.06;
const MOTOR_RADIUS = 0.05;
const PROP_LENGTH = 0.28;
const LEG_HEIGHT = 0.06;

// X configuration motor positions: FL, FR, RL,RR
const MOTOR_POSITIONS: [number, number, number][] = [
  [ARM_LENGTH, 0, ARM_LENGTH],
  [-ARM_LENGTH, 0, ARM_LENGTH],
  [ARM_LENGTH, 0, -ARM_LENGTH],
  [-ARM_LENGTH, 0, -ARM_LENGTH],
];

export default function DroneModel({ position, rotation, motorSpeeds }: DroneModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const propRefs = useRef<THREE.Mesh[]>([]);

  useFrame((_, delta) => {
    propRefs.current.forEach((prop, i) => {
      if (prop) {
        prop.rotation.y += motorSpeeds[i] * 20 * delta;
      }
    });
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* ===== BODY ===== */}
      {/* Top plate */}
      <mesh position={[0, BODY_HEIGHT / 2 + 0.005, 0]}>
        <boxGeometry args={[BODY_SIZE, 0.01, BODY_SIZE]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Main body shell */}
      <mesh>
        <boxGeometry args={[BODY_SIZE, BODY_HEIGHT, BODY_SIZE]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Bottom plate */}
      <mesh position={[0, -BODY_HEIGHT / 2 - 0.005, 0]}>
        <boxGeometry args={[BODY_SIZE, 0.01, BODY_SIZE]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Battery pack (bottom) */}
      <mesh position={[0, -BODY_HEIGHT / 2 - 0.02, 0]}>
        <boxGeometry args={[0.14, 0.03, 0.12]} />
        <meshStandardMaterial color="#333" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Camera / sensor dome (top center) */}
      <mesh position={[0, BODY_HEIGHT / 2 + 0.025, 0]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, BODY_HEIGHT / 2 + 0.025, 0.035]}>
        <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#444" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ===== ARMS ===== */}
      {MOTOR_POSITIONS.map(([mx, , mz], i) => {
        const angle = Math.atan2(mz, mx);
        const armLen = Math.sqrt(mx * mx + mz * mz);
        return (
          <group key={`arm-${i}`}>
            {/* Carbon fiber arm */}
            <mesh
              position={[mx / 2, 0, mz / 2]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[armLen, 0.025, 0.035]} />
              <meshStandardMaterial color="#1c1c1c" metalness={0.5} roughness={0.4} />
            </mesh>

            {/* Motor mount (at arm end) */}
            <group position={[mx, 0, mz]}>
              {/* Motor bell (top) */}
              <mesh position={[0, 0.03, 0]}>
                <cylinderGeometry args={[MOTOR_RADIUS, MOTOR_RADIUS * 0.85, 0.04, 16]} />
                <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
              </mesh>

              {/* Motor base */}
              <mesh position={[0, 0.005, 0]}>
                <cylinderGeometry args={[MOTOR_RADIUS * 0.9, MOTOR_RADIUS * 0.9, 0.02, 16]} />
                <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
              </mesh>

              {/* Motor shaft */}
              <mesh position={[0, 0.055, 0]}>
                <cylinderGeometry args={[0.006, 0.006, 0.04, 8]} />
                <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
              </mesh>

              {/* ===== PROPELLER ===== */}
              <group
                ref={(el) => { if (el) propRefs.current[i] = el as unknown as THREE.Mesh; }}
                position={[0, 0.075, 0]}
              >
                {/* Blade 1 */}
                <mesh position={[PROP_LENGTH / 2, 0, 0]}>
                  <boxGeometry args={[PROP_LENGTH, 0.003, 0.025]} />
                  <meshStandardMaterial
                    color="#0e8f83"
                    transparent
                    opacity={0.75}
                    metalness={0.3}
                    roughness={0.4}
                  />
                </mesh>
                {/* Blade 2 */}
                <mesh position={[-PROP_LENGTH / 2, 0, 0]}>
                  <boxGeometry args={[PROP_LENGTH, 0.003, 0.025]} />
                  <meshStandardMaterial
                    color="#0e8f83"
                    transparent
                    opacity={0.75}
                    metalness={0.3}
                    roughness={0.4}
                  />
                </mesh>
                {/* Hub */}
                <mesh>
                  <cylinderGeometry args={[0.015, 0.015, 0.01, 12]} />
                  <meshStandardMaterial color="#555" metalness={0.7} roughness={0.3} />
                </mesh>
              </group>
            </group>
          </group>
        );
      })}

      {/* ===== LANDING GEAR ===== */}
      {[
        [0.1, -BODY_HEIGHT / 2 - LEG_HEIGHT / 2, 0.1],
        [-0.1, -BODY_HEIGHT / 2 - LEG_HEIGHT / 2, 0.1],
        [0.1, -BODY_HEIGHT / 2 - LEG_HEIGHT / 2, -0.1],
        [-0.1, -BODY_HEIGHT / 2 - LEG_HEIGHT / 2, -0.1],
      ].map((pos, i) => (
        <group key={`leg-${i}`} position={pos as [number, number, number]}>
          {/* Vertical leg */}
          <mesh>
            <cylinderGeometry args={[0.008, 0.008, LEG_HEIGHT, 6]} />
            <meshStandardMaterial color="#444" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Foot pad */}
          <mesh position={[0, -LEG_HEIGHT / 2, 0]}>
            <cylinderGeometry args={[0.015, 0.02, 0.008, 8]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      ))}

      {/* ===== LED INDICATORS ===== */}
      {/* Front LEDs (green) */}
      {[[0.09, 0, 0.095], [-0.09, 0, 0.095]].map((pos, i) => (
        <mesh key={`led-f-${i}`} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial
            color="#1f9d55"
            emissive="#1f9d55"
            emissiveIntensity={1.0}
          />
        </mesh>
      ))}
      {/* Rear LEDs (red) */}
      {[[0.09, 0, -0.095], [-0.09, 0, -0.095]].map((pos, i) => (
        <mesh key={`led-r-${i}`} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial
            color="#dc2626"
            emissive="#dc2626"
            emissiveIntensity={1.0}
          />
        </mesh>
      ))}

      {/* ===== HEADLIGHT ===== */}
      <mesh position={[0, -0.01, BODY_SIZE / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.015, 12]} />
        <meshStandardMaterial
          color="#fff"
          emissive="#ffffff"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}
