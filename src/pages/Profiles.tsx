// ... imports (保持不变)
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, RefreshCw, Check, Trash2, FileText, FolderOpen, Database, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { switchConfig } from "@/lib/api";
import { Progress } from "@/components/ui/progress"; // 需要安装 progress 组件

// 扩展 Profile 接口
interface Profile {
  id: string;
  name: string;
  url: string;
  updatedAt: string;
  filePath?: string;
  userInfo?: {
    upload: number;
    download: number;
    total: number;
    expire: number;
  };
}

// 解析 UserInfo 字符串
const parseUserInfo = (str: string) => {
  if (!str) return undefined;
  const res: any = {};
  const pairs = str.split(';');
  pairs.forEach(pair => {
    const [key, value] = pair.trim().split('=');
    if (key && value) res[key] = Number(value);
  });
  return res;
};

// 格式化流量
const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化日期
const formatDate = (ts: number) => {
  if (!ts) return '无限期';
  return new Date(ts * 1000).toLocaleDateString();
};

export default function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "" });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await window.electronAPI.getProfiles();
        setProfiles(data);
        const savedActive = localStorage.getItem("clash_active_profile");
        if (savedActive) setActiveId(savedActive);
      } catch (e) { toast.error("读取失败"); }
    };
    init();
  }, []);

  const saveToDisk = async (newProfiles: Profile[]) => {
    setProfiles(newProfiles);
    await window.electronAPI.saveProfiles(newProfiles);
  };

  const handleAddProfile = async () => {
    if (!formData.name || !formData.url) return toast.error("请填写完整信息");
    const newProfile: Profile = {
      id: Date.now().toString(),
      name: formData.name,
      url: formData.url,
      updatedAt: "未下载",
    };
    await saveToDisk([...profiles, newProfile]);
    setIsOpen(false);
    setFormData({ name: "", url: "" });
    toast.success("添加成功");
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newProfiles = profiles.filter((p) => p.id !== id);
    await saveToDisk(newProfiles);
    toast.success("已删除");
    if (id === activeId) { setActiveId(""); localStorage.removeItem("clash_active_profile"); }
  };

  const handleUpdate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdatingId(id);
    const target = profiles.find(p => p.id === id);
    if (!target) return;

    try {
      toast.info(`正在下载...`);
      // 获取返回值中的 userInfo
      const result = await window.electronAPI.downloadProfile(target.url, target.id);
      
      const newProfiles = profiles.map(p => 
        p.id === id ? { 
            ...p, 
            updatedAt: new Date().toLocaleString(), 
            filePath: result.path,
            userInfo: parseUserInfo(result.userInfo) // 解析并保存
        } : p
      );
      
      await saveToDisk(newProfiles);
      toast.success("更新成功");

      if (activeId === id) {
        await switchConfig(result.path);
        toast.success("配置已热重载");
      }
    } catch (err: any) {
      toast.error(`更新失败: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSelect = async (profile: Profile) => {
    if (!profile.filePath) return toast.error("请先下载配置");
    try {
        await switchConfig(profile.filePath);
        setActiveId(profile.id);
        localStorage.setItem("clash_active_profile", profile.id);
        toast.success(`切换到: ${profile.name}`);
        setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
        toast.error("切换失败");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">订阅管理</h2>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.electronAPI?.openProfileFolder()}><FolderOpen className="mr-2 h-4 w-4" /> 文件夹</Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> 新建</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>添加新订阅</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>名称</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                <div className="grid gap-2"><Label>URL</Label><Input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} /></div>
                </div>
                <DialogFooter><Button onClick={handleAddProfile}>保存</Button></DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {profiles.map((profile) => {
            const used = (profile.userInfo?.upload || 0) + (profile.userInfo?.download || 0);
            const total = profile.userInfo?.total || 1;
            const percent = Math.min((used / total) * 100, 100);

            return (
                <Card key={profile.id} onClick={() => handleSelect(profile)} 
                    className={cn("cursor-pointer border-2 relative group transition-all", activeId === profile.id ? "border-primary bg-primary/5" : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-800")}>
                    
                    {activeId === profile.id && <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-1 rounded-bl-lg"><Check size={14} /></div>}
                    
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <FileText size={18} />
                            <span className="truncate">{profile.name}</span>
                        </CardTitle>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end"><DropdownMenuItem onClick={(e) => handleDelete(profile.id, e)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> 删除</DropdownMenuItem></DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                        <div className="text-xs text-muted-foreground truncate" title={profile.url}>{profile.url}</div>
                        
                        {/* 流量信息条 */}
                        {profile.userInfo && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500 flex items-center gap-1"><Database size={12}/> {formatBytes(used)} / {formatBytes(total)}</span>
                                    <span className="text-zinc-500 flex items-center gap-1"><Calendar size={12}/> {formatDate(profile.userInfo.expire)}</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                            <span className={cn("text-xs", !profile.filePath ? "text-yellow-600" : "text-zinc-400")}>
                                {!profile.filePath ? "⚠ 未下载" : `更新于 ${profile.updatedAt}`}
                            </span>
                            <Button variant="ghost" size="sm" className={cn("h-6 px-2 text-xs", updatingId === profile.id && "animate-spin")} onClick={(e) => handleUpdate(profile.id, e)} disabled={!!updatingId}>
                                <RefreshCw className="h-3 w-3 mr-1" /> 更新
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )
        })}
      </div>
    </div>
  );
}