import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProxies, selectProxy, groupDelayTest } from "@/lib/api";
import { ProxyCard } from "@/components/ProxyCard";
import { useState, useRef } from "react";
import { Zap, Search, Lock, Loader2, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SortType = 'default' | 'name_asc' | 'name_desc' | 'delay_asc' | 'delay_desc';

export default function Proxies() {
  const queryClient = useQueryClient();
  const [activeGroup, setActiveGroup] = useState<string>("");
  const [testing, setTesting] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [switchingNode, setSwitchingNode] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('default');
  const tabsRef = useRef<HTMLDivElement>(null);

  const { data: proxies } = useQuery({ queryKey: ["proxies"], queryFn: getProxies, refetchInterval: 3000 });

  const mutation = useMutation({
    mutationFn: ({ group, node }: { group: string; node: string }) => selectProxy(group, node),
    onMutate: (vars) => setSwitchingNode(vars.node),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["proxies"] });
        setTimeout(() => { queryClient.invalidateQueries({ queryKey: ["proxies"] }); window.electronAPI?.refreshTray(); }, 500);
    },
    onError: () => toast.error("切换失败"),
    onSettled: () => setSwitchingNode(null)
  });

  const handleTabWheel = (e: React.WheelEvent) => { if (tabsRef.current) tabsRef.current.scrollLeft += e.deltaY; };

  if (!proxies) return <div className="flex h-full items-center justify-center text-muted-foreground animate-pulse">正在连接内核...</div>;

  const groups = Object.values(proxies as any)
    .filter((p: any) => ["Selector", "URLTest"].includes(p.type))
    .sort((a: any, b: any) => (a.name === "GLOBAL" || a.name === "Proxy" ? -1 : 1));

  if (groups.length === 0) return <div className="flex h-full items-center justify-center text-muted-foreground">暂无代理组</div>;

  let currentGroupName = activeGroup;
  if (!currentGroupName) {
      const priorityRegex = /Proxy|Select|节点|代理/i;
      const defaultGroup = groups.find((g: any) => priorityRegex.test(g.name)) || groups[0];
      currentGroupName = defaultGroup.name;
  }

  const currentGroupNode = (proxies as any)[currentGroupName];
  const isSelectable = currentGroupNode?.type === 'Selector';
  let displayNodes = currentGroupNode?.all?.map((name: string) => (proxies as any)[name]) || [];

  if (filterText) displayNodes = displayNodes.filter((node: any) => node.name.toLowerCase().includes(filterText.toLowerCase()));

  if (sortType !== 'default') {
    displayNodes.sort((a: any, b: any) => {
      const delayA = a.history?.[a.history.length - 1]?.delay || 99999;
      const delayB = b.history?.[b.history.length - 1]?.delay || 99999;
      switch (sortType) {
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          case 'delay_asc': return delayA - delayB;
          case 'delay_desc': return delayB - delayA;
          default: return 0;
      }
    });
  }

  const handleTestLatency = async () => {
    setTesting(true);
    try { await groupDelayTest(currentGroupName); toast.success("测速中..."); setTimeout(() => queryClient.invalidateQueries({ queryKey: ["proxies"] }), 1500); } 
    catch (e) { toast.error("测速失败"); } finally { setTesting(false); }
  };

  const handleTestAll = async () => {
      setTesting(true);
      try { toast.info("全组测速中..."); await Promise.all(groups.map((g: any) => groupDelayTest(g.name))); setTimeout(() => queryClient.invalidateQueries({ queryKey: ["proxies"] }), 2000); } 
      catch (e) { toast.error("失败"); } finally { setTesting(false); }
  };

  const handleNodeClick = (nodeName: string) => {
    if (!isSelectable) return toast.warning("自动组无法手动切换");
    mutation.mutate({ group: currentGroupName, node: nodeName });
  };

  const getSortLabel = () => {
    switch (sortType) {
        case 'name_asc': return { label: '名称 (A-Z)', icon: ArrowDown };
        case 'name_desc': return { label: '名称 (Z-A)', icon: ArrowUp };
        case 'delay_asc': return { label: '延迟 (低-高)', icon: ArrowDown };
        case 'delay_desc': return { label: '延迟 (高-低)', icon: ArrowUp };
        default: return { label: '默认排序', icon: ArrowUpDown };
    }
  };
  const SortIcon = getSortLabel().icon;

  return (
    <div className="flex flex-col space-y-3 h-[calc(100vh-3.5rem)] max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 shrink-0">
         <div className="flex items-center gap-4 flex-1">
             <h2 className="text-xl font-bold tracking-tight whitespace-nowrap flex items-center gap-2">
                代理组
                <span className={cn("text-[10px] font-normal px-1.5 py-0.5 rounded border", isSelectable ? "bg-green-50 text-green-700 border-green-200" : "bg-orange-50 text-orange-700 border-orange-200")}>
                    {currentGroupNode?.type === 'URLTest' ? 'AUTO' : 'MANUAL'}
                </span>
             </h2>
             <div className="relative w-full max-w-xs">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="搜索..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-8 h-8 text-xs bg-muted/50" />
             </div>
         </div>
         <div className="flex gap-2">
             <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2 h-8 text-xs"><SortIcon size={12} />{getSortLabel().label}</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortType('default')}><RotateCcw size={14} className="mr-2"/> 默认</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortType('delay_asc')}>延迟 (低到高)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortType('name_asc')}>名称 (A-Z)</DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
             <div className="flex rounded-md shadow-sm h-8">
                 <Button variant="outline" size="sm" onClick={handleTestLatency} disabled={testing} className={cn("gap-2 rounded-r-none border-r-0 h-8 text-xs", testing && "animate-pulse")}><Zap size={12} className={testing ? "text-yellow-500 fill-yellow-500" : ""} /> {testing ? "测速..." : "测速"}</Button>
                 <Button variant="outline" size="sm" onClick={handleTestAll} disabled={testing} className="px-2 rounded-l-none h-8" title="全测"><ZapOff size={12} /></Button>
             </div>
         </div>
      </div>

      <div ref={tabsRef} onWheel={handleTabWheel} className="flex overflow-x-auto pb-1 space-x-1.5 scrollbar-hide mask-image-gradient shrink-0 cursor-grab active:cursor-grabbing">
         {groups.map((group: any) => (
            <button key={group.name} onClick={() => setActiveGroup(group.name)} className={cn("px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-1.5", currentGroupName === group.name ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground")}>
                {group.name} {group.type === 'URLTest' && <Lock size={10} className="opacity-70" />}
            </button>
         ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-2 custom-scrollbar">
        {/* === 核心优化：高密度 Grid 布局 === */}
        {/* 小屏3列，中屏4列，大屏5列，超大屏6列 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 pb-10">
            {displayNodes.map((node: any) => {
                const isActive = currentGroupNode.now === node.name;
                const delay = node.history?.[node.history.length - 1]?.delay;
                const isLoading = switchingNode === node.name;
                return (
                    <div key={node.name} className={cn("relative transition-opacity", !isSelectable && "opacity-60 cursor-not-allowed")}>
                        {isLoading && (<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-lg backdrop-blur-[1px]"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>)}
                        <ProxyCard name={node.name} type={node.type} active={isActive} delay={delay} onClick={() => !isLoading && handleNodeClick(node.name)} />
                    </div>
                )
            })}
            {displayNodes.length === 0 && (<div className="col-span-full text-center py-20 text-muted-foreground text-xs">暂无节点</div>)}
        </div>
      </div>
    </div>
  );
}