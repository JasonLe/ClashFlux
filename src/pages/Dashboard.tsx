import { useEffect, useState } from "react";
import { getConfigs, updateConfigs, getVersion, ClashConfig, getConnections, updateApiConfig } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrafficChart } from "@/components/TrafficChart";
import { Badge } from "@/components/ui/badge";
import { Laptop, Globe, ShieldCheck, MapPin, Activity, Download, Upload, RotateCw, AlertTriangle, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTraffic } from "@/hooks/useTraffic";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { CountUp } from "@/components/CountUp"; // 引入新组件

export default function Dashboard() {
  const [version, setVersion] = useState<any>(null);
  const [config, setConfig] = useState<ClashConfig | null>(null);
  const [connCount, setConnCount] = useState(0);
  const [restarting, setRestarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const { currentSpeed } = useTraffic();

  // === 1. 核心修复：IP 多源获取逻辑 ===
  const fetchIpWithFallback = async () => {
    // 优先级：IP.SB (最准) -> IPAPI.co -> IP-API (HTTP fallback)
    const sources = [
        { url: 'https://api.ip.sb/geoip', type: 'sb' }, 
        { url: 'https://ipapi.co/json/', type: 'co' },
        { url: 'http://ip-api.com/json', type: 'com' }
    ];

    for (const source of sources) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
            
            const res = await fetch(source.url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!res.ok) continue;
            const data = await res.json();

            // 统一数据格式
            if (source.type === 'sb') {
                return { query: data.ip, country: data.country, city: data.city, isp: data.isp };
            } else if (source.type === 'com') {
                return { query: data.query, country: data.country, city: data.city, isp: data.isp };
            } else {
                return { query: data.ip, country: data.country_name, city: data.city, isp: data.org };
            }
        } catch (e) {}
    }
    throw new Error("All IP sources failed");
  };

  const { data: ipInfo, refetch: fetchIp, isRefetching: ipLoading, isError: ipError } = useQuery({
    queryKey: ['ipInfo'],
    queryFn: fetchIpWithFallback,
    staleTime: 1000 * 60 * 60, // 1小时缓存
    refetchOnWindowFocus: false,
    retry: 1
  });

  const handleManualRefreshIp = async () => {
      const res = await fetchIp();
      if (res.isSuccess) toast.success("IP 信息已更新");
      else toast.error("IP 获取失败，请检查网络");
  };

  // === 2. 内核保活心跳 ===
  const checkHealth = async () => {
    try {
        const v = await getVersion();
        setVersion(v);
        setErrorMsg(""); 
        setConfig(prev => { if (!prev) getConfigs().then(setConfig); return prev; });
        getConnections().then(d => setConnCount(d.connections.length)).catch(() => {});
    } catch (e: any) {
        setVersion(null);
        setConnCount(0);
        if (e.response?.status === 401) setErrorMsg("鉴权失败：密钥(Secret)不匹配");
        else if (e.code === "ERR_NETWORK") setErrorMsg("无法连接：端口可能被占用或被拦截");
        else setErrorMsg(e.message || "未知连接错误");
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRestart = async () => {
      setRestarting(true);
      try {
          await window.electronAPI?.restartKernel();
          toast.success("重启指令已发送");
          setVersion(null);
          setTimeout(checkHealth, 4000);
      } catch (e) { toast.error("重启失败"); } 
      finally { setRestarting(false); }
  };

  const handleResetApi = () => {
      updateApiConfig("127.0.0.1", "9097", "");
      toast.success("连接配置已重置", { description: "正在重试连接..." });
      setTimeout(checkHealth, 500);
  };

  const changeMode = async (mode: string) => {
    if (!config) return toast.error("内核未连接");
    const oldMode = config.mode;
    setConfig({ ...config, mode }); 
    try { await updateConfigs({ mode }); toast.success(`已切换到 ${mode.toUpperCase()} 模式`); window.electronAPI?.refreshTray(); } 
    catch (e) { setConfig({ ...config, mode: oldMode }); toast.error("切换失败"); }
  };

  const formatSpeed = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB/s`;
  };

  const ModeCard = ({ mode, label, icon: Icon, desc }: any) => {
    const isActive = config?.mode.toLowerCase() === mode.toLowerCase();
    return (
        <div onClick={() => changeMode(mode)} className={cn("group cursor-pointer flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg active:scale-95", isActive ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800")}>
            <div className={cn("p-3 rounded-full mb-3 transition-colors", isActive ? "bg-primary/10 text-primary" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500")}><Icon size={24} /></div>
            <div className={cn("font-bold text-sm", isActive ? "text-primary" : "text-foreground")}>{label}</div>
            <div className="text-[10px] text-muted-foreground mt-1 text-center opacity-80">{desc}</div>
        </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between animate-in-fade">
         <h2 className="text-2xl font-bold tracking-tight">概览</h2>
         <div className="flex items-center gap-2">
             {!version && (
                 <Button variant="destructive" size="sm" onClick={handleRestart} disabled={restarting}>
                     <RotateCw className={`mr-2 h-4 w-4 ${restarting ? 'animate-spin' : ''}`} /> {restarting ? "重启中..." : "重启内核"}
                 </Button>
             )}
             <Badge variant={version ? "outline" : "destructive"} className="font-mono h-8 px-3">
                {version ? `Mihomo ${version.version}` : "Disconnected"}
             </Badge>
         </div>
      </div>
      
      {!version && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-800 dark:text-red-300 animate-in-fade">
              <div className="flex items-center gap-3"><AlertTriangle size={20} className="shrink-0" /><div className="text-sm"><div className="font-bold">内核未连接</div><div>原因：{errorMsg || "正在尝试连接..."}</div></div></div>
              {(errorMsg.includes("鉴权") || errorMsg.includes("401")) && (<Button variant="outline" size="sm" onClick={handleResetApi} className="bg-white/50 border-red-200 hover:bg-red-100 text-red-800"><KeyRound size={14} className="mr-2"/> 重置密钥</Button>)}
          </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in-fade" style={{ animationDelay: '50ms' }}>
         {/* IP 卡片 */}
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">当前 IP</CardTitle>
                <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-primary" onClick={handleManualRefreshIp} disabled={ipLoading} title="刷新 IP">
                    <RefreshCw size={14} className={ipLoading ? "animate-spin" : ""} />
                </Button>
            </CardHeader>
            <CardContent>
                {ipLoading && !ipInfo ? (
                    <div className="animate-pulse space-y-2"><div className="h-6 bg-muted rounded w-3/4"></div><div className="h-3 bg-muted rounded w-1/2"></div></div>
                ) : (
                    <>
                        <div className="text-lg font-bold truncate" title={ipInfo?.query}>
                            {ipError ? "获取失败" : (ipInfo?.query || "Unknown")}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin size={10} /> 
                            {ipInfo ? `${ipInfo.country || ""} ${ipInfo.city || ""}` : "-"}
                        </div>
                    </>
                )}
            </CardContent>
         </Card>

         {/* 活跃连接 (动画数字) */}
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">活跃连接</CardTitle><Activity size={16} className="text-muted-foreground"/></CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    <CountUp end={connCount} />
                </div>
                <p className="text-xs text-muted-foreground">Sessions</p>
            </CardContent>
         </Card>

         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">下载</CardTitle><Download size={16} className="text-green-500"/></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600 font-mono tracking-tight">{formatSpeed(currentSpeed.down)}</div></CardContent>
         </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">上传</CardTitle><Upload size={16} className="text-blue-500"/></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-600 font-mono tracking-tight">{formatSpeed(currentSpeed.up)}</div></CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in-fade" style={{ animationDelay: '100ms' }}>
         <ModeCard mode="rule" label="规则模式" icon={ShieldCheck} desc="智能分流" />
         <ModeCard mode="global" label="全局模式" icon={Globe} desc="强制代理" />
         <ModeCard mode="direct" label="直连模式" icon={Laptop} desc="不走代理" />
      </div>

      <div className="grid gap-4 animate-in-fade" style={{ animationDelay: '150ms' }}>
        <TrafficChart />
      </div>
    </div>
  );
}