import { Card, CardBody } from "@heroui/react";

interface ProxyCardProps {
  name: string;
  type: string;
  delay?: number;
  active?: boolean;
  onClick?: () => void;
}

export function ProxyCard({ name, type, delay, active, onClick }: ProxyCardProps) {
  
  const getDelayColor = (d?: number) => {
    if (!d) return "bg-default-300";
    if (d < 200) return "bg-success";
    if (d < 500) return "bg-warning";
    return "bg-danger";
  };

  const getDelayText = (d?: number) => {
      if (!d) return "Timeout";
      return `${d}ms`;
  };

  return (
    <Card 
      isPressable 
      onPress={onClick}
      className={`border-2 transition-all w-full ${active ? "border-primary bg-primary/5" : "border-transparent bg-content2 hover:bg-content3"}`}
      shadow="sm"
    >
      <CardBody className="p-3 flex flex-row justify-between items-center gap-2 overflow-hidden">
        <div className="flex flex-col min-w-0 flex-1">
            <span className={`text-xs font-bold truncate ${active ? "text-primary" : "text-foreground"}`} title={name}>
                {name}
            </span>
            <span className="text-[9px] text-default-400 uppercase tracking-wider mt-0.5 truncate">
                {type}
            </span>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getDelayColor(delay)}`}></span>
                <span className="text-[10px] font-mono text-default-500">{getDelayText(delay)}</span>
            </div>
            {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
      </CardBody>
    </Card>
  );
}