import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { switchConfig } from "@/lib/api";

export default function Layout() {
  
  // === 启动时自动恢复上次的订阅 ===
  useEffect(() => {
    const restoreProfile = async () => {
      // 1. 稍微延迟，等待 Electron Bridge 就绪
      await new Promise(r => setTimeout(r, 500));

      const activeId = localStorage.getItem("clash_active_profile");
      if (!activeId) return;

      try {
        // 2. 只有当 electronAPI 存在时才执行 (避免报错)
        if (window.electronAPI?.getProfiles) {
            const profiles = await window.electronAPI.getProfiles();
            const activeProfile = profiles.find((p: any) => p.id === activeId);
            
            if (activeProfile && activeProfile.filePath) {
              console.log("正在自动恢复订阅:", activeProfile.name);
              await switchConfig(activeProfile.filePath);
            }
        }
      } catch (e) {
        console.error("自动恢复失败", e);
      }
    };

    restoreProfile();
  }, []);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6 bg-zinc-50/50 dark:bg-zinc-950">
        <Outlet />
      </main>
      <Toaster /> 
    </div>
  );
}