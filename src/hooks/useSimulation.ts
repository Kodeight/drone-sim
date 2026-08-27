'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

export function useSimulation() {
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef(false);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const step = useSimulationStore((s) => s.step);

  // Single-flight polling: wait for response before next request
  const fetchState = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    try {
      await step(0.016);
    } finally {
      pendingRef.current = false;
    }
  }, [step]);

  const loop = useCallback(
    (timestamp: number) => {
      // Poll at ~30Hz (33ms) - single flight
      fetchState();
      rafRef.current = requestAnimationFrame(loop);
    },
    [fetchState]
  );

  useEffect(() => {
    if (isRunning) {
      pendingRef.current = false;
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
        rafRef.current = null;
      }
    };
  }, [isRunning, loop]);
}