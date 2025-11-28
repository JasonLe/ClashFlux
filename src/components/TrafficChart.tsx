import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTraffic } from "@/hooks/useTraffic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Activity } from "lucide-react";

const formatSpeed = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB/s`;
};

export function TrafficChart() {
  const { data, currentSpeed } = useTraffic();

  return (
    <Card className="col-span-2 overflow-hidden border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
      <CardHeader className="pb-2 pt-4 px-6 border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            实时流量
          </CardTitle>
          <div className="flex gap-6 text-sm font-mono">
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md border border-green-100 dark:border-green-900/50">
              <ArrowDown size={14} strokeWidth={3} />
              {formatSpeed(currentSpeed.down)}
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50">
              <ArrowUp size={14} strokeWidth={3} />
              {formatSpeed(currentSpeed.up)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              {/* 网格线 */}
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
              
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 'auto']} /> 
              
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                }}
                labelFormatter={() => ''}
                formatter={(value: number, name: string) => [
                    formatSpeed(value), 
                    name === 'down' ? '下载' : '上传'
                ]}
                itemStyle={{ padding: 0 }}
              />
              
              {/* 下载曲线 (绿色) */}
              <Area 
                type="monotone" 
                dataKey="down" 
                stroke="#22c55e" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorDown)" 
                isAnimationActive={false}
              />
              
              {/* 上传曲线 (蓝色) - 叠加在上方，或者你可以把 fillOpacity 调低 */}
              <Area 
                type="monotone" 
                dataKey="up" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorUp)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}