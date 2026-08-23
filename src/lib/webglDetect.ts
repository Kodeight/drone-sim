'use client';

export interface WebGLInfo {
  available: boolean;
  version: string | null;
  vendor: string | null;
  renderer: string | null;
  error: string | null;
}

export function detectWebGL(): WebGLInfo {
  if (typeof window === 'undefined') {
    return { available: false, version: null, vendor: null, renderer: null, error: 'Not in browser' };
  }

  const canvas = document.createElement('canvas');
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;

  try {
    gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  } catch {
    return { available: false, version: null, vendor: null, renderer: null, error: 'Context creation threw' };
  }

  if (!gl) {
    return { available: false, version: null, vendor: null, renderer: null, error: 'Context is null' };
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const version = gl.getParameter(gl.VERSION);
  const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null;
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null;

  canvas.width = 1;
  canvas.height = 1;
  const testCtx = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!testCtx) {
    return { available: false, version, vendor, renderer, error: 'Secondary context failed' };
  }

  return { available: true, version, vendor, renderer, error: null };
}

export function getElectronInfo(): Record<string, string> {
  const info: Record<string, string> = {};
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    info.electronAPI = 'available';
  }
  if (typeof navigator !== 'undefined') {
    info.userAgent = navigator.userAgent;
  }
  return info;
}
