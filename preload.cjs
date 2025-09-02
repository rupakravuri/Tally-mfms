const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // MongoDB API
  mongo: {
    loadConfig: () => ipcRenderer.invoke('mongo-load-config'),
    saveConfig: (config) => ipcRenderer.invoke('mongo-save-config', config),
    testConnection: (config) => ipcRenderer.invoke('mongo-test-connection', config),
    connect: () => ipcRenderer.invoke('mongo-connect'),
    disconnect: () => ipcRenderer.invoke('mongo-disconnect'),
    insertDocument: (document, collectionName) => ipcRenderer.invoke('mongo-insert-document', document, collectionName),
    updateDocument: (filter, update, collectionName, upsert) => ipcRenderer.invoke('mongo-update-document', filter, update, collectionName, upsert),
    findDocument: (filter, collectionName) => ipcRenderer.invoke('mongo-find-document', filter, collectionName),
    findDocuments: (filter, collectionName) => ipcRenderer.invoke('mongo-find-documents', filter, collectionName),
    bulkUpsert: (documents, collectionName) => ipcRenderer.invoke('mongo-bulk-upsert', documents, collectionName),
    getCollectionStats: (collectionName) => ipcRenderer.invoke('mongo-get-collection-stats', collectionName)
  }
});

// Expose Node.js version info (optional)
contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
});