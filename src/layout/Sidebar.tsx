import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Globe, 
  Settings, 
  Radio, 
  Minus, 
  Square, 
  X, 
  PieChart, 
  FileText, 
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getConfigs, updateConfigs } from "@/lib/api";
import { toast } from "sonner";

// 菜单配置
const menuItems = [
  { icon: LayoutDashboard, label: "仪表盘", path: "/" },
  { icon: Globe, label: "代理", path: "/proxies" },
  { icon: ShieldCheck, label: "规则", path: "/rules" },
  { icon: Radio, label: "订阅", path: "/profiles" },
  { icon: PieChart, label: "统计", path: "/analytics" },
  { icon: FileText, label: "日志", path: "/logs" },
  { icon: Settings, label: "设置", path: "/settings" },
];

export function Sidebar() {
  const queryClient = useQueryClient();

  // 安全检测平台：防止在浏览器中运行时因 undefined 报错导致白屏
  const isMac = window.electronAPI?.platform === 'darwin';

  const { data: configs, isError } = useQuery({
    queryKey: ['configs'],
    queryFn: getConfigs,
    refetchInterval: 3000, // 定期刷新配置
    // StaleTime: Infinity, // 配置信息不经常变动，可以设置长一些的 StaleTime
    select: (data) => ({ // 转换数据结构，方便使用
      ...data,
      mode: data.mode.toLowerCase(),
      isSystemProxy: data.tun?.enable || false
    }),
  });

  const updateMutation = useMutation({
    mutationFn: updateConfigs,
    onSuccess: () => {
      // 成功后立即让 'configs' 查询失效，从而触发重新获取
      queryClient.invalidateQueries({ queryKey: ['configs'] });
      toast.success("配置已更新");
    },
    onError: (err) => {
      toast.error(`操作失败: ${err.message}`);
    }
  });

  // 切换系统代理
  const toggleProxy = (checked: boolean) => {
    updateMutation.mutate({ tun: { enable: checked } });
  };

  // 切换运行模式
  const handleModeChange = (val: string) => {
    updateMutation.mutate({ mode: val });
  };

  // 窗口控制函数 (带安全检查)
  const handleMin = () => window.electronAPI?.minimize();
  const handleMax = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  if (isError) {
    // 增加错误状态 UI
    return (
      <div className="w-64 h-screen bg-zinc-50 border-r flex flex-col justify-center items-center dark:bg-zinc-900 dark:border-zinc-800 shrink-0 p-4 text-center">
        <X className="text-red-500 mb-2" size={32}/>
        <p className="text-sm font-bold text-red-500">连接失败</p>
        <p className="text-xs text-muted-foreground mt-1">
          无法连接到Clash核心，请检查核心是否正在运行。
        </p>
      </div>
    )
  }
  
  return (
    <div className="w-64 h-screen bg-zinc-50 border-r flex flex-col dark:bg-zinc-900 dark:border-zinc-800 shrink-0">
      
      {/* === 窗口控制栏 (Drag Region) === */}
      <div 
        className="h-12 flex items-center px-4 shrink-0 select-none" 
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
         {!isMac && (
           <div 
             className="flex gap-2 group z-50" 
             style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
           >
              <div onClick={handleClose} className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] cursor-pointer flex items-center justify-center hover:bg-[#FF5F57]/80 transition-colors">
                  <X size={8} className="opacity-0 group-hover:opacity-100 text-black/60" />
              </div>
              <div onClick={handleMin} className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] cursor-pointer flex items-center justify-center hover:bg-[#FFBD2E]/80 transition-colors">
                  <Minus size={8} className="opacity-0 group-hover:opacity-100 text-black/60" />
              </div>
              <div onClick={handleMax} className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] cursor-pointer flex items-center justify-center hover:bg-[#27C93F]/80 transition-colors">
                  <Square size={6} className="opacity-0 group-hover:opacity-100 text-black/60" />
              </div>
           </div>
         )}
      </div>

      {/* Title */}
      <div className="text-xl font-bold mb-6 px-6 flex items-center gap-2">
        Clash Flux
      </div>
      
      {/* 导航菜单 */}
      <nav className="flex flex-col gap-2 px-4 flex-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-zinc-500 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* 底部控制面板 */}
      <div className="p-4 border-t bg-zinc-100/50 dark:bg-zinc-900/50 space-y-4">
        
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground ml-1">运行模式</Label>
            <Select 
              value={configs?.mode} 
              onValueChange={handleModeChange} 
              disabled={!configs}
            >
                <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="加载中..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="rule">规则模式 (Rule)</SelectItem>
                    <SelectItem value="global">全局模式 (Global)</SelectItem>
                    <SelectItem value="direct">直连模式 (Direct)</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex flex-col">
                <Label htmlFor="system-proxy" className="font-bold text-sm">系统代理</Label>
                <span className="text-[10px] text-muted-foreground">TUN 模式</span>
            </div>
            <Switch 
                id="system-proxy" 
                checked={configs?.isSystemProxy}
                onCheckedChange={toggleProxy}
                disabled={!configs}
                className="scale-90 origin-right"
            />
        </div>
      </div>
    </div>
  );
}