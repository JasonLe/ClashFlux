import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, clipboard, MenuItemConstructorOptions } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import { spawn, exec, ChildProcess } from 'node:child_process'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import WebSocket from 'ws'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PRELOAD_PATH = path.join(__dirname, 'preload.mjs')

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let kernelProcess: ChildProcess | null = null;
let logWs: WebSocket | null = null;
let statsData: Record<string, any> = {};
const logBuffer: any[] = [];
let cachedSecret = ""; 

const USER_DATA_PATH = app.getPath('userData');
const PROFILES_FILE = path.join(USER_DATA_PATH, 'profiles.json');
const RUNTIME_CONFIG_PATH = path.join(USER_DATA_PATH, 'config.yaml');
const LOGS_DIR = path.join(USER_DATA_PATH, 'logs');
const STATS_FILE = path.join(USER_DATA_PATH, 'stats.json');

const IS_DEV = process.env.VITE_DEV_SERVER_URL !== undefined;
const BIN_PATH = IS_DEV ? path.join(__dirname, '../sidecars') : path.join(process.resourcesPath, 'sidecars');
const EXECUTABLE_NAME = process.platform === 'win32' ? 'mihomo.exe' : 'mihomo';
const KERNEL_BIN = path.join(BIN_PATH, EXECUTABLE_NAME);
const ICON_PATH = IS_DEV ? path.join(__dirname, '../public/icon.png') : path.join(process.resourcesPath, 'icon.png');

const FORCE_CONFIG_APPEND = `
external-controller: 127.0.0.1:9097
secret: ""
bind-address: "*"
mixed-port: 7890
port: 0
socks-port: 0
geodata-mode: true
geox-url:
  geoip: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat"
  geosite: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat"
  mmdb: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb"
`;

