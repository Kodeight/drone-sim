'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

const POLL_INTERVAL_MS = 33; // ~30 Hz

export function useSimulation() {
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef(false);
  const lastPollRef = useRef(0);
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
      rafRef.current = requestAnimationFrame(loop);
      // Throttle to POLL_INTERVAL_MS and single-flight
      if (timestamp - lastPollRef.current >= POLL_INTERVAL_MS) {
        lastPollRef.current = timestamp;
        fetchState();
      }
    },
    [fetchState]
  );

  useEffect(() => {
    if (isRunning) {
      pendingRef.current = false;
      lastPollRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current = false;
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current = false;
    };
  }, [isRunning, loop]);
}