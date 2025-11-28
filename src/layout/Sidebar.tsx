import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Globe, Settings, Radio, Minus, Square, X, PieChart, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getConfigs, updateConfigs, getSystemProxyStatus } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const menuItems = [
  { icon: LayoutDashboard, label: "仪表盘", path: "/" },
  { icon: Globe, label: "代理", path: "/proxies" },
  { icon: Radio, label: "订阅", path: "/profiles" },
  { icon: PieChart, label: "统计", path: "/analytics" },
  { icon: FileText, label: "日志", path: "/logs" },
  { icon: Settings, label: "设置", path: "/settings" },
];

export function Sidebar() {
  const isMac = window.electronAPI?.platform === 'darwin';
  const queryClient = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ["configs"],
    queryFn: getConfigs,
  });

  const { data: isSysProxy } = useQuery({
    queryKey: ["sysProxy"],
    queryFn: getSystemProxyStatus,
  });

  const sysProxyMutation = useMutation({
    mutationFn: async (checked: boolean) => await window.electronAPI?.setSystemProxy(checked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sysProxy"] }),
    onError: () => toast.error("设置失败")
  });

  const configMutation = useMutation({
    mutationFn: updateConfigs,
    onSuccess: () => {
        window.electronAPI?.refreshTray();
        queryClient.invalidateQueries({ queryKey: ["configs"] });
    },
    onError: () => toast.error("修改失败")
  });

  const handleClose = () => window.electronAPI?.close();
  const handleMin = () => window.electronAPI?.minimize();
  const handleMax = () => window.electronAPI?.maximize();

  return (
    <div className="w-64 h-screen bg-zinc-50/80 dark:bg-zinc-900/80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 backdrop-blur-xl transition-colors duration-300">
      
      {/* 拖拽区域 */}
      <div className="h-12 flex items-center px-4 shrink-0 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
         {!isMac && (
           <div className="flex gap-2 group z-50 transition-opacity duration-300 hover:opacity-100 opacity-60" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <div onClick={handleClose} className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] hover:scale-110 transition-transform cursor-pointer flex items-center justify-center group-hover:bg-[#FF5F57]"><X size={8} className="opacity-0 group-hover:opacity-60 text-black" /></div>
              <div onClick={handleMin} className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:scale-110 transition-transform cursor-pointer flex items-center justify-center group-hover:bg-[#FFBD2E]"><Minus size={8} className="opacity-0 group-hover:opacity-60 text-black" /></div>
              <div onClick={handleMax} className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:scale-110 transition-transform cursor-pointer flex items-center justify-center group-hover:bg-[#27C93F]"><Square size={6} className="opacity-0 group-hover:opacity-60 text-black" /></div>
           </div>
         )}
      </div>

      <div className="text-xl font-bold mb-6 px-6 flex items-center gap-2 tracking-tight">
        Clash <span className="text-primary">Flux</span>
      </div>
      
      <nav className="flex flex-col gap-1 px-3 flex-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out relative overflow-hidden",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-zinc-500 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-white/5 hover:translate-x-1"
              )
            }
          >
            <item.icon size={18} className="transition-transform duration-300 group-hover:scale-110" />
            {item.label}
            {/* 选中态的光泽效果 */}
            {({isActive}) => isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* 底部控制面板 - 玻璃拟态卡片 */}
      <div className="p-4 mx-2 mb-2 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 backdrop-blur-md space-y-4 shadow-sm">
        
        {/* 模式选择 */}
        <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1 font-bold">MODE</Label>
            <Select 
                value={config?.mode.toLowerCase() || 'rule'} 
                onValueChange={(val) => configMutation.mutate({ mode: val })}
            >
                <SelectTrigger className="h-8 text-xs bg-transparent border-black/10 dark:border-white/10 focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="rule">Rule (规则)</SelectItem>
                    <SelectItem value="global">Global (全局)</SelectItem>
                    <SelectItem value="direct">Direct (直连)</SelectItem>
                </SelectContent>
            </Select>
        </div>

        {/* 开关组 */}
        <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between group">
                <div className="flex flex-col">
                    <Label className="font-medium text-xs cursor-pointer group-hover:text-primary transition-colors">System Proxy</Label>
                </div>
                <Switch 
                    checked={!!isSysProxy} 
                    onCheckedChange={(c) => sysProxyMutation.mutate(c)} 
                    className="scale-75 data-[state=checked]:bg-green-500" 
                />
            </div>
            <div className="flex items-center justify-between group">
                <div className="flex flex-col">
                    <Label className="font-medium text-xs cursor-pointer group-hover:text-primary transition-colors">TUN Mode</Label>
                </div>
                <Switch 
                    checked={config?.tun?.enable || false} 
                    onCheckedChange={(c) => configMutation.mutate({ tun: { enable: c } })} 
                    className="scale-75 data-[state=checked]:bg-blue-500" 
                />
            </div>
        </div>
      </div>
    </div>
  );
}