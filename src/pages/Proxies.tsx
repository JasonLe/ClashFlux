import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProxies, selectProxy, groupDelayTest } from "@/lib/api";
import { useState } from "react";
import { Zap, Search, Lock, Wifi, WifiOff } from "lucide-react";
import { Button, Input, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Chip, Card, CardBody, Spinner } from "@heroui/react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type SortType = 'default' | 'name_asc' | 'name_desc' | 'delay_asc' | 'delay_desc';

export default function Proxies() {
  const queryClient = useQueryClient();
  const [activeGroup, setActiveGroup] = useState<string>("");
  const [filterText, setFilterText] = useState("");
  const [sortType, setSortType] = useState<SortType>('default');
  const [testing, setTesting] = useState(false);

  const { data: proxies } = useQuery({ queryKey: ["proxies"], queryFn: getProxies, refetchInterval: 3000 });

  const mutation = useMutation({
    mutationFn: ({ group, node }: { group: string; node: string }) => selectProxy(group, node),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["proxies"] });
        setTimeout(() => { queryClient.invalidateQueries({ queryKey: ["proxies"] }); window.electronAPI?.refreshTray(); }, 500);
    },
    onError: () => toast.error("切换失败")
  });

  if (!proxies) return <div className="h-full flex items-center justify-center"><Spinner label="Loading Nodes..." color="primary" /></div>;

  const groups = Object.values(proxies as any)
    .filter((p: any) => ["Selector", "URLTest"].includes(p.type))
    .sort((a: any, b: any) => (a.name === "GLOBAL" || a.name === "Proxy" ? -1 : 1));

  let currentGroupName = activeGroup;
  if (!currentGroupName && groups.length > 0) {
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
          const d1 = a.history?.[a.history.length-1]?.delay||9999;
          const d2 = b.history?.[b.history.length-1]?.delay||9999;
          switch(sortType) {
              case 'delay_asc': return d1-d2;
              case 'delay_desc': return d2-d1;
              case 'name_asc': return a.name.localeCompare(b.name);
              case 'name_desc': return b.name.localeCompare(a.name);
              default: return 0;
          }
      });
  }

  const handleTestLatency = async () => {
    setTesting(true);
    try { await groupDelayTest(currentGroupName); toast.success("测速中..."); setTimeout(() => queryClient.invalidateQueries({ queryKey: ["proxies"] }), 1500); } 
    catch { toast.error("失败"); } finally { setTesting(false); }
  };

  const getDelayColor = (d?: number) => {
      if (!d) return "default";
      if (d < 200) return "success";
      if (d < 500) return "warning";
      return "danger";
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-7xl mx-auto gap-4">
      {/* Header ToolBar */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 p-1">
         <div className="flex items-center gap-4 min-w-0 flex-1">
             <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">代理组</h2>
                    <Chip size="sm" variant="flat" color={isSelectable ? "primary" : "warning"} className="h-5 text-[10px] uppercase font-bold">
                        {currentGroupNode?.type === 'URLTest' ? 'Auto' : 'Manual'}
                    </Chip>
                 </div>
                 <p className="text-tiny text-default-400 font-mono">Total {displayNodes.length} nodes</p>
             </div>
             
             {/* 修复：搜索框使用 min-w 和 max-w 限制，防止重叠 */}
             <Input 
                placeholder="Search..." 
                value={filterText} 
                onValueChange={setFilterText} 
                startContent={<Search size={16} className="text-default-400" />}
                size="sm"
                variant="faded"
                isClearable
                classNames={{ base: "w-full max-w-[240px] min-w-[150px]", inputWrapper: "bg-default-100/50" }}
             />
         </div>

         <div className="flex gap-2 shrink-0">
             <Dropdown>
                <DropdownTrigger><Button variant="bordered" size="sm">排序</Button></DropdownTrigger>
                <DropdownMenu aria-label="Sort" onAction={(k) => setSortType(k as any)}>
                    <DropdownItem key="default">默认</DropdownItem>
                    <DropdownItem key="delay_asc">延迟 (低到高)</DropdownItem>
                    <DropdownItem key="name_asc">名称 (A-Z)</DropdownItem>
                </DropdownMenu>
             </Dropdown>
             <Button color="primary" variant="shadow" size="sm" onPress={handleTestLatency} isLoading={testing} startContent={!testing && <Zap size={16}/>}>测速</Button>
         </div>
      </div>

      {/* Groups Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0 snap-x">
         {groups.map((group: any) => {
            const isGroupActive = currentGroupName === group.name;
            return (
                <Button
                    key={group.name}
                    size="sm"
                    variant={isGroupActive ? "solid" : "light"}
                    color={isGroupActive ? "primary" : "default"}
                    onPress={() => setActiveGroup(group.name)}
                    className={cn(
                        "min-w-fit snap-start transition-all", 
                        isGroupActive ? "font-bold shadow-md shadow-primary/20" : "text-default-500 hover:text-default-900"
                    )}
                >
                    {group.name} {group.type === 'URLTest' && <Lock size={12} className="opacity-50"/>}
                </Button>
            )
         })}
      </div>

      {/* Nodes Grid (With Animations) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-10 custom-scrollbar">
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 content-start">
            <AnimatePresence>
                {displayNodes.map((node: any) => {
                    const isActive = currentGroupNode?.now === node.name;
                    const delay = node.history?.[node.history.length - 1]?.delay;
                    
                    return (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            key={node.name}
                            className={!isSelectable ? "opacity-60 cursor-not-allowed" : ""}
                        >
                            <Card 
                                isPressable={isSelectable} 
                                onPress={() => isSelectable && mutation.mutate({ group: currentGroupName, node: node.name })}
                                className={cn(
                                    "border transition-all w-full h-full", 
                                    isActive 
                                        ? "border-primary bg-primary/10 shadow-sm" 
                                        : "border-transparent bg-content2/50 hover:bg-content2 hover:scale-[1.02]"
                                )}
                                shadow="none"
                            >
                                <CardBody className="p-3 flex flex-row justify-between items-center gap-2 overflow-hidden">
                                    <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                        <span className={cn("text-xs font-bold truncate", isActive ? "text-primary" : "text-foreground")} title={node.name}>
                                            {node.name}
                                        </span>
                                        <span className="text-[9px] text-default-400 uppercase tracking-wider truncate font-mono">
                                            {node.type}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {delay ? (
                                            <div className="flex items-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full bg-${getDelayColor(delay)}`}></span>
                                                <span className="text-[10px] font-mono text-default-500">{delay}</span>
                                            </div>
                                        ) : (
                                            <WifiOff size={12} className="text-default-300" />
                                        )}
                                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                    </div>
                                </CardBody>
                            </Card>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}