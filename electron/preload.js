const { contextBridge, ipcRenderer } = require('electron');

// Simple dummy ML model for distraction prediction
function simplePredict(text) {
  const lower = text.toLowerCase();
  if (
    lower.includes('youtube') ||
    lower.includes('game') ||
    lower.includes('netflix') ||
    lower.includes('discord') ||
    lower.includes('instagram') ||
    lower.includes('whatsapp')
  ) {
    return 'distracting';
  }
  return 'productive';
}

// ✅ Expose ML prediction function in the frontend
contextBridge.exposeInMainWorld('predictApp', (text) => {
  return simplePredict(text);
});

// ✅ Expose ipcRenderer methods in the frontend
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    // Send message to main process
    send: (channel, data) => ipcRenderer.send(channel, data),

    // Listen for messages from main process
    on: (channel, func) => ipcRenderer.on(channel, (_event, ...args) => func(...args)),

    // 🔥 Invoke async calls to main process (used by WeeklyReport)
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  },
});
