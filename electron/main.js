const { app, BrowserWindow, session } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

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
    console.log('[GPU Diagnostics] -------------------------\n');
  } catch (e) {
    console.warn('[GPU Diagnostics] Could not retrieve GPU info:', e.message);
  }
}

const requestedAngle = process.argv.find(function (a) {
  return a.startsWith('--use-angle=');
});

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

  mainWindow.once('ready-to-show', function () {
    mainWindow.show();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

var spawn = require('child_process').spawn;

var pythonProcess = null;

function startPythonBackend() {
  pythonProcess = spawn('python', ['Drone_simulator_PID2.py', '--backend'], {
    cwd: path.join(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  pythonProcess.stdout.on('data', function (data) {
    console.log('[Python Backend]', data.toString());
  });

  pythonProcess.stderr.on('data', function (data) {
    console.error('[Python Backend Error]', data.toString());
  });

  pythonProcess.on('close', function (code) {
    console.log('[Python Backend exited with code ' + code + ']');
    pythonProcess = null;
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

app.whenReady().then(function () {
  startPythonBackend();

  var CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' http://127.0.0.1:8765 http://localhost:8765",
    "worker-src 'self' blob:",
  ].join('; ');

  session.defaultSession.webRequest.onBeforeRequest(function (details, callback) {
    var url = details.url;
    var fontsIdx = url.indexOf('/fonts/');
    if (fontsIdx !== -1 && url.indexOf('file:///') === 0) {
      var fontsPath = url.substring(fontsIdx);
      var correctPath = 'file://' + path.join(__dirname, '..', 'out', fontsPath).split('\\').join('/');
      callback({ redirectURL: correctPath });
      return;
    }
    callback({});
  });

  session.defaultSession.webRequest.onHeadersReceived(function (details, callback) {
    callback({
      responseHeaders: Object.assign({}, details.responseHeaders, {
        'Content-Security-Policy': [CSP],
      }),
    });
  });

  logGPUInfo();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', function () {
  stopPythonBackend();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
