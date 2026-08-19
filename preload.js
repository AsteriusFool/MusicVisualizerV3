'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposes a safe, typed API bridge to the renderer process.
 * Only the listed methods are accessible via window.electronAPI.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** Returns desktop capture sources for system audio loopback. */
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  /** Frameless window chrome controls. */
  windowMinimize:         () => ipcRenderer.invoke('window-minimize'),
  windowMaximize:         () => ipcRenderer.invoke('window-maximize'),
  windowClose:            () => ipcRenderer.invoke('window-close'),
  windowFullscreenToggle: () => ipcRenderer.invoke('window-fullscreen-toggle'),

  /** Current OS ('win32' | 'darwin' | 'linux'). */
  platform: process.platform,
});
