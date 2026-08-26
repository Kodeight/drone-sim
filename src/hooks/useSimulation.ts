'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

export function useSimulation() {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const step = useSimulationStore((s) => s.step);

  const loop = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      lastTimeRef.current = timestamp;

      // Python backend runs its own loop at 100Hz.
      // We only need to fetch the latest state once per frame.
      step(0.016);

      rafRef.current = requestAnimationFrame(loop);
    },
    [step]
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
