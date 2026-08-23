'use client';

import { Grid } from '@react-three/drei';

export default function Environment() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} castShadow intensity={1} />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={0.3} />
      </mesh>

      {/* Grid */}
      <Grid
        args={[200, 200]}
        cellSize={6}
        cellThickness={0.5}
        cellColor="#c8cdd8"
        sectionSize={30}
        sectionThickness={1}
        sectionColor="#a0a5b0"
        fadeDistance={120}
        fadeStrength={1}
        position={[0, -0.04, 0]}
      />
    </>
  );
}
