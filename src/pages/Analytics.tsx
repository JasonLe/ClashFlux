import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, Button } from "@heroui/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { RefreshCw, Trash2, TrendingUp, Globe2, BarChart2 } from "lucide-react";
import { toast } from "sonner";

export default function Analytics() {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [topDomains, setTopDomains] = useState<any[]>([]);
  const [traffic24h, setTraffic24h] = useState<any[]>([]);

  const loadData = async () => {
    try {
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
        const top = Object.entries(allDomains).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
        setHistoryData(trend);
        setTopDomains(top);
      }
      const history = await window.electronAPI?.getTrafficHistory();
      if (history) setTraffic24h(history);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); const t = setInterval(loadData, 60000); return () => clearInterval(t); }, []);

  const handleRefresh = async () => { await loadData(); toast.success("统计数据已刷新"); };
  const clearHistory = () => { toast.info("暂不支持清空后端历史记录"); }

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">数据统计</h2>
        <div className="flex gap-2">
            <Button size="sm" variant="bordered" color="danger" onPress={clearHistory} startContent={<Trash2 size={14}/>}>重置</Button>
            <Button size="sm" variant="flat" color="primary" onPress={handleRefresh} startContent={<RefreshCw size={14}/>}>刷新</Button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-4 space-y-6 custom-scrollbar">
         {/* 24小时流量 */}
         <Card className="border-none shadow-sm bg-content1">
            <CardHeader className="flex gap-3 pb-0">
                <div className="p-2 bg-success/10 rounded-lg text-success"><TrendingUp size={20}/></div>
                <div className="flex flex-col">
                    <p className="text-md font-bold">24小时流量趋势</p>
                    <p className="text-small text-default-500">每分钟流量消耗记录 (MB)</p>
                </div>
            </CardHeader>
            <CardBody className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={traffic24h}>
                        <defs>
                            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#17c964" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#17c964" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="time" fontSize={10} minTickGap={30} stroke="var(--nextui-default-400)" />
                        <YAxis fontSize={10} stroke="var(--nextui-default-400)" />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} stroke="var(--nextui-default-300)" />
                        <Tooltip labelFormatter={(l) => `时间: ${l}`} formatter={(v: number) => [`${v} MB`, "消耗"]} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'var(--nextui-content2)', color: 'var(--nextui-foreground)' }} />
                        <Area type="monotone" dataKey="value" stroke="#17c964" fillOpacity={1} fill="url(#colorTraffic)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </CardBody>
         </Card>

         <div className="grid gap-6 md:grid-cols-2">
             <Card className="border-none shadow-sm bg-content1">
                <CardHeader className="flex gap-3 pb-0">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><Globe2 size={20}/></div>
                    <div className="flex flex-col"><p className="text-md font-bold">历史访问排行</p><p className="text-small text-default-500">Top 10 Domains</p></div>
                </CardHeader>
                <CardBody className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topDomains} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} stroke="var(--nextui-default-300)" />
                            <XAxis type="number" fontSize={12} stroke="var(--nextui-default-400)" />
                            <YAxis type="category" dataKey="name" width={110} fontSize={11} tick={{ fill: 'var(--nextui-default-500)' }} />
                            <Tooltip cursor={{fill: 'var(--nextui-content2)'}} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'var(--nextui-content2)' }} />
                            <Bar dataKey="value" fill="#006FEE" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardBody>
             </Card>

             <Card className="border-none shadow-sm bg-content1">
                <CardHeader className="flex gap-3 pb-0">
                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary"><BarChart2 size={20}/></div>
                    <div className="flex flex-col"><p className="text-md font-bold">每日请求趋势</p><p className="text-small text-default-500">近 7 天总请求数</p></div>
                </CardHeader>
                <CardBody className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} stroke="var(--nextui-default-300)" />
                            <XAxis dataKey="date" fontSize={12} stroke="var(--nextui-default-400)" />
                            <YAxis fontSize={12} stroke="var(--nextui-default-400)" />
                            <Tooltip cursor={{fill: 'var(--nextui-content2)'}} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'var(--nextui-content2)' }} />
                            <Bar dataKey="total" fill="#9353d3" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardBody>
             </Card>
         </div>
      </div>
    </div>
  );
}