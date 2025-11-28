import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, clipboard, MenuItemConstructorOptions } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import { spawn, exec, ChildProcess } from 'node:child_process'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import WebSocket from 'ws'
import { net } from 'electron'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PRELOAD_PATH = path.join(__dirname, 'preload.mjs')

// === 全局变量 ===
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let kernelProcess: ChildProcess | null = null;
let logWs: WebSocket | null = null;
let statsData: Record<string, any> = {};
const logBuffer: any[] = [];
let cachedSecret = ""; 
// 修复：使用模块级变量替代 global，解决 ESM 下状态丢失问题
let isSystemProxyEnabled = false;

const USER_DATA_PATH = app.getPath('userData');
const PROFILES_FILE = path.join(USER_DATA_PATH, 'profiles.json');
const RUNTIME_CONFIG_PATH = path.join(USER_DATA_PATH, 'config.yaml');
const LOGS_DIR = path.join(USER_DATA_PATH, 'logs');
const STATS_FILE = path.join(USER_DATA_PATH, 'stats.json');

const IS_DEV = process.env.VITE_DEV_SERVER_URL !== undefined;
const BIN_PATH = IS_DEV ? path.join(__dirname, '../sidecars') : path.join(process.resourcesPath, 'sidecars');
const EXECUTABLE_NAME = process.platform === 'win32' ? 'mihomo.exe' : 'mihomo';
const KERNEL_BIN = path.join(BIN_PATH, EXECUTABLE_NAME);
// 修复：确保开发环境能找到 public 下的图标
const ICON_PATH = IS_DEV 
  ? path.join(__dirname, '../public/icon.png') 
  : path.join(process.resourcesPath, 'icon.png');

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

// === API 请求 ===
const fetchKernel = async (method: string, endpoint: string, body?: any) => {
  try {
    const headers: any = { 'Content-Type': 'application/json' };
    if (cachedSecret) headers['Authorization'] = `Bearer ${cachedSecret}`;
    const res = await fetch(`http://127.0.0.1:9097${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) return null;
    if (method === 'GET') return await res.json();
    return true; 
  } catch (e) { return null; }
};

const notifyRendererUpdate = () => win?.webContents.send('clash-state-update');

// === 托盘 ===
const updateTrayMenu = async () => {
  if (!tray) return;
  const [config, proxiesData] = await Promise.all([fetchKernel('GET', '/configs'), fetchKernel('GET', '/proxies')]);
  
  // 即使内核没连接，也要显示托盘（显示部分菜单）
  const isReady = !!config && !!proxiesData;
  const currentMode = config?.mode.toLowerCase() || 'rule';
  const currentTun = config?.tun?.enable === true;
  const proxies = proxiesData?.proxies || {};
  
  const groups = Object.values(proxies).filter((p: any) => p.type === 'Selector').sort((a: any, b: any) => (a.name === 'GLOBAL' || a.name === 'Proxy' ? -1 : 1));

  const proxyMenu: MenuItemConstructorOptions[] = groups.map((group: any) => ({
    label: group.name,
    submenu: group.all.map((nodeName: string) => ({
      label: nodeName,
      type: 'radio',
      checked: group.now === nodeName,
      click: async () => {
        await fetchKernel('PUT', `/proxies/${encodeURIComponent(group.name)}`, { name: nodeName });
        setTimeout(() => { notifyRendererUpdate(); updateTrayMenu(); }, 300);
      }
    }))
  }));

  const template: MenuItemConstructorOptions[] = [
    { label: isReady ? '核心: 运行中' : '核心: 已停止', enabled: false },
    { label: '显示主界面', click: () => win?.show() },
    { type: 'separator' },
    { label: '重启内核', click: () => restartKernelService() }, // 托盘增加重启功能
    { type: 'separator' },
    // 只有核心就绪才显示配置项
    ...(isReady ? [
      { label: '运行模式', submenu: [
          { label: '规则 (Rule)', type: 'radio', checked: currentMode === 'rule', click: () => changeMode('rule') },
          { label: '全局 (Global)', type: 'radio', checked: currentMode === 'global', click: () => changeMode('global') },
          { label: '直连 (Direct)', type: 'radio', checked: currentMode === 'direct', click: () => changeMode('direct') },
      ]},
      { label: '选择节点', submenu: proxyMenu },
      { type: 'separator' },
      { label: '系统代理', type: 'checkbox', checked: isSystemProxyEnabled, click: (item) => setSystemProxy(item.checked) },
      { label: 'TUN 模式', type: 'checkbox', checked: currentTun, click: (item) => changeTun(item.checked) },
      { label: '复制环境变量', click: () => copyEnvCommand(config['mixed-port']) },
      { type: 'separator' }
    ] : []),
    { label: '退出', click: () => { app.isQuiting = true; stopKernel(); app.quit(); } }
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
};

const changeMode = async (mode: string) => { await fetchKernel('PATCH', '/configs', { mode }); notifyRendererUpdate(); updateTrayMenu(); };
const changeTun = async (enable: boolean) => { await fetchKernel('PATCH', '/configs', { tun: { enable } }); notifyRendererUpdate(); updateTrayMenu(); };

// 修复：系统代理使用本地变量
const setSystemProxy = (enable: boolean) => {
  isSystemProxyEnabled = enable;
  if (process.platform === 'win32') {
    const val = enable ? 1 : 0;
    exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d ${val} /f`);
    if (enable) exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "127.0.0.1:7890" /f`);
  }
  notifyRendererUpdate(); 
  updateTrayMenu();
};

const copyEnvCommand = (port: number) => {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? `set http_proxy=http://127.0.0.1:${port} && set https_proxy=http://127.0.0.1:${port}` : `export http_proxy=http://127.0.0.1:${port} && export https_proxy=http://127.0.0.1:${port}`;
  clipboard.writeText(cmd);
};

// ... 日志记录 ...
const startLogRecorder = () => {
  fs.mkdir(LOGS_DIR, { recursive: true }).catch(console.error);
  fs.readFile(STATS_FILE, 'utf-8').then(data => { statsData = JSON.parse(data); }).catch(() => { statsData = {}; });
  const connectWs = () => {
    logWs = new WebSocket('ws://127.0.0.1:9097/logs?level=info');
    logWs.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString();
        logBuffer.push({ id: Date.now() + Math.random(), time: timeStr, type: msg.type, payload: msg.payload });
        if (logBuffer.length > 500) logBuffer.shift();
        const logFile = path.join(LOGS_DIR, `${dateStr}.log`);
        await fs.appendFile(logFile, `[${timeStr}] [${msg.type}] ${msg.payload}\n`);
        if (msg.type === 'info' && (msg.payload.startsWith('[TCP]') || msg.payload.startsWith('[UDP]'))) {
           const match = msg.payload.match(/-->\s+([^\s:]+)/);
           if (match && match[1]) {
             const domain = match[1];
             if (!statsData[dateStr]) statsData[dateStr] = { total: 0, domains: {} };
             statsData[dateStr].total = (statsData[dateStr].total || 0) + 1;
             statsData[dateStr].domains[domain] = (statsData[dateStr].domains[domain] || 0) + 1;
           }
        }
      } catch (e) {}
    });
    logWs.on('close', () => setTimeout(connectWs, 5000));
    logWs.on('error', () => {});
  };
  setTimeout(connectWs, 3000);
  setInterval(() => { fs.writeFile(STATS_FILE, JSON.stringify(statsData, null, 2)).catch(console.error); }, 60 * 1000);
};

const startKernel = async () => {
  try { await fs.mkdir(USER_DATA_PATH, { recursive: true }); } catch (e) {}
  try { await fs.access(RUNTIME_CONFIG_PATH, constants.F_OK); } 
  catch { await fs.writeFile(RUNTIME_CONFIG_PATH, FORCE_CONFIG_APPEND); }
  cachedSecret = await getClashSecret();
  
  console.log(`[Kernel] Spawning: ${KERNEL_BIN}`);
  kernelProcess = spawn(KERNEL_BIN, ['-d', USER_DATA_PATH], { cwd: USER_DATA_PATH, stdio: 'inherit', windowsHide: true });
  startLogRecorder();
};

const stopKernel = () => { setSystemProxy(false); if (kernelProcess) { kernelProcess.kill(); kernelProcess = null; } };

// === 重启逻辑 ===
const restartKernelService = async () => {
    console.log('[Kernel] Restarting...');
    stopKernel();
    await new Promise(r => setTimeout(r, 1000)); // 等待进程彻底结束
    await startKernel();
    updateTrayMenu();
    notifyRendererUpdate();
};

async function getClashSecret() { try { const content = await fs.readFile(RUNTIME_CONFIG_PATH, 'utf-8'); const match = content.match(/secret:\s*["']?([^"'\s]+)["']?/); return match ? match[1] : ''; } catch (e) { return ''; } }

const createTray = () => {
  // 确保图标存在，否则用空图标防止报错
  let icon = nativeImage.createEmpty();
  try { icon = nativeImage.createFromPath(ICON_PATH); } catch (e) { console.error("Icon load failed:", e); }
  
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
  createTray(); // === 修复：最先创建托盘，防止内核启动慢导致无图标 ===
  await startKernel();

  ipcMain.handle('get-clash-secret', getClashSecret);
  ipcMain.handle('get-profiles', readProfiles);
  ipcMain.handle('save-profiles', async (_event, profiles) => saveProfiles(profiles));
  ipcMain.handle('get-history-stats', getHistoryStats);
  ipcMain.handle('get-recent-logs', () => logBuffer);
  ipcMain.handle('set-system-proxy', async (_event, enable: boolean) => { setSystemProxy(enable); return true; });
  ipcMain.handle('get-system-proxy-status', () => isSystemProxyEnabled); // 使用本地变量
  ipcMain.on('refresh-tray', () => updateTrayMenu());
  
  // === 新增：重启内核 IPC ===
  ipcMain.handle('restart-kernel', async () => {
    await restartKernelService();
    return true;
  });

  // ... (select-proxy, download-profile, system-info 等保持不变，请确保包含) ...
  // 为了篇幅，这里简写了，请确保保留之前添加的所有 IPC
  ipcMain.handle('select-proxy', async (_event, { group, node }) => {
    const success = await fetchKernel('PUT', `/proxies/${encodeURIComponent(group)}`, { name: node });
    if (success) { setTimeout(() => { notifyRendererUpdate(); updateTrayMenu(); }, 300); return true; } 
    else { throw new Error('Failed'); }
  });
  
  ipcMain.handle('download-profile', async (_event, { url, id }) => { /* ...保持原样... */ 
    try {
        const profilePath = path.join(USER_DATA_PATH, `${id}.yaml`);
        const res = await net.fetch(url, { headers: { "User-Agent": "Clash/1.0" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let text = await res.text();
        const userInfo = res.headers.get('subscription-userinfo') || "";
        if (!text.includes('proxies:') && /^[A-Za-z0-9+/=]+$/.test(text.trim())) { try { text = Buffer.from(text, 'base64').toString('utf-8'); } catch (e) {} }
        text = text.replace(/^port:.*$/gm, '# port: rm').replace(/^socks-port:.*$/gm, '# socks-port: rm').replace(/^mixed-port:.*$/gm, '# mixed-port: rm').replace(/^external-controller:.*$/gm, '# ext-ctrl: rm');
        text = text + FORCE_CONFIG_APPEND;
        await fs.writeFile(profilePath, text);
        return { success: true, path: profilePath, userInfo };
    } catch (e: any) { throw new Error(e.message); }
  });

  // System Info & Tests
  ipcMain.handle('get-system-info', () => ({ arch: os.arch(), platform: os.platform(), cpus: os.cpus()[0].model, memory: os.totalmem(), hostname: os.hostname() }));
  ipcMain.handle('set-auto-launch', (_event, enable: boolean) => { app.setLoginItemSettings({ openAtLogin: enable, openAsHidden: true }); return true; });
  ipcMain.handle('get-auto-launch', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('test-website', async (_event, url) => { try { const start = Date.now(); const res = await fetch(url, { method: 'HEAD', redirect: 'follow' }); return { ok: res.ok, status: res.status, time: Date.now() - start }; } catch { return { ok: false, status: 0, time: -1 }; } });

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