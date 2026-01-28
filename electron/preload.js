// Preload script is currently empty as frontend uses Express server over HTTP
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
});
