import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Analytics() {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [topDomains, setTopDomains] = useState<any[]>([]);
  const [traffic24h, setTraffic24h] = useState<any[]>([]);

  const loadData = async () => {
    try {
      // 1. 历史趋势 & 域名 (Stats.json)
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
        
        setHistoryData(trend);
        setTopDomains(top);
      }

      // 2. === 修改：从后端读取 24h 流量 ===
      const history = await window.electronAPI?.getTrafficHistory();
      if (history) {
          setTraffic24h(history);
      }

    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => { await loadData(); toast.success("统计数据已刷新"); };

  // 重置功能需要扩展到后端，这里暂时只清空前端显示，实际需要增加IPC清空后端文件
  // 为了简单，这里暂不实现后端清空
  const clearHistory = () => { toast.info("暂不支持清空后端历史记录"); }

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">数据统计</h2>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw size={14} className="mr-2" /> 刷新
            </Button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-4 space-y-6 custom-scrollbar">
         {/* 24小时流量 */}
         <Card>
            <CardHeader className="pb-2">
                <CardTitle>24小时流量趋势</CardTitle>
                <CardDescription>后台每分钟自动记录 (MB)</CardDescription>
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
             {/* 域名排行 */}
             <Card>
                <CardHeader><CardTitle>历史访问排行</CardTitle><CardDescription>Top 10 Domains</CardDescription></CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topDomains} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                            <XAxis type="number" fontSize={12} stroke="#888888" />
                            <YAxis type="category" dataKey="name" width={110} fontSize={11} tick={{ fill: '#888888' }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
             </Card>

             {/* 每日趋势 */}
             <Card>
                <CardHeader><CardTitle>每日请求趋势</CardTitle><CardDescription>近 7 天总请求</CardDescription></CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="date" fontSize={12} stroke="#888888" />
                            <YAxis fontSize={12} stroke="#888888" />
                            <Tooltip />
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