import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid 
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Analytics() {
  const [domainStats, setDomainStats] = useState<any[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<any[]>([]);
  
  // 用于记录上一次检测时的总流量，用来计算增量
  const lastTotalRef = useRef<number>(0);

  // === 1. 核心逻辑：流量趋势记录器 ===
  useEffect(() => {
    // 尝试从 LocalStorage 加载历史数据
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem("traffic_24h_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          // 过滤掉超过24小时的数据 (24 * 60 * 60 * 1000 ms)
          const now = Date.now();
          const validData = parsed.filter((item: any) => now - item.timestamp < 24 * 60 * 60 * 1000);
          setTrafficHistory(validData);
        }
      } catch (e) { console.error("读取历史流量失败", e); }
    };

    loadHistory();

    // 定时器：每 1 分钟记录一次流量消耗
    const recordTraffic = async () => {
      try {
        const { data } = await apiClient.get('/connections');
        // 获取当前内核记录的总流量 (上传+下载)
        const currentTotal = data.downloadTotal + data.uploadTotal;
        
        // 如果是第一次运行，先初始化基准值，不记录增量（避免出现巨大的初始柱子）
        if (lastTotalRef.current === 0) {
          lastTotalRef.current = currentTotal;
          return;
        }

        // 计算这一分钟内的增量
        let delta = currentTotal - lastTotalRef.current;
        
        // 异常处理：如果内核重启了，currentTotal 会变小，此时 delta 为负数，重置基准
        if (delta < 0) {
          lastTotalRef.current = currentTotal;
          delta = 0;
        } else {
          lastTotalRef.current = currentTotal;
        }

        // 只有当有流量产生时才记录，或者强制记录以保持时间轴连续
        // 这里转为 MB
        const deltaMB = parseFloat((delta / 1024 / 1024).toFixed(2));
        
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const newPoint = {
            time: timeStr,
            timestamp: now.getTime(),
            value: deltaMB
        };

        setTrafficHistory(prev => {
            const next = [...prev, newPoint];
            // 再次确保只保留24小时内的数据 (约1440个点)
            // 为了性能，也可以限制只保留最近 60 个点(1小时)或更多，这里我们限制 100 点用于展示
            // 如果想展示完整24小时，可以把 slice 去掉或者调大
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const filtered = next.filter(p => p.timestamp > oneDayAgo);
            
            // 持久化保存
            localStorage.setItem("traffic_24h_history", JSON.stringify(filtered));
            return filtered;
        });

      } catch (e) { console.error(e) }
    };

    // 设置定时器 (60秒一次)
    const interval = setInterval(recordTraffic, 60 * 1000);
    // 立即执行一次以校准基准值
    recordTraffic();

    return () => clearInterval(interval);
  }, []);

  // === 2. 辅助逻辑：域名流量分析 (保持不变) ===
  useEffect(() => {
    const analyzeDomains = async () => {
      try {
        const { data } = await apiClient.get('/connections');
        const conns = data.connections || [];
        const domains: Record<string, number> = {};
        
        conns.forEach((c: any) => {
            const host = c.metadata.host || c.metadata.destinationIP;
            if (host) domains[host] = (domains[host] || 0) + c.upload + c.download;
        });
        
        const domainData = Object.entries(domains)
            .map(([name, bytes]) => ({ 
                name, 
                value: bytes,
                valueMB: parseFloat(((bytes as number) / 1024 / 1024).toFixed(2))
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        setDomainStats(domainData);
      } catch (e) {}
    };
    analyzeDomains();
    const timer = setInterval(analyzeDomains, 3000);
    return () => clearInterval(timer);
  }, []);

  // 清空历史记录
  const clearHistory = () => {
    localStorage.removeItem("traffic_24h_history");
    setTrafficHistory([]);
    toast.success("流量历史已重置");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">流量统计分析</h2>
        <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground hover:text-red-500">
            <Trash2 size={14} className="mr-2" /> 重置历史
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 flex-1 min-h-0">
         
         {/* 左侧：域名流量排行 (条形图) */}
         <Card className="flex flex-col">
            <CardHeader className="shrink-0">
                <CardTitle>域名流量排行 (Top 10)</CardTitle>
                <CardDescription>当前活跃连接的累计流量</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={domainStats} 
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                        <XAxis type="number" fontSize={12} stroke="#888888" />
                        <YAxis type="category" dataKey="name" width={120} fontSize={11} tick={{ fill: '#888888' }} />
                        <Tooltip formatter={(value: number) => [`${value} MB`, "流量"]} contentStyle={{ borderRadius: '8px' }} />
                        <Bar dataKey="valueMB" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
         </Card>

         {/* 右侧：24小时流量趋势 (面积图) */}
         <Card className="flex flex-col">
            <CardHeader className="shrink-0">
                <CardTitle>24小时流量趋势</CardTitle>
                <CardDescription>每分钟统计一次增量消耗</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
                {trafficHistory.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trafficHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" fontSize={10} minTickGap={30} stroke="#888888" />
                            <YAxis fontSize={10} stroke="#888888" />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <Tooltip 
                                labelFormatter={(label) => `时间: ${label}`}
                                formatter={(value: number) => [`${value} MB`, "消耗"]}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#10b981" 
                                fillOpacity={1} 
                                fill="url(#colorTraffic)" 
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                        <div className="animate-pulse">正在收集数据...</div>
                        <div className="text-xs mt-2 opacity-50">请保持应用运行，数据将每分钟更新一次</div>
                    </div>
                )}
            </CardContent>
         </Card>
      </div>
    </div>
  );
}