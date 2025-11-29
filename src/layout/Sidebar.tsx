import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Globe, Radio, Network, PieChart, FileText, Settings, 
  Minus, Square, X, Zap, Activity
} from "lucide-react";
import { Button, Tooltip, Switch, cn } from "@heroui/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getConfigs, updateConfigs, getSystemProxyStatus, getVersion } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

const menuItems = [
  { icon: LayoutDashboard, label: "仪表盘", path: "/" },
  { icon: Globe, label: "代理组", path: "/proxies" },
  { icon: Radio, label: "订阅源", path: "/profiles" },
  { icon: Network, label: "连接流", path: "/connections" },
  { icon: PieChart, label: "统计", path: "/analytics" },
  { icon: FileText, label: "日志", path: "/logs" },
  { icon: Settings, label: "设置", path: "/settings" },
];

export function Sidebar() {
  const isMac = window.electronAPI?.platform === 'darwin';
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: config } = useQuery({ queryKey: ["configs"], queryFn: getConfigs });
  const { data: isSysProxy } = useQuery({ queryKey: ["sysProxy"], queryFn: getSystemProxyStatus });
  const { data: version } = useQuery({ queryKey: ["version"], queryFn: getVersion });

  const sysProxyMutation = useMutation({
    mutationFn: async (v: boolean) => await window.electronAPI?.setSystemProxy(v),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sysProxy"] }),
    onError: () => toast.error("系统代理设置失败")
  });

  const configMutation = useMutation({
    mutationFn: updateConfigs,
    onSuccess: () => {
        window.electronAPI?.refreshTray();
        queryClient.invalidateQueries({ queryKey: ["configs"] });
    },
    onError: () => toast.error("修改失败")
  });

  return (
    <div className="w-[260px] h-screen flex flex-col shrink-0 bg-background/40 backdrop-blur-2xl border-r border-divider/50 relative z-50">
      
      {/* 拖拽区域 */}
      <div className="h-14 flex items-center px-6 shrink-0 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
         {!isMac && (
           <div className="flex gap-2 group z-50 transition-opacity opacity-60 hover:opacity-100" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <div onClick={() => window.electronAPI?.close()} className="w-3 h-3 rounded-full bg-[#FF5F57] hover:scale-110 cursor-pointer shadow-sm border border-black/10" />
              <div onClick={() => window.electronAPI?.minimize()} className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:scale-110 cursor-pointer shadow-sm border border-black/10" />
              <div onClick={() => window.electronAPI?.maximize()} className="w-3 h-3 rounded-full bg-[#27C93F] hover:scale-110 cursor-pointer shadow-sm border border-black/10" />
           </div>
         )}
      </div>

      {/* Header */}
      <div className="px-6 mb-8 flex items-center gap-3 select-none">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Zap size={18} fill="currentColor" />
        </div>
        <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">Clash Flux</h1>
            <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${version ? 'bg-success' : 'bg-danger'} animate-pulse`}></span>
                <p className="text-[10px] text-default-400 font-mono">{version ? version.version : 'Offline'}</p>
            </div>
        </div>
      </div>
      
      {/* Menu */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path} className="block relative group">
               {isActive && (
                 <motion.div
                   layoutId="sidebar-active"
                   className="absolute inset-0 bg-default-100 dark:bg-default-50/50 rounded-xl"
                   transition={{ type: "spring", stiffness: 300, damping: 30 }}
                 />
               )}
               <div className={cn(
                   "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200",
                   isActive ? "text-primary font-semibold" : "text-default-500 hover:text-foreground hover:bg-default-50/50"
               )}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-primary" : "text-default-400"} />
                  <span>{item.label}</span>
               </div>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom Controls */}
      <div className="p-4 mx-3 mb-4 mt-2 rounded-2xl bg-content2/50 border border-white/5 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-default-600">系统代理</span>
            <Switch 
                size="sm" 
                color="success"
                isSelected={!!isSysProxy} 
                onValueChange={(v) => sysProxyMutation.mutate(v)}
                classNames={{ wrapper: "group-data-[selected=true]:bg-success" }}
            />
        </div>
        <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-default-600">TUN 模式</span>
            <Switch 
                size="sm" 
                color="primary"
                isSelected={config?.tun?.enable || false} 
                onValueChange={(v) => configMutation.mutate({ tun: { enable: v } })} 
            />
        </div>
      </div>
    </div>
  );
}