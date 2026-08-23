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
  canvas.width = 1;
  canvas.height = 1;

  const attrs: WebGLContextAttributes = {
    antialias: true,
    alpha: true,
    depth: true,
    stencil: false,
    powerPreference: 'default',
  };

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let version: string | null = null;

  try {
    gl = canvas.getContext('webgl2', attrs) as WebGL2RenderingContext | null;
    if (gl) {
      version = 'WebGL 2';
    } else {
      gl = canvas.getContext('webgl', attrs) as WebGLRenderingContext | null;
      if (gl) {
        version = 'WebGL 1';
      } else {
        gl = canvas.getContext('experimental-webgl', attrs) as WebGLRenderingContext | null;
        if (gl) version = 'WebGL 1 (experimental)';
      }
    }
  } catch (e) {
    cachedResult = { available: false, version: null, vendor: null, renderer: null, error: String(e) };
    return cachedResult;
  }

  if (!gl) {
    cachedResult = { available: false, version: null, vendor: null, renderer: null, error: 'Context is null' };
    return cachedResult;
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const glVersion = gl.getParameter(gl.VERSION);
  const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null;
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null;

  // Release the context immediately to free the GPU context slot for R3F/THREE
  try {
    const loseCtx = gl.getExtension('WEBGL_lose_context');
    if (loseCtx) loseCtx.loseContext();
  } catch {}

  // Null out references so GC can collect
  gl = null;

  cachedResult = { available: true, version: version ?? glVersion, vendor, renderer, error: null };
  return cachedResult;
}
