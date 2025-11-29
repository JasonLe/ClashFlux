import { useState, useEffect } from "react";
import { 
  Card, CardBody, CardHeader, Button, Input, Modal, ModalContent, ModalHeader, 
  ModalBody, ModalFooter, useDisclosure, Dropdown, DropdownTrigger, DropdownMenu, 
  DropdownItem, Progress, Chip 
} from "@heroui/react";
import { Plus, MoreVertical, RefreshCw, Check, Trash2, FileText, FolderOpen, Database, Calendar, Globe, Tag } from "lucide-react";
import { toast } from "sonner";
import { switchConfig } from "@/lib/api";

interface Profile {
  id: string;
  name: string;
  url: string;
  updatedAt: string;
  filePath?: string;
  userInfo?: { upload: number; download: number; total: number; expire: number; };
}

const parseUserInfo = (str: string) => {
  if (!str) return undefined;
  const res: any = {};
  const pairs = str.split(';');
  pairs.forEach(pair => { const [key, value] = pair.trim().split('='); if (key && value) res[key] = Number(value); });
  return res;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024; const s = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
};

const formatDate = (ts: number) => !ts ? '无限期' : new Date(ts * 1000).toLocaleDateString();

export default function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const { isOpen, onOpen, onOpenChange } = useDisclosure(); // HeroUI Modal Hook
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

  const handleAddProfile = async (onClose: () => void) => {
    if (!formData.name || !formData.url) return toast.error("请填写完整信息");
    const newProfile: Profile = {
      id: Date.now().toString(),
      name: formData.name,
      url: formData.url,
      updatedAt: "未下载",
    };
    await saveToDisk([...profiles, newProfile]);
    onClose();
    setFormData({ name: "", url: "" });
    toast.success("添加成功");
  };

  const handleDelete = async (id: string) => {
    const newProfiles = profiles.filter((p) => p.id !== id);
    await saveToDisk(newProfiles);
    toast.success("已删除");
    if (id === activeId) { setActiveId(""); localStorage.removeItem("clash_active_profile"); }
  };

  const handleUpdate = async (id: string) => {
    setUpdatingId(id);
    const target = profiles.find(p => p.id === id);
    if (!target) return;

    try {
      toast.info(`正在下载...`);
      const result = await window.electronAPI.downloadProfile(target.url, target.id);
      
      const newProfiles = profiles.map(p => 
        p.id === id ? { ...p, updatedAt: new Date().toLocaleString(), filePath: result.path, userInfo: parseUserInfo(result.userInfo) } : p
      );
      
      await saveToDisk(newProfiles);
      toast.success("更新成功");

      if (activeId === id) {
        await switchConfig(result.path);
        toast.success("配置已热重载");
      }
    } catch (err: any) { toast.error(`更新失败: ${err.message}`); } 
    finally { setUpdatingId(null); }
  };

  const handleSelect = async (profile: Profile) => {
    if (!profile.filePath) return toast.error("请先下载配置");
    try {
        await switchConfig(profile.filePath);
        setActiveId(profile.id);
        localStorage.setItem("clash_active_profile", profile.id);
        toast.success(`切换到: ${profile.name}`);
        setTimeout(() => window.location.reload(), 500);
    } catch (e: any) { toast.error("切换失败"); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">订阅管理</h2>
        <div className="flex gap-2">
            <Button variant="bordered" onPress={() => window.electronAPI?.openProfileFolder()} startContent={<FolderOpen size={16}/>}>文件夹</Button>
            <Button color="primary" onPress={onOpen} startContent={<Plus size={16}/>}>新建</Button>
        </div>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>添加新订阅</ModalHeader>
              <ModalBody>
                <Input label="名称" placeholder="例如: 公司节点" variant="bordered" value={formData.name} onValueChange={(v) => setFormData({...formData, name: v})} startContent={<Tag size={16} className="text-default-400"/>}/>
                <Input label="URL" placeholder="https://..." variant="bordered" value={formData.url} onValueChange={(v) => setFormData({...formData, url: v})} startContent={<Globe size={16} className="text-default-400"/>}/>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>取消</Button>
                <Button color="primary" onPress={() => handleAddProfile(onClose)}>保存</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {profiles.map((profile) => {
            const used = (profile.userInfo?.upload || 0) + (profile.userInfo?.download || 0);
            const total = profile.userInfo?.total || 1;
            const percent = Math.min((used / total) * 100, 100);
            const isActive = activeId === profile.id;

            return (
                <Card 
                    key={profile.id} 
                    isPressable 
                    onPress={() => handleSelect(profile)} 
                    className={`border-2 transition-all ${isActive ? "border-primary bg-primary/5" : "border-transparent bg-content1"}`}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-full ${isActive ? 'bg-primary text-white' : 'bg-default-100 text-default-500'}`}><FileText size={18} /></div>
                            <span className={`text-base font-bold truncate ${isActive ? 'text-primary' : ''}`}>{profile.name}</span>
                            {isActive && <Chip size="sm" color="primary" variant="flat" startContent={<Check size={12}/>}>Active</Chip>}
                        </div>
                        <Dropdown>
                            <DropdownTrigger>
                                <Button isIconOnly variant="light" size="sm"><MoreVertical size={16}/></Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Actions">
                                <DropdownItem key="delete" className="text-danger" color="danger" onPress={() => handleDelete(profile.id)} startContent={<Trash2 size={16}/>}>删除订阅</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </CardHeader>
                    
                    <CardBody className="space-y-4 pt-0">
                        <p className="text-tiny text-default-400 truncate bg-default-50 p-1 rounded">{profile.url}</p>
                        
                        {profile.userInfo && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-tiny text-default-500">
                                    <span className="flex items-center gap-1"><Database size={10}/> {formatBytes(used)} / {formatBytes(total)}</span>
                                    <span className="flex items-center gap-1"><Calendar size={10}/> {formatDate(profile.userInfo.expire)}</span>
                                </div>
                                <Progress size="sm" value={percent} color={percent > 80 ? "warning" : "success"} className="max-w-full" />
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-divider">
                            <span className={`text-tiny ${!profile.filePath ? "text-warning" : "text-default-400"}`}>
                                {!profile.filePath ? "⚠ 未下载" : `更新于 ${profile.updatedAt}`}
                            </span>
                            <Button size="sm" variant="flat" color="default" onPress={() => handleUpdate(profile.id)} isLoading={updatingId === profile.id} startContent={!updatingId && <RefreshCw size={14} />}>
                                更新
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            )
        })}
      </div>
    </div>
  );
}