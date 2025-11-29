import { useEffect, useState } from "react";
import { getConfigs, updateConfigs, getVersion, ClashConfig, getConnections } from "@/lib/api";
import { Card, CardHeader, CardBody, Button, Chip, Tabs, Tab } from "@heroui/react";
import { TrafficChart } from "@/components/TrafficChart";
import { Laptop, Globe, ShieldCheck, MapPin, Activity, Download, Upload, RotateCw, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTraffic } from "@/hooks/useTraffic";
import { useQuery } from "@tanstack/react-query";
import { CountUp } from "@/components/CountUp";

export default function Dashboard() {
  // ... State Logic 保持不变 (copy from previous logic) ...
  const [config, setConfig] = useState<ClashConfig | null>(null);
  const [connCount, setConnCount] = useState(0);
  const [restarting, setRestarting] = useState(false);
  const { currentSpeed } = useTraffic();

  const { data: ipInfo, refetch: fetchIp, isRefetching: ipLoading } = useQuery({
    queryKey: ['ipInfo'],
    queryFn: async () => (await fetch("https://ipapi.co/json/")).json(),
    staleTime: 3600000,
    refetchOnWindowFocus: false,
  });

  const checkHealth = async () => {
    try { setConfig(await getConfigs()); getConnections().then(d => setConnCount(d.connections.length)).catch(()=>{}); } catch (e) {}
  };
  useEffect(() => { checkHealth(); const t = setInterval(checkHealth, 2000); return () => clearInterval(t); }, []);

  const handleRestart = async () => {
      setRestarting(true);
      try { await window.electronAPI?.restartKernel(); toast.success("已重启"); setTimeout(checkHealth, 4000); } 
      catch (e) { toast.error("失败"); } finally { setRestarting(false); }
  };

  const handleModeChange = async (key: React.Key) => {
      if (!config) return;
      const mode = key as string;
      const oldMode = config.mode;
      setConfig({ ...config, mode });
      try { await updateConfigs({ mode }); window.electronAPI?.refreshTray(); } catch { setConfig({ ...config, mode: oldMode }); toast.error("失败"); }
  };

  const formatSpeed = (bytes: number) => {
    if (bytes < 1024) return { val: bytes, unit: 'B/s' };
    if (bytes < 1024 * 1024) return { val: (bytes / 1024).toFixed(1), unit: 'KB/s' };
    return { val: (bytes / 1024 / 1024).toFixed(1), unit: 'MB/s' };
  };

  const down = formatSpeed(currentSpeed.down);
  const up = formatSpeed(currentSpeed.up);

  return (
    <div className="h-full flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between shrink-0 p-1">
         <div>
             <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
             <p className="text-default-500 text-sm">System Status Monitor</p>
         </div>
         <Button color="warning" variant="faded" size="sm" startContent={<RotateCw size={16}/>} onPress={handleRestart} isLoading={restarting}>重启内核</Button>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6 px-1">
         {/* 1. 流量图 */}
         <div className="col-span-12 lg:col-span-8 h-[320px]">
            <TrafficChart />
         </div>

         {/* 2. 模式切换 */}
         <Card className="col-span-12 lg:col-span-4 h-[320px] border-none bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardHeader className="font-bold text-default-700 px-6 pt-6">运行模式</CardHeader>
            <CardBody className="px-6 pb-6">
                <Tabs 
                    aria-label="Mode" 
                    color="primary" 
                    variant="light"
                    isVertical 
                    classNames={{ tabList: "w-full gap-2", cursor: "w-full bg-primary/10 rounded-lg", tab: "h-12 justify-start px-4", tabContent: "text-default-500 group-data-[selected=true]:text-primary font-medium" }}
                    selectedKey={config?.mode.toLowerCase()}
                    onSelectionChange={handleModeChange}
                >
                    <Tab key="rule" title={<div className="flex items-center gap-3"><ShieldCheck size={20}/><span>规则模式</span></div>}/>
                    <Tab key="global" title={<div className="flex items-center gap-3"><Globe size={20}/><span>全局模式</span></div>}/>
                    <Tab key="direct" title={<div className="flex items-center gap-3"><Laptop size={20}/><span>直连模式</span></div>}/>
                </Tabs>
            </CardBody>
         </Card>

         {/* 3. 数据卡片 (连接数, 速度) */}
         {[
             { title: "Active Connections", val: <CountUp end={connCount} />, icon: Activity, color: "text-foreground", bg: "bg-default-100" },
             { title: "Realtime Download", val: down.val, unit: down.unit, icon: Download, color: "text-success", bg: "bg-success/10" },
             { title: "Realtime Upload", val: up.val, unit: up.unit, icon: Upload, color: "text-primary", bg: "bg-primary/10" }
         ].map((item, i) => (
             <Card key={i} className="col-span-12 md:col-span-4 border-none bg-content1 shadow-sm hover:scale-[1.02] transition-transform">
                <CardBody className="flex flex-row items-center justify-between p-5">
                    <div>
                        <p className="text-tiny uppercase font-bold text-default-400 tracking-wider">{item.title}</p>
                        <div className={`text-3xl font-bold ${item.color} mt-1 flex items-baseline gap-1`}>
                            {item.val} <span className="text-sm font-medium text-default-400">{item.unit}</span>
                        </div>
                    </div>
                    <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}><item.icon size={24} /></div>
                </CardBody>
             </Card>
         ))}

         {/* 4. IP 信息 */}
         <Card className="col-span-12 border-none bg-content1 shadow-sm">
            <CardBody className="flex flex-row items-center justify-between p-5">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-secondary/10 text-secondary"><MapPin size={24}/></div>
                    <div>
                        <div className="text-xl font-bold flex items-center gap-2">
                            {ipInfo?.ip || "Loading..."}
                            <Chip size="sm" variant="flat" color="secondary">{ipInfo?.org || "ISP"}</Chip>
                        </div>
                        <p className="text-small text-default-400 mt-0.5">{ipInfo?.country_name}, {ipInfo?.city}</p>
                    </div>
                </div>
                <Button isIconOnly variant="light" onPress={() => fetchIp()} isLoading={ipLoading}><RefreshCw size={20}/></Button>
            </CardBody>
         </Card>
      </div>
    </div>
  );
}