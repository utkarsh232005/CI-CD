import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StageStatus = "pending" | "running" | "success" | "failed";

interface PipelineStageProps {
  name: string;
  status: StageStatus;
  duration?: string;
  logs?: string[];
}

const statusConfig = {
  pending: {
    icon: Circle,
    color: "text-pending",
    bgColor: "bg-pending/10",
    borderColor: "border-pending/30",
  },
  running: {
    icon: Loader2,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
  },
  success: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
  },
  failed: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
  },
};

export const PipelineStage = ({ name, status, duration, logs }: PipelineStageProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-lg border-2 p-6 transition-all duration-300",
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon 
            className={cn(
              "h-6 w-6",
              config.color,
              status === "running" && "animate-spin"
            )} 
          />
          <div>
            <h3 className="text-lg font-semibold text-foreground">{name}</h3>
            {duration && (
              <p className="text-sm text-muted-foreground">{duration}</p>
            )}
          </div>
        </div>
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide",
          config.bgColor,
          config.color
        )}>
          {status}
        </span>
      </div>
      
      {logs && logs.length > 0 && (
        <div className="mt-4 bg-background/50 rounded-md p-4 font-mono text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="flex gap-2">
              <span className="text-primary">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
