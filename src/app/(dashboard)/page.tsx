'use client';

import { useSimulation } from '@/hooks/useSimulation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboard';
import { useSimulationStore } from '@/store/simulationStore';
import ControlPanel from '@/components/panels/ControlPanel';
import PIDController from '@/components/panels/PIDController';
import DisturbanceControls from '@/components/panels/DisturbanceControls';
import TelemetryDisplay from '@/components/panels/TelemetryDisplay';
import MotorDisplay from '@/components/panels/MotorDisplay';
import Scene from '@/components/3d/Scene';
import { OverviewCharts, FullCharts } from '@/components/charts/SimulationCharts';

export default function DroneSimulator() {
  useSimulation();
  useKeyboardShortcuts();

  const activeTab = useSimulationStore((s) => s.activeTab);
  const setActiveTab = useSimulationStore((s) => s.setActiveTab);

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white px-4 py-2 flex items-center gap-4 shrink-0">
        <h1 className="text-sm font-bold text-gray-800">🚁 DRONE CONTROL CENTER</h1>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <aside className="w-[380px] min-w-[320px] border-r border-border bg-white overflow-y-auto p-3 space-y-3 shrink-0">
          <ControlPanel />
          <PIDController />
          <DisturbanceControls />
          <TelemetryDisplay />
        </aside>

        {/* Right Panel */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Tabs */}
          <div className="flex border-b border-border bg-white shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-5 py-2 text-sm font-bold transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-accent2 text-accent2'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              🖥 OVERVIEW
            </button>
            <button
              onClick={() => setActiveTab('graphs')}
              className={`px-5 py-2 text-sm font-bold transition-colors ${
                activeTab === 'graphs'
                  ? 'border-b-2 border-accent2 text-accent2'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              📈 GRAPHS
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 flex overflow-hidden">
            {activeTab === 'overview' ? (
              <>
                {/* 3D View */}
                <div className="flex-[1.2] border-r border-border p-2 min-w-0 flex flex-col">
                  <div className="text-xs font-bold text-gray-500 mb-1 shrink-0">3D DRONE VIEW</div>
                  <div className="flex-1 rounded-lg overflow-hidden border border-border min-h-0">
                    <Scene />
                  </div>
                </div>

                {/* Mini charts + motors */}
                <div className="flex-1 flex flex-col overflow-y-auto p-2 min-w-0">
                  <div className="text-xs font-bold text-gray-500 mb-1 shrink-0">SYSTEM RESPONSE</div>
                  <div className="flex-1 overflow-y-auto">
                    <OverviewCharts />
                  </div>
                  <div className="mt-2 shrink-0">
                    <MotorDisplay />
                  </div>
                </div>
              </>
            ) : (
              /* Full Graphs tab */
              <div className="flex-1 overflow-y-auto p-3">
                <div className="text-xs font-bold text-gray-500 mb-2">SYSTEM RESPONSE — DETAILED VIEW</div>
                <FullCharts />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
