'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

const POLL_INTERVAL_MS = 33; // ~30 Hz — decoupled from render loop (Python owns physics timing)

export function useSimulation() {
  const timerRef = useRef<number | null>(null);
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

  useEffect(() => {
    if (isRunning) {
      pendingRef.current = false;
      // Immediate authoritative fetch then interval — fully decoupled from RAF/Three.js
      fetchState();
      const id = window.setInterval(fetchState, POLL_INTERVAL_MS);
      timerRef.current = id as unknown as number;
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current = false;
    }

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current = false;
    };
  }, [isRunning, fetchState]);
}