import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { XCircle, ArrowUp, ArrowDown, Package, Globe, Network, Zap, Search, Info } from "lucide-react";
import { toast } from "sonner";

interface Connection {
  id: string;
  metadata: {
    host: string;
    destinationIP: string;
    destinationPort: string;
    network: string; 
    type: string;    
    processPath?: string;
    sourceIP: string;
    sourcePort: string;
  };
  upload: number;
  download: number;
  start: string;
  chains: string[];
  rule: string;
  rulePayload?: string;
  speedUp?: number;
  speedDown?: number;
}

export default function Connections() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [total, setTotal] = useState({ upload: 0, download: 0 });
  const [filterText, setFilterText] = useState("");
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null);
  
  const prevConnsRef = useRef<Map<string, { up: number, down: number, time: number }>>(new Map());
  const INTERVAL = 1000;

  useEffect(() => {
    const fetchConns = async () => {
      try {
        const now = Date.now();
        const { data } = await apiClient.get('/connections');
        const currentList = data.connections as Connection[];
        
        const listWithSpeed = currentList.map(conn => {
            const prev = prevConnsRef.current.get(conn.id);
            let speedUp = 0, speedDown = 0;
            if (prev) {
                const duration = (now - prev.time) / 1000;
                if (duration > 0) {
                    speedUp = Math.max(0, (conn.upload - prev.up) / duration);
                    speedDown = Math.max(0, (conn.download - prev.down) / duration);
                }
            }
            prevConnsRef.current.set(conn.id, { up: conn.upload, down: conn.download, time: now });
            
            // 实时更新抽屉里的数据
            if (selectedConn && selectedConn.id === conn.id) {
                setSelectedConn(prev => prev ? { ...conn, speedUp, speedDown } : null);
            }

            return { ...conn, speedUp, speedDown };
        });

        const currentIds = new Set(currentList.map(c => c.id));
        for (const id of prevConnsRef.current.keys()) { if (!currentIds.has(id)) prevConnsRef.current.delete(id); }

        listWithSpeed.sort((a, b) => {
            const speedDiff = (b.speedDown || 0) - (a.speedDown || 0);
            if (speedDiff !== 0) return speedDiff;
            return b.download - a.download;
        });

        setConns(listWithSpeed);
        setTotal({ upload: data.uploadTotal, download: data.downloadTotal });
      } catch (e) { console.error(e); }
    };

    fetchConns();
    const timer = setInterval(fetchConns, INTERVAL);
    return () => clearInterval(timer);
  }, [selectedConn?.id]); // 依赖 ID 避免频繁重渲染

  const closeConnection = async (id: string) => {
    try { 
        await apiClient.delete(`/connections/${id}`); 
        setConns(prev => prev.filter(c => c.id !== id)); 
        if (selectedConn?.id === id) setSelectedConn(null);
        toast.success("连接已断开"); 
    } catch (e) { toast.error("操作失败"); }
  };

  const closeAll = async () => {
    try { await apiClient.delete('/connections'); setConns([]); toast.success("已断开所有连接"); } catch (e) { toast.error("操作失败"); }
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  const formatSpeed = (bytesPerSec: number) => bytesPerSec ? formatBytes(bytesPerSec) + '/s' : '';
  const getProcessName = (path?: string) => path?.split(/[/\\]/).pop();
  
  const getDuration = (start: string) => {
      const diff = Date.now() - new Date(start).getTime();
      const secs = Math.floor(diff / 1000);
      if (secs < 60) return `${secs}s`;
      return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  const filteredConns = conns.filter(c => {
      if (!filterText) return true;
      const lower = filterText.toLowerCase();
      return (c.metadata.host || "").toLowerCase().includes(lower) || 
             c.metadata.destinationIP.includes(lower) || 
             (c.metadata.processPath || "").toLowerCase().includes(lower);
  });

  return (
    <div className="space-y-4 max-w-6xl mx-auto h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0 gap-4">
         <div className="flex items-center gap-4 flex-1">
             <h2 className="text-2xl font-bold tracking-tight whitespace-nowrap">连接 ({filteredConns.length})</h2>
             <div className="relative w-full max-w-xs">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="筛选 Host, IP, 进程..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-8 h-9" />
             </div>
             {conns.length > 0 && (<Button variant="ghost" size="sm" onClick={closeAll} className="text-muted-foreground hover:text-red-500"><XCircle size={14} className="mr-2"/> 断开全部</Button>)}
         </div>
         <div className="flex gap-4 text-xs font-mono bg-muted/50 px-3 py-1.5 rounded-md border text-muted-foreground">
            <span className="flex items-center"><ArrowUp size={12} className="mr-1"/> {formatBytes(total.upload)}</span>
            <span className="flex items-center"><ArrowDown size={12} className="mr-1"/> {formatBytes(total.download)}</span>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar pb-10">
         {filteredConns.map((conn) => (
            <Card key={conn.id} className="group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setSelectedConn(conn)}>
                <div className="p-3 grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-primary/10 p-1.5 rounded-full text-primary shrink-0">{conn.metadata.network === 'udp' ? <Zap size={14}/> : <Globe size={14}/>}</div>
                            <div className="font-bold text-sm truncate" title={conn.metadata.host}>{conn.metadata.host || conn.metadata.destinationIP}</div>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">{conn.metadata.destinationPort}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate pl-1">
                            {conn.metadata.processPath && (<span className="flex items-center gap-1 bg-muted px-1.5 rounded text-[10px]"><Package size={10} /> {getProcessName(conn.metadata.processPath)}</span>)}
                        </div>
                    </div>
                    <div className="col-span-3 min-w-0 flex flex-col justify-center text-xs">
                        <div className="flex items-center gap-1.5 font-medium mb-0.5"><Network size={12} /><span className="truncate">{conn.chains[0] || 'Direct'}</span></div>
                        <div className="text-[10px] text-muted-foreground truncate pl-4.5">{conn.rule}</div>
                    </div>
                    <div className="col-span-3 flex flex-col items-end gap-0.5 font-mono text-xs">
                        <div className="flex items-center gap-2">{(conn.speedDown || 0) > 0 && (<span className="text-green-600 font-bold">{formatSpeed(conn.speedDown!)}</span>)}<span className="text-muted-foreground min-w-[60px] text-right">↓ {formatBytes(conn.download)}</span></div>
                        <div className="flex items-center gap-2">{(conn.speedUp || 0) > 0 && (<span className="text-blue-600 font-bold">{formatSpeed(conn.speedUp!)}</span>)}<span className="text-muted-foreground min-w-[60px] text-right">↑ {formatBytes(conn.upload)}</span></div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); closeConnection(conn.id); }}><XCircle size={16} /></Button>
                    </div>
                </div>
            </Card>
         ))}
      </div>

      {/* === 核心修复：Sheet 关闭逻辑 === */}
      {/* 确保 open 属性完全受控，onOpenChange 处理关闭事件 */}
      <Sheet 
        open={!!selectedConn} 
        onOpenChange={(open) => {
            if (!open) setSelectedConn(null);
        }}
      >
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
                <SheetTitle className="flex items-center gap-2 break-all text-left">
                    <Globe size={18} /> {selectedConn?.metadata.host || selectedConn?.metadata.destinationIP}
                </SheetTitle>
                <SheetDescription className="text-left">连接详情</SheetDescription>
            </SheetHeader>
            {selectedConn && (
                <div className="mt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg"><div className="text-xs text-muted-foreground">下载</div><div className="text-lg font-mono font-bold text-green-600">{formatBytes(selectedConn.download)}</div></div>
                        <div className="p-3 bg-muted/50 rounded-lg"><div className="text-xs text-muted-foreground">上传</div><div className="text-lg font-mono font-bold text-blue-600">{formatBytes(selectedConn.upload)}</div></div>
                    </div>
                    <div className="space-y-3 text-sm">
                        <h3 className="font-medium flex items-center gap-2"><Info size={14}/> 基础信息</h3>
                        <div className="grid grid-cols-[80px_1fr] gap-2">
                            <span className="text-muted-foreground">时间</span><span>{new Date(selectedConn.start).toLocaleTimeString()} ({getDuration(selectedConn.start)})</span>
                            <span className="text-muted-foreground">类型</span><span>{selectedConn.metadata.network} / {selectedConn.metadata.type}</span>
                            <span className="text-muted-foreground">目标</span><span className="font-mono">{selectedConn.metadata.destinationIP}:{selectedConn.metadata.destinationPort}</span>
                            <span className="text-muted-foreground">进程</span><span className="font-mono break-all text-xs">{selectedConn.metadata.processPath || "-"}</span>
                        </div>
                    </div>
                    <div className="space-y-3 text-sm">
                        <h3 className="font-medium flex items-center gap-2"><Network size={14}/> 链路</h3>
                        <div className="flex flex-col gap-2">
                            {selectedConn.chains.slice().reverse().map((node, i) => (
                                <div key={i} className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">{i+1}</div><div className="p-2 bg-muted/30 rounded flex-1 text-xs border">{node}</div></div>
                            ))}
                        </div>
                    </div>
                    <Button variant="destructive" className="w-full" onClick={() => closeConnection(selectedConn.id)}>断开连接</Button>
                </div>
            )}
        </SheetContent>
      </Sheet>
    </div>
  );
}