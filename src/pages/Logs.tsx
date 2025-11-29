import { useEffect, useState, useRef } from "react";
import { Button, Chip, Card } from "@heroui/react";
import { Trash2, Pause, Play } from "lucide-react";
import { getWsBaseUrl, CLASH_SECRET } from "@/lib/api";

interface LogEntry {
  id: number;
  time: string;
  type: string;
  payload: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const recent = await window.electronAPI?.getRecentLogs();
        if (recent && recent.length > 0) setLogs(recent);
      } catch (e) {}
      connect();
    };
    init();
    return () => { if (ws.current) ws.current.close(); };
  }, []);

  const connect = () => {
    const baseUrl = getWsBaseUrl();
    const secretParam = CLASH_SECRET ? `&token=${encodeURIComponent(CLASH_SECRET)}` : '';
    const url = `${baseUrl}/logs?level=info${secretParam}`;

    ws.current = new WebSocket(url);
    ws.current.onmessage = (event) => {
      if (isPaused) return;
      try {
        const data = JSON.parse(event.data);
        const newLog = { 
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString(),
          ...data
        };
        setLogs(prev => {
            const next = [...prev, newLog];
            if (next.length > 500) return next.slice(next.length - 500);
            return next;
        });
      } catch (e) {}
    };
  };

  useEffect(() => {
    if (scrollRef.current && !isPaused) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs, isPaused]);

  const getLogColor = (type: string) => {
    switch (type) {
        case 'info': return "primary";
        case 'warning': return "warning";
        case 'error': return "danger";
        default: return "default";
    }
  };

  return (
    <div className="flex flex-col space-y-4 h-[calc(100vh-3.5rem)] max-w-6xl mx-auto">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">内核日志</h2>
        <div className="flex gap-2">
            <Button size="sm" variant={isPaused ? "solid" : "bordered"} color="warning" onPress={() => setIsPaused(!isPaused)} startContent={isPaused ? <Play size={14}/> : <Pause size={14}/>}>
                {isPaused ? "继续" : "暂停"}
            </Button>
            <Button size="sm" variant="bordered" color="danger" onPress={() => setLogs([])} startContent={<Trash2 size={14}/>}>
                清空
            </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-divider rounded-xl bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs shadow-inner relative overflow-hidden">
        <div className="h-full w-full overflow-y-auto p-4 custom-scrollbar">
            {logs.length === 0 && (
                <div className="text-center text-default-500 py-10 opacity-50">等待日志输出...</div>
            )}
            {logs.map((log) => (
                <div key={log.id} className="mb-1 flex items-start gap-3 hover:bg-white/5 p-1 rounded transition-colors group">
                    <span className="text-default-500 shrink-0 select-none">[{log.time}]</span>
                    <Chip size="sm" variant="flat" color={getLogColor(log.type) as any} className="h-5 px-0 min-w-[50px] justify-center capitalize font-bold">
                        {log.type}
                    </Chip>
                    <span className="break-all whitespace-pre-wrap leading-5 text-default-300 group-hover:text-white transition-colors">{log.payload}</span>
                </div>
            ))}
            <div ref={scrollRef} />
        </div>
      </div>
    </div>
  );
}