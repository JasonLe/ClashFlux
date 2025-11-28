import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle2, XCircle, Timer } from "lucide-react";

const SITES = [
  { name: "Google", url: "https://www.google.com" },
  { name: "YouTube", url: "https://www.youtube.com" },
  { name: "GitHub", url: "https://github.com" },
  { name: "OpenAI", url: "https://openai.com" },
  { name: "Netflix", url: "https://www.netflix.com" },
  { name: "Disney+", url: "https://www.disneyplus.com" },
  { name: "Bilibili", url: "https://www.bilibili.com" },
  { name: "Baidu", url: "https://www.baidu.com" },
];

export default function Testing() {
  const [results, setResults] = useState<Record<string, { ok: boolean; status: number; time: number } | null>>({});
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true);
    setResults({}); // 清空旧结果
    
    // 并行测试
    const promises = SITES.map(async (site) => {
        const res = await window.electronAPI.testWebsite(site.url);
        setResults(prev => ({ ...prev, [site.name]: res }));
    });

    await Promise.all(promises);
    setTesting(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">连通性测试</h2>
        <Button onClick={runTest} disabled={testing}>
            <Play className={`mr-2 h-4 w-4 ${testing ? "animate-spin" : ""}`} /> 
            {testing ? "测试中..." : "开始测试"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SITES.map((site) => {
            const res = results[site.name];
            return (
                <Card key={site.name} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="font-medium">{site.name}</div>
                        <div className="text-xs text-muted-foreground">{site.url}</div>
                    </div>
                    <div>
                        {!res && testing && <span className="text-xs text-muted-foreground animate-pulse">Waiting...</span>}
                        {res && (
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-mono ${res.time > 1000 ? "text-yellow-600" : "text-green-600"} flex items-center`}>
                                    <Timer size={12} className="mr-1"/> {res.time}ms
                                </span>
                                {res.ok ? (
                                    <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 size={12} className="mr-1"/> 200 OK</Badge>
                                ) : (
                                    <Badge variant="destructive"><XCircle size={12} className="mr-1"/> {res.status || "Error"}</Badge>
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            )
        })}
      </div>
    </div>
  );
}