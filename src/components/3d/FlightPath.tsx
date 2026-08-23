'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

interface FlightPathProps {
  points: [number, number, number][];
  color?: string;
}

export default function FlightPath({ points, color = '#2f6fed' }: FlightPathProps) {
  const lineGeometry = useMemo(() => {
    if (points.length < 2) return null;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    points.forEach(([x, y, z], i) => {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    });
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [points]);

  if (!lineGeometry) return null;

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color={color} transparent opacity={0.6} />
    </line>
  );
}
