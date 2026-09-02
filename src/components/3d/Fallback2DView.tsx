'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

/**
 * Fallback2DView — guaranteed to work without WebGL.
 * Draws top-down (X-Z plane, Y is up/altitude) drone using 2D canvas.
 * Consumes exact same frontend simulation state as 3D view.
 * Propellers spin around motor shaft (Y up) — drawn as rotating lines in XZ.
 */
export default function Fallback2DView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const propAngleRef = useRef<number[]>([0, 0, 0, 0]);

  // Subscribe to store to trigger re-renders when relevant state changes
  const drone = useSimulationStore((s) => s.drone);
  const target = useSimulationStore((s) => s.target);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const showTarget = useSimulationStore((s) => s.showTarget);
  const showGrid = useSimulationStore((s) => s.showGrid);
  const showAxes = useSimulationStore((s) => s.showAxes);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = useCallback(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, [dpr]);

    resize();
    window.addEventListener('resize', resize);

    const draw = useCallback(() => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) / 24; // 1 sim meter = scale px, view ~24m

      // Clear
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-app')?.trim() || '#f0f4f8';
      if (!ctx.fillStyle || ctx.fillStyle === '') ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(0, 0, w, h);

      // Grid (XZ plane, same coordinate system as 3D view)
      if (showGrid) {
        ctx.strokeStyle = 'rgba(120,130,150,0.12)';
        ctx.lineWidth = 1;
        const gridSize = 20;
        for (let i = -gridSize; i <= gridSize; i++) {
          const sx = cx + i * scale;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, h);
          ctx.stroke();
          const sz = cy + i * scale;
          ctx.beginPath();
          ctx.moveTo(0, sz);
          ctx.lineTo(w, sz);
          ctx.stroke();
        }
      }

      // Axes: red = X (horizontal), blue = Z (depth/vertical in top-down), green = Y up label
      if (showAxes) {
        ctx.strokeStyle = '#ef4444'; // red X
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 40, cy);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px monospace';
        ctx.fillText('X', cx + 44, cy + 3);

        ctx.strokeStyle = '#3b82f6'; // blue Z
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy + 40);
        ctx.stroke();
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('Z', cx + 3, cy + 52);

        // Y up label
        ctx.fillStyle = '#22c55e';
        ctx.fillText('Y↑', cx - 20, cy - 30);
      }

      // Target
      if (showTarget) {
        const tx = cx + target.x * scale;
        const tz = cy + target.z * scale; // display same coord mapping as 3D: (x, z, -y) but top-down shows x,z
        ctx.fillStyle = 'rgba(34,197,94,0.9)';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tx, tz, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // pole to drone
        ctx.strokeStyle = 'rgba(34,197,94,0.25)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(tx, tz);
        ctx.lineTo(cx + drone.x * scale, cy + (-drone.y) * scale);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Drone position in display frame: X=x, Z=-y (altitude), using same coord mapping as 3D
      const dx = cx + drone.x * scale;
      const dz = cy + (-drone.y) * scale; // display Z = -y (altitude inverted for canvas)
      const yaw = drone.yaw;

      // Update propeller angles
      const thrusts: number[] = (drone.motorThrusts as any) || [0, 0, 0, 0];
      const dirs = [1, -1, -1, 1];
      for (let i = 0; i < 4; i++) {
        const t = thrusts[i] ?? 0;
        const idle = isRunning ? 0.18 : 0;
        const spin = isRunning ? t * 0.32 : 0;
        propAngleRef.current[i] += dirs[i] * (idle + spin);
      }

      ctx.save();
      ctx.translate(dx, dz);
      ctx.rotate(-yaw); // display yaw is around Y, top-down rotation inverse

      // Body - white shell, same proportions as 3D
      ctx.fillStyle = '#eef2f7';
      ctx.strokeStyle = '#c8cdd8';
      ctx.lineWidth = 1;
      const bodyL = 0.30 * scale;
      const bodyW = 0.14 * scale;
      // chamfered rect
      const cham = 0.04 * scale;
      ctx.beginPath();
      ctx.moveTo(bodyL / 2, bodyW / 2 - cham);
      ctx.lineTo(bodyL / 2 - cham, bodyW / 2);
      ctx.lineTo(-bodyL / 2 + cham * 0.8, bodyW / 2);
      ctx.lineTo(-bodyL / 2, bodyW / 2 - cham * 0.8);
      ctx.lineTo(-bodyL / 2, -bodyW / 2 + cham * 0.8);
      ctx.lineTo(-bodyL / 2 + cham * 0.8, -bodyW / 2);
      ctx.lineTo(bodyL / 2 - cham, -bodyW / 2);
      ctx.lineTo(bodyL / 2, -bodyW / 2 + cham);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Arms - 4 diagonal
      const armOffsets: [number, number][] = [
        [0.205, -0.205],
        [0.205, 0.205],
        [-0.195, -0.205],
        [-0.195, 0.205],
      ];
      ctx.strokeStyle = '#0f1218';
      ctx.lineWidth = 3;
      armOffsets.forEach(([ax, az]) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ax * scale, az * scale);
        ctx.stroke();
        // truss cutouts hint
        ctx.strokeStyle = 'rgba(5,7,10,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ax * scale * 0.3 - 8, az * scale * 0.3 - 3, 16, 6);
        ctx.strokeStyle = '#0f1218';
        ctx.lineWidth = 3;
      });

      // Motors + propellers
      armOffsets.forEach(([ax, az], i) => {
        const mx = ax * scale;
        const mz = az * scale;
        // motor housing
        ctx.fillStyle = '#0a0c10';
        ctx.beginPath();
        ctx.arc(mx, mz, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c8ced6';
        ctx.beginPath();
        ctx.arc(mx, mz, 5, 0, Math.PI * 2);
        ctx.fill();
        // red ring
        ctx.strokeStyle = '#cc1a1a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, mz, 7, 0, Math.PI * 2);
        ctx.stroke();
        // propeller - 2 blades opposite, elongated
        const ang = propAngleRef.current[i];
        ctx.save();
        ctx.translate(mx, mz);
        ctx.rotate(ang);
        ctx.fillStyle = '#0d0f14';
        // blade 1
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5, 22, 0, 0, Math.PI * 2);
        // Instead draw two blades as rotated rects
        ctx.fillRect(-2, -22, 4, 44);
        // hub
        ctx.fillStyle = '#0a0a0d';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // blur when spinning fast
        if (isRunning && (thrusts[i] ?? 0) > 0.5) {
          ctx.fillStyle = 'rgba(26,29,36,0.08)';
          ctx.beginPath();
          ctx.arc(mx, mz, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Front indicator (camera)
      ctx.fillStyle = '#0f1116';
      ctx.fillRect(bodyL / 2 - 2, -6, 4, 12);
      ctx.fillStyle = '#7de2ff';
      ctx.fillRect(bodyL / 2 + 1, -5, 2, 4);
      ctx.fillRect(bodyL / 2 + 1, 1, 2, 4);

      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    }, [drone, target, isRunning, showTarget, showGrid, showAxes, scale, cx, cy]);

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [drone, target, isRunning, showTarget, showGrid, showAxes]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(255,255,255,0.92)', padding: '6px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: 10, border: '1px solid #d7dce6' }}>
        2D fallback — Y is up, same simulation state
      </div>
    </div>
  );
}