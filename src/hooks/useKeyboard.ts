'use client';

import { useEffect } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

export function useKeyboardShortcuts() {
  const toggleSimulation = useSimulationStore((s) => s.toggleSimulation);
  const resetSimulation = useSimulationStore((s) => s.resetSimulation);
  const speed = useSimulationStore((s) => s.speed);
  const setSpeed = useSimulationStore((s) => s.setSpeed);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          toggleSimulation();
          break;
        case 'KeyR':
          resetSimulation();
          break;
        case 'Equal':
        case 'NumpadAdd':
          setSpeed(Math.min(5, speed + 0.1));
          break;
        case 'Minus':
        case 'NumpadSubtract':
          setSpeed(Math.max(0.1, speed - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSimulation, resetSimulation, speed, setSpeed]);
}
