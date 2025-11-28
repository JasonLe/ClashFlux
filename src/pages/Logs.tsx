import { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pause, Play } from "lucide-react";
import { toast } from "sonner";

interface LogEntry {
  type: string;
  payload: string;
  time: string;
  id: number;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const connect = async () => {
      // 异步获取 secret
      const secret = await window.electronAPI.getClashSecret();
      const url = `ws://127.0.0.1:9097/logs?token=${encodeURIComponent(secret)}&level=info`;
      ws.current = new WebSocket(url);

      ws.current.onmessage = (event) => {
        if (isPaused) return;
        try {
          const data = JSON.parse(event.data);
          const newLog = { 
            ...data, 
            time: new Date().toLocaleTimeString(),
            id: Date.now() + Math.random() 
          };
          
          setLogs(prev => {
              const next = [...prev, newLog];
              if (next.length > 500) return next.slice(next.length - 500);
              return next;
          });
        } catch (e) {
          console.error("Failed to parse log message:", e);
        }
      };

      ws.current.onerror = (err) => {
        console.error("Log WebSocket error:", err);
        toast.error("日志服务连接失败，请检查Clash核心是否运行");
      }
    }

    connect();

    return () => ws.current?.close();
  }, [isPaused]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const getBadgeColor = (type: string) => {
    switch (type) {
        case 'info': return "bg-blue-500 hover:bg-blue-600";
        case 'warning': return "bg-yellow-500 hover:bg-yellow-600";
        case 'error': return "bg-red-500 hover:bg-red-600";
        case 'debug': return "bg-zinc-500";
        default: return "bg-zinc-500";
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">内核日志</h2>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? <Play size={14} className="mr-2"/> : <Pause size={14} className="mr-2"/>}
                {isPaused ? "继续" : "暂停"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLogs([])}>
                <Trash2 size={14} className="mr-2"/> 清空
            </Button>
        </div>
      </div>

      <div className="flex-1 border rounded-lg bg-zinc-950 text-zinc-50 font-mono text-xs overflow-hidden shadow-inner">
        <ScrollArea className="h-full p-4">
            {logs.length === 0 && <div className="text-zinc-500 text-center mt-10">等待日志输出...</div>}
            {logs.map((log) => (
                <div key={log.id} className="mb-1 flex gap-3 hover:bg-zinc-900 p-1 rounded">
                    <span className="text-zinc-500 shrink-0">[{log.time}]</span>
                    <Badge className={`h-5 px-1 ${getBadgeColor(log.type)}`}>{log.type}</Badge>
                    <span className="break-all">{log.payload}</span>
                </div>
            ))}
            <div ref={scrollRef} />
        </ScrollArea>
      </div>
    </div>
  );
}