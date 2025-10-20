import { ArrowRight } from "lucide-react";
import { PipelineStage, StageStatus } from "./PipelineStage";

interface Stage {
  id: string;
  name: string;
  status: StageStatus;
  duration?: string;
  logs?: string[];
}

interface PipelineVisualizationProps {
  stages: Stage[];
}

export const PipelineVisualization = ({ stages }: PipelineVisualizationProps) => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-4 overflow-x-auto pb-4">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-4 flex-shrink-0">
            <div className="min-w-[300px]">
              <PipelineStage
                name={stage.name}
                status={stage.status}
                duration={stage.duration}
                logs={stage.logs}
              />
            </div>
            {index < stages.length - 1 && (
              <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
