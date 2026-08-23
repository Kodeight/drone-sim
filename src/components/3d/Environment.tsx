'use client';

import { Grid } from '@react-three/drei';

export default function Environment() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} castShadow intensity={1} />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.4} />
      </mesh>

      {/* Grid */}
      <Grid
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#666"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#444"
        fadeDistance={40}
        fadeStrength={1}
        position={[0, 0.01, 0]}
      />
    </>
  );
}
