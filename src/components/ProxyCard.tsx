import { cn } from "@/lib/utils";

interface ProxyCardProps {
  name: string;
  type: string;
  delay?: number;
  active?: boolean;
  onClick?: () => void;
}

export function ProxyCard({ name, type, delay, active, onClick }: ProxyCardProps) {
  
  const getDelayStyle = (d?: number) => {
    if (d === undefined || d === 0) return { bg: "bg-zinc-300 dark:bg-zinc-600", text: "text-zinc-400", label: "-" };
    if (d < 200) return { bg: "bg-emerald-500", text: "text-emerald-600", label: `${d}ms` };
    if (d < 500) return { bg: "bg-yellow-500", text: "text-yellow-600", label: `${d}ms` };
    return { bg: "bg-red-500", text: "text-red-600", label: `${d}ms` };
  };

  const status = getDelayStyle(delay);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-lg border px-3 py-2 transition-all duration-200 ease-out select-none", // 减小 padding (p-3.5 -> px-3 py-2)
        "hover:border-primary/50 hover:shadow-sm active:scale-[0.98]",
        active 
          ? "bg-white dark:bg-zinc-800 border-primary shadow-sm ring-1 ring-primary/20" 
          : "bg-white/40 dark:bg-zinc-900/40 border-transparent hover:bg-white dark:hover:bg-zinc-900"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {/* 左侧：名称 */}
        <div className="flex flex-col min-w-0 flex-1">
            <span className={cn(
                "text-xs font-medium truncate transition-colors leading-tight", // text-sm -> text-xs
                active ? "text-primary" : "text-zinc-700 dark:text-zinc-300"
            )} title={name}>
                {name}
            </span>
            {/* 类型显示极简化，仅作为副标题 */}
            <span className="text-[9px] text-muted-foreground/60 truncate font-mono mt-0.5">
                {type}
            </span>
        </div>

        {/* 右侧：延迟 */}
        <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", status.bg)} />
                <span className={cn("text-[10px] font-mono font-medium", status.text)}>
                    {status.label}
                </span>
            </div>
            {/* 选中指示点 */}
            {active && <div className="w-1 h-1 rounded-full bg-primary" />}
        </div>
      </div>
    </div>
  );
}