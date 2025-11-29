import { useEffect, useState } from "react";
import { 
  getConfigs, updateConfigs, ClashConfig, getVersion, flushFakeIP, 
  reloadConfigs, updateApiConfig, updateGeoData, forceGC 
} from "@/lib/api";
import { 
  Card, CardBody, CardHeader, Button, Input, Switch, 
  Select, SelectItem, Tabs, Tab, Modal, ModalContent, 
  ModalHeader, ModalBody, ModalFooter, Divider, Chip, 
  useDisclosure, Spacer
} from "@heroui/react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { 
  Save, RefreshCw, Terminal, Bug, Copy, Database, Eraser, RotateCw, Network, 
  Settings as SettingsIcon, Key, Globe2, Zap, Moon, Sun, Laptop, Cpu, Info, Github, 
  Power, Server
} from "lucide-react";

export default function Settings() {
  const [config, setConfig] = useState<ClashConfig | null>(null);
  const [version, setVersion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const { theme, setTheme } = useTheme();
  
  const [sysInfo, setSysInfo] = useState<any>(null);
  const [autoLaunch, setAutoLaunch] = useState(false);

  // API Config State
  const [apiHost, setApiHost] = useState("127.0.0.1");
  const [apiPort, setApiPort] = useState("9097");
  const [apiSecret, setApiSecret] = useState("");
  
  // HeroUI Modal Control
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const reload = async () => {
    try {
      const [c, v] = await Promise.all([getConfigs(), getVersion()]);
      setConfig(c); setVersion(v);
    } catch (e) {
      toast.error("无法连接到 Clash 内核");
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
    if (window.electronAPI) {
        window.electronAPI.getSystemInfo().then(setSysInfo);
        window.electronAPI.getAutoLaunch().then(setAutoLaunch);
    }
  }, []);

  // Handlers
  const handleAutoLaunch = async (isSelected: boolean) => {
      setAutoLaunch(isSelected);
      await window.electronAPI?.setAutoLaunch(isSelected);
      toast.success(isSelected ? "已开启开机自启" : "已关闭开机自启");
  };

  const handleSaveApiConfig = () => { 
      updateApiConfig(apiHost, apiPort, apiSecret); 
      onOpenChange(); // Close Modal
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
  const handleReload = async () => { setLoading(true); try { await reloadConfigs(); toast.success("配置已重载"); setTimeout(reload, 1000); } catch { toast.error("重载失败"); } finally { setLoading(false); } };
  const handleUpdateGeo = async () => { toast.info("正在后台更新..."); try { await updateGeoData(); toast.success("更新完成"); } catch { toast.error("更新失败"); } };
  const handleGC = async () => { try { await forceGC(); toast.success("GC 指令已发送"); } catch { toast.error("操作失败"); } };
  
  const handleFactoryReset = () => {
      if (confirm("确定要重置所有设置并清除本地数据吗？")) {
          localStorage.clear();
          window.location.reload();
      }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10 h-full flex flex-col">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">系统设置</h2>
        <div className="flex items-center gap-2">
            <Chip 
                variant="flat" 
                color={version ? "success" : "danger"} 
                startContent={version ? <Server size={14}/> : <Info size={14}/>}
            >
                {version ? `Mihomo ${version.version}` : "Disconnected"}
            </Chip>
            <Button isIconOnly variant="light" onPress={reload} isLoading={loading}>
                <RefreshCw size={20} />
            </Button>
        </div>
      </div>

      {/* API 配置弹窗 (Modal) */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top-center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">外部控制配置</ModalHeader>
              <ModalBody>
                <Input
                  autoFocus
                  label="Host"
                  placeholder="127.0.0.1"
                  variant="bordered"
                  value={apiHost}
                  onValueChange={setApiHost}
                  startContent={<Globe2 className="text-default-400" size={16} />}
                />
                <Input
                  label="Port"
                  placeholder="9097"
                  variant="bordered"
                  value={apiPort}
                  onValueChange={setApiPort}
                  startContent={<Network className="text-default-400" size={16} />}
                />
                <Input
                  label="Secret"
                  placeholder="Api Secret"
                  type="password"
                  variant="bordered"
                  value={apiSecret}
                  onValueChange={setApiSecret}
                  startContent={<Key className="text-default-400" size={16} />}
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  取消
                </Button>
                <Button color="primary" onPress={handleSaveApiConfig}>
                  保存并连接
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 选项卡 (Tabs) */}
      <Tabs aria-label="Settings Options" color="primary" variant="underlined">
        
        {/* === 1. 常规设置 === */}
        <Tab key="general" title={<div className="flex items-center space-x-2"><Laptop size={16}/><span>常规</span></div>}>
            <div className="space-y-4 pt-2">
                <Card>
                    <CardHeader className="flex gap-3">
                        <div className="p-2 bg-default-100 rounded-md"><Laptop size={20}/></div>
                        <div className="flex flex-col">
                            <p className="text-md">界面与系统</p>
                            <p className="text-small text-default-500">外观主题与启动设置</p>
                        </div>
                    </CardHeader>
                    <Divider/>
                    <CardBody className="gap-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">界面主题</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant={theme === 'light' ? "solid" : "bordered"} onPress={() => setTheme('light')} startContent={<Sun size={14} />}>亮色</Button>
                                <Button size="sm" variant={theme === 'dark' ? "solid" : "bordered"} onPress={() => setTheme('dark')} startContent={<Moon size={14} />}>暗色</Button>
                                <Button size="sm" variant={theme === 'system' ? "solid" : "bordered"} onPress={() => setTheme('system')} startContent={<Laptop size={14} />}>跟随</Button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm">开机自启动</span>
                                <span className="text-tiny text-default-400">登录系统时自动启动应用</span>
                            </div>
                            <Switch isSelected={autoLaunch} onValueChange={handleAutoLaunch} color="success" size="sm" />
                        </div>
                    </CardBody>
                </Card>

                <Card className={!version ? "border-danger border" : ""}>
                    <CardBody className="flex flex-row items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-md font-medium flex items-center gap-2"><Key size={18} /> API 连接</span>
                            <span className="text-tiny text-default-500">当前: {`http://${apiHost}:${apiPort}`}</span>
                        </div>
                        <Button color={version ? "default" : "danger"} variant="flat" size="sm" onPress={onOpen} startContent={<SettingsIcon size={16}/>}>配置</Button>
                    </CardBody>
                </Card>

                {sysInfo && (
                    <Card>
                        <CardHeader className="flex gap-3">
                            <div className="p-2 bg-default-100 rounded-md"><Cpu size={20}/></div>
                            <div className="flex flex-col"><p className="text-md">设备信息</p></div>
                        </CardHeader>
                        <Divider/>
                        <CardBody className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between"><span>Host</span><span className="font-mono text-default-500">{sysInfo.hostname}</span></div>
                            <div className="flex justify-between"><span>OS</span><span className="font-mono text-default-500">{sysInfo.platform} ({sysInfo.arch})</span></div>
                            <div className="flex justify-between"><span>CPU</span><span className="font-mono text-default-500 truncate w-40 text-right">{sysInfo.cpus}</span></div>
                            <div className="flex justify-between"><span>Mem</span><span className="font-mono text-default-500">{(sysInfo.memory / 1024 / 1024 / 1024).toFixed(1)} GB</span></div>
                        </CardBody>
                    </Card>
                )}
            </div>
        </Tab>

        {/* === 2. 网络设置 === */}
        <Tab key="network" title={<div className="flex items-center space-x-2"><Network size={16}/><span>网络</span></div>} isDisabled={!config}>
            {config && (
                <div className="space-y-4 pt-2">
                    <Card>
                        <CardHeader className="flex gap-3">
                            <div className="p-2 bg-primary/10 rounded-md text-primary"><Network size={20}/></div>
                            <div className="flex flex-col">
                                <p className="text-md">入站与模式</p>
                                <p className="text-small text-default-500">Core Network Settings</p>
                            </div>
                        </CardHeader>
                        <Divider/>
                        <CardBody className="gap-6">
                            <div className="grid grid-cols-2 gap-6">
                                <Input 
                                    label="混合端口" 
                                    type="number" 
                                    variant="bordered"
                                    value={String(config["mixed-port"])} 
                                    onValueChange={(v) => setConfig({...config, "mixed-port": Number(v)})} 
                                    description="HTTP & SOCKS5 Mixed Port"
                                />
                                <Select 
                                    label="运行模式" 
                                    variant="bordered"
                                    selectedKeys={[config.mode.toLowerCase()]}
                                    onChange={(e) => setConfig({...config, mode: e.target.value})}
                                >
                                    <SelectItem key="rule">Rule (规则)</SelectItem>
                                    <SelectItem key="global">Global (全局)</SelectItem>
                                    <SelectItem key="direct">Direct (直连)</SelectItem>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm">允许局域网连接</span>
                                    <span className="text-tiny text-default-400">Allow LAN</span>
                                </div>
                                <Switch isSelected={config["allow-lan"]} onValueChange={v => setConfig({...config, "allow-lan": v})} size="sm" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm">启用 IPv6</span>
                                    <span className="text-tiny text-default-400">IPv6 Protocol</span>
                                </div>
                                <Switch isSelected={config.ipv6} onValueChange={v => setConfig({...config, ipv6: v})} size="sm" />
                            </div>
                            <div className="flex justify-end">
                                <Button color="primary" onPress={handleSave} isLoading={loading} startContent={<Save size={16}/>}>保存修改</Button>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}
        </Tab>

        {/* === 3. 维护与调试 === */}
        <Tab key="maintain" title={<div className="flex items-center space-x-2"><Database size={16}/><span>维护</span></div>}>
            <div className="space-y-4 pt-2">
                <Card>
                    <CardHeader className="flex gap-3">
                        <div className="p-2 bg-warning/10 rounded-md text-warning"><Database size={20}/></div>
                        <div className="flex flex-col">
                            <p className="text-md">内核维护</p>
                            <p className="text-small text-default-500">缓存清理与状态重置</p>
                        </div>
                    </CardHeader>
                    <Divider/>
                    <CardBody className="gap-4">
                        <div className="flex items-center justify-between">
                            <span>清除 FakeIP 缓存</span>
                            <Button size="sm" variant="flat" onPress={handleFlushFakeIP} startContent={<Eraser size={14}/>}>清除</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>重载配置 (Reload)</span>
                            <Button size="sm" variant="flat" onPress={handleReload} startContent={<RotateCw size={14}/>}>重载</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>更新 Geo 数据库</span>
                            <Button size="sm" variant="flat" onPress={handleUpdateGeo} startContent={<Globe2 size={14}/>}>更新</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>内存优化 (GC)</span>
                            <Button size="sm" variant="flat" onPress={handleGC} startContent={<Zap size={14}/>}>执行</Button>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader className="flex gap-3">
                        <div className="p-2 bg-default-100 rounded-md"><Terminal size={20}/></div>
                        <div className="flex flex-col"><p className="text-md">开发者工具</p></div>
                    </CardHeader>
                    <Divider/>
                    <CardBody className="gap-4">
                        <div className="flex items-center justify-between">
                            <span>复制终端代理命令</span>
                            <Button size="sm" variant="bordered" onPress={handleCopyEnv} startContent={<Copy size={14}/>}>复制</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>打开调试控制台</span>
                            <Button size="sm" variant="bordered" onPress={handleOpenDevTools} startContent={<Bug size={14}/>}>Open DevTools</Button>
                        </div>
                        <Spacer y={2} />
                        <div className="flex items-center justify-between">
                            <span className="text-danger">重置应用数据</span>
                            <Button size="sm" color="danger" variant="flat" onPress={handleFactoryReset} startContent={<Power size={14}/>}>Reset</Button>
                        </div>
                    </CardBody>
                </Card>

                <div className="flex justify-center pt-2">
                    <Button variant="light" size="sm" onPress={() => window.open('https://github.com/metacubex/mihomo', '_blank')} className="text-tiny text-default-400">
                        <Github size={14} className="mr-1" /> Powered by Mihomo Core
                    </Button>
                </div>
            </div>
        </Tab>
      </Tabs>
    </div>
  );
}