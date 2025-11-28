import { useEffect, useState } from 'react';
import { getWsBaseUrl, CLASH_SECRET } from '@/lib/api';

interface TrafficData {
  up: number;
  down: number;
  time: number;
}

// === 全局单例状态 (Global State) ===
// 这些变量保存在模块作用域，组件销毁后依然存在
const HISTORY_LENGTH = 60;
let globalTrafficData: TrafficData[] = new Array(HISTORY_LENGTH).fill({ up: 0, down: 0, time: Date.now() });
let globalCurrentSpeed = { up: 0, down: 0 };
let globalWs: WebSocket | null = null;
let listeners: ((data: TrafficData[], speed: { up: number, down: number }) => void)[] = [];
let retryTimeout: NodeJS.Timeout | null = null;

// 广播数据给所有订阅的组件
const notifyListeners = () => {
  listeners.forEach(listener => listener(globalTrafficData, globalCurrentSpeed));
};

// 建立全局连接
const connectGlobalWs = () => {
  if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) return;

  const baseUrl = getWsBaseUrl();
  const secretParam = CLASH_SECRET ? `?token=${encodeURIComponent(CLASH_SECRET)}` : '';
  const url = `${baseUrl}/traffic${secretParam}`;

  globalWs = new WebSocket(url);

  globalWs.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      globalCurrentSpeed = { up: message.up, down: message.down };
      
      // 更新历史数据
      const newData = [...globalTrafficData.slice(1), { 
        up: message.up, 
        down: message.down, 
        time: Date.now() 
      }];
      globalTrafficData = newData;
      
      notifyListeners();
    } catch (e) {}
  };

  globalWs.onclose = (e) => {
    globalWs = null;
    // 非正常关闭则重连
    if (e.code !== 1000) {
      retryTimeout = setTimeout(connectGlobalWs, 3000);
    }
  };

  globalWs.onerror = () => {
    if (globalWs) globalWs.close();
  };
};

// 初始化连接 (文件加载时立即执行一次)
connectGlobalWs();

// === Hook ===
export function useTraffic() {
  const [data, setData] = useState<TrafficData[]>(globalTrafficData);
  const [currentSpeed, setCurrentSpeed] = useState(globalCurrentSpeed);

  useEffect(() => {
    // 组件挂载时，确保连接存在
    if (!globalWs) connectGlobalWs();

    // 订阅更新
    const listener = (newData: TrafficData[], newSpeed: { up: number, down: number }) => {
      setData(newData);
      setCurrentSpeed(newSpeed);
    };
    listeners.push(listener);

    // 组件卸载时，只取消订阅，不关闭连接
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  return { data, currentSpeed };
}