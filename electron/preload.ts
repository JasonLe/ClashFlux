import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  toggleDevTools: () => ipcRenderer.send('toggle-devtools'),
  openTerminal: () => ipcRenderer.send('open-terminal'),
  openProfileFolder: () => ipcRenderer.send('open-profile-folder'),
  
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfiles: (profiles: any[]) => ipcRenderer.invoke('save-profiles', profiles),
  downloadProfile: (url: string, id: string) => ipcRenderer.invoke('download-profile', { url, id }),
  getHistoryStats: () => ipcRenderer.invoke('get-history-stats'),
  getRecentLogs: () => ipcRenderer.invoke('get-recent-logs'),
  setSystemProxy: (enable: boolean) => ipcRenderer.invoke('set-system-proxy', enable),
  getSystemProxyStatus: () => ipcRenderer.invoke('get-system-proxy-status'),
  refreshTray: () => ipcRenderer.send('refresh-tray'),
  
  // === 新增 ===
  selectProxy: (group: string, node: string) => ipcRenderer.invoke('select-proxy', { group, node }),
  
  onClashUpdate: (callback: () => void) => {
    ipcRenderer.on('clash-state-update', () => callback());
  },
  
  platform: process.platform,
})