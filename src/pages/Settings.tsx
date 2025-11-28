import { useEffect, useState } from "react";
import { 
  getConfigs, 
  updateConfigs, 
  ClashConfig, 
  getVersion, 
  flushFakeIP, 
  reloadConfigs, 
  updateApiConfig,
  updateGeoData,
  forceGC 
} from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Save, 
  RefreshCw, 
  Terminal, 
  Bug, 
  Copy, 
  Database, 
  Eraser, 
  RotateCw,
  Network, 
  Settings as SettingsIcon, 
  Key,
  Globe2,
  Zap
} from "lucide-react";

export default function Settings() {
  const [config, setConfig] = useState<ClashConfig | null>(null);
  const [version, setVersion] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // API 配置状态
  const [apiHost, setApiHost] = useState("127.0.0.1");
  const [apiPort, setApiPort] = useState("9097");
  const [apiSecret, setApiSecret] = useState("");
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);

  // 初始化加载
  const reload = async () => {
    try {
      const [c, v] = await Promise.all([getConfigs(), getVersion()]);
      setConfig(c);
      setVersion(v);
    } catch (e) {
      // 这里的报错通常是因为连接不上 API
      toast.error("无法连接到 Clash 内核", {
        description: "请检查 API 配置或确认内核已启动",
        action: {
          label: "配置连接",
          onClick: () => setIsApiDialogOpen(true)
        }
      });
      setVersion(null);
      setConfig(null);
    }
  };

  useEffect(() => { 
    // 读取本地存储的 API 配置回显
    const stored = localStorage.getItem('clash_api_config');
    if (stored) {
        const { baseURL, secret } = JSON.parse(stored);
        // 简单解析 baseURL 以回显到输入框
        const match = baseURL.match(/http:\/\/(.+):(\d+)/);
        if (match) {
            setApiHost(match[1]);
            setApiPort(match[2]);
        }
        setApiSecret(secret);
    }
    reload(); 
  }, []);

  // === 动作处理函数 ===

  // 保存 API 配置
  const handleSaveApiConfig = () => {
    updateApiConfig(apiHost, apiPort, apiSecret);
    setIsApiDialogOpen(false);
    toast.success("API 配置已更新", { description: "正在尝试重新连接..." });
    setTimeout(() => {
        window.location.reload(); // 刷新页面以应用 WebSocket 等连接
    }, 1000);
  };

  // 保存基础配置
  const handleSave = async () => {
    if (!config) return;
    setLoading(true);
    try {
      await updateConfigs({
        "mixed-port": Number(config["mixed-port"]),
        "allow-lan": config["allow-lan"],
        "mode": config.mode,
        "log-level": config["log-level"],
        "ipv6": config.ipv6
      });
      toast.success("系统设置已保存");
      reload();
    } catch (e) {
      toast.error("保存失败");
    } finally {
      setLoading(false);
    }
  };

  // 复制终端环境变量
  const handleCopyEnv = () => {
    if (!config) return;
    const port = config["mixed-port"];
    const isWin = window.electronAPI?.platform === 'win32';
    
    const cmd = isWin 
        ? `set http_proxy=http://127.0.0.1:${port} && set https_proxy=http://127.0.0.1:${port}`
        : `export http_proxy=http://127.0.0.1:${port} && export https_proxy=http://127.0.0.1:${port}`;

    navigator.clipboard.writeText(cmd);
    toast.success("命令已复制", {
        description: isWin ? "Windows CMD/PowerShell 格式" : "Mac/Linux Terminal 格式"
    });
  };

  // 打开开发者工具
  const handleOpenDevTools = () => {
    if (window.electronAPI?.toggleDevTools) {
      window.electronAPI.toggleDevTools();
    } else {
      toast.warning("仅在 Electron 环境下可用");
    }
  };

  // 清除 FakeIP
  const handleFlushFakeIP = async () => {
    try { await flushFakeIP(); toast.success("FakeIP 缓存已清除"); } 
    catch (e) { toast.error("操作失败", { description: "当前内核版本可能不支持此操作" }); }
  };

  // 重载内核配置
  const handleReload = async () => {
    setLoading(true);
    try {
        await reloadConfigs();
        toast.success("配置与规则已重载");
        setTimeout(reload, 1000);
    } catch (e) { toast.error("重载失败"); } 
    finally { setLoading(false); }
  };

  // 更新 Geo 数据库
  const handleUpdateGeo = async () => {
    toast.info("正在后台更新 Geo 数据库...");
    try {
        await updateGeoData();
        toast.success("Geo 数据库更新完成");
    } catch (e) {
        toast.error("更新失败，请检查网络连接");
    }
  };

  // 强制 GC
  const handleGC = async () => {
    try {
        await forceGC();
        toast.success("内存回收指令已发送");
    } catch (e) {
        toast.error("操作失败");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">系统设置</h2>
        <div className="flex items-center gap-2">
            <span className={`text-xs font-mono px-2 py-1 rounded border ${version ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                Core: {version?.version || "Disconnected"}
            </span>
            <Button variant="ghost" size="icon" onClick={reload} title="刷新配置">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </Button>
        </div>
      </div>

      {/* === API 连接配置弹窗 === */}
      <Dialog open={isApiDialogOpen} onOpenChange={setIsApiDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>外部控制设置 (API)</DialogTitle>
                <DialogDescription>
                    配置 Clash 内核的连接地址和鉴权密钥。
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">地址 (Host)</Label>
                    <Input className="col-span-3" value={apiHost} onChange={e => setApiHost(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">端口 (Port)</Label>
                    <Input className="col-span-3" value={apiPort} onChange={e => setApiPort(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">密钥 (Secret)</Label>
                    <Input className="col-span-3" type="password" placeholder="为空则不使用密钥" value={apiSecret} onChange={e => setApiSecret(e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSaveApiConfig}>保存并连接</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6">

        {/* === 卡片 0: 连接管理 === */}
        <Card className={!version ? "border-red-500 shadow-sm" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
             <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Key size={18} /> 外部控制连接
                </CardTitle>
                <CardDescription>当前连接: {`http://${apiHost}:${apiPort}`}</CardDescription>
             </div>
             <Button variant={version ? "outline" : "destructive"} size="sm" onClick={() => setIsApiDialogOpen(true)}>
                <SettingsIcon size={14} className="mr-2"/> 配置连接
             </Button>
          </CardHeader>
        </Card>

        {/* 如果没连接上，隐藏下面的详细配置 */}
        {config ? (
            <>
                {/* === 卡片 1: 网络设置 === */}
                <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Network size={18} /> 网络与端口</CardTitle>
                    <CardDescription>配置本地监听端口及局域网访问权限</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>混合端口 (Mixed Port)</Label>
                        <Input type="number" value={config["mixed-port"]} onChange={e => setConfig({...config, "mixed-port": Number(e.target.value)})} />
                        <div className="text-[10px] text-muted-foreground">同时支持 HTTP 和 SOCKS5 协议</div>
                    </div>
                    <div className="space-y-2">
                        <Label>运行模式 (Mode)</Label>
                        <Select value={config.mode} onValueChange={val => setConfig({...config, mode: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rule">Rule (规则分流)</SelectItem>
                                <SelectItem value="global">Global (全局代理)</SelectItem>
                                <SelectItem value="direct">Direct (全直连)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>允许局域网连接 (Allow LAN)</Label>
                            <div className="text-xs text-muted-foreground">允许同一 Wi-Fi 下的其他设备连接此代理</div>
                        </div>
                        <Switch checked={config["allow-lan"]} onCheckedChange={checked => setConfig({...config, "allow-lan": checked})} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>启用 IPv6 解析</Label>
                            <div className="text-xs text-muted-foreground">允许内核处理 IPv6 流量，网络不稳定建议关闭</div>
                        </div>
                        <Switch checked={config.ipv6} onCheckedChange={checked => setConfig({...config, ipv6: checked})} />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSave} disabled={loading} className="w-32">
                            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
                            保存修改
                        </Button>
                    </div>
                </CardContent>
                </Card>

                {/* === 卡片 2: 开发与调试 === */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Terminal size={18} /> 开发与调试</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>终端代理命令</Label>
                                <div className="text-xs text-muted-foreground">复制环境变量设置命令</div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleCopyEnv}><Copy size={14} className="mr-2" /> 复制</Button>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>调试控制台 (DevTools)</Label>
                                <div className="text-xs text-muted-foreground">打开 Electron 调试工具</div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleOpenDevTools}><Bug size={14} className="mr-2" /> 打开</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* === 卡片 3: 内核维护 === */}
                <Card className="border-red-100 dark:border-red-900/30">
                    <CardHeader>
                        <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2 text-base"><Database size={18}/> 内核维护</CardTitle>
                        <CardDescription>管理 Mihomo 内核的缓存与状态</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>清除 FakeIP 缓存</Label>
                                <div className="text-xs text-muted-foreground">清空 DNS 映射，解决连接异常</div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleFlushFakeIP} className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                                <Eraser size={14} className="mr-2" /> 清除
                            </Button>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>重载配置 (Reload)</Label>
                                <div className="text-xs text-muted-foreground">重新读取配置文件与规则</div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleReload}>
                                <RotateCw size={14} className="mr-2" /> 重载
                            </Button>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>更新 Geo 数据库</Label>
                                <div className="text-xs text-muted-foreground">更新 GeoIP 和 GeoSite 规则库</div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleUpdateGeo}>
                                <Globe2 size={14} className="mr-2" /> 更新库
                            </Button>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>强制内存回收</Label>
                                <div className="text-xs text-muted-foreground">触发 GC 释放内存</div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleGC}>
                                <Zap size={14} className="mr-2" /> 优化内存
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </>
        ) : (
            <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <p className="mb-2">未连接到内核，请先配置连接。</p>
                <p className="text-xs opacity-70">如果内核已启动，请检查端口(9097)和密钥是否匹配。</p>
            </div>
        )}
      </div>
    </div>
  );
}