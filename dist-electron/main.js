import { app, ipcMain, shell, nativeImage, Tray, Menu, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import { spawn, exec } from "node:child_process";
import os from "node:os";
import { fileURLToPath } from "node:url";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
const PRELOAD_PATH = path.join(__dirname$1, "preload.mjs");
let win = null;
let tray = null;
let kernelProcess = null;
let statsData = {};
const logBuffer = [];
let cachedSecret = "";
const USER_DATA_PATH = app.getPath("userData");
const PROFILES_FILE = path.join(USER_DATA_PATH, "profiles.json");
const RUNTIME_CONFIG_PATH = path.join(USER_DATA_PATH, "config.yaml");
path.join(USER_DATA_PATH, "logs");
const STATS_FILE = path.join(USER_DATA_PATH, "stats.json");
const IS_DEV = process.env.VITE_DEV_SERVER_URL !== void 0;
const BIN_PATH = IS_DEV ? path.join(__dirname$1, "../sidecars") : path.join(process.resourcesPath, "sidecars");
const EXECUTABLE_NAME = process.platform === "win32" ? "mihomo.exe" : "mihomo";
const KERNEL_BIN = path.join(BIN_PATH, EXECUTABLE_NAME);
const ICON_PATH = IS_DEV ? path.join(__dirname$1, "../public/icon.png") : path.join(process.resourcesPath, "icon.png");
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
const fetchKernel = async (method, endpoint, body) => {
  try {
    const headers = { "Content-Type": "application/json" };
    if (cachedSecret) headers["Authorization"] = `Bearer ${cachedSecret}`;
    if (method === "PUT") console.log(`[KernelReq] ${method} ${endpoint}`, body);
    const res = await fetch(`http://127.0.0.1:9097${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0
    });
    if (!res.ok) {
      console.error(`[KernelErr] ${res.status} ${res.statusText}`);
      return null;
    }
    if (method === "GET") return await res.json();
    return true;
  } catch (e) {
    console.error(`[KernelFatal]`, e);
    return null;
  }
};
const notifyRendererUpdate = () => win == null ? void 0 : win.webContents.send("clash-state-update");
const updateTrayMenu = async () => {
  var _a;
  if (!tray) return;
  const [config, proxiesData] = await Promise.all([fetchKernel("GET", "/configs"), fetchKernel("GET", "/proxies")]);
  if (!config || !proxiesData) return;
  const currentMode = config.mode.toLowerCase();
  const currentTun = ((_a = config.tun) == null ? void 0 : _a.enable) === true;
  const proxies = proxiesData.proxies || {};
  const groups = Object.values(proxies).filter((p) => p.type === "Selector").sort((a, b) => a.name === "GLOBAL" || a.name === "Proxy" ? -1 : 1);
  const proxyMenu = groups.map((group) => ({
    label: group.name,
    submenu: group.all.map((nodeName) => ({
      label: nodeName,
      type: "radio",
      checked: group.now === nodeName,
      click: async () => {
        await fetchKernel("PUT", `/proxies/${encodeURIComponent(group.name)}`, { name: nodeName });
        setTimeout(() => {
          notifyRendererUpdate();
          updateTrayMenu();
        }, 500);
      }
    }))
  }));
  const template = [
    { label: "显示主界面", click: () => win == null ? void 0 : win.show() },
    { type: "separator" },
    { label: "运行模式", submenu: [
      { label: "规则 (Rule)", type: "radio", checked: currentMode === "rule", click: () => changeMode("rule") },
      { label: "全局 (Global)", type: "radio", checked: currentMode === "global", click: () => changeMode("global") },
      { label: "直连 (Direct)", type: "radio", checked: currentMode === "direct", click: () => changeMode("direct") }
    ] },
    { label: "选择节点", submenu: proxyMenu },
    { type: "separator" },
    { label: "系统代理", type: "checkbox", checked: global.isSystemProxyEnabled, click: (item) => setSystemProxy(item.checked) },
    { label: "TUN 模式", type: "checkbox", checked: currentTun, click: (item) => changeTun(item.checked) },
    { type: "separator" },
    { label: "退出", click: () => {
      app.isQuiting = true;
      stopKernel();
      app.quit();
    } }
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
};
const changeMode = async (mode) => {
  await fetchKernel("PATCH", "/configs", { mode });
  notifyRendererUpdate();
  updateTrayMenu();
};
const changeTun = async (enable) => {
  await fetchKernel("PATCH", "/configs", { tun: { enable } });
  notifyRendererUpdate();
  updateTrayMenu();
};
global.isSystemProxyEnabled = false;
const setSystemProxy = (enable) => {
  global.isSystemProxyEnabled = enable;
  if (process.platform === "win32") {
    const val = enable ? 1 : 0;
    exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d ${val} /f`);
    if (enable) exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "127.0.0.1:7890" /f`);
  }
  notifyRendererUpdate();
  updateTrayMenu();
};
const startKernel = async () => {
  try {
    await fs.mkdir(USER_DATA_PATH, { recursive: true });
  } catch (e) {
  }
  try {
    await fs.access(RUNTIME_CONFIG_PATH, constants.F_OK);
  } catch {
    await fs.writeFile(RUNTIME_CONFIG_PATH, FORCE_CONFIG_APPEND);
  }
  cachedSecret = await getClashSecret();
  kernelProcess = spawn(KERNEL_BIN, ["-d", USER_DATA_PATH], { cwd: USER_DATA_PATH, stdio: "inherit", windowsHide: true });
};
const stopKernel = () => {
  setSystemProxy(false);
  if (kernelProcess) {
    kernelProcess.kill();
    kernelProcess = null;
  }
};
async function getClashSecret() {
  try {
    const content = await fs.readFile(RUNTIME_CONFIG_PATH, "utf-8");
    const match = content.match(/secret:\s*["']?([^"'\s]+)["']?/);
    return match ? match[1] : "";
  } catch (e) {
    return "";
  }
}
const createTray = () => {
  let icon = nativeImage.createEmpty();
  try {
    icon = nativeImage.createFromPath(ICON_PATH);
  } catch (e) {
  }
  tray = new Tray(icon);
  tray.setToolTip("Clash Flux");
  updateTrayMenu();
  setInterval(updateTrayMenu, 3e3);
  tray.on("double-click", () => (win == null ? void 0 : win.isVisible()) ? win.hide() : win == null ? void 0 : win.show());
};
async function ensureConfigFile() {
  try {
    await fs.access(PROFILES_FILE);
  } catch {
    await fs.writeFile(PROFILES_FILE, JSON.stringify([]));
  }
}
async function readProfiles() {
  await ensureConfigFile();
  const data = await fs.readFile(PROFILES_FILE, "utf-8");
  return JSON.parse(data);
}
async function saveProfiles(profiles) {
  await ensureConfigFile();
  await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2));
  return true;
}
async function getHistoryStats() {
  try {
    await fs.writeFile(STATS_FILE, JSON.stringify(statsData, null, 2));
    return statsData;
  } catch {
    return {};
  }
}
const createWindow = () => {
  win = new BrowserWindow({
    width: 1e3,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    icon: ICON_PATH,
    webPreferences: { preload: PRELOAD_PATH, nodeIntegration: false, contextIsolation: true }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile("dist/index.html");
  }
  win.on("close", (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      win == null ? void 0 : win.hide();
    }
  });
};
app.whenReady().then(async () => {
  await startKernel();
  createTray();
  ipcMain.handle("get-clash-secret", getClashSecret);
  ipcMain.handle("get-profiles", readProfiles);
  ipcMain.handle("save-profiles", async (_event, profiles) => saveProfiles(profiles));
  ipcMain.handle("get-history-stats", getHistoryStats);
  ipcMain.handle("get-recent-logs", () => logBuffer);
  ipcMain.handle("set-system-proxy", async (_event, enable) => {
    setSystemProxy(enable);
    return true;
  });
  ipcMain.handle("get-system-proxy-status", () => global.isSystemProxyEnabled);
  ipcMain.on("refresh-tray", () => updateTrayMenu());
  ipcMain.handle("select-proxy", async (_event, { group, node }) => {
    console.log(`[IPC:select-proxy] Group: "${group}", Node: "${node}"`);
    const success = await fetchKernel("PUT", `/proxies/${encodeURIComponent(group)}`, { name: node });
    if (success) {
      setTimeout(() => {
        notifyRendererUpdate();
        updateTrayMenu();
      }, 300);
      return true;
    } else {
      console.error("[IPC:select-proxy] FAILED");
      throw new Error("Kernel API request failed");
    }
  });
  ipcMain.handle("download-profile", async (_event, { url, id }) => {
    try {
      const profilePath = path.join(USER_DATA_PATH, `${id}.yaml`);
      const res = await fetch(url, { headers: { "User-Agent": "Clash/1.0" } });
      let text = await res.text();
      if (!text.includes("proxies:") && /^[A-Za-z0-9+/=]+$/.test(text.trim())) {
        try {
          text = Buffer.from(text, "base64").toString("utf-8");
        } catch (e) {
        }
      }
      text = text.replace(/^port:.*$/gm, "# port: removed").replace(/^socks-port:.*$/gm, "# socks-port: removed").replace(/^mixed-port:.*$/gm, "# mixed-port: removed").replace(/^external-controller:.*$/gm, "# external-controller: removed");
      text = text + FORCE_CONFIG_APPEND;
      await fs.writeFile(profilePath, text);
      return { success: true, path: profilePath };
    } catch (e) {
      throw new Error(e.message);
    }
  });
  ipcMain.on("open-profile-folder", () => shell.openPath(USER_DATA_PATH));
  ipcMain.on("window-min", () => win == null ? void 0 : win.minimize());
  ipcMain.on("window-max", () => (win == null ? void 0 : win.isMaximized()) ? win.unmaximize() : win == null ? void 0 : win.maximize());
  ipcMain.on("window-close", () => win == null ? void 0 : win.hide());
  ipcMain.on("toggle-devtools", () => win == null ? void 0 : win.webContents.toggleDevTools());
  ipcMain.on("open-terminal", () => shell.openPath(os.homedir()));
  createWindow();
});
app.isQuiting = false;
app.on("before-quit", () => {
  app.isQuiting = true;
  stopKernel();
});
