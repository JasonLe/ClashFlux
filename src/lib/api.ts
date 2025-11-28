import axios from 'axios';

// 默认配置
const DEFAULT_API_URL = 'http://127.0.0.1:9097';

const getStoredConfig = () => {
  try {
    const stored = localStorage.getItem('clash_api_config');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return { baseURL: DEFAULT_API_URL, secret: '' };
};

let currentConfig = getStoredConfig();
export let CLASH_SECRET = currentConfig.secret;

export const getWsBaseUrl = () => {
  const config = getStoredConfig();
  return config.baseURL.replace(/^http/, 'ws');
};

export const apiClient = axios.create({
  baseURL: currentConfig.baseURL,
  timeout: 5000,
});

export const updateApiConfig = (host: string, port: string, secret: string) => {
  const baseURL = `http://${host}:${port}`;
  currentConfig = { baseURL, secret };
  CLASH_SECRET = secret;
  apiClient.defaults.baseURL = baseURL;
  localStorage.setItem('clash_api_config', JSON.stringify(currentConfig));
};

apiClient.interceptors.request.use(
  (config) => {
    if (CLASH_SECRET) config.headers.Authorization = `Bearer ${CLASH_SECRET}`;
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) console.error("鉴权失败");
    return Promise.reject(error);
  }
);

// Types
export interface ProxyNode { name: string; type: string; udp: boolean; history: { time: string; delay: number }[]; now?: string; all?: string[]; }
export interface ProxyProviders { proxies: Record<string, ProxyNode>; }
export interface ClashConfig { port: number; "socks-port": number; "redir-port": number; "tproxy-port": number; "mixed-port": number; "allow-lan": boolean; mode: string; "log-level": string; ipv6: boolean; tun?: { enable: boolean }; "system-proxy"?: boolean; }

// Methods
export const getVersion = async () => { const { data } = await apiClient.get('/version'); return data; };
export const getConfigs = async () => { const { data } = await apiClient.get<ClashConfig>('/configs'); return data; };
export const updateConfigs = async (config: Partial<any>) => { await apiClient.patch('/configs', config); };
export const switchConfig = async (path: string) => { await apiClient.put('/configs?force=true', { path }); };
export const reloadConfigs = async () => { await apiClient.put('/configs?force=true', { path: "" }); };
export const getProxies = async () => { const { data } = await apiClient.get<ProxyProviders>('/proxies'); return data.proxies; };

// === 修改核心：selectProxy 走 IPC ===
export const selectProxy = async (selectorName: string, nodeName: string) => {
  if (window.electronAPI?.selectProxy) {
    try {
      console.log(`[Frontend] Call IPC selectProxy: ${selectorName} -> ${nodeName}`);
      await window.electronAPI.selectProxy(selectorName, nodeName);
      return;
    } catch (e) {
      console.error("IPC selectProxy error:", e);
      throw e; // 直接抛出错误，让 UI 捕获
    }
  } else {
    // 只有在非 Electron 环境下才尝试 HTTP (比如纯浏览器调试)
    const config = { headers: { 'Content-Type': 'application/json' } };
    await apiClient.put(`/proxies/${encodeURIComponent(selectorName)}`, { name: nodeName }, config);
  }
};

export const groupDelayTest = async (groupName: string) => { await apiClient.get(`/group/${encodeURIComponent(groupName)}/delay`, { params: { url: 'http://www.gstatic.com/generate_204', timeout: 2000 } }); };
export const getConnections = async () => { const { data } = await apiClient.get('/connections'); return data; };
export const closeConnection = async (id: string) => { await apiClient.delete(`/connections/${id}`); };
export const closeAllConnections = async () => { await apiClient.delete('/connections'); };
export const getRules = async () => { const { data } = await apiClient.get('/rules'); return data; };
export const flushFakeIP = async () => { await apiClient.post('/cache/fakeip/flush'); };
export const getProxyProviders = async () => { const { data } = await apiClient.get('/providers/proxies'); return data.providers; };
export const updateProxyProvider = async (name: string) => { await apiClient.put(`/providers/proxies/${encodeURIComponent(name)}`); };
export const getRuleProviders = async () => { const { data } = await apiClient.get('/providers/rules'); return data.providers; };
export const updateRuleProvider = async (name: string) => { await apiClient.put(`/providers/rules/${encodeURIComponent(name)}`); };
export const updateGeoData = async () => { await apiClient.post('/configs/geo'); };
export const forceGC = async () => { await apiClient.get('/gc'); };
export const queryDNS = async (name: string) => { const { data } = await apiClient.get('/dns/query', { params: { name } }); return data; };
export const getSystemProxyStatus = async () => {
  if (window.electronAPI?.getSystemProxyStatus) return await window.electronAPI.getSystemProxyStatus();
  return false;
};