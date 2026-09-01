'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSimulation } from '@/hooks/useSimulation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboard';
import { useSimulationStore } from '@/store/simulationStore';
import { useTheme } from '@/hooks/useTheme';

// Layout & Navigation Components
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

// Panels
import ParametersPanel from '@/components/panels/ParametersPanel';
import QuickControls from '@/components/panels/QuickControls';
import TelemetryPlots from '@/components/panels/TelemetryPlots';
import ViewportControls from '@/components/panels/ViewportControls';
import PIDController from '@/components/panels/PIDController';
import TargetControls from '@/components/panels/TargetControls';

// Pages
import ParametersPage from '@/components/pages/ParametersPage';
import LogsPage from '@/components/pages/LogsPage';
import PresetsPage from '@/components/pages/PresetsPage';
import SettingsPage from '@/components/pages/SettingsPage';
import HelpPage from '@/components/pages/HelpPage';
import AboutPage from '@/components/pages/AboutPage';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

// SceneSwitcher auto-chooses normal Scene (high-GPU) or SceneLowGPU (low-GPU) — original Scene untouched
const Scene = dynamic(() => import('@/components/3d/SceneSwitcher'), { ssr: false });

function LoadingFallback() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg-app)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color: 'var(--text-muted)',
    }}>
      Loading 3D scene...
    </div>
  );
}

export default function DroneSimulator() {
  useSimulation();
  useKeyboardShortcuts();
  useTheme();

  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing systems');
  const activePage = useSimulationStore((s) => s.activePage);
  const sceneRef = useRef<{ fitCamera: () => void } | null>(null);

  useEffect(() => {
    const messages = [
      { text: 'Initializing systems', delay: 0 },
      { text: 'Loading drone model', delay: 600 },
      { text: 'Configuring physics engine', delay: 1200 },
      { text: 'Setting up 3D scene', delay: 1800 },
      { text: 'Ready', delay: 2400 },
    ];

    const timers = messages.map((m, i) =>
      setTimeout(() => setLoadingMessage(m.text), m.delay)
    );
    const hideTimer = setTimeout(() => setLoading(false), 2800);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleFitCamera = () => {
    sceneRef.current?.fitCamera();
  };

  if (loading) {
    return <SkeletonLoader message={loadingMessage} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden select-none" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <Header />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar />

        <main className="flex-1 flex min-w-0 overflow-hidden">
          {activePage === 'dashboard' && (
            <div className="flex-1 flex overflow-hidden min-w-0">
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-1 flex flex-col min-h-0 relative border-b border-border">
                  <ViewportControls onFit={handleFitCamera} />
                  <div className="flex-1 relative min-h-0">
                    <Suspense fallback={<LoadingFallback />}>
                      <Scene ref={sceneRef} />
                    </Suspense>
                  </div>
                </div>
                <div style={{ height: 260, minHeight: 200, maxHeight: 350, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <TelemetryPlots />
                </div>
                <QuickControls />
              </div>
              <ParametersPanel />
            </div>
          )}

          {activePage === '3dview' && (
            <div className="flex-1 flex overflow-hidden min-w-0 h-full">
              <div className="flex-1 flex flex-col min-w-0 h-full relative">
                <ViewportControls onFit={handleFitCamera} />
                <div className="flex-1 relative min-h-0">
                  <Suspense fallback={<LoadingFallback />}>
                    <Scene ref={sceneRef} />
                  </Suspense>
                </div>
                <QuickControls />
              </div>
              <TargetControls />
            </div>
          )}

          {activePage === 'parameters' && (
            <div className="flex-1 overflow-hidden h-full">
              <ParametersPage />
            </div>
          )}

          {activePage === 'pid' && (
            <div className="flex-1 overflow-hidden h-full">
              <PIDController />
            </div>
          )}

          {activePage === 'plots' && (
            <div className="flex-1 flex flex-col min-w-0 h-full">
              <div className="flex-1 overflow-hidden">
                <TelemetryPlots />
              </div>
              <QuickControls />
            </div>
          )}

          {activePage === 'logs' && (
            <div className="flex-1 overflow-hidden h-full">
              <LogsPage />
            </div>
          )}

          {activePage === 'presets' && (
            <div className="flex-1 overflow-hidden h-full">
              <PresetsPage />
            </div>
          )}

          {activePage === 'settings' && (
            <div className="flex-1 overflow-hidden h-full">
              <SettingsPage />
            </div>
          )}

          {activePage as string === 'help' && (
            <div className="flex-1 overflow-hidden h-full">
              <HelpPage />
            </div>
          )}

          {activePage as string === 'about' && (
            <div className="flex-1 overflow-hidden h-full">
              <AboutPage />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
