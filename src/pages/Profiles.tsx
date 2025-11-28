import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, RefreshCw, Check, Trash2, FileText, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { switchConfig } from "@/lib/api";

interface Profile {
  id: string;
  name: string;
  url: string;
  updatedAt: string;
  filePath?: string;
}

export default function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "" });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await window.electronAPI?.getProfiles();
        if (data) setProfiles(data);
        const savedActive = localStorage.getItem("clash_active_profile");
        if (savedActive) setActiveId(savedActive);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const saveToDisk = async (newProfiles: Profile[]) => {
    setProfiles(newProfiles);
    await window.electronAPI.saveProfiles(newProfiles);
  };

  // === 修复：确保弹窗关闭 ===
  const handleAddProfile = async () => {
    if (!formData.name || !formData.url) return toast.error("请填写完整信息");
    
    try {
        const newProfile: Profile = {
          id: Date.now().toString(),
          name: formData.name,
          url: formData.url,
          updatedAt: "未下载",
        };
        // 先关闭弹窗，给用户即时反馈
        setIsOpen(false);
        setFormData({ name: "", url: "" });
        
        await saveToDisk([...profiles, newProfile]);
        toast.success("订阅已添加，请点击更新按钮下载配置");
    } catch (e) {
        toast.error("保存失败");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newProfiles = profiles.filter((p) => p.id !== id);
    await saveToDisk(newProfiles);
    toast.success("订阅已删除");
    if (id === activeId) { setActiveId(""); localStorage.removeItem("clash_active_profile"); }
  };

  const handleUpdate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdatingId(id);
    const target = profiles.find(p => p.id === id);
    if (!target) return;

    try {
      toast.info(`正在下载: ${target.name}`);
      
      // 这里的 downloadProfile 之前报错，现在 preload 修复后应该好了
      const result = await window.electronAPI.downloadProfile(target.url, target.id);
      
      const newProfiles = profiles.map(p => 
        p.id === id ? { ...p, updatedAt: new Date().toLocaleString(), filePath: result.path } : p
      );
      await saveToDisk(newProfiles);
      toast.success("下载成功");

      if (activeId === id) {
        await switchConfig(result.path);
        toast.success("配置已热重载");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`更新失败: ${err.message || "未知错误"}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSelect = async (profile: Profile) => {
    if (!profile.filePath) {
        toast.error("配置文件未下载，请先点击更新按钮");
        return;
    }

    try {
        await switchConfig(profile.filePath);
        setActiveId(profile.id);
        localStorage.setItem("clash_active_profile", profile.id);
        toast.success(`已切换到: ${profile.name}`);
        // 刷新以清除旧缓存
        setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
        const msg = e.response?.data?.message || e.message || "未知错误";
        toast.error("切换失败", { description: msg });
    }
  };

  const handleOpenFolder = () => window.electronAPI?.openProfileFolder();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">订阅管理</h2>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenFolder}>
                <FolderOpen className="mr-2 h-4 w-4" /> 打开文件夹
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> 新建订阅</Button></DialogTrigger>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
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
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => handleDelete(profile.id, e)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> 删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            
            <CardContent>
              <div className="text-xs text-muted-foreground truncate mb-2" title={profile.url}>{profile.url}</div>
              <div className="flex justify-between items-center mt-4">
                <span className={cn("text-xs", !profile.filePath ? "text-yellow-600" : "text-zinc-400")}>
                    {!profile.filePath ? "⚠ 未下载" : profile.updatedAt}
                </span>
                <Button variant="ghost" size="sm" className={cn("h-6 px-2 text-xs", updatingId === profile.id && "animate-spin")} onClick={(e) => handleUpdate(profile.id, e)} disabled={!!updatingId}>
                  <RefreshCw className="h-3 w-3 mr-1" /> 更新
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}