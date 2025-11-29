import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardBody, Button, Input, Chip, Tooltip } from "@heroui/react";
import { XCircle, ArrowUp, ArrowDown, Package, Globe, Network, Zap, Search } from "lucide-react";
import { toast } from "sonner";

// ... Interface Connection 定义保持不变 ...
interface Connection { id: string; metadata: any; upload: number; download: number; chains: string[]; rule: string; speedUp?: number; speedDown?: number; }

export default function Connections() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [total, setTotal] = useState({ upload: 0, download: 0 });
  const [filterText, setFilterText] = useState("");
  const prevConnsRef = useRef<Map<string, any>>(new Map());

  // ... useEffect 逻辑保持不变 (fetchConns) ...
  useEffect(() => {
      const fetchConns = async () => {
          // ... 这里的逻辑和你之前的一样，主要是获取数据并计算速度 ...
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
                return { ...conn, speedUp, speedDown };
            });
            const currentIds = new Set(currentList.map(c => c.id));
            for (const id of prevConnsRef.current.keys()) { if (!currentIds.has(id)) prevConnsRef.current.delete(id); }
            listWithSpeed.sort((a, b) => (b.speedDown || 0) - (a.speedDown || 0) || b.download - a.download);
            setConns(listWithSpeed);
            setTotal({ upload: data.uploadTotal, download: data.downloadTotal });
          } catch (e) {}
      };
      const t = setInterval(fetchConns, 1000);
      return () => clearInterval(t);
  }, []);

  const closeConnection = async (id: string) => {
    try { await apiClient.delete(`/connections/${id}`); setConns(p => p.filter(c => c.id !== id)); toast.success("断开成功"); } catch { toast.error("失败"); }
  };
  const closeAll = async () => { try { await apiClient.delete('/connections'); setConns([]); toast.success("全部断开"); } catch { toast.error("失败"); } };

  const formatBytes = (bytes: number) => { if (!bytes) return '0 B'; const k=1024; const s=['B','KB','MB','GB']; const i=Math.floor(Math.log(bytes)/Math.log(k)); return parseFloat((bytes/Math.pow(k,i)).toFixed(1))+' '+s[i]; };
  const formatSpeed = (v: number) => v ? formatBytes(v)+'/s' : '';
  const getProcessName = (p?: string) => p?.split(/[/\\]/).pop();

  const filtered = conns.filter(c => !filterText || JSON.stringify(c).toLowerCase().includes(filterText.toLowerCase()));

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0 gap-4">
         <h2 className="text-xl font-bold flex items-center gap-2">
            连接 <Chip size="sm" variant="flat">{filtered.length}</Chip>
         </h2>
         <Input placeholder="筛选..." value={filterText} onValueChange={setFilterText} startContent={<Search size={16}/>} size="sm" className="max-w-xs" isClearable />
         <Button size="sm" color="danger" variant="flat" onPress={closeAll} startContent={<XCircle size={16}/>}>断开全部</Button>
      </div>
      
      {/* 统计条 */}
      <div className="flex gap-4 text-xs font-mono bg-content2 px-4 py-2 rounded-lg text-default-500 shrink-0">
        <span className="flex items-center gap-1"><ArrowUp size={12}/> {formatBytes(total.upload)}</span>
        <span className="flex items-center gap-1"><ArrowDown size={12}/> {formatBytes(total.download)}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar pb-10">
         {filtered.map(conn => (
            <Card key={conn.id} className="border border-transparent hover:border-primary/30 transition-colors shadow-sm bg-content1">
                <CardBody className="p-3 grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-primary/10 p-1.5 rounded-full text-primary shrink-0">{conn.metadata.network === 'udp' ? <Zap size={14}/> : <Globe size={14}/>}</div>
                            <span className="font-bold text-sm truncate" title={conn.metadata.host}>{conn.metadata.host || conn.metadata.destinationIP}</span>
                            <span className="text-[10px] text-default-400 border border-default-200 px-1 rounded">{conn.metadata.destinationPort}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-default-400 truncate pl-1">
                            {conn.metadata.processPath && (<span className="flex items-center gap-1 bg-default-100 px-1.5 rounded text-[10px] text-default-600"><Package size={10} /> {getProcessName(conn.metadata.processPath)}</span>)}
                        </div>
                    </div>
                    <div className="col-span-3 min-w-0 flex flex-col justify-center text-xs">
                        <div className="flex items-center gap-1.5 font-medium mb-0.5"><Network size={12} className="text-default-400"/><span className="truncate">{conn.chains[0] || 'Direct'}</span></div>
                        <div className="text-[10px] text-default-400 truncate pl-4.5">{conn.rule}</div>
                    </div>
                    <div className="col-span-3 flex flex-col items-end gap-0.5 font-mono text-xs">
                        <div className="flex items-center gap-2">{(conn.speedDown || 0) > 0 && <span className="text-success font-bold">{formatSpeed(conn.speedDown!)}</span>}<span className="text-default-400 w-[60px] text-right">↓ {formatBytes(conn.download)}</span></div>
                        <div className="flex items-center gap-2">{(conn.speedUp || 0) > 0 && <span className="text-primary font-bold">{formatSpeed(conn.speedUp!)}</span>}<span className="text-default-400 w-[60px] text-right">↑ {formatBytes(conn.upload)}</span></div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                        <Tooltip content="断开连接">
                            <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => closeConnection(conn.id)}><XCircle size={18} /></Button>
                        </Tooltip>
                    </div>
                </CardBody>
            </Card>
         ))}
      </div>
    </div>
  );
}