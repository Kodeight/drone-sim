'use client';

import { useEffect } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

/**
 * Initialises theme from localStorage / OS preference,
 * and keeps the <html> element's class in sync with the store.
 */
export function useTheme() {
  const theme    = useSimulationStore((s) => s.theme);
  const setTheme = useSimulationStore((s) => s.setTheme);

  // On mount: read persisted theme or fall back to OS preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('drone-sim-theme') as 'dark' | 'light' | null;
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
    } else {
      // OS preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply class to <html> whenever theme changes + persist
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    try {
      localStorage.setItem('drone-sim-theme', theme);
    } catch { /* storage blocked */ }
  }, [theme]);

  return theme;
}
