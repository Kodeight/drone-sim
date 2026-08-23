'use client';

import dynamic from 'next/dynamic';
import { useSimulation } from '@/hooks/useSimulation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboard';
import { useSimulationStore } from '@/store/simulationStore';
import ControlPanel from '@/components/panels/ControlPanel';
import PIDController from '@/components/panels/PIDController';
import DisturbanceControls from '@/components/panels/DisturbanceControls';
import TelemetryDisplay from '@/components/panels/TelemetryDisplay';
import MotorDisplay from '@/components/panels/MotorDisplay';

const Scene = dynamic(() => import('@/components/3d/Scene'), { ssr: false });
const OverviewCharts = dynamic(() => import('@/components/charts/SimulationCharts').then(m => m.OverviewCharts), { ssr: false });
const FullCharts = dynamic(() => import('@/components/charts/SimulationCharts').then(m => m.FullCharts), { ssr: false });

export default function DroneSimulator() {
  useSimulation();
  useKeyboardShortcuts();

  const isRunning = useSimulationStore((s) => s.isRunning);
  const toggleSimulation = useSimulationStore((s) => s.toggleSimulation);
  const resetSimulation = useSimulationStore((s) => s.resetSimulation);
  const exportCSV = useSimulationStore((s) => s.exportCSV);
  const speed = useSimulationStore((s) => s.speed);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const status = useSimulationStore((s) => s.status);
  const time = useSimulationStore((s) => s.time);
  const activeTab = useSimulationStore((s) => s.activeTab);
  const setActiveTab = useSimulationStore((s) => s.setActiveTab);

  const statusColor: Record<string, string> = {
    STOPPED: 'text-gray-400',
    PAUSED: 'text-warning',
    TRACKING: 'text-warning',
    ON_TARGET: 'text-success',
  };

  return (
    <div className="h-screen flex flex-col bg-[#f4f6fb] overflow-hidden select-none">
      {/* ===== HEADER BAR ===== */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-b border-border">
        <span className="text-sm font-bold text-gray-800 whitespace-nowrap">DRONE CONTROL CENTER</span>

        <div className="w-px h-5 bg-border" />

        <button
          onClick={toggleSimulation}
          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
            isRunning
              ? 'bg-warning text-white hover:bg-amber-600'
              : 'bg-success text-white hover:bg-green-600'
          }`}
        >
          {isRunning ? 'PAUSE' : 'START'}
        </button>
        <button
          onClick={resetSimulation}
          className="px-3 py-1 rounded text-xs font-bold bg-white border border-border hover:bg-gray-100 text-gray-700"
        >
          RESET
        </button>
        <button
          onClick={exportCSV}
          className="px-3 py-1 rounded text-xs font-bold bg-white border border-border hover:bg-gray-100 text-gray-700"
        >
          SAVE CSV
        </button>

        <div className="w-px h-5 bg-border" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Speed</span>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-20 h-1"
          />
          <span className="text-xs font-mono text-gray-500 w-7">{speed.toFixed(1)}x</span>
        </div>

        <div className="flex-1" />

        <span className={`text-xs font-bold ${statusColor[status]}`}>{status}</span>
        <span className="text-xs text-gray-400 font-mono">t={time.toFixed(1)}s</span>
      </header>

      {/* ===== BODY ===== */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ----- LEFT PANEL ----- */}
        <aside className="w-[360px] shrink-0 border-r border-border bg-white overflow-y-auto">
          <div className="p-3 space-y-3">
            <ControlPanel />
            <PIDController />
            <DisturbanceControls />
            <TelemetryDisplay />
          </div>
        </aside>

        {/* ----- RIGHT PANEL ----- */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div className="shrink-0 flex border-b border-border bg-white">
            {(['overview', 'graphs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  activeTab === tab
                    ? 'text-accent2 border-b-2 border-accent2'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab === 'overview' ? 'Overview' : 'Graphs'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'overview' ? (
              <div className="h-full flex">
                {/* 3D View */}
                <div className="flex-[1.2] flex flex-col min-w-0 border-r border-border">
                  <div className="px-2 pt-2 pb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase">3D Drone View</span>
                  </div>
                  <div className="flex-1 mx-2 mb-2 rounded-lg overflow-hidden border border-border">
                    <Scene />
                  </div>
                </div>

                {/* Right column: charts + motors */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  <div className="px-3 pt-2 pb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase">System Response</span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-1">
                    <OverviewCharts />
                  </div>
                  <div className="shrink-0 px-3 pb-2">
                    <MotorDisplay />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-3">
                <span className="text-xs font-bold text-gray-400 uppercase block mb-2">
                  System Response &mdash; Detailed View
                </span>
                <FullCharts />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
