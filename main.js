'use strict';

const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
} = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow = null;
let rendererWatcher = null;
let reloadTimer = null;

function watchRenderer() {
  if (rendererWatcher) return;

  rendererWatcher = fs.watch(
    path.join(__dirname, 'renderer'),
    { recursive: true },
    () => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload();
      }, 120);
    },
  );
}

// ─── Window Creation ──────────────────────────────────────────────────────────

/**
 * Creates the frameless main window.
 * contextIsolation ON; nodeIntegration OFF for security.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Auto-approve media permissions so getUserMedia + desktopCapturer work
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const allowed = ['media', 'audioCapture', 'videoCapture', 'desktopCapture'];
      callback(allowed.includes(permission));
    }
  );

  // Content-Security-Policy — local files only, no eval
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;",
          ],
        },
      });
    }
  );

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    watchRenderer();
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  rendererWatcher?.close();
  clearTimeout(reloadTimer);
});

// ─── IPC: Audio Sources ───────────────────────────────────────────────────────

/**
 * Returns all screen sources from desktopCapturer.
 * On Windows, Chromium/Electron captures WASAPI loopback audio when
 * getUserMedia is called with { chromeMediaSource: 'desktop' }.
 */
ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      fetchWindowIcons: false,
    });
    return sources.map((s) => ({ id: s.id, name: s.name }));
  } catch (err) {
    console.error('[main] desktopCapturer failed:', err.message);
    return [];
  }
});

// ─── IPC: Window Controls ─────────────────────────────────────────────────────

ipcMain.handle('window-minimize', () => mainWindow?.minimize());

ipcMain.handle('window-maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) { mainWindow.unmaximize(); return false; }
  mainWindow.maximize();
  return true;
});

ipcMain.handle('window-close', () => mainWindow?.close());

ipcMain.handle('window-fullscreen-toggle', () => {
  if (!mainWindow) return;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});