// === API 请求封装 ===
const fetchKernel = async (method: string, endpoint: string, body?: any) => {
  try {
    const headers: any = { 'Content-Type': 'application/json' };
    if (cachedSecret) headers['Authorization'] = `Bearer ${cachedSecret}`;
    
    // 增加调试日志
    if (method === 'PUT') console.log(`[KernelReq] ${method} ${endpoint}`, body);

    const res = await fetch(`http://127.0.0.1:9097${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!res.ok) {
        console.error(`[KernelErr] ${res.status} ${res.statusText}`);
        return null;
    }
    
    if (method === 'GET') return await res.json();
    return true; 
  } catch (e) {
    console.error(`[KernelFatal]`, e);
    return null;
  }
};

const notifyRendererUpdate = () => win?.webContents.send('clash-state-update');

const updateTrayMenu = async () => {
  if (!tray) return;
  const [config, proxiesData] = await Promise.all([fetchKernel('GET', '/configs'), fetchKernel('GET', '/proxies')]);
  if (!config || !proxiesData) return;

  const currentMode = config.mode.toLowerCase();
  const currentTun = config.tun?.enable === true;
  const proxies = proxiesData.proxies || {};
  const groups = Object.values(proxies).filter((p: any) => p.type === 'Selector').sort((a: any, b: any) => (a.name === 'GLOBAL' || a.name === 'Proxy' ? -1 : 1));

  const proxyMenu: MenuItemConstructorOptions[] = groups.map((group: any) => ({
    label: group.name,
    submenu: group.all.map((nodeName: string) => ({
      label: nodeName,
      type: 'radio',
      checked: group.now === nodeName,
      click: async () => {
        await fetchKernel('PUT', `/proxies/${encodeURIComponent(group.name)}`, { name: nodeName });
        setTimeout(() => { notifyRendererUpdate(); updateTrayMenu(); }, 500);
      }
    }))
  }));

  const template: MenuItemConstructorOptions[] = [
    { label: '显示主界面', click: () => win?.show() },
    { type: 'separator' },
    { label: '运行模式', submenu: [
        { label: '规则 (Rule)', type: 'radio', checked: currentMode === 'rule', click: () => changeMode('rule') },
        { label: '全局 (Global)', type: 'radio', checked: currentMode === 'global', click: () => changeMode('global') },
        { label: '直连 (Direct)', type: 'radio', checked: currentMode === 'direct', click: () => changeMode('direct') },
    ]},
    { label: '选择节点', submenu: proxyMenu },
    { type: 'separator' },
    { label: '系统代理', type: 'checkbox', checked: global.isSystemProxyEnabled, click: (item) => setSystemProxy(item.checked) },
    { label: 'TUN 模式', type: 'checkbox', checked: currentTun, click: (item) => changeTun(item.checked) },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuiting = true; stopKernel(); app.quit(); } }
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
};

const changeMode = async (mode: string) => { await fetchKernel('PATCH', '/configs', { mode }); notifyRendererUpdate(); updateTrayMenu(); };
const changeTun = async (enable: boolean) => { await fetchKernel('PATCH', '/configs', { tun: { enable } }); notifyRendererUpdate(); updateTrayMenu(); };

declare global { var isSystemProxyEnabled: boolean; }
global.isSystemProxyEnabled = false;

const setSystemProxy = (enable: boolean) => {
  global.isSystemProxyEnabled = enable;
  if (process.platform === 'win32') {
    const val = enable ? 1 : 0;
    exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d ${val} /f`);
    if (enable) exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "127.0.0.1:7890" /f`);
  }
  notifyRendererUpdate(); updateTrayMenu();
};

const startLogRecorder = () => { /* 日志代码略，保持不变 */ };
const startKernel = async () => {
  try { await fs.mkdir(USER_DATA_PATH, { recursive: true }); } catch (e) {}
  try { await fs.access(RUNTIME_CONFIG_PATH, constants.F_OK); } 
  catch { await fs.writeFile(RUNTIME_CONFIG_PATH, FORCE_CONFIG_APPEND); }
  cachedSecret = await getClashSecret();
  kernelProcess = spawn(KERNEL_BIN, ['-d', USER_DATA_PATH], { cwd: USER_DATA_PATH, stdio: 'inherit', windowsHide: true });
};
const stopKernel = () => { setSystemProxy(false); if (kernelProcess) { kernelProcess.kill(); kernelProcess = null; } };
async function getClashSecret() { try { const content = await fs.readFile(RUNTIME_CONFIG_PATH, 'utf-8'); const match = content.match(/secret:\s*["']?([^"'\s]+)["']?/); return match ? match[1] : ''; } catch (e) { return ''; } }

const createTray = () => {
  let icon = nativeImage.createEmpty();
  try { icon = nativeImage.createFromPath(ICON_PATH); } catch (e) {}
  tray = new Tray(icon);
  tray.setToolTip('Clash Flux');
  updateTrayMenu();
  setInterval(updateTrayMenu, 3000); 
  tray.on('double-click', () => win?.isVisible() ? win.hide() : win?.show());
};

// ... Service functions ...
async function ensureConfigFile() { try { await fs.access(PROFILES_FILE); } catch { await fs.writeFile(PROFILES_FILE, JSON.stringify([])); } }
async function readProfiles() { await ensureConfigFile(); const data = await fs.readFile(PROFILES_FILE, 'utf-8'); return JSON.parse(data); }
async function saveProfiles(profiles: any[]) { await ensureConfigFile(); await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2)); return true; }
async function getHistoryStats() { try { await fs.writeFile(STATS_FILE, JSON.stringify(statsData, null, 2)); return statsData; } catch { return {}; } }

const createWindow = () => {
  win = new BrowserWindow({
    width: 1000, height: 720, minWidth: 800, minHeight: 600,
    frame: false, titleBarStyle: 'hidden', icon: ICON_PATH,
    webPreferences: { preload: PRELOAD_PATH, nodeIntegration: false, contextIsolation: true },
  })
  if (process.env.VITE_DEV_SERVER_URL) { win.loadURL(process.env.VITE_DEV_SERVER_URL) } else { win.loadFile('dist/index.html') }
  win.on('close', (e) => { if (!app.isQuiting) { e.preventDefault(); win?.hide(); } });
}

app.whenReady().then(async () => {
  await startKernel();
  createTray();
  ipcMain.handle('get-clash-secret', getClashSecret);
  ipcMain.handle('get-profiles', readProfiles);
  ipcMain.handle('save-profiles', async (_event, profiles) => saveProfiles(profiles));
  ipcMain.handle('get-history-stats', getHistoryStats);
  ipcMain.handle('get-recent-logs', () => logBuffer);
  ipcMain.handle('set-system-proxy', async (_event, enable: boolean) => { setSystemProxy(enable); return true; });
  ipcMain.handle('get-system-proxy-status', () => global.isSystemProxyEnabled);
  ipcMain.on('refresh-tray', () => updateTrayMenu());
  
  // === 核心 IPC: 切换代理 ===
  ipcMain.handle('select-proxy', async (_event, { group, node }) => {
    // 强制打印日志，检查参数是否正确
    console.log(`[IPC:select-proxy] Group: "${group}", Node: "${node}"`);
    
    // 复用 fetchKernel
    const success = await fetchKernel('PUT', `/proxies/${encodeURIComponent(group)}`, { name: node });
    
    if (success) {
        // 延时刷新，确保内核生效
        setTimeout(() => {
            notifyRendererUpdate(); 
            updateTrayMenu();
        }, 300);
        return true;
    } else {
        console.error('[IPC:select-proxy] FAILED');
        throw new Error('Kernel API request failed');
    }
  });

  ipcMain.handle('download-profile', async (_event, { url, id }) => {
    try {
        const profilePath = path.join(USER_DATA_PATH, `${id}.yaml`);
        const res = await fetch(url, { headers: { "User-Agent": "Clash/1.0" } });
        let text = await res.text();
        if (!text.includes('proxies:') && /^[A-Za-z0-9+/=]+$/.test(text.trim())) { try { text = Buffer.from(text, 'base64').toString('utf-8'); } catch (e) {} }
        text = text.replace(/^port:.*$/gm, '# port: removed').replace(/^socks-port:.*$/gm, '# socks-port: removed').replace(/^mixed-port:.*$/gm, '# mixed-port: removed').replace(/^external-controller:.*$/gm, '# external-controller: removed');
        text = text + FORCE_CONFIG_APPEND;
        await fs.writeFile(profilePath, text);
        return { success: true, path: profilePath };
    } catch (e: any) { throw new Error(e.message); }
  });

  ipcMain.on('open-profile-folder', () => shell.openPath(USER_DATA_PATH));
  ipcMain.on('window-min', () => win?.minimize());
  ipcMain.on('window-max', () => win?.isMaximized() ? win.unmaximize() : win?.maximize());
  ipcMain.on('window-close', () => win?.hide());
  ipcMain.on('toggle-devtools', () => win?.webContents.toggleDevTools());
  ipcMain.on('open-terminal', () => shell.openPath(os.homedir()));
  createWindow();
})

app.isQuiting = false;
app.on('before-quit', () => { app.isQuiting = true; stopKernel(); });