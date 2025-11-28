import { useEffect, useState } from "react";
import { 
  getConfigs, updateConfigs, ClashConfig, getVersion, flushFakeIP, 
  reloadConfigs, updateApiConfig, updateGeoData, forceGC 
} from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider"; // === 引入 Hook ===
import { 
  Save, RefreshCw, Terminal, Bug, Copy, Database, Eraser, RotateCw, Network, 
  Settings as SettingsIcon, Key, Globe2, Zap, Moon, Sun, Laptop 
} from "lucide-react";

export default function Settings() {
  const [config, setConfig] = useState<ClashConfig | null>(null);
  const [version, setVersion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // === 主题控制 ===
  const { theme, setTheme } = useTheme();

  // API 配置
  const [apiHost, setApiHost] = useState("127.0.0.1");
  const [apiPort, setApiPort] = useState("9097");
  const [apiSecret, setApiSecret] = useState("");
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);

  const reload = async () => {
    try {
      const [c, v] = await Promise.all([getConfigs(), getVersion()]);
      setConfig(c);
      setVersion(v);
    } catch (e) {
      toast.error("无法连接到 Clash 内核", {
        description: "请检查 API 配置或确认内核已启动",
        action: { label: "配置连接", onClick: () => setIsApiDialogOpen(true) }
      });
      setVersion(null); setConfig(null);
    }
  };

  useEffect(() => { 
    const stored = localStorage.getItem('clash_api_config');
    if (stored) {
        const { baseURL, secret } = JSON.parse(stored);
        const match = baseURL.match(/http:\/\/(.+):(\d+)/);
        if (match) { setApiHost(match[1]); setApiPort(match[2]); }
        setApiSecret(secret);
    }
    reload(); 
  }, []);

  const handleSaveApiConfig = () => {
    updateApiConfig(apiHost, apiPort, apiSecret);
    setIsApiDialogOpen(false);
    toast.success("API 配置已更新");
    setTimeout(() => window.location.reload(), 1000);
  };

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
    } catch (e) { toast.error("保存失败"); } 
    finally { setLoading(false); }
  };

  const handleCopyEnv = () => {
    if (!config) return;
    const port = config["mixed-port"];
    const isWin = window.electronAPI?.platform === 'win32';
    const cmd = isWin 
        ? `set http_proxy=http://127.0.0.1:${port} && set https_proxy=http://127.0.0.1:${port}`
        : `export http_proxy=http://127.0.0.1:${port} && export https_proxy=http://127.0.0.1:${port}`;
    navigator.clipboard.writeText(cmd);
    toast.success("命令已复制");
  };

  const handleOpenDevTools = () => window.electronAPI?.toggleDevTools?.();
  const handleFlushFakeIP = async () => { try { await flushFakeIP(); toast.success("FakeIP 缓存已清除"); } catch { toast.error("操作失败"); } };
  const handleReload = async () => { setLoading(true); try { await reloadConfigs(); toast.success("配置与规则已重载"); setTimeout(reload, 1000); } catch { toast.error("重载失败"); } finally { setLoading(false); } };
  const handleUpdateGeo = async () => { toast.info("正在后台更新..."); try { await updateGeoData(); toast.success("更新完成"); } catch { toast.error("更新失败"); } };
  const handleGC = async () => { try { await forceGC(); toast.success("GC 指令已发送"); } catch { toast.error("操作失败"); } };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">系统设置</h2>
        <div className="flex items-center gap-2">
            <span className={`text-xs font-mono px-2 py-1 rounded border ${version ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                Core: {version?.version || "Disconnected"}
            </span>
            <Button variant="ghost" size="icon" onClick={reload}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></Button>
        </div>
      </div>

      <Dialog open={isApiDialogOpen} onOpenChange={setIsApiDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>外部控制设置</DialogTitle><DialogDescription>配置连接地址和密钥</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Host</Label><Input className="col-span-3" value={apiHost} onChange={e => setApiHost(e.target.value)} /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Port</Label><Input className="col-span-3" value={apiPort} onChange={e => setApiPort(e.target.value)} /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Secret</Label><Input className="col-span-3" type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={handleSaveApiConfig}>保存并连接</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6">
        
        {/* === 新增：外观设置 === */}
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sun size={18} /> 外观设置</CardTitle></CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>界面主题</Label>
                        <div className="text-xs text-muted-foreground">切换亮色/暗色模式</div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant={theme === 'light' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setTheme('light')}
                            className="gap-2"
                        >
                            <Sun size={14} /> 亮色
                        </Button>
                        <Button 
                            variant={theme === 'dark' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setTheme('dark')}
                            className="gap-2"
                        >
                            <Moon size={14} /> 暗色
                        </Button>
                        <Button 
                            variant={theme === 'system' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setTheme('system')}
                            className="gap-2"
                        >
                            <Laptop size={14} /> 跟随系统
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* 连接管理 */}
        <Card className={!version ? "border-red-500 shadow-sm" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
             <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base"><Key size={18} /> 外部控制连接</CardTitle>
                <CardDescription>当前: {`http://${apiHost}:${apiPort}`}</CardDescription>
             </div>
             <Button variant={version ? "outline" : "destructive"} size="sm" onClick={() => setIsApiDialogOpen(true)}><SettingsIcon size={14} className="mr-2"/> 配置连接</Button>
          </CardHeader>
        </Card>

        {config && (
            <>
                {/* 网络设置 */}
                <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Network size={18} /> 网络与端口</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>混合端口</Label><Input type="number" value={config["mixed-port"]} onChange={e => setConfig({...config, "mixed-port": Number(e.target.value)})} /></div>
                    <div className="space-y-2"><Label>运行模式</Label>
                        <Select value={config.mode} onValueChange={val => setConfig({...config, mode: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="rule">Rule</SelectItem><SelectItem value="global">Global</SelectItem><SelectItem value="direct">Direct</SelectItem></SelectContent>
                        </Select>
                    </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between"><Label>允许局域网连接</Label><Switch checked={config["allow-lan"]} onCheckedChange={checked => setConfig({...config, "allow-lan": checked})} /></div>
                    <div className="flex items-center justify-between"><Label>启用 IPv6</Label><Switch checked={config.ipv6} onCheckedChange={checked => setConfig({...config, ipv6: checked})} /></div>
                    <div className="flex justify-end pt-2"><Button onClick={handleSave} disabled={loading} className="w-32">{loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 保存</Button></div>
                </CardContent>
                </Card>

                {/* 开发与调试 */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Terminal size={18} /> 开发与调试</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between"><Label>终端代理命令</Label><Button variant="outline" size="sm" onClick={handleCopyEnv}><Copy size={14} className="mr-2" /> 复制</Button></div>
                        <Separator />
                        <div className="flex items-center justify-between"><Label>调试控制台</Label><Button variant="outline" size="sm" onClick={handleOpenDevTools}><Bug size={14} className="mr-2" /> 打开</Button></div>
                    </CardContent>
                </Card>

                {/* 内核维护 */}
                <Card className="border-red-100 dark:border-red-900/30">
                    <CardHeader><CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2 text-base"><Database size={18}/> 内核维护</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between"><Label>清除 FakeIP 缓存</Label><Button variant="outline" size="sm" onClick={handleFlushFakeIP}><Eraser size={14} className="mr-2" /> 清除</Button></div>
                        <Separator />
                        <div className="flex items-center justify-between"><Label>重载配置</Label><Button variant="outline" size="sm" onClick={handleReload}><RotateCw size={14} className="mr-2" /> 重载</Button></div>
                        <Separator />
                        <div className="flex items-center justify-between"><Label>更新 Geo 数据库</Label><Button variant="outline" size="sm" onClick={handleUpdateGeo}><Globe2 size={14} className="mr-2" /> 更新</Button></div>
                        <Separator />
                        <div className="flex items-center justify-between"><Label>强制内存回收</Label><Button variant="outline" size="sm" onClick={handleGC}><Zap size={14} className="mr-2" /> 优化</Button></div>
                    </CardContent>
                </Card>
            </>
        )}
      </div>
    </div>
  );
}