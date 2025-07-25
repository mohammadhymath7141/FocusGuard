const { app, BrowserWindow } = require('electron');
const getWindows = require('get-windows');

let mainWindow;

app.whenReady().then(async () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + '/preload.js', // optional
    },
  });

  mainWindow.loadURL('http://localhost:3000'); // or loadFile for local HTML

  const windows = await getWindows();
  console.log('Active windows:', windows);
});
