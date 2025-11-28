import { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pause, Play } from "lucide-react";
import { getWsBaseUrl, CLASH_SECRET } from "@/lib/api";

interface LogEntry {
  id: number;
  time: string;
  type: string;
  payload: string;
}

// === 全局日志缓存 ===
// 保证切换页面后数据不丢失
let globalLogs: LogEntry[] = [];
let globalWs: WebSocket | null = null;
let listeners: ((logs: LogEntry[]) => void)[] = [];

// 启动全局日志监听
const startGlobalLogWs = () => {
  if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) return;

  const baseUrl = getWsBaseUrl();
  const secretParam = CLASH_SECRET ? `&token=${encodeURIComponent(CLASH_SECRET)}` : '';
  const url = `${baseUrl}/logs?level=info${secretParam}`;

  globalWs = new WebSocket(url);

  globalWs.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const newLog = { 
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        ...data
      };
      
      // 更新全局缓存 (保留最近 1000 条)
      globalLogs = [...globalLogs, newLog];
      if (globalLogs.length > 1000) globalLogs = globalLogs.slice(globalLogs.length - 1000);
      
      // 通知所有活跃的组件
      listeners.forEach(l => l(globalLogs));
    } catch (e) {}
  };

  globalWs.onclose = () => {
    globalWs = null;
    setTimeout(startGlobalLogWs, 3000);
  };
};

// 立即启动监听 (可选，或者等到第一次进入页面再启动)
// startGlobalLogWs(); 

export default function Logs() {
  // 初始化 state 直接使用全局缓存
  const [logs, setLogs] = useState<LogEntry[]>(globalLogs);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. 如果没有连接，则建立连接
    if (!globalWs) {
        // 先尝试从后端拉取最近日志 (填补真空期)
        window.electronAPI?.getRecentLogs().then((recent: any[]) => {
            if (recent && recent.length > 0 && globalLogs.length === 0) {
                globalLogs = recent;
                setLogs(globalLogs);
            }
        });
        startGlobalLogWs();
    } else {
        // 如果已有连接，直接回显
        setLogs(globalLogs);
    }

    // 2. 注册监听器
    const listener = (newLogs: LogEntry[]) => {
        if (!isPaused) setLogs(newLogs);
    };
    listeners.push(listener);

    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
  }, [isPaused]);

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current && !isPaused) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isPaused]);

  const clearLogs = () => {
      globalLogs = []; // 清空全局缓存
      setLogs([]);     // 清空当前视图
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
        case 'info': return "bg-blue-500 hover:bg-blue-600";
        case 'warning': return "bg-yellow-500 hover:bg-yellow-600";
        case 'error': return "bg-red-500 hover:bg-red-600";
        default: return "bg-zinc-500";
    }
  };

  return (
    <div className="flex flex-col space-y-4 h-[calc(100vh-3.5rem)] max-w-6xl mx-auto">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">内核日志</h2>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? <Play size={14} className="mr-2"/> : <Pause size={14} className="mr-2"/>}
                {isPaused ? "继续" : "暂停"}
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs}>
                <Trash2 size={14} className="mr-2"/> 清空
            </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border rounded-lg bg-zinc-950 text-zinc-50 font-mono text-xs shadow-inner relative overflow-hidden">
        <ScrollArea className="h-full w-full">
            <div className="p-4">
                {logs.length === 0 && <div className="text-center text-zinc-600 py-10">等待日志输出...</div>}
                {logs.map((log) => (
                    <div key={log.id} className="mb-1 flex gap-3 hover:bg-zinc-900 p-1 rounded transition-colors">
                        <span className="text-zinc-500 shrink-0">[{log.time}]</span>
                        <Badge className={`h-5 px-1 ${getBadgeColor(log.type)}`}>{log.type}</Badge>
                        <span className="break-all whitespace-pre-wrap">{log.payload}</span>
                    </div>
                ))}
                <div ref={scrollRef} />
            </div>
        </ScrollArea>
      </div>
    </div>
  );
}