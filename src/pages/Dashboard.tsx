import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getConfigs, updateConfigs, getVersion, ClashConfig } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrafficChart } from "@/components/TrafficChart";
import { Badge } from "@/components/ui/badge";
import { Laptop, Globe, Shield, LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ModeCardProps {
  mode: "rule" | "global" | "direct";
  label: string;
  icon: LucideIcon;
  desc: string;
  isActive: boolean;
  onClick: (mode: string) => void;
}

const ModeCard = ({ mode, label, icon: Icon, desc, isActive, onClick }: ModeCardProps) => (
  <div 
      onClick={() => onClick(mode)}
      className={cn(
          "cursor-pointer flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all hover:scale-105",
          isActive 
          ? "border-primary bg-primary/5 shadow-lg" 
          : "border-transparent bg-card hover:bg-accent hover:border-accent"
      )}
  >
      <Icon size={24} className={cn("mb-2", isActive ? "text-primary" : "text-muted-foreground")} />
      <div className={cn("font-bold text-sm", isActive ? "text-primary" : "text-foreground")}>{label}</div>
      <div className="text-[10px] text-muted-foreground mt-1">{desc}</div>
  </div>
);

export default function Dashboard() {
  const queryClient = useQueryClient();

  const { data: version } = useQuery({
    queryKey: ['version'],
    queryFn: getVersion,
  });

  const { data: config } = useQuery<ClashConfig>({
    queryKey: ['configs'],
    queryFn: getConfigs,
    refetchInterval: 3000,
  });

  const mutation = useMutation({
    mutationFn: updateConfigs,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
      toast.success(`已切换到 ${variables.mode} 模式`);
    },
    onError: () => {
      toast.error("切换失败");
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    }
  });

  const changeMode = (mode: string) => {
    mutation.mutate({ mode });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">概览</h2>
         <Badge variant="outline" className="font-mono">{version?.version || "Connecting..."}</Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
         <ModeCard mode="rule" label="规则模式" icon={Shield} desc="智能分流，推荐使用" isActive={config?.mode.toLowerCase() === 'rule'} onClick={changeMode} />
         <ModeCard mode="global" label="全局模式" icon={Globe} desc="所有流量走代理" isActive={config?.mode.toLowerCase() === 'global'} onClick={changeMode} />
         <ModeCard mode="direct" label="直连模式" icon={Laptop} desc="不走代理" isActive={config?.mode.toLowerCase() === 'direct'} onClick={changeMode} />
      </div>

      <div className="grid gap-4">
        <TrafficChart />
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">端口信息</CardTitle></CardHeader>
            <CardContent>
                <div className="text-2xl font-bold font-mono">{config?.["mixed-port"] || '...'}</div>
                <div className="text-xs text-muted-foreground">Mixed Port</div>
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">允许局域网</CardTitle></CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{config ? (config["allow-lan"] ? "On" : "Off") : '...'}</div>
                <div className="text-xs text-muted-foreground">Allow LAN</div>
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">IPv6</CardTitle></CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{config ? (config.ipv6 ? "On" : "Off") : '...'}</div>
                <div className="text-xs text-muted-foreground">Support</div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}