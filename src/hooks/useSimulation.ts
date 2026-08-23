'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

export function useSimulation() {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const speed = useSimulationStore((s) => s.speed);
  const step = useSimulationStore((s) => s.step);

  const loop = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const dt = 0.01;
      const stepsPerFrame = Math.max(1, Math.round(4 * speed));

      for (let i = 0; i < stepsPerFrame; i++) {
        step(dt);
      }

      rafRef.current = requestAnimationFrame(loop);
    },
    [speed, step]
  );

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(loop);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isRunning, loop]);
}
