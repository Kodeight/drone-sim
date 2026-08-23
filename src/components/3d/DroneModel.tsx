'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '@/store/simulationStore';

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * Visual scale that maps simulator physics units (meters) to scene units.
 * The GLB is ~2.70 x 0.58 x 3.23 units in its own local space.
 * The simulator operates in meters.  We want the model to look physically
 * correct relative to the grid (1 grid cell = 1 scene unit).
 */
export const MODEL_VISUAL_SCALE = 1.0;

/** FOV margin multiplier (> 1.0 adds breathing room around the model) */
const FIT_MARGIN = 1.55;

// ─── Types ──────────────────────────────────────────────────────────────────

interface DroneModelGLBProps {
  onLoaded?: (box: THREE.Box3) => void;
}

// ─── Propeller detection ─────────────────────────────────────────────────────

const PROP_KEYWORDS = ['prop', 'rotor', 'blade', 'motor', 'fan', 'spinner'];

function findPropellers(scene: THREE.Object3D): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];

  scene.traverse((obj) => {
    const name = obj.name.toLowerCase();
    const isProp = PROP_KEYWORDS.some((k) => name.includes(k));
    if (isProp) {
      found.push(obj);
    }
  });

  // Deduplicate: keep only leaf-most nodes (children of groups)
  // If none found by name, attempt heuristic: 4 similarly-named meshes
  if (found.length === 0) {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
    });
    // Log all mesh names for debugging
    if (typeof window !== 'undefined') {
      console.log('[DroneModel] GLB mesh names:', meshes.map((m) => m.name));
    }
  } else {
    if (typeof window !== 'undefined') {
      console.log('[DroneModel] Found propeller nodes:', found.map((o) => o.name));
    }
  }

  return found.slice(0, 4);
}

/** CW: +Y rotation; CCW: -Y rotation */
const PROP_DIRECTIONS = [1, -1, -1, 1]; // M1 CW, M2 CCW, M3 CCW, M4 CW (X config)

// ─── Camera fit utility ───────────────────────────────────────────────────────

export function fitCameraToBox(
  camera: THREE.PerspectiveCamera,
  controls: any | null,
  box: THREE.Box3,
  margin: number = FIT_MARGIN
) {
  const center = new THREE.Vector3();
  box.getCenter(center);

  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const radius = sphere.radius;

  const fovRad = (camera.fov * Math.PI) / 180;
  // Account for aspect: use the smaller angular extent
  const aspect = camera.aspect;
  const effectiveFov = aspect < 1 ? fovRad * aspect : fovRad;

  const distance = (radius * margin) / Math.sin(effectiveFov / 2);

  // Position camera at isometric-style angle
  const dir = new THREE.Vector3(1.2, 0.8, 1.2).normalize();
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

// ─── Main component ─────────────────────────────────────────────────────────

export default function DroneModel({ onLoaded }: DroneModelGLBProps) {
  const { scene: gltfScene } = useGLTF('models/drone.glb');

  const drone       = useSimulationStore((s) => s.drone);
  const cameraMode  = useSimulationStore((s) => s.cameraMode);

  const { camera, scene } = useThree();

  // Refs
  const calibGroupRef  = useRef<THREE.Group>(null);   // model centering
  const simGroupRef    = useRef<THREE.Group>(null);    // simulation transforms
  const propRefs       = useRef<THREE.Object3D[]>([]);
  const loadedRef      = useRef(false);
  const boxRef         = useRef<THREE.Box3>(new THREE.Box3());

  // Clone the scene once to avoid mutations on the shared asset
  const clonedScene = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    if (!gltfScene || loadedRef.current) return;
    loadedRef.current = true;

    // Deep clone so multiple instances don't share state
    const clone = gltfScene.clone(true);
    clonedScene.current = clone;

    // ── 1. Measure bounding box of the raw GLB ──────────────────────────
    const rawBox = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    rawBox.getCenter(center);

    // ── 2. Center calibration group ─────────────────────────────────────
    if (calibGroupRef.current) {
      calibGroupRef.current.position.set(-center.x, -center.y, -center.z);
    }

    // ── 3. Add clone to calib group ──────────────────────────────────────
    if (calibGroupRef.current) {
      calibGroupRef.current.add(clone);
    }

    // ── 4. Find propellers ────────────────────────────────────────────────
    propRefs.current = findPropellers(clone);

    // ── 5. Compute world bounding box of the centered model ──────────────
    if (simGroupRef.current) {
      simGroupRef.current.updateWorldMatrix(true, true);
      const worldBox = new THREE.Box3().setFromObject(simGroupRef.current);
      boxRef.current = worldBox;
      onLoaded?.(worldBox);
    }
  }, [gltfScene, onLoaded]);

  // ── Simulation transform: position + attitude ────────────────────────────
  useFrame((_, delta) => {
    if (!simGroupRef.current) return;

    const { x, y, z, roll, pitch, yaw } = drone;

    // Map sim coords → scene coords
    // Simulator: x=forward, y=left, z=up (NED-ish)
    // Three.js:  x=right,   y=up,   z=back
    // We do: scene.x = sim.x, scene.y = sim.z, scene.z = -sim.y
    simGroupRef.current.position.set(x, z, -y);

    // Rotation: ZYX Euler in radians
    // roll → X axis, pitch → Z axis (forward tilt), yaw → Y axis
    simGroupRef.current.rotation.set(roll, -yaw, pitch);

    // ── Propeller animation ─────────────────────────────────────────────
    const thrusts = drone.motorThrusts;
    propRefs.current.forEach((prop, i) => {
      if (!prop) return;
      const dir = PROP_DIRECTIONS[i] ?? 1;
      const speed = (thrusts[i] ?? 0) * 30;
      prop.rotation.y += dir * speed * delta;
    });

    // ── Follow camera mode ──────────────────────────────────────────────
    if (cameraMode === 'follow') {
      const cam = camera as THREE.PerspectiveCamera;
      const pos = simGroupRef.current.position;
      cam.position.set(pos.x - 4, pos.y + 2, pos.z + 4);
      cam.lookAt(pos);
    }
  });

  return (
    <group ref={simGroupRef} scale={[MODEL_VISUAL_SCALE, MODEL_VISUAL_SCALE, MODEL_VISUAL_SCALE]}>
      {/* Calibration group: offsets the GLB origin to its center */}
      <group ref={calibGroupRef} />
    </group>
  );
}

// Preload for faster first render
useGLTF.preload('models/drone.glb');
