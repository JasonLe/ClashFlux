/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    
    getProfiles: () => Promise<any[]>;
    saveProfiles: (profiles: any[]) => Promise<boolean>;
    downloadProfile: (url: string, id: string) => Promise<{ success: boolean; path: string }>;
    
    toggleDevTools: () => void;
    openTerminal: () => void;
    openProfileFolder: () => void;
    
    getHistoryStats: () => Promise<Record<string, any>>;
    getRecentLogs: () => Promise<any[]>;
    
    setSystemProxy: (enable: boolean) => Promise<boolean>;
    getSystemProxyStatus: () => Promise<boolean>;
    refreshTray: () => void;
    
    // === 新增 ===
    selectProxy: (group: string, node: string) => Promise<boolean>;
    
    onClashUpdate: (callback: () => void) => void;
    platform: string;
  }
}