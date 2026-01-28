const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const serve = require('electron-serve');
require('./server'); // Start Express server

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

ipcMain.handle('save-config', async (event, config) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Failed to save config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-config', async () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Failed to load config:', error);
    return null;
  }
});

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
