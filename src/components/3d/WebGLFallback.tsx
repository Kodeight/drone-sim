'use client';

import { useEffect, useState } from 'react';
import { detectWebGL, type WebGLInfo } from '@/lib/webglDetect';

export default function WebGLFallback() {
  const [info, setInfo] = useState<WebGLInfo | null>(null);

  useEffect(() => {
    setInfo(detectWebGL());
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="w-12 h-12 mb-4 rounded-full bg-amber-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>

      <h3 className="text-sm font-bold text-gray-800 mb-2">3D View Unavailable</h3>
      <p className="text-xs text-gray-500 mb-4 max-w-xs leading-relaxed">
        WebGL could not be initialized on this computer. The simulator controls and telemetry are still available.
      </p>

      {info && (
        <div className="text-[10px] text-gray-400 space-y-1 mb-4">
          {info.version && <p>WebGL: {info.version}</p>}
          {info.renderer && <p>GPU: {info.renderer}</p>}
          {info.vendor && <p>Vendor: {info.vendor}</p>}
          {info.error && <p className="text-red-400">Error: {info.error}</p>}
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        Try updating the graphics driver or enabling hardware acceleration.
      </p>
    </div>
  );
}
