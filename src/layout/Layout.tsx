import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { switchConfig } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export default function Layout() {
  const queryClient = useQueryClient();
  const location = useLocation();

  useEffect(() => {
    const restoreProfile = async () => {
      await new Promise(r => setTimeout(r, 500));
      const activeId = localStorage.getItem("clash_active_profile");
      if (!activeId) return;
      try {
        if (window.electronAPI?.getProfiles) {
            const profiles = await window.electronAPI.getProfiles();
            const activeProfile = profiles.find((p: any) => p.id === activeId);
            if (activeProfile && activeProfile.filePath) {
              await switchConfig(activeProfile.filePath);
            }
        }
      } catch (e) { console.error(e); }
    };
    restoreProfile();

    if (window.electronAPI?.onClashUpdate) {
        window.electronAPI.onClashUpdate(() => {
            queryClient.invalidateQueries(); 
        });
    }
  }, []);

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-black text-foreground overflow-hidden font-sans">
      <Sidebar />
      {/* 主要内容区域 */}
      <main className="flex-1 overflow-hidden relative">
        {/* 背景装饰（可选） */}
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] pointer-events-none" />
        
        <div className="h-full w-full overflow-auto custom-scrollbar p-6">
            {/* 这里的 key={location.pathname} 确保切换路由时触发动画 */}
            <div key={location.pathname} className="animate-in-fade max-w-7xl mx-auto">
                <Outlet />
            </div>
        </div>
      </main>
      <Toaster position="bottom-right" theme="system" /> 
    </div>
  );
}