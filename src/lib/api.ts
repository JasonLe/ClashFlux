import axios from 'axios';

// === 1. 初始化配置逻辑 ===

// 默认配置
const DEFAULT_API_URL = 'http://127.0.0.1:9097';

// 从 LocalStorage 读取用户自定义的 API 配置
const getStoredConfig = () => {
  const stored = localStorage.getItem('clash_api_config');
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    baseURL: DEFAULT_API_URL,
    secret: '' // 默认为空
  };
};

// 初始化当前配置
let currentConfig = getStoredConfig();

// 导出密钥供 WebSocket 等其他模块使用
export let CLASH_SECRET = currentConfig.secret;

// === 2. Axios 实例与拦截器 ===

export const apiClient = axios.create({
  baseURL: currentConfig.baseURL,
  timeout: 5000,
});

// 动态更新 API 配置 (供设置页面调用)
export const updateApiConfig = (host: string, port: string, secret: string) => {
  const baseURL = `http://${host}:${port}`;
  
  // 更新内存变量
  currentConfig = { baseURL, secret };
  CLASH_SECRET = secret;
  
  // 更新 Axios 实例
  apiClient.defaults.baseURL = baseURL;
  
  // 持久化存储
  localStorage.setItem('clash_api_config', JSON.stringify(currentConfig));
};

// 请求拦截器：自动注入 Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    if (CLASH_SECRET) {
      config.headers.Authorization = `Bearer ${CLASH_SECRET}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：全局错误处理
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Clash API 鉴权失败: 请检查密钥设置");
    }
    return Promise.reject(error);
  }
);

// === 3. 类型定义 (DTO) ===

export interface ProxyNode {
  name: string;
  type: string;
  udp: boolean;
  history: { time: string; delay: number }[];
  now?: string; 
  all?: string[]; 
}

export interface ProxyProviders {
  proxies: Record<string, ProxyNode>;
}

export interface ClashConfig {
  port: number;
  "socks-port": number;
  "redir-port": number;
  "tproxy-port": number;
  "mixed-port": number;
  "allow-lan": boolean;
  mode: string;
  "log-level": string;
  ipv6: boolean;
  // Mihomo 内核通常使用 tun 字段控制
  tun?: { enable: boolean };
  // 兼容旧版 Clash Premium
  "system-proxy"?: boolean;
}

// === 4. API 方法封装 ===

/** 获取内核版本 */
export const getVersion = async () => {
  const { data } = await apiClient.get('/version');
  return data;
};

/** 获取全局配置 */
export const getConfigs = async () => {
  const { data } = await apiClient.get<ClashConfig>('/configs');
  return data;
};

/** 更新全局配置 (PATCH) */
export const updateConfigs = async (config: Partial<any>) => {
  await apiClient.patch('/configs', config);
};

/** 切换配置文件 (用于订阅切换) */
export const switchConfig = async (path: string) => {
  // force=true 强制重新加载
  // path 必须是绝对路径
  await apiClient.put('/configs?force=true', { path });
};

/** 重载当前配置 (用于刷新) */
export const reloadConfigs = async () => {
  await apiClient.put('/configs?force=true', { path: "" });
};

/** 获取所有代理节点 */
export const getProxies = async () => {
  const { data } = await apiClient.get<ProxyProviders>('/proxies');
  return data.proxies;
};

/** 切换代理节点 */
export const selectProxy = async (selectorName: string, nodeName: string) => {
  await apiClient.put(`/proxies/${encodeURIComponent(selectorName)}`, {
    name: nodeName,
  });
};

/** 代理组延迟测速 */
export const groupDelayTest = async (groupName: string) => {
  const params = { url: 'http://www.gstatic.com/generate_204', timeout: 2000 };
  await apiClient.get(`/group/${encodeURIComponent(groupName)}/delay`, { params });
};

/** 获取所有连接 (用于 Connections 页面) */
export const getConnections = async () => {
  const { data } = await apiClient.get('/connections');
  return data;
};

/** 断开指定连接 */
export const closeConnection = async (id: string) => {
  await apiClient.delete(`/connections/${id}`);
};

/** 断开所有连接 */
export const closeAllConnections = async () => {
  await apiClient.delete('/connections');
};

/** 获取分流规则 (用于 Rules 页面) */
export const getRules = async () => {
  const { data } = await apiClient.get('/rules');
  return data;
};

/** 清除 FakeIP 缓存 (用于高级维护) */
export const flushFakeIP = async () => {
  await apiClient.post('/cache/fakeip/flush');
};

// === 5. 高级功能补全 ===

/** 获取所有代理提供商 (Proxy Providers) */
export const getProxyProviders = async () => {
  const { data } = await apiClient.get('/providers/proxies');
  return data.providers;
};

/** 强制更新某个代理提供商 */
export const updateProxyProvider = async (name: string) => {
  await apiClient.put(`/providers/proxies/${encodeURIComponent(name)}`);
};

/** 获取所有规则提供商 (Rule Providers) */
export const getRuleProviders = async () => {
  const { data } = await apiClient.get('/providers/rules');
  return data.providers;
};

/** 强制更新某个规则提供商 */
export const updateRuleProvider = async (name: string) => {
  await apiClient.put(`/providers/rules/${encodeURIComponent(name)}`);
};

/** 更新 GeoIP / GeoSite 数据库 */
export const updateGeoData = async () => {
  // 这是一个耗时操作
  await apiClient.post('/configs/geo');
};

/** 强制内存回收 (GC) */
export const forceGC = async () => {
  await apiClient.get('/gc');
};

/** DNS 解析调试 (查看某个域名会被解析成什么 IP) */
export const queryDNS = async (name: string) => {
  const { data } = await apiClient.get('/dns/query', { params: { name } });
  return data;
};