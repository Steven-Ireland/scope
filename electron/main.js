const { app, BrowserWindow } = require('electron');
const path = require('path');
const serve = require('electron-serve');
require('./server'); // Start Express server

const loadURL = serve({ directory: path.join(__dirname, '../dist') });

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#000000',
  });

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173'); // Vite default port
  } else {
    loadURL(win);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
