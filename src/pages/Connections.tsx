import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XCircle, ArrowUp, ArrowDown, Package, Globe, Network } from "lucide-react";
import { toast } from "sonner";

// 定义连接数据接口
interface Connection {
  id: string;
  metadata: {
    host: string;
    destinationIP: string;
    destinationPort: string;
    network: string; // tcp, udp
    type: string;    // HTTP, HTTPS, Socks5
    sourceIP: string;
    sourcePort: string;
    processPath?: string; // Mihomo 特有: 进程路径
    process?: string;     // 进程名
  };
  upload: number;
  download: number;
  start: string;
  chains: string[];
  rule: string;
}

export default function Connections() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [total, setTotal] = useState({ upload: 0, download: 0 });

  // 轮询获取数据
  useEffect(() => {
    const fetchConns = async () => {
      try {
        const { data } = await apiClient.get('/connections');
        // 按下载流量倒序排列，方便看谁在跑流量
        const sorted = (data.connections as Connection[]).sort((a, b) => b.download - a.download);
        setConns(sorted);
        setTotal({ upload: data.uploadTotal, download: data.downloadTotal });
      } catch (e) { 
        // 轮询失败通常不弹窗，避免刷屏，只在控制台记录
        console.error("Fetch connections failed", e); 
      }
    };

    // 立即执行一次
    fetchConns();
    // 设置 2秒 轮询
    const timer = setInterval(fetchConns, 2000);
    return () => clearInterval(timer);
  }, []);

  // 断开连接
  const closeConnection = async (id: string) => {
    try {
      await apiClient.delete(`/connections/${id}`);
      // 乐观更新 UI
      setConns(prev => prev.filter(c => c.id !== id));
      toast.success("连接已断开");
    } catch (e) {
      toast.error("断开连接失败");
    }
  };

  // 断开所有连接
  const closeAll = async () => {
    try {
      await apiClient.delete('/connections');
      setConns([]);
      toast.success("已断开所有连接");
    } catch (e) {
      toast.error("操作失败");
    }
  }

  // 格式化流量单位
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 提取文件名 (例如 C:\Windows\System32\curl.exe -> curl.exe)
  const getProcessName = (path?: string) => {
    if (!path) return null;
    return path.split(/[/\\]/).pop();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* 头部统计栏 */}
      <div className="flex items-center justify-between shrink-0">
         <div className="flex items-center gap-4">
             <h2 className="text-2xl font-bold tracking-tight">活动连接 ({conns.length})</h2>
             <Button variant="ghost" size="sm" onClick={closeAll} className="text-muted-foreground hover:text-red-500">
                <XCircle size={14} className="mr-2"/> 断开全部
             </Button>
         </div>
         <div className="flex gap-4 text-sm font-mono bg-muted/50 px-3 py-1 rounded-full border">
            <span className="flex items-center text-blue-500"><ArrowUp size={14} className="mr-1"/> {formatBytes(total.upload)}</span>
            <span className="flex items-center text-green-500"><ArrowDown size={14} className="mr-1"/> {formatBytes(total.download)}</span>
         </div>
      </div>

      {/* 连接列表 (滚动区域) */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
         {conns.length === 0 && <div className="text-center py-20 text-muted-foreground">暂无活动连接</div>}
         
         {conns.map((conn) => (
            <Card key={conn.id} className="hover:bg-accent/30 transition-colors border-l-4 border-l-transparent hover:border-l-primary">
                <div className="p-3 flex items-center justify-between gap-4">
                    
                    {/* 左侧：主机信息与进程 */}
                    <div className="flex flex-col gap-1 w-[40%] min-w-0">
                        <div className="font-bold text-sm truncate flex items-center gap-2" title={conn.metadata.host}>
                            <Globe size={14} className="text-muted-foreground shrink-0"/>
                            {conn.metadata.host || conn.metadata.destinationIP}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 overflow-hidden">
                            <Badge variant="secondary" className="text-[10px] h-5 px-1 rounded-sm font-mono">
                                {conn.metadata.network.toUpperCase()}
                            </Badge>
                            <span className="truncate">{conn.metadata.type}</span>
                            <span className="text-zinc-400">→</span>
                            <span className="truncate">{conn.metadata.destinationIP}:{conn.metadata.destinationPort}</span>
                        </div>
                        
                        {/* 进程显示 (Mihomo特性) */}
                        {conn.metadata.processPath && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1 truncate bg-muted/30 w-fit px-1 rounded" title={conn.metadata.processPath}>
                                <Package size={10} />
                                {getProcessName(conn.metadata.processPath)}
                            </div>
                        )}
                    </div>

                    {/* 中间：链路信息 */}
                    <div className="flex flex-col gap-1 w-[35%] text-xs text-muted-foreground min-w-0">
                       <div className="flex items-center gap-1">
                          <Network size={12} />
                          <span className="truncate" title={conn.chains.slice().reverse().join(' -> ')}>
                            {conn.chains.length > 0 ? conn.chains[0] : 'Direct'}
                          </span>
                       </div>
                       <div className="text-[10px] opacity-70 truncate" title={`Rule: ${conn.rule}`}>
                          规则: {conn.rule}
                       </div>
                    </div>

                    {/* 右侧：流量与操作 */}
                    <div className="flex items-center gap-4 w-[25%] justify-end">
                        <div className="flex flex-col items-end text-xs font-mono tabular-nums">
                            <span className="text-green-600 dark:text-green-400">↓ {formatBytes(conn.download)}</span>
                            <span className="text-blue-500 dark:text-blue-400">↑ {formatBytes(conn.upload)}</span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded-full" 
                            onClick={() => closeConnection(conn.id)}
                            title="断开连接"
                        >
                            <XCircle size={18} />
                        </Button>
                    </div>
                </div>
            </Card>
         ))}
      </div>
    </div>
  );
}