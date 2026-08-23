'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSimulation } from '@/hooks/useSimulation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboard';
import { useSimulationStore } from '@/store/simulationStore';
import { useTheme } from '@/hooks/useTheme';

// Layout & Navigation Components
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

// Panels
import FlightStatus from '@/components/panels/FlightStatus';
import ParametersPanel from '@/components/panels/ParametersPanel';
import MotorThrustVisual from '@/components/panels/MotorThrustVisual';
import QuickControls from '@/components/panels/QuickControls';
import TelemetryPlots from '@/components/panels/TelemetryPlots';
import ViewportControls from '@/components/panels/ViewportControls';

// Pages
import LogsPage from '@/components/pages/LogsPage';
import PresetsPage from '@/components/pages/PresetsPage';
import SettingsPage from '@/components/pages/SettingsPage';
import HelpPage from '@/components/pages/HelpPage';
import AboutPage from '@/components/pages/AboutPage';

// Dynamically import Scene to avoid SSR issues
const Scene = dynamic(() => import('@/components/3d/Scene'), { ssr: false });

export default function DroneSimulator() {
  // Activate simulation physics loop, keyboard shortcuts, and theme hook
  useSimulation();
  useKeyboardShortcuts();
  useTheme();

  const activePage = useSimulationStore((s) => s.activePage);
  const sceneRef = useRef<{ fitCamera: () => void } | null>(null);

  const handleFitCamera = () => {
    sceneRef.current?.fitCamera();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden select-none" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* HEADER BAR */}
      <Header />

      {/* BODY AREA */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT SIDEBAR NAV */}
        <Sidebar />

        {/* MAIN WORKSPACE CONTENT */}
        <main className="flex-1 flex min-w-0 overflow-hidden">
          {activePage === 'dashboard' && (
            <div className="flex-1 flex overflow-hidden min-w-0">
              {/* Left Column: 3D view + visual plots */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* 3D View Area */}
                <div className="flex-1 flex flex-col min-h-0 relative border-b border-border">
                  <ViewportControls onFit={handleFitCamera} />
                  <div className="flex-1 relative min-h-0">
                    <Scene ref={sceneRef} />
                  </div>
                </div>

                {/* Bottom Plots Strip */}
                <div style={{ height: 260, minHeight: 200, maxHeight: 350, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <TelemetryPlots />
                </div>

                {/* Quick Controls Bar */}
                <QuickControls />
              </div>

              {/* Parameters Panel on the Right */}
              <ParametersPanel />
            </div>
          )}

          {activePage === '3dview' && (
            <div className="flex-1 flex flex-col min-w-0 h-full relative">
              <ViewportControls onFit={handleFitCamera} />
              <div className="flex-1 relative">
                <Scene ref={sceneRef} />
              </div>
              <QuickControls />
            </div>
          )}

          {activePage === 'parameters' && (
            <div className="flex-1 flex overflow-hidden min-w-0 h-full">
              <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-secondary">
                <span className="text-xl font-bold mb-2">Adjust Parameters in Sidebar</span>
                <span className="text-sm text-muted">Use the sidebar parameters drawer in the main Dashboard tab or tune them directly.</span>
              </div>
              <ParametersPanel />
            </div>
          )}

          {activePage === 'pid' && (
            <div className="flex-1 flex overflow-hidden min-w-0 h-full">
              <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-secondary">
                <span className="text-xl font-bold mb-2">Tuning Controller Coefficients</span>
                <span className="text-sm text-muted">Select Preset or adjust individual axis gains directly in the Parameters Drawer.</span>
              </div>
              <ParametersPanel />
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

          {/* Fallback settings pages */}
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
