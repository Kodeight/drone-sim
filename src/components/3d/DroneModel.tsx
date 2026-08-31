'use client';

/**
 * DroneModel — procedural quadcopter rebuilt from /public/models/drone.png
 * via the img2threejs code-only pipeline.
 *
 * Reference: public/models/drone.png (1536×1024, dark studio, X-config
 * cinematic quad with white fuselage, black truss arms, silver motors with
 * red rings, 3-blade props, camera gimbal, V-legs, front LEDs).
 *
 * Pipeline (img2threejs/img2threejs):
 *  1. forge/stage1_intake/probe_image.py  — 1536×1024, sharp, no alpha issues
 *  2. forge/stage1_intake/build_detail_inventory.py — identity details enumerated
 *  3. forge/stage2_spec/new_sculpt_spec.py — ObjectSculptSpec authored (body,
 *     4× armTruss, 4× motorStack, 4× propeller, landingGear, gimbal, antenna)
 *  4. PBR evidence (extract_pbr_evidence.py): white shell #eef2f5, truss #11151c,
 *     silver #c8ced6, red ring #cc1a1a (emissive), LED #7de2ff (emissive),
 *     prop #0d0f14
 *  5. forge/stage3_build/generate_threejs_factory.py — this factory
 *
 * Output is a code-only THREE.Group — no GLB, no texture image at runtime.
 * The factory is animation-ready: propGroupRefs expose 4 sockets spinning
 * about local +Z (the display-frame up for the Y/Z-swapped visualizer).
 *
 * Visualization is Y/Z-swapped only (sim x,y,z → display x,-y,z,  N@R@N);
 * simulation, PID, physics, API and reset logic are untouched.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '@/store/simulationStore';

// ─── Constants ─────────────────────────────────────────────────────────────

export const MODEL_VISUAL_SCALE = 1.0;
const FIT_MARGIN = 1.55;

// ─── Types ──────────────────────────────────────────────────────────────────

interface DroneModelProps {
  onLoaded?: (box: THREE.Box3) => void;
}

// ─── Body footprint (top view) — chamfered rectangle mimicking white shell ──

function createBodyShellGeometry(): THREE.ExtrudeGeometry {
  const halfL = 0.148; // forward half-length (X)
  const halfW = 0.072; // half-width (Y)
  const chamF = 0.028;
  const chamR = 0.022;

  const s = new THREE.Shape();
  // front edge clockwise
  s.moveTo(halfL, halfW - chamF);
  s.lineTo(halfL - chamF, halfW);
  s.lineTo(-halfL + chamR, halfW);
  s.lineTo(-halfL, halfW - chamR);
  s.lineTo(-halfL, -halfW + chamR);
  s.lineTo(-halfL + chamR, -halfW);
  s.lineTo(halfL - chamF, -halfW);
  s.lineTo(halfL, -halfW + chamF);
  s.closePath();

  const geom = new THREE.ExtrudeGeometry(s, {
    depth: 0.048,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.009,
    bevelSegments: 3,
    steps: 1,
  });
  // Extrude goes +Z; center vertically so the shell straddles z=0
  geom.translate(0, 0, -0.024);
  geom.computeVertexNormals();
  return geom;
}

// ─── Propeller geometry — 3-blade, disc in XY plane (spin about local +Z) ─
// fix.md strict: exactly 4 propellers × 3 blades = 12 blades

function createPropellerGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const blades = 3;
  const innerR = 0.018;
  const outerR = 0.18;
  const bladeW = 0.022;

  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const cosW = Math.cos(angle + 0.18);
    const sinW = Math.sin(angle + 0.18);

    shape.moveTo(cos * innerR, sin * innerR);
    shape.lineTo(cosW * outerR - sinW * bladeW, sinW * outerR + cosW * bladeW);
    shape.lineTo(cosW * outerR + sinW * bladeW, sinW * outerR - cosW * bladeW);
    shape.lineTo(cos * innerR, sin * innerR);
  }

  const geometry = new THREE.ShapeGeometry(shape, 1);
  // keep in XY plane — normal is +Z (spin axis)
  return geometry;
}

// ─── Motor positions — X-config, arms in XY plane (up = +Z in display frame) ─

const MOTOR_OFFSETS: [number, number, number][] = [
  [0.205, 0.205, 0.02], // M1 front-right (X forward, Y right)
  [0.205, -0.205, 0.02], // M2 front-left
  [-0.195, 0.205, 0.02], // M3 rear-right
  [-0.195, -0.195, 0.02], // M4 rear-left
];

/** X-config: CW, CCW, CCW, CW about local +Z */
const PROP_DIRECTIONS = [1, -1, -1, 1];

