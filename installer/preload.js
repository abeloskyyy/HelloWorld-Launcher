/**
 * installer/preload.js
 * Secure IPC bridge between main process and renderer.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('setup', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),

  // Get startup data (mode, paths, versions, images)
  getStartupInfo: () => ipcRenderer.invoke('get-startup-info'),

  // Open a native directory picker
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // Check if a path is writable
  checkWriteAccess: (p) => ipcRenderer.invoke('check-write-access', p),

  // Execute an operation (install/update/repair/uninstall)
  runOperation: (operation, options) => ipcRenderer.invoke('run-operation', { operation, options }),

  // Listen to operation progress events (returns unsubscribe fn)
  onProgress: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('operation-progress', handler)
    return () => ipcRenderer.removeListener('operation-progress', handler)
  },

  // Open install folder in file manager
  openFolder: (p) => ipcRenderer.invoke('open-folder', p),

  // Re-launch with admin (Windows only)
  relaunchElevated: (mode, installPath) => ipcRenderer.invoke('relaunch-elevated', { mode, installPath }),
})
