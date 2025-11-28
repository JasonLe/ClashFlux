import { useEffect, useState } from "react";
import { getConfigs, updateConfigs, getVersion, ClashConfig } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrafficChart } from "@/components/TrafficChart";
import { Badge } from "@/components/ui/badge";
import { Laptop, Globe, Shield, Network, Wifi, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [version, setVersion] = useState<any>(null);
  const [config, setConfig] = useState<ClashConfig | null>(null);

  // 初始化加载数据
  useEffect(() => {
    const init = async () => {
        try {
            const v = await getVersion();
            setVersion(v);
            const c = await getConfigs();
            setConfig(c);
        } catch (e) {
            console.error("Dashboard init failed", e);
        }
    };
    init();
  }, []);

  // 切换运行模式
  const changeMode = async (mode: string) => {
    if (!config) return;
    const oldMode = config.mode;
    
    // 乐观更新 UI
    setConfig({ ...config, mode }); 
    
    try {
      await updateConfigs({ mode });
      toast.success(`已切换到 ${mode.toUpperCase()} 模式`);
      // 通知托盘刷新 (如果有 IPC)
      window.electronAPI?.refreshTray();
    } catch (e) {
      setConfig({ ...config, mode: oldMode }); // 回滚
      toast.error("切换失败");
    }
  };

  // 模式选择卡片组件
  const ModeCard = ({ mode, label, icon: Icon, desc }: any) => {
    const isActive = config?.mode.toLowerCase() === mode.toLowerCase();
    
    return (
        <div 
            onClick={() => changeMode(mode)}
            className={cn(
                "group cursor-pointer flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ease-out",
                "hover:-translate-y-1 hover:shadow-lg active:scale-95 active:translate-y-0", // 悬浮与点击动画
                isActive 
                ? "border-primary bg-primary/5 shadow-md" 
                : "border-transparent bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
        >
            <div className={cn(
                "p-3 rounded-full mb-3 transition-colors",
                isActive ? "bg-primary/10 text-primary" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:text-foreground"
            )}>
                <Icon size={24} />
            </div>
            <div className={cn("font-bold text-sm", isActive ? "text-primary" : "text-foreground")}>
                {label}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 text-center opacity-80">
                {desc}
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* 顶部：标题与版本 */}
      <div className="flex items-center justify-between animate-in-fade" style={{ animationDelay: '0ms' }}>
         <h2 className="text-2xl font-bold tracking-tight">概览</h2>
         <Badge variant={version ? "outline" : "destructive"} className="font-mono h-6">
            {version ? `Mihomo ${version.version}` : "Core Disconnected"}
         </Badge>
      </div>
      
      {/* 模式切换区 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in-fade" style={{ animationDelay: '50ms' }}>
         <ModeCard mode="rule" label="规则模式 (Rule)" icon={ShieldCheck} desc="智能分流，根据规则自动选择代理或直连" />
         <ModeCard mode="global" label="全局模式 (Global)" icon={Globe} desc="所有流量强制经过代理节点" />
         <ModeCard mode="direct" label="直连模式 (Direct)" icon={Laptop} desc="所有流量不走代理，直接访问" />
      </div>

      {/* 实时流量图表 */}
      <div className="grid gap-4 animate-in-fade" style={{ animationDelay: '100ms' }}>
        <TrafficChart />
      </div>
      
      {/* 底部信息栏 */}
      <div className="grid gap-4 md:grid-cols-3 animate-in-fade" style={{ animationDelay: '150ms' }}>
         <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">混合端口</CardTitle>
                <Network size={16} className="text-blue-500 opacity-70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold font-mono">{config?.["mixed-port"] || "-"}</div>
                <p className="text-xs text-muted-foreground mt-1">HTTP & SOCKS5</p>
            </CardContent>
         </Card>

         <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-green-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">局域网连接</CardTitle>
                <Wifi size={16} className="text-green-500 opacity-70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{config?.["allow-lan"] ? "开启" : "关闭"}</div>
                <p className="text-xs text-muted-foreground mt-1">Allow LAN</p>
            </CardContent>
         </Card>

         <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-purple-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">IPv6 支持</CardTitle>
                <Shield size={16} className="text-purple-500 opacity-70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{config?.ipv6 ? "开启" : "关闭"}</div>
                <p className="text-xs text-muted-foreground mt-1">IPv6 Protocol</p>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}