import { useEffect, useState } from "react";
import { PipelineVisualization } from "@/components/PipelineVisualization";
import { Activity, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type StageStatus = "pending" | "running" | "success" | "failed";

interface Stage {
  id: string;
  name: string;
  status: StageStatus;
  duration?: string;
  logs?: string[];
}

const Index = () => {
  const [stages, setStages] = useState<Stage[]>([
    {
      id: "clone",
      name: "Clone Repository",
      status: "success",
      duration: "2s",
      logs: [
        "Cloning into 'project'...",
        "remote: Counting objects: 100%",
        "Receiving objects: 100% (1234/1234)",
        "✓ Repository cloned successfully"
      ]
    },
    {
      id: "build",
      name: "Build Application",
      status: "running",
      duration: "1m 23s",
      logs: [
        "Installing dependencies...",
        "npm install --production",
        "Building application...",
        "Compiling TypeScript files..."
      ]
    },
    {
      id: "test",
      name: "Run Tests",
      status: "pending",
    },
    {
      id: "deploy",
      name: "Deploy to Production",
      status: "pending",
    },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStages(prev => [
        prev[0],
        {
          ...prev[1],
          status: "success",
          duration: "1m 45s",
          logs: [
            ...prev[1].logs!,
            "✓ Build completed successfully",
            "✓ All assets generated"
          ]
        },
        {
          ...prev[2],
          status: "running",
          duration: "12s",
          logs: [
            "Running test suite...",
            "✓ Unit tests: 45 passed",
            "✓ Integration tests: 12 passed"
          ]
        },
        prev[3]
      ]);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const overallStatus = stages.some(s => s.status === "failed")
    ? "Failed"
    : stages.some(s => s.status === "running")
      ? "Running"
      : stages.every(s => s.status === "success")
        ? "Success"
        : "Pending";

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">CI/CD Pipeline</h1>
              <p className="text-muted-foreground">Real-time deployment status</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Real-time Dashboard
              </Button>
            </Link>
            <Card className="px-6 py-3 bg-card border-border">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className={`text-sm font-semibold ${overallStatus === "Success" ? "text-success" :
                    overallStatus === "Failed" ? "text-destructive" :
                      overallStatus === "Running" ? "text-warning" :
                        "text-pending"
                  }`}>
                  {overallStatus}
                </span>
              </div>
            </Card>
          </div>
        </div>

        {/* Pipeline Info */}
        <Card className="p-6 bg-card border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Branch</p>
              <p className="font-mono text-sm text-foreground">main</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Commit</p>
              <p className="font-mono text-sm text-foreground">a1b2c3d</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Triggered By</p>
              <p className="font-mono text-sm text-foreground">push event</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Started</p>
              <p className="font-mono text-sm text-foreground">2 minutes ago</p>
            </div>
          </div>
        </Card>

        {/* Pipeline Stages */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold text-foreground mb-6">Pipeline Stages</h2>
          <PipelineVisualization stages={stages} />
        </Card>
      </div>
    </div>
  );
};

export default Index;