// ─── Camera fit utility (unchanged contract) ─────────────────────────────────

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
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function DroneModel({ onLoaded }: DroneModelProps) {
  const drone = useSimulationStore((s) => s.drone);
  const cameraMode = useSimulationStore((s) => s.cameraMode);
  const isRunning = useSimulationStore((s) => s.isRunning);

  const { camera } = useThree();

  const simGroupRef = useRef<THREE.Group>(null);
  const propGroupRefs = useRef<THREE.Group[]>([]);
  const loadedRef = useRef(false);
  const boxRef = useRef<THREE.Box3>(new THREE.Box3());

  const prevStateRef = useRef<{
    x: number;
    y: number;
    z: number;
    roll: number;
    pitch: number;
    yaw: number;
    quaternion: THREE.Quaternion;
    position: THREE.Vector3;
  } | null>(null);
  const currentStateRef = useRef<{
    x: number;
    y: number;
    z: number;
    roll: number;
    pitch: number;
    yaw: number;
    quaternion: THREE.Quaternion;
    position: THREE.Vector3;
  } | null>(null);
  const interpFactorRef = useRef(0);
  const stateKeyRef = useRef('');

  const propGeometry = useMemo(() => createPropellerGeometry(), []);
  const bodyShellGeometry = useMemo(() => createBodyShellGeometry(), []);
  // blur disc for fast spin — a faint translucent circle in the prop plane
  const blurGeometry = useMemo(() => new THREE.CircleGeometry(0.18, 32), []);

  useEffect(() => {
    if (loadedRef.current || !simGroupRef.current) return;
    loadedRef.current = true;
    simGroupRef.current.updateWorldMatrix(true, true);
    const worldBox = new THREE.Box3().setFromObject(simGroupRef.current);
    boxRef.current = worldBox;
    onLoaded?.(worldBox);
  }, [onLoaded]);

  useFrame((_, delta) => {
    if (!simGroupRef.current) return;
    const { x, y, z, roll, pitch, yaw, motorThrusts } = drone;

    // ── Attitude: Python Z-up → display frame (Y/Z swapped) ──────────────
    // Display maps sim→scene as X=x, Y=-y, Z=z  (N = diag(1,-1,1)),  R_disp = N·R_sim·N
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);

    const r11 = cy * cp;
    const r12 = cy * sp * sr - sy * cr;
    const r13 = cy * sp * cr + sy * sr;
    const r21 = sy * cp;
    const r22 = sy * sp * sr + cy * cr;
    const r23 = sy * sp * cr - cy * sr;
    const r31 = -sp;
    const r32 = cp * sr;
    const r33 = cp * cr;

    const elements = [
      r11, -r21, r31, 0,
      -r12, r22, -r32, 0,
      r13, -r23, r33, 0,
      0, 0, 0, 1,
    ];

    const newQuaternion = new THREE.Quaternion();
    newQuaternion.setFromRotationMatrix(new THREE.Matrix4().fromArray(elements));
    const newPosition = new THREE.Vector3(x, -y, z);

    const stateKey = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)},${roll.toFixed(6)},${pitch.toFixed(6)},${yaw.toFixed(6)}`;
    const isNewState = stateKey !== stateKeyRef.current;
    if (isNewState) {
      if (currentStateRef.current) {
        prevStateRef.current = {
          x: currentStateRef.current.x,
          y: currentStateRef.current.y,
          z: currentStateRef.current.z,
          roll: currentStateRef.current.roll,
          pitch: currentStateRef.current.pitch,
          yaw: currentStateRef.current.yaw,
          quaternion: currentStateRef.current.quaternion.clone(),
          position: currentStateRef.current.position.clone(),
        };
      }
      stateKeyRef.current = stateKey;
    }
    currentStateRef.current = { x, y, z, roll, pitch, yaw, quaternion: newQuaternion, position: newPosition };
    if (isNewState) interpFactorRef.current = 0;

    const prev = prevStateRef.current;
    const curr = currentStateRef.current;
    let interpQuaternion: THREE.Quaternion;
    let interpPosition: THREE.Vector3;
    if (prev && curr) {
      interpFactorRef.current = Math.min(1, interpFactorRef.current + delta * 60);
      interpQuaternion = new THREE.Quaternion().copy(prev.quaternion).slerp(curr.quaternion, interpFactorRef.current);
      interpPosition = new THREE.Vector3().copy(prev.position).lerp(curr.position, interpFactorRef.current);
    } else if (curr) {
      interpQuaternion = curr.quaternion;
      interpPosition = curr.position;
    } else return;

    simGroupRef.current.quaternion.copy(interpQuaternion);
    simGroupRef.current.position.copy(interpPosition);

    // ── Propeller spin about local +Z (display-frame up) ────────────────
    // Always spinning when isRunning so the user sees motion "on start";
    // idle base spin + thrust-proportional term → blur at hover thrust (~2.2 N).
    const thrusts = motorThrusts;
    propGroupRefs.current.forEach((group, i) => {
      if (!group) return;
      const dir = PROP_DIRECTIONS[i] ?? 1;
      const t = thrusts[i] ?? 0;
      const idle = isRunning ? 18 : 0; // rad/s visible even at 0 thrust
      const thrustSpin = isRunning ? t * 32 : 0;
      group.rotation.z += dir * (idle + thrustSpin) * delta;
    });

    if (cameraMode === 'follow') {
      const cam = camera as THREE.PerspectiveCamera;
      const pos = simGroupRef.current.position;
      cam.position.set(pos.x - 4, pos.y + 2, pos.z + 4);
      cam.lookAt(pos);
    }
  });

  return (
    <group ref={simGroupRef} scale={[MODEL_VISUAL_SCALE, MODEL_VISUAL_SCALE, MODEL_VISUAL_SCALE]}>
      {/* Drone hierarchy per spec */}
      <group name="body">
        <mesh castShadow receiveShadow geometry={bodyShellGeometry} position={[0.01, 0, 0.038]}>
          <meshStandardMaterial color="#eef2f7" roughness={0.32} metalness={0.06} />
        </mesh>
        <mesh position={[0.02, 0, 0.069]} castShadow>
          <boxGeometry args={[0.22, 0.025, 0.012]} />
          <meshStandardMaterial color="#f6f8fb" roughness={0.4} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={`vents-${side}`} name={`vents-${side}`}>
            {[0.06, 0.09, 0.12].map((dx, j) => (
              <mesh key={j} position={[0.02 + dx, side * 0.072, 0.05]}>
                <boxGeometry args={[0.018, 0.003, 0.006]} />
                <meshStandardMaterial color="#2a2f3a" roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      <group name="lowerChassis">
        <mesh castShadow receiveShadow position={[0.01, 0, 0.0]}>
          <boxGeometry args={[0.26, 0.135, 0.032]} />
          <meshStandardMaterial color="#13161f" roughness={0.6} metalness={0.15} />
        </mesh>
        <mesh position={[-0.138, 0, 0.028]}>
          <boxGeometry args={[0.004, 0.07, 0.006]} />
          <meshStandardMaterial color="#ff1a1a" emissive="#ff1a1a" emissiveIntensity={1.6} />
        </mesh>
      </group>

      <group name="frontLights">
        <mesh position={[0.152, 0.048, 0.028]}>
          <boxGeometry args={[0.008, 0.038, 0.01]} />
          <meshStandardMaterial color="#7de2ff" emissive="#2fb8ff" emissiveIntensity={2.2} />
        </mesh>
        <mesh position={[0.152, -0.048, 0.028]}>
          <boxGeometry args={[0.008, 0.038, 0.01]} />
          <meshStandardMaterial color="#7de2ff" emissive="#2fb8ff" emissiveIntensity={2.2} />
        </mesh>
      </group>

      <group name="cameraGimbal" position={[0.11, 0, -0.018]}>
        <mesh castShadow>
          <boxGeometry args={[0.052, 0.042, 0.034]} />
          <meshStandardMaterial color="#0f1116" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0.016, 0, -0.006]}>
          <cylinderGeometry args={[0.018, 0.018, 0.012, 24]} />
          <meshStandardMaterial color="#07080a" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0.022, 0, -0.006]}>
          <circleGeometry args={[0.014, 24]} />
          <meshStandardMaterial color="#1a2a33" roughness={0.2} metalness={0.6} emissive="#0a1a22" emissiveIntensity={0.3} />
        </mesh>
      </group>

      <group name="antenna">
        <mesh position={[-0.06, 0, 0.072]} castShadow>
          <cylinderGeometry args={[0.004, 0.004, 0.07, 10]} />
          <meshStandardMaterial color="#0e0f12" roughness={0.7} />
        </mesh>
        <mesh position={[-0.06, 0, 0.11]}>
          <sphereGeometry args={[0.006, 10, 10]} />
          <meshStandardMaterial color="#0e0f12" />
        </mesh>
      </group>

      <group name="landingGear">
        {[-1, 1].map((side) => (
          <group key={`leg-${side}`} position={[0.015, side * 0.068, -0.028]}>
            <mesh position={[0.02, side * 0.018, -0.045]} rotation={[0, side * 0.28, -0.18]} castShadow>
              <boxGeometry args={[0.14, 0.014, 0.012]} />
              <meshStandardMaterial color="#0a0c10" roughness={0.6} />
            </mesh>
            <mesh position={[-0.025, side * 0.012, -0.045]} rotation={[0, side * -0.18, 0.12]} castShadow>
              <boxGeometry args={[0.11, 0.012, 0.01]} />
              <meshStandardMaterial color="#0a0c10" roughness={0.6} />
            </mesh>
            <mesh position={[0, side * 0.032, -0.098]} rotation={[0, 0, 0]} castShadow>
              <boxGeometry args={[0.18, 0.016, 0.008]} />
              <meshStandardMaterial color="#0a0c10" roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>

      <group name="arms">
        {MOTOR_OFFSETS.map((offset, i) => {
          const ax = offset[0];
          const ay = offset[1];
          const len = Math.hypot(ax, ay);
          const ang = Math.atan2(ay, ax);
          const midX = ax * 0.52;
          const midY = ay * 0.52;
          const names = ['frontRight', 'frontLeft', 'rearRight', 'rearLeft'] as const;
          return (
            <group key={`arm-${i}`} name={names[i] ?? `arm-${i}`} position={[midX, midY, 0.008]} rotation={[0, 0, ang]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[len * 0.92, 0.042, 0.022]} />
                <meshStandardMaterial color="#0f1218" roughness={0.55} metalness={0.18} />
              </mesh>
              <mesh position={[0.04, 0, 0.001]}>
                <boxGeometry args={[len * 0.22, 0.022, 0.024]} />
                <meshStandardMaterial color="#05070a" roughness={0.9} />
              </mesh>
              <mesh position={[-0.05, 0, 0.001]}>
                <boxGeometry args={[len * 0.22, 0.022, 0.024]} />
                <meshStandardMaterial color="#05070a" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0, 0.006]} rotation={[0, 0, Math.PI * 0.18]}>
                <boxGeometry args={[len * 0.28, 0.006, 0.004]} />
                <meshStandardMaterial color="#1a1f2a" roughness={0.6} />
              </mesh>
            </group>
          );
        })}
      </group>

      <group name="motors">
        {MOTOR_OFFSETS.map((offset, i) => {
          const names = ['frontRight', 'frontLeft', 'rearRight', 'rearLeft'] as const;
          return (
            <group key={`motor-${i}`} name={names[i] ?? `motor-${i}`} position={offset}>
              <mesh castShadow position={[0, 0, -0.008]}>
                <cylinderGeometry args={[0.048, 0.052, 0.038, 20]} />
                <meshStandardMaterial color="#0a0c10" roughness={0.55} metalness={0.22} />
              </mesh>
              <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.038, 0.0035, 10, 24]} />
                <meshStandardMaterial color="#cc1a1a" emissive="#ff1a1a" emissiveIntensity={1.2} roughness={0.4} />
              </mesh>
              <mesh castShadow position={[0, 0, 0.022]}>
                <cylinderGeometry args={[0.034, 0.034, 0.022, 20]} />
                <meshStandardMaterial color="#c8ced6" roughness={0.28} metalness={0.72} />
              </mesh>
              <mesh position={[0, 0, 0.038]}>
                <cylinderGeometry args={[0.012, 0.014, 0.012, 16]} />
                <meshStandardMaterial color="#0f1115" roughness={0.5} metalness={0.3} />
              </mesh>

              <group name="propeller" ref={(el) => { if (el) propGroupRefs.current[i] = el; }} position={[0, 0, 0.048]}>
                <mesh position={[0, 0, 0.004]}>
                  <cylinderGeometry args={[0.01, 0.01, 0.008, 16]} />
                  <meshStandardMaterial color="#0a0a0d" roughness={0.6} />
                </mesh>
                <mesh geometry={propGeometry} castShadow receiveShadow>
                  <meshStandardMaterial color="#0d0f14" roughness={0.45} metalness={0.08} side={THREE.DoubleSide} />
                </mesh>
                <mesh geometry={blurGeometry} position={[0, 0, -0.002]}>
                  <meshBasicMaterial color="#1a1d24" transparent opacity={isRunning ? 0.14 : 0} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}
