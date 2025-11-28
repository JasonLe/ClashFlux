import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

interface ProxyCardProps {
  name: string;
  type: string;
  delay?: number;
  active?: boolean;
  onClick?: () => void;
}

export function ProxyCard({ name, type, delay, active, onClick }: ProxyCardProps) {
  
  const getDelayStyle = (d?: number) => {
    if (!d) return { color: "text-zinc-400", bg: "bg-zinc-400", label: "Timeout" };
    if (d < 400) return { color: "text-green-500", bg: "bg-green-500", label: `${d}ms` };
    if (d < 800) return { color: "text-yellow-500", bg: "bg-yellow-500", label: `${d}ms` };
    return { color: "text-red-500", bg: "bg-red-500", label: `${d}ms` };
  };

  const status = getDelayStyle(delay);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-xl border p-3 transition-all duration-200 ease-out",
        "hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0",
        active 
          ? "bg-white dark:bg-zinc-800 border-primary shadow-sm ring-1 ring-primary/20" 
          : "bg-white/50 dark:bg-zinc-900/50 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
      )}
    >
      <div className="flex flex-col gap-3">
        {/* 顶部：名字与类型 */}
        <div className="flex justify-between items-start gap-2">
            <span className={cn(
                "text-sm font-medium truncate flex-1 transition-colors",
                active ? "text-primary" : "text-foreground group-hover:text-foreground"
            )} title={name}>
                {name}
            </span>
            <Badge variant="secondary" className="text-[9px] h-4 px-1 rounded-sm font-normal opacity-50">
                {type}
            </Badge>
        </div>

        {/* 底部：延迟显示 */}
        <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1.5">
                {/* 呼吸灯效果 */}
                <span className={cn("flex h-2 w-2 rounded-full", status.bg, active && "animate-pulse")} />
                <span className={cn("text-xs font-mono font-medium", status.color)}>
                    {status.label}
                </span>
            </div>
            {/* 选中指示器 */}
            <div className={cn(
                "h-1.5 w-1.5 rounded-full bg-primary transition-all duration-300",
                active ? "opacity-100 scale-100" : "opacity-0 scale-0"
            )} />
        </div>
      </div>
    </div>
  );
}