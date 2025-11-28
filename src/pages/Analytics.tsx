import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

// === 全局缓存 ===
let cachedHistory: any[] = [];
let cachedDomains: any[] = [];
let cached24h: any[] = [];

export default function Analytics() {
  const [historyData, setHistoryData] = useState<any[]>(cachedHistory);
  const [topDomains, setTopDomains] = useState<any[]>(cachedDomains);
  const [traffic24h, setTraffic24h] = useState<any[]>(cached24h);

  // 加载数据
  const loadData = async () => {
    try {
      // 1. 历史趋势 (Stats.json)
      const stats = await window.electronAPI?.getHistoryStats();
      if (stats) {
        const trend = Object.keys(stats).sort().map(date => ({ date, total: stats[date].total })).slice(-7);
        
        const allDomains: Record<string, number> = {};
        Object.values(stats).forEach((day: any) => {
            if (day.domains) {
                Object.entries(day.domains).forEach(([domain, count]) => {
                    allDomains[domain] = (allDomains[domain] || 0) + (count as number);
                });
            }
        });
        const top = Object.entries(allDomains)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        
        // 更新缓存
        cachedHistory = trend;
        cachedDomains = top;
        setHistoryData(trend);
        setTopDomains(top);
      }

      // 2. 24小时流量 (LocalStorage)
      const saved = localStorage.getItem("traffic_24h_history");
      if (saved) {
          const parsed = JSON.parse(saved);
          const now = Date.now();
          const validData = parsed.filter((item: any) => now - item.timestamp < 24 * 60 * 60 * 1000);
          cached24h = validData;
          setTraffic24h(validData);
      }

    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    // 首次加载，如果缓存为空则请求，否则先用缓存再请求
    loadData();
    // 自动刷新 (每 60秒)
    const timer = setInterval(loadData, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
      await loadData();
      toast.success("统计数据已刷新");
  };

  const clearHistory = () => {
      localStorage.removeItem("traffic_24h_history");
      setTraffic24h([]);
      cached24h = [];
      toast.success("24小时流量历史已清空");
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">数据统计</h2>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearHistory}>
                <Trash2 size={14} className="mr-2" /> 重置流量图
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw size={14} className="mr-2" /> 刷新
            </Button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-4 space-y-6 custom-scrollbar">
         {/* 上半部分：24小时流量图 */}
         <Card>
            <CardHeader className="pb-2">
                <CardTitle>24小时流量趋势</CardTitle>
                <CardDescription>每分钟统计的流量消耗 (上传+下载)</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={traffic24h}>
                        <defs>
                            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="time" fontSize={10} minTickGap={30} stroke="#888888" />
                        <YAxis fontSize={10} stroke="#888888" />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <Tooltip labelFormatter={(l) => `时间: ${l}`} formatter={(v: number) => [`${v} MB`, "消耗"]} />
                        <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorTraffic)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
         </Card>

         <div className="grid gap-6 md:grid-cols-2">
             {/* 左下：域名排行 */}
             <Card>
                <CardHeader>
                    <CardTitle>历史访问排行 (Top 10)</CardTitle>
                    <CardDescription>基于本地日志分析</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topDomains} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                            <XAxis type="number" fontSize={12} stroke="#888888" />
                            <YAxis type="category" dataKey="name" width={110} fontSize={11} tick={{ fill: '#888888' }} />
                            <Tooltip formatter={(value: number) => [`${value} 次`, "访问"]} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
             </Card>

             {/* 右下：每日趋势 */}
             <Card>
                <CardHeader>
                    <CardTitle>每日请求趋势</CardTitle>
                    <CardDescription>近 7 天总请求数</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="date" fontSize={12} stroke="#888888" />
                            <YAxis fontSize={12} stroke="#888888" />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="total" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
             </Card>
         </div>
      </div>
    </div>
  );
}