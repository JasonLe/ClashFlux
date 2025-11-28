import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  
  // 开发者工具 & 调试
  toggleDevTools: () => ipcRenderer.send('toggle-devtools'),
  openTerminal: () => ipcRenderer.send('open-terminal'),
  openProfileFolder: () => ipcRenderer.send('open-profile-folder'),

  // 核心数据操作
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfiles: (profiles: any[]) => ipcRenderer.invoke('save-profiles', profiles),
  
  // === 关键修复：下载接口必须存在 ===
  downloadProfile: (url: string, id: string) => ipcRenderer.invoke('download-profile', { url, id }),
  
  // 平台信息
  platform: process.platform,
})