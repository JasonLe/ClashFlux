"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => electron.ipcRenderer.send("window-min"),
  maximize: () => electron.ipcRenderer.send("window-max"),
  close: () => electron.ipcRenderer.send("window-close"),
  toggleDevTools: () => electron.ipcRenderer.send("toggle-devtools"),
  openTerminal: () => electron.ipcRenderer.send("open-terminal"),
  openProfileFolder: () => electron.ipcRenderer.send("open-profile-folder"),
  getProfiles: () => electron.ipcRenderer.invoke("get-profiles"),
  saveProfiles: (profiles) => electron.ipcRenderer.invoke("save-profiles", profiles),
  downloadProfile: (url, id) => electron.ipcRenderer.invoke("download-profile", { url, id }),
  getHistoryStats: () => electron.ipcRenderer.invoke("get-history-stats"),
  getRecentLogs: () => electron.ipcRenderer.invoke("get-recent-logs"),
  setSystemProxy: (enable) => electron.ipcRenderer.invoke("set-system-proxy", enable),
  getSystemProxyStatus: () => electron.ipcRenderer.invoke("get-system-proxy-status"),
  refreshTray: () => electron.ipcRenderer.send("refresh-tray"),
  // === 新增 ===
  selectProxy: (group, node) => electron.ipcRenderer.invoke("select-proxy", { group, node }),
  onClashUpdate: (callback) => {
    electron.ipcRenderer.on("clash-state-update", () => callback());
  },
  platform: process.platform
});
