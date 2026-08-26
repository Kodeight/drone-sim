'use client';

import { useState } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { PID_PRESETS } from '@/lib/simulation/types';

export default function PresetsPage() {
  const presets     = useSimulationStore((s) => s.presets);
  const savePreset  = useSimulationStore((s) => s.savePreset);
  const loadPreset  = useSimulationStore((s) => s.loadPreset);
  const deletePreset = useSimulationStore((s) => s.deletePreset);
  const applyPreset = useSimulationStore((s) => s.applyPreset);
  const [newName, setNewName] = useState('');

  const handleSave = () => {
    if (!newName.trim()) return;
    savePreset(newName.trim());
    setNewName('');
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Presets</span>

      {/* Save new preset */}
      <div style={cardStyle}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          Save Current Configuration
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Preset name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            style={{
              flex: 1, padding: '6px 10px', fontSize: 12,
              background: 'var(--bg-panel)', border: '1px solid var(--border)',
              borderRadius: 5, color: 'var(--text-primary)', outline: 'none',
            }}
          />
          <button
            onClick={handleSave}
            disabled={!newName.trim()}
            className="btn btn-primary btn-sm"
            style={{ opacity: newName.trim() ? 1 : 0.4 }}
          >
            Save
          </button>
        </div>
      </div>

      {/* Built-in presets */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Built-in PID Presets
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(PID_PRESETS).map(([name, preset]) => (
            <div key={name} style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  Z: Kp={preset.Z.kp} Ki={preset.Z.ki} Kd={preset.Z.kd} · Roll: Kp={preset.Roll.kp}
                </div>
              </div>
              <button
                onClick={() => applyPreset(preset as any)}
                className="btn btn-primary btn-sm"
                style={{ padding: '4px 12px', fontSize: 11 }}
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* User presets */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Saved Presets ({presets.length})
        </div>
        {presets.length === 0 ? (
          <div style={{
            padding: 24, textAlign: 'center', color: 'var(--text-muted)',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12,
          }}>
            No saved presets yet. Save the current configuration above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {presets.map((preset) => (
              <div key={preset.id} style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{preset.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    Saved {new Date(preset.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => loadPreset(preset.id)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 10px', fontSize: 11 }}
                >
                  Load
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="btn btn-danger btn-sm"
                  style={{ padding: '4px 10px', fontSize: 11 }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
