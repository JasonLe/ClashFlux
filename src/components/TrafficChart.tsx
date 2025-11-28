import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTraffic } from "@/hooks/useTraffic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";

const formatSpeed = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB/s`;
};

export function TrafficChart() {
  const { data, currentSpeed } = useTraffic();

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">实时流量</CardTitle>
          <div className="flex gap-4 text-sm font-mono">
            <div className="flex items-center gap-1 text-green-500">
              <ArrowDown size={14} />{formatSpeed(currentSpeed.down)}
            </div>
            <div className="flex items-center gap-1 text-blue-500">
              <ArrowUp size={14} />{formatSpeed(currentSpeed.up)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 'auto']} /> 
              <Tooltip content={() => null} cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="down" stroke="#22c55e" strokeWidth={2} fill="url(#colorDown)" isAnimationActive={false} />
              <Area type="monotone" dataKey="up" stroke="#3b82f6" strokeWidth={2} fill="url(#colorUp)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}