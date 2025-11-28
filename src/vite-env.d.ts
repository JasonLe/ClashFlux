/// <reference types="vite/client" />

interface Profile {
    id: string;
    name: string;
    url: string;
    updatedAt: string;
}

interface Window {
    electronAPI: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        getProfiles: () => Promise<Profile[]>;
        saveProfiles: (profiles: Profile[]) => Promise<boolean>;
        downloadProfile: (url: string, id: string) => Promise<{ success: boolean; path: string }>;
        toggleDevTools: () => void;
        openTerminal: () => void;
        getClashSecret: () => Promise<string>;
        platform: string;
        openProfileFolder: () => void;
    }
}