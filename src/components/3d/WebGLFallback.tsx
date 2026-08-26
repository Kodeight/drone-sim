'use client';

import { useEffect, useState } from 'react';
import { detectWebGL, type WebGLInfo } from '@/lib/webglDetect';

export default function WebGLFallback() {
  const [info, setInfo] = useState<WebGLInfo | null>(null);

  useEffect(() => {
    setInfo(detectWebGL());
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'var(--bg-app)' }}>
      <div className="w-14 h-14 mb-4 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
        <svg className="w-7 h-7" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>

      <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        3D VIEW UNAVAILABLE
      </h3>

      <p className="text-xs mb-3 max-w-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        Your system could not initialize WebGL.
      </p>

      {info && (
        <div className="text-[10px] space-y-1 mb-4 font-mono max-w-xs"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' }}>
          {info.renderer && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Graphics:</span>
              <span style={{ color: 'var(--text-primary)' }}>{info.renderer}</span>
            </div>
          )}
          {info.vendor && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Vendor:</span>
              <span style={{ color: 'var(--text-primary)' }}>{info.vendor}</span>
            </div>
          )}
          {info.version && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>WebGL:</span>
              <span style={{ color: 'var(--text-primary)' }}>{info.version}</span>
            </div>
          )}
          {info.error && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Error:</span>
              <span style={{ color: '#ef4444' }}>{info.error}</span>
            </div>
          )}
        </div>
      )}

      <p className="text-xs mb-3 max-w-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        The simulator controls, parameters, telemetry and other functionality remain available.
      </p>

      <div className="text-[10px] max-w-sm text-left space-y-1" style={{ color: 'var(--text-muted)' }}>
        <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Possible solutions:</p>
        <p>&bull; Update your graphics driver</p>
        <p>&bull; Run the application on a newer GPU</p>
        <p>&bull; Check Electron graphics compatibility</p>
        <p>&bull; Try launching with: <code className="font-mono" style={{ color: 'var(--accent)' }}>electron . --use-angle=warp</code></p>
      </div>
    </div>
  );
}
