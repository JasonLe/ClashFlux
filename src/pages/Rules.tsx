import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldAlert, Globe, Radio } from "lucide-react";

interface Rule {
  type: string;
  payload: string;
  proxy: string;
  size?: number; // 只有 Rule Provider 才有 size
}

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [filteredRules, setFilteredRules] = useState<Rule[]>([]);
  const [search, setSearch] = useState("");
  const [providerCount, setProviderCount] = useState(0);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const { data } = await apiClient.get('/rules');
        const ruleList = data.rules || [];
        setRules(ruleList);
        setFilteredRules(ruleList.slice(0, 100)); // 默认只渲染前100条防止卡顿
        
        // 统计有多少是 Provider 类型的（高级规则集）
        const count = ruleList.filter((r: any) => r.type === 'RuleSet').length;
        setProviderCount(count);
      } catch (e) { console.error(e); }
    };
    fetchRules();
  }, []);

  // 搜索逻辑
  useEffect(() => {
    if (!search) {
      setFilteredRules(rules.slice(0, 100));
    } else {
      const lower = search.toLowerCase();
      const matched = rules.filter(r => 
        r.payload.toLowerCase().includes(lower) || 
        r.proxy.toLowerCase().includes(lower) ||
        r.type.toLowerCase().includes(lower)
      );
      setFilteredRules(matched.slice(0, 100)); // 搜索结果也限制数量
    }
  }, [search, rules]);

  // 根据类型显示不同颜色的 Badge
  const getBadgeVariant = (proxy: string) => {
    if (proxy === 'DIRECT') return 'bg-green-500 hover:bg-green-600';
    if (proxy === 'REJECT') return 'bg-red-500 hover:bg-red-600';
    return 'bg-blue-500 hover:bg-blue-600';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
         <h2 className="text-2xl font-bold tracking-tight">分流规则 ({rules.length})</h2>
         <div className="text-sm text-muted-foreground">
            {providerCount > 0 && <span className="mr-4">包含 {providerCount} 个规则集</span>}
         </div>
      </div>

      {/* 搜索栏 */}
      <div className="relative w-full max-w-md shrink-0">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
              placeholder="搜索域名、IP 或 策略组..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
          />
      </div>

      {/* 规则列表 */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-3 border-b bg-muted/30 shrink-0">
            <div className="grid grid-cols-12 text-xs font-bold text-muted-foreground px-2">
                <div className="col-span-2">类型 (Type)</div>
                <div className="col-span-6">规则内容 (Payload)</div>
                <div className="col-span-4 text-right">策略 (Proxy)</div>
            </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
            {filteredRules.map((rule, index) => (
                <div key={index} className="grid grid-cols-12 text-sm px-6 py-3 border-b hover:bg-muted/50 transition-colors items-center">
                    <div className="col-span-2 font-mono text-xs text-muted-foreground truncate" title={rule.type}>
                        {rule.type}
                    </div>
                    <div className="col-span-6 font-medium truncate pr-4" title={rule.payload}>
                        {rule.payload}
                    </div>
                    <div className="col-span-4 flex justify-end">
                        <Badge className={`${getBadgeVariant(rule.proxy)} text-white border-0`}>
                            {rule.proxy}
                        </Badge>
                    </div>
                </div>
            ))}
            {filteredRules.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">没有找到匹配的规则</div>
            )}
            {/* 提示信息 */}
            {rules.length > 100 && !search && (
                <div className="text-center py-4 text-xs text-muted-foreground bg-muted/20">
                    仅显示前 100 条，请使用搜索查找更多...
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}