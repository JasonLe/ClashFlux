import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ProxyCardProps {
  name: string;
  type: string;
  delay?: number;
  active?: boolean;
  onClick?: () => void;
}

export function ProxyCard({ name, type, delay, active, onClick }: ProxyCardProps) {
  const getDelayColor = (d?: number) => {
    if (!d) return "text-zinc-400";
    if (d < 400) return "text-green-500";
    if (d < 800) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border p-3 transition-all hover:bg-accent",
        active ? "bg-accent border-primary/50 ring-1 ring-primary/20" : "bg-card"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium truncate w-3/4" title={name}>{name}</span>
        {delay ? (
           <span className={cn("text-xs font-bold", getDelayColor(delay))}>{delay}ms</span>
        ) : (
           <Badge variant="outline" className="text-[10px] h-5 px-1">{type}</Badge>
        )}
      </div>
      <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        {active && <div className="h-full bg-primary w-full" />}
      </div>
    </div>
  );
}