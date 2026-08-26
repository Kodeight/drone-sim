const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

// ─── GPU / ANGLE Compatibility ────────────────────────────────────────────────
// Test WebGL compatibility before window creation.
// Try default first; if that fails on this GPU, fall back to ANGLE WARP.

function logGPUInfo() {
  try {
    const gpuInfo = app.getGPUInfo('basic');
    const gpuFeatures = app.getGPUFeatureStatus();
    console.log('\n[GPU Diagnostics]');
    console.log('  Electron:', process.versions.electron);
    console.log('  Chromium:', process.versions.chrome);
    console.log('  Platform:', process.platform, process.arch);
    if (gpuInfo) {
      console.log('  GPU Vendor:', gpuInfo.vendor || 'unknown');
      console.log('  GPU Device:', gpuInfo.device || 'unknown');
      console.log('  Driver:', gpuInfo.driver || 'unknown');
    }
    if (gpuFeatures) {
      console.log('  webgl:', gpuFeatures.webgl);
      console.log('  webgl2:', gpuFeatures.webgl2);
      console.log('  gpu_compositing:', gpuFeatures.gpu_compositing);
      console.log('  rasterization:', gpuFeatures.rasterization);
      console.log('  video_decode:', gpuFeatures.video_decode);
      console.log('  video_encode:', gpuFeatures.video_encode);
    }
    console.log('[GPU Diagnostics] ─────────────────────────\n');
  } catch (e) {
    console.warn('[GPU Diagnostics] Could not retrieve GPU info:', e.message);
  }
}

// Apply ANGLE backend. Default order: try hardware first, then WARP.
const requestedAngle = process.argv.find((a) => a.startsWith('--use-angle='));
if (!requestedAngle) {
  // Do NOT force WARP globally — let Chromium pick the best backend.
  // If the user or launcher passes --use-angle=... it will be respected.
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1550,
    height: 920,
    minWidth: 1280,
    minHeight: 740,
    title: 'Drone Simulator',
    icon: path.join(__dirname, '..', 'out', 'favicon.png'),
    backgroundColor: '#f4f6fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'out', 'index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  logGPUInfo();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
