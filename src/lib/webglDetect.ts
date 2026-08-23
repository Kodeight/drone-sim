'use client';

export interface WebGLInfo {
  available: boolean;
  version: string | null;
  vendor: string | null;
  renderer: string | null;
  error: string | null;
}

let cachedResult: WebGLInfo | null = null;

export function detectWebGL(): WebGLInfo {
  if (cachedResult) return cachedResult;

  if (typeof window === 'undefined') {
    cachedResult = { available: false, version: null, vendor: null, renderer: null, error: 'Not in browser' };
    return cachedResult;
  }

  const canvas = document.createElement('canvas');
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;

  try {
    gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  } catch {
    cachedResult = { available: false, version: null, vendor: null, renderer: null, error: 'Context creation threw' };
    return cachedResult;
  }

  if (!gl) {
    cachedResult = { available: false, version: null, vendor: null, renderer: null, error: 'Context is null' };
    return cachedResult;
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const version = gl.getParameter(gl.VERSION);
  const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null;
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null;

  cachedResult = { available: true, version, vendor, renderer, error: null };
  return cachedResult;
}
