import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTraffic } from "@/hooks/useTraffic";
import { Card, CardHeader, CardBody } from "@heroui/react";
import { ArrowDown, ArrowUp, Activity } from "lucide-react";

const formatSpeed = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB/s`;
};

export function TrafficChart() {
  const { data, currentSpeed } = useTraffic();

  return (
    <Card className="border-none shadow-sm bg-content1 w-full">
      <CardHeader className="flex justify-between items-center pb-0 pt-4 px-4">
          <div className="flex items-center gap-2 text-default-700 font-bold text-sm">
            <Activity size={18} className="text-primary" /> 实时流量趋势
          </div>
          <div className="flex gap-4 text-tiny font-mono">
            <div className="flex items-center gap-1 text-success">
              <ArrowDown size={12} strokeWidth={3} />
              {formatSpeed(currentSpeed.down)}
            </div>
            <div className="flex items-center gap-1 text-primary">
              <ArrowUp size={12} strokeWidth={3} />
              {formatSpeed(currentSpeed.up)}
            </div>
          </div>
      </CardHeader>
      <CardBody className="p-0 overflow-hidden min-h-[240px]">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#17c964" stopOpacity={0.4} /> {/* HeroUI Success Color */}
                  <stop offset="95%" stopColor="#17c964" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#006FEE" stopOpacity={0.4} /> {/* HeroUI Primary Color */}
                  <stop offset="95%" stopColor="#006FEE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nextui-content3)" opacity={0.5} />
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 'auto']} /> 
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'var(--nextui-content1)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--nextui-divider)', 
                    boxShadow: 'var(--nextui-box-shadow-medium)',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                }}
                labelFormatter={() => ''}
                itemStyle={{ color: 'var(--nextui-foreground)' }}
                formatter={(value: number, name: string) => [
                    formatSpeed(value), 
                    name === 'down' ? '下载' : '上传'
                ]}
              />
              <Area type="monotone" dataKey="down" stroke="#17c964" strokeWidth={2} fillOpacity={1} fill="url(#colorDown)" isAnimationActive={false} />
              <Area type="monotone" dataKey="up" stroke="#006FEE" strokeWidth={2} fillOpacity={1} fill="url(#colorUp)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}