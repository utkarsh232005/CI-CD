import { useEffect, useState } from "react";
import { PipelineVisualization } from "@/components/PipelineVisualization";
import { Activity, BarChart3, Play, RefreshCw, GitBranch, Clock, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { io, Socket } from "socket.io-client";

type StageStatus = "pending" | "running" | "success" | "failed";

interface Stage {
  id: string;
  name: string;
  status: StageStatus;
  duration?: string;
  logs?: string[];
  startTime?: string;
  conclusion?: string;
}

interface GitHubWorkflow {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_sha: string;
  html_url: string;
  actor?: {
    login: string;
    avatar_url: string;
  };
  jobs?: GitHubJob[];
}

interface GitHubJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  html_url: string;
  steps?: GitHubStep[];
}

interface GitHubStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string;
  completed_at: string | null;
}

const Index = () => {
  const [stages, setStages] = useState<Stage[]>([
    {
      id: "clone",
      name: "Clone Repository",
      status: "pending",
    },
    {
      id: "build",
      name: "Build Application",
      status: "pending",
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

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentInfo, setDeploymentInfo] = useState({
    branch: "main",
    commit: "a1b2c3d",
    triggeredBy: "manual",
    startTime: ""
  });

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001');
    setSocket(newSocket);

    // Listen for deployment events
    newSocket.on('deployment:started', (data) => {
      setIsDeploying(true);
      setDeploymentInfo(prev => ({
        ...prev,
        startTime: new Date(data.timestamp).toLocaleTimeString()
      }));

      // Reset all stages to pending and start with clone
      setStages(prev => prev.map(stage => ({
        ...stage,
        status: stage.id === "clone" ? "running" : "pending",
        startTime: stage.id === "clone" ? data.timestamp : undefined,
        logs: stage.id === "clone" ? ["🔄 Starting repository clone..."] : undefined
      })));
    });

    newSocket.on('deployment:progress', (data) => {
      const { step, progress } = data;

      // Map deployment steps to our pipeline stages
      let currentStageId = "clone";
      if (step.includes("dependencies") || step.includes("Installing")) {
        currentStageId = "build";
      } else if (step.includes("test") || step.includes("Running tests")) {
        currentStageId = "test";
      } else if (step.includes("deploy") || step.includes("Deploying") || step.includes("Finalizing")) {
        currentStageId = "deploy";
      }

      setStages(prev => prev.map(stage => {
        if (stage.id === currentStageId) {
          return {
            ...stage,
            status: "running",
            logs: [...(stage.logs || []), `🔄 ${data.message}`],
            startTime: stage.startTime || data.timestamp
          };
        }
        return stage;
      }));
    });

    newSocket.on('deployment:log', (data) => {
      const { type, message } = data;

      // Determine which stage this log belongs to
      let stageId = "clone";
      if (message.includes("dependencies") || message.includes("Build")) {
        stageId = "build";
      } else if (message.includes("test") || message.includes("Test")) {
        stageId = "test";
      } else if (message.includes("deploy") || message.includes("Deploy")) {
        stageId = "deploy";
      }

      setStages(prev => prev.map(stage => {
        if (stage.id === stageId) {
          const newLog = type === "success" ? `✅ ${message}` : `⚠️ ${message}`;
          return {
            ...stage,
            logs: [...(stage.logs || []), newLog],
            status: type === "success" ? "success" : stage.status,
            duration: type === "success" && stage.startTime ?
              calculateDuration(stage.startTime, data.timestamp) : stage.duration
          };
        }
        return stage;
      }));
    });

    newSocket.on('deployment:completed', (data) => {
      setIsDeploying(false);
      setStages(prev => prev.map(stage => ({
        ...stage,
        status: "success",
        logs: [...(stage.logs || []),
        stage.id === "deploy" ? `🎉 Deployment completed! URL: ${data.url}` : "✅ Stage completed"
        ]
      })));
    });

    newSocket.on('deployment:failed', (data) => {
      setIsDeploying(false);
      setStages(prev => prev.map(stage => ({
        ...stage,
        status: stage.status === "running" ? "failed" : stage.status,
        logs: [...(stage.logs || []), `❌ ${data.error}`]
      })));
    });

    newSocket.on('github:workflow', (data) => {
      const { action, workflow } = data;
      if (action === 'started' || action === 'requested') {
        triggerPipelineFromWorkflow(workflow);
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const calculateDuration = (startTime: string, endTime: string): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const triggerPipelineFromWorkflow = (workflow: any) => {
    setDeploymentInfo(prev => ({
      ...prev,
      triggeredBy: `GitHub: ${workflow.name}`,
      startTime: new Date().toLocaleTimeString()
    }));
  };

  const triggerDeployment = async () => {
    if (!socket || isDeploying) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}/api/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: 'main' })
      });

      if (response.ok) {
        console.log('Deployment triggered successfully');
      }
    } catch (error) {
      console.error('Failed to trigger deployment:', error);
    }
  };

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
            <Button
              onClick={triggerDeployment}
              disabled={isDeploying}
              className="flex items-center gap-2"
            >
              {isDeploying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Trigger Deploy
                </>
              )}
            </Button>
            <Card className="px-6 py-3 bg-card border-border">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className={`text-sm font-semibold ${overallStatus === "Success" ? "text-green-600" :
                  overallStatus === "Failed" ? "text-red-600" :
                    overallStatus === "Running" ? "text-yellow-600" :
                      "text-gray-600"
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
              <p className="font-mono text-sm text-foreground">{deploymentInfo.branch}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Commit</p>
              <p className="font-mono text-sm text-foreground">{deploymentInfo.commit}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Triggered By</p>
              <p className="font-mono text-sm text-foreground">{deploymentInfo.triggeredBy}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Started</p>
              <p className="font-mono text-sm text-foreground">
                {deploymentInfo.startTime || "Not started"}
              </p>
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
