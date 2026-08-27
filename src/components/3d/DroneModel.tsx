'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '@/store/simulationStore';

// ─── Constants ─────────────────────────────────────────────────────────────

export const MODEL_VISUAL_SCALE = 1.0;
const FIT_MARGIN = 1.55;

// ─── Types ──────────────────────────────────────────────────────────────────

interface DroneModelGLBProps {
  onLoaded?: (box: THREE.Box3) => void;
}

// ─── Propeller geometry (shared) ────────────────────────────────────────────

function createPropellerGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // 3-blade propeller
  const blades = 3;
  const innerR = 0.02;
  const outerR = 0.18;
  const bladeWidth = 0.04;

  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const cosW = Math.cos(angle + 0.15);
    const sinW = Math.sin(angle + 0.15);

    shape.moveTo(cos * innerR, sin * innerR);
    shape.lineTo(cosW * outerR - sinW * bladeWidth, sinW * outerR + cosW * bladeWidth);
    shape.lineTo(cosW * outerR + sinW * bladeWidth, sinW * outerR - cosW * bladeWidth);
    shape.lineTo(cos * innerR, sin * innerR);
  }

  const geometry = new THREE.ShapeGeometry(shape, 1);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

// ─── Motor positions (relative to drone center, in GLB local space) ────────
// X-config: front-left, front-right, rear-left, rear-right
const MOTOR_OFFSETS: [number, number, number][] = [
  [ 0.18, 0.06, -0.18],  // M1 front-left
  [ 0.18, 0.06,  0.18],  // M2 front-right
  [-0.18, 0.06, -0.18],  // M3 rear-left
  [-0.18, 0.06,  0.18],  // M4 rear-right
];

/**
 * X-config quadrotor rotation directions.
 * M1 Front-Left: CW  M2 Front-Right: CCW
 * M3 Rear-Left:  CCW M4 Rear-Right:  CW
 */
const PROP_DIRECTIONS = [1, -1, -1, 1];

// ─── Camera fit utility ───────────────────────────────────────────────────────

export function fitCameraToBox(
  camera: THREE.PerspectiveCamera,
  controls: any | null,
  box: THREE.Box3,
  margin: number = FIT_MARGIN
) {
  const center = new THREE.Vector3();
  box.getCenter(center);
  center.y = Math.max(center.y, 1.5);

  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const radius = sphere.radius;

  const fovRad = (camera.fov * Math.PI) / 180;
  const aspect = camera.aspect;
  const effectiveFov = aspect < 1 ? fovRad * aspect : fovRad;
  const distance = (radius * margin) / Math.sin(effectiveFov / 2);

  const dir = new THREE.Vector3(1.0, 1.0, 1.0).normalize();
  camera.position.copy(center).addScaledVector(dir, distance);
  camera.near = distance * 0.01;
  camera.far  = distance * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

// ─── Single propeller mesh ───────────────────────────────────────────────────

function PropellerBlade({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#1a1a2e" side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function DroneModel({ onLoaded }: DroneModelGLBProps) {
  const { scene: gltfScene } = useGLTF('models/drone.glb');

  const drone      = useSimulationStore((s) => s.drone);
  const cameraMode = useSimulationStore((s) => s.cameraMode);
  const isRunning  = useSimulationStore((s) => s.isRunning);

  const { camera } = useThree();

  const calibGroupRef = useRef<THREE.Group>(null);
  const simGroupRef   = useRef<THREE.Group>(null);
  const propGroupRefs = useRef<THREE.Group[]>([]);
  const loadedRef     = useRef(false);
  const boxRef        = useRef<THREE.Box3>(new THREE.Box3());
  const clonedScene   = useRef<THREE.Object3D | null>(null);
  const _decomposePos = useRef(new THREE.Vector3());

  const propGeometry = useMemo(() => createPropellerGeometry(), []);

  useEffect(() => {
    if (!gltfScene || loadedRef.current) return;
    loadedRef.current = true;

    const clone = gltfScene.clone(true);
    clonedScene.current = clone;

    const rawBox = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    rawBox.getCenter(center);

    if (calibGroupRef.current) {
      calibGroupRef.current.position.set(-center.x, -center.y, -center.z);
      calibGroupRef.current.add(clone);
    }

    if (simGroupRef.current) {
      simGroupRef.current.updateWorldMatrix(true, true);
      const worldBox = new THREE.Box3().setFromObject(simGroupRef.current);
      boxRef.current = worldBox;
      onLoaded?.(worldBox);
    }
  }, [gltfScene, onLoaded]);

  // ── Animation loop ──────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!simGroupRef.current) return;

    const { x, y, z, roll, pitch, yaw } = drone;

    // ── Attitude conversion: Python (Z-up) → Three.js (Y-up)
    // Using R_three = S @ R_sim @ inverse(S) where:
    // S = [[1, 0, 0], [0, 0, 1], [0, -1, 0]]
    // Python: R_sim = Rz(yaw) @ Ry(pitch) @ Rx(roll)
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);

    // R_sim = Rz(yaw) @ Ry(pitch) @ Rx(roll)
    const r11 = cy * cp;
    const r12 = cy * sp * sr - sy * cr;
    const r13 = cy * sp * cr + sy * sr;
    const r21 = sy * cp;
    const r22 = sy * sp * sr + cy * cr;
    const r23 = sy * sp * cr - cy * sr;
    const r31 = -sp;
    const r32 = cp * sr;
    const r33 = cp * cr;

    // R_three = S @ R_sim @ S^{-1}
    // Three.js Matrix4.fromArray expects column-major order, so transpose from row-major
    const elements = [
      r11, r31, -r21, 0,
      r13, r33, -r23, 0,
      -r12, -r32, r22, 0,
      0, 0, 0, 1,
    ];

    simGroupRef.current.matrix.fromArray(elements);
    simGroupRef.current.matrix.decompose(
      _decomposePos.current,
      simGroupRef.current.quaternion,
      simGroupRef.current.scale
    );

    // ── Position conversion: Python Z-up → Three.js Y-up
    // X_three = X_sim, Y_three = Z_sim, Z_three = -Y_sim
    // Set AFTER decompose since the rotation matrix has no translation
    simGroupRef.current.position.set(x, z, -y);

    // ── Propeller spin ──────────────────────────────────────────────────
    const thrusts = drone.motorThrusts;
    propGroupRefs.current.forEach((group, i) => {
      if (!group) return;
      const dir = PROP_DIRECTIONS[i] ?? 1;
      const motorOutput = isRunning ? (thrusts[i] ?? 0) : 0;
      const speed = motorOutput * 40;
      // Rotate around the local shaft axis (group's local Y after rotation conversion)
      group.rotation.y += dir * speed * delta;
    });

    // ── Follow camera ──────────────────────────────────────────────────
    if (cameraMode === 'follow') {
      const cam = camera as THREE.PerspectiveCamera;
      const pos = simGroupRef.current.position;
      cam.position.set(pos.x - 4, pos.y + 2, pos.z + 4);
      cam.lookAt(pos);
    }
  });

  return (
    <group ref={simGroupRef} scale={[MODEL_VISUAL_SCALE, MODEL_VISUAL_SCALE, MODEL_VISUAL_SCALE]}>
      <group ref={calibGroupRef} />

      {/* ── Procedural propellers ─────────────────────────────────────── */}
      {MOTOR_OFFSETS.map((offset, i) => (
        <group
          key={i}
          ref={(el) => { if (el) propGroupRefs.current[i] = el; }}
          position={offset}
        >
          <PropellerBlade geometry={propGeometry} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload('models/drone.glb');
