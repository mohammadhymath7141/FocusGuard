import { app, BrowserWindow, Notification, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { activeWindow } from 'active-win';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow, overlayWindow;
let distractionSeconds = 0;
let productiveSeconds = 0;
let isLocked = false;
let hourStart = Date.now();

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:3000');
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 600,
    height: 300,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    skipTaskbar: true,
    focusable: false,
    backgroundColor: '#000000',
    show: false,
  });

  overlayWindow.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(`
        <html>
          <body style="margin:0;display:flex;align-items:center;justify-content:center;background:#000;color:white;font-family:sans-serif;font-size:20px;">
            <div>🚫 FocusGuard Alert:<br>You've hit 10+ minutes of distraction.<br>Please refocus.</div>
          </body>
        </html>`)
  );

  overlayWindow.once('ready-to-show', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    overlayWindow.setBounds({
      x: Math.floor((width - 1200) / 2),
      y: Math.floor((height - 850) / 2),
      width: 1200,
      height: 850,
    });
  });
}

async function monitorActivity() {
  try {
    const active = await activeWindow();
    const title = active?.title || '';
    const process = active?.owner?.name || '';
    const filePath = active?.owner?.path || '';

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('active-window-info', {
        title,
        process,
        path: filePath,
      });
      mainWindow.webContents.send('activity-tick');
    }

    // Only continue if window is alive
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const prediction = await mainWindow.webContents.executeJavaScript(
      `window.predictApp(${JSON.stringify(title + ' ' + process)})`
    );

    const now = Date.now();

    // ✨ Reset every hour (without saving anything)
    if (now - hourStart > 60 * 60 * 1000) {
      distractionSeconds = 0;
      productiveSeconds = 0;
      isLocked = false;
      hourStart = now;
      if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
    }

    // Update timers and control overlay
    if (prediction === 'distracting') {
      distractionSeconds += 2;

      if (distractionSeconds > 600 && !isLocked) {
        isLocked = true;
        new Notification({
          title: 'FocusGuard',
          body: "You've been distracted for over 10 minutes. Refocus now!",
        }).show();

        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.show();
        }
      }
    } else {
      productiveSeconds += 2;

      if (productiveSeconds > 3300) {
        new Notification({
          title: 'FocusGuard',
          body: '✅ Great job! You’ve focused for 55 minutes. Take a 5–10 min break.',
        }).show();
      }

      if (isLocked && overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
        isLocked = false;
      }
    }
  } catch (err) {
    console.error('monitorActivity error:', err.message);
  }
}

app.whenReady().then(() => {
  createMainWindow();
  createOverlayWindow();
  setInterval(monitorActivity, 2000); // check every 2 seconds
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
