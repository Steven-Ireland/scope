// Preload script is currently empty as frontend uses Express server over HTTP
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isElectron: true
});
