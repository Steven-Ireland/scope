const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  search: (params) => ipcRenderer.invoke('search', params),
  getIndices: () => ipcRenderer.invoke('get-indices'),
  getFields: (index) => ipcRenderer.invoke('get-fields', index),
  getValues: (params) => ipcRenderer.invoke('get-values', params),
});