'use client';

import { useEffect, useState } from 'react';
import { detectWebGL, type WebGLInfo } from '@/lib/webglDetect';

export default function WebGLFallback() {
  const [info, setInfo] = useState<WebGLInfo | null>(null);

  useEffect(() => {
    setInfo(detectWebGL());
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#f4f6fb] p-6 text-center">
      <div className="w-14 h-14 mb-4 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
        <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>

      <h3 className="text-sm font-bold text-gray-800 mb-2">3D VIEW UNAVAILABLE</h3>

      <p className="text-xs text-gray-500 mb-3 max-w-sm leading-relaxed">
        WebGL could not be initialized on this computer.
        Your graphics hardware/driver may not support the 3D rendering features required by this simulator.
      </p>
      <p className="text-xs text-gray-500 mb-4 max-w-sm leading-relaxed">
        The simulator controls, parameters, telemetry and other functionality remain available.
      </p>

      {info && (
        <div className="text-[10px] text-gray-400 space-y-0.5 mb-4 font-mono">
          {info.version && <p>WebGL: {info.version}</p>}
          {info.renderer && <p>GPU: {info.renderer}</p>}
          {info.vendor && <p>Vendor: {info.vendor}</p>}
          {info.error && <p className="text-red-400">Error: {info.error}</p>}
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        Try updating your graphics driver or running the application on a computer with newer graphics hardware.
      </p>
    </div>
  );
}
