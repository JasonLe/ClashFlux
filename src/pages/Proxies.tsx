import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProxies, selectProxy, groupDelayTest, ProxyNode, ProxyProviders } from "@/lib/api";
import { ProxyCard } from "@/components/ProxyCard";
import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Proxies() {
    const queryClient = useQueryClient();
    const [activeGroup, setActiveGroup] = useState<string>("");
    const [testing, setTesting] = useState(false);
    const [filterText, setFilterText] = useState("");

    const { data: proxies } = useQuery({
        queryKey: ["proxies"],
        queryFn: getProxies,
        refetchInterval: 3000,
    });

    const mutation = useMutation({
        mutationFn: ({ group, node }: { group: string; node: string }) => selectProxy(group, node),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proxies"] }),
    });

    if (!proxies) return <div className="flex h-full items-center justify-center text-muted-foreground">连接内核中...</div>;

    const typedProxies = proxies as ProxyProviders['proxies'];

    const groups = Object.values(typedProxies)
        .filter((p: ProxyNode) => ["Selector", "URLTest", "Fallback"].includes(p.type))
        .sort((a: ProxyNode, b: ProxyNode) => {
            // "Proxy" or "GLOBAL" should be sticky on top
            if (a.name === "GLOBAL" || a.name === "Proxy") return -1;
            if (b.name === "GLOBAL" || b.name === "Proxy") return 1;
            return 0;
        });

    const currentGroupName = activeGroup || groups[0]?.name;
    const currentGroupNode = typedProxies[currentGroupName];
    
    // Feature: filter nodes by search text
    const subNodes = currentGroupNode?.all
        ?.map((name: string) => typedProxies[name])
        .filter(node => node && node.name.toLowerCase().includes(filterText.toLowerCase())) || [];


    const handleTestLatency = async () => {
        if (!currentGroupName) {
            toast.error("请先选择一个代理组");
            return;
        }
        setTesting(true);
        try {
            await groupDelayTest(currentGroupName);
            toast.success("测速指令已发送");
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ["proxies"] }), 1000);
        } catch (e: unknown) {
            if (e instanceof Error) {
                toast.error(`测速失败: ${e.message}`);
            } else {
                toast.error("测速失败");
            }
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4 max-w-6xl mx-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-2xl font-bold tracking-tight whitespace-nowrap">代理组</h2>

                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="搜索节点..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="pl-8 h-9 bg-muted/50 border-transparent focus:bg-background transition-colors"
                        />
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestLatency}
                    disabled={testing}
                    className={cn("gap-2 whitespace-nowrap", testing && "animate-pulse")}
                >
                    <Zap size={16} className={testing ? "text-yellow-500 fill-yellow-500" : ""} />
                    {testing ? "测速中" : "测速"}
                </Button>
            </div>

            {/* Group Tabs */}
            <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-hide mask-image-gradient">
                {groups.map((group: ProxyNode) => (
                    <button
                        key={group.name}
                        onClick={() => setActiveGroup(group.name)}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                            currentGroupName === group.name
                                ? "bg-primary text-primary-foreground border-primary shadow-md"
                                : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                        )}
                    >
                        {group.name}
                    </button>
                ))}
            </div>

            {/* Node List */}
            <div className="flex-1 overflow-y-auto pr-2 pb-10">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {subNodes.map((node: ProxyNode) => {
                        if (!node) return null; // Defensive check
                        const isActive = currentGroupNode.now === node.name;
                        const delay = node.history?.[node.history.length - 1]?.delay || 0;

                        return (
                            <ProxyCard
                                key={node.name}
                                name={node.name}
                                type={node.type}
                                active={isActive}
                                delay={delay}
                                onClick={() => mutation.mutate({ group: currentGroupName, node: node.name })}
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    );
}