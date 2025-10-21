import { useEffect, useState } from "react";
import { PipelineVisualization } from "@/components/PipelineVisualization";
import { Activity, BarChart3, RefreshCw, GitBranch, Clock, User, ExternalLink } from "lucide-react";
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
  const [workflows, setWorkflows] = useState<GitHubWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<GitHubWorkflow | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");  // Fetch GitHub workflows
  const fetchWorkflows = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else if (!workflows.length) {
        setIsLoading(true);
      }

      const response = await fetch(`${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}/api/github/workflows`);
      if (response.ok) {
        const data = await response.json();
        const newWorkflows = data.workflow_runs || [];

        // Update workflows
        setWorkflows(newWorkflows);

        // If we have a selected workflow, try to find its updated version
        if (selectedWorkflow) {
          const updatedWorkflow = newWorkflows.find(w => w.id === selectedWorkflow.id);
          if (updatedWorkflow) {
            setSelectedWorkflow(updatedWorkflow);
            convertWorkflowToStages(updatedWorkflow);
          }
        } else if (newWorkflows.length > 0) {
          // Select the latest workflow if none selected
          setSelectedWorkflow(newWorkflows[0]);
          convertWorkflowToStages(newWorkflows[0]);
        }

        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Convert GitHub workflow to pipeline stages
  const convertWorkflowToStages = (workflow: GitHubWorkflow) => {
    const workflowStages: Stage[] = [
      {
        id: "setup",
        name: "Setup Workflow",
        status: mapGitHubStatusToStageStatus(workflow.status, workflow.conclusion),
        startTime: workflow.created_at,
        duration: workflow.conclusion ? calculateDuration(workflow.created_at, workflow.updated_at) : undefined,
        logs: [
          `🔄 Workflow: ${workflow.name}`,
          `📋 Branch: ${workflow.head_branch}`,
          `📝 Commit: ${workflow.head_sha.substring(0, 7)}`,
          `👤 Actor: ${workflow.actor?.login || 'Unknown'}`
        ]
      }
    ];

    // Add default CI/CD stages based on workflow status
    const defaultStages = [
      { id: "build", name: "Build & Test", icon: "🏗️" },
      { id: "deploy", name: "Deploy", icon: "🚀" }
    ];

    defaultStages.forEach((stage, index) => {
      const isCompleted = workflow.conclusion === 'success';
      const isFailed = workflow.conclusion === 'failure' || workflow.conclusion === 'cancelled';
      const isCurrent = workflow.status === 'in_progress' && index === 0;

      let stageStatus: StageStatus = 'pending';
      if (isCompleted) stageStatus = 'success';
      else if (isFailed) stageStatus = 'failed';
      else if (isCurrent || workflow.status === 'in_progress') stageStatus = 'running';

      workflowStages.push({
        id: stage.id,
        name: stage.name,
        status: stageStatus,
        startTime: workflow.created_at,
        duration: isCompleted ? calculateDuration(workflow.created_at, workflow.updated_at) : undefined,
        logs: [
          isCompleted ? `✅ ${stage.name} completed successfully` :
            isFailed ? `❌ ${stage.name} failed` :
              isCurrent ? `🔄 ${stage.name} in progress...` :
                `⏳ ${stage.name} pending`
        ]
      });
    });

    setStages(workflowStages);
  };

  // Map GitHub status to our stage status
  const mapGitHubStatusToStageStatus = (status: string, conclusion: string | null): StageStatus => {
    if (status === 'completed') {
      if (conclusion === 'success') return 'success';
      if (conclusion === 'failure' || conclusion === 'cancelled') return 'failed';
    }
    if (status === 'in_progress' || status === 'queued') return 'running';
    return 'pending';
  };

  // Calculate duration between two timestamps
  const calculateDuration = (startTime: string, endTime: string): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001');
    setSocket(newSocket);    // Listen for GitHub workflow events
    newSocket.on('github:workflow', (data) => {
      const { action, workflow } = data;
      console.log('GitHub workflow event:', action, workflow);

      // Immediately refresh workflows when there's a new event
      if (action === 'requested' || action === 'in_progress' || action === 'completed') {
        fetchWorkflows(true);
      }
    });

    return () => {
      newSocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch workflows on component mount and set up polling
  useEffect(() => {
    fetchWorkflows();

    // Poll for updates every 15 seconds to avoid rate limiting
    const interval = setInterval(fetchWorkflows, 15000);

    // Add event listener for when the page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchWorkflows(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update stages when selected workflow changes
  useEffect(() => {
    if (selectedWorkflow) {
      convertWorkflowToStages(selectedWorkflow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkflow]);

  const refreshWorkflows = async () => {
    await fetchWorkflows(true);
  };

  const getOverallStatus = (): string => {
    if (!selectedWorkflow) return "No Data";

    const status = selectedWorkflow.status;
    const conclusion = selectedWorkflow.conclusion;

    if (status === 'completed') {
      if (conclusion === 'success') return "Success";
      if (conclusion === 'failure') return "Failed";
      if (conclusion === 'cancelled') return "Cancelled";
    }
    if (status === 'in_progress') return "Running";
    if (status === 'queued') return "Queued";
    return "Pending";
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Success": return "text-green-600";
      case "Failed": case "Cancelled": return "text-red-600";
      case "Running": case "Queued": return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

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
              <h1 className="text-3xl font-bold text-foreground">GitHub Actions CI/CD</h1>
              <p className="text-muted-foreground">Real-time workflow monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Button
              onClick={refreshWorkflows}
              disabled={isLoading || isRefreshing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Card className="px-6 py-3 bg-card border-border">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className={`text-sm font-semibold ${getStatusColor(getOverallStatus())}`}>
                  {getOverallStatus()}
                </span>
              </div>
            </Card>
          </div>
        </div>

        {/* Workflow Selection */}
        {workflows.length > 0 && (
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Workflows</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {isRefreshing ? 'Refreshing...' : `Last updated: ${lastUpdate}`}
                </span>
                {isRefreshing && <RefreshCw className="h-3 w-3 animate-spin" />}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.slice(0, 6).map((workflow) => (
                <Card
                  key={workflow.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedWorkflow?.id === workflow.id ? 'ring-2 ring-primary' : ''
                    }`}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm truncate">{workflow.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${workflow.conclusion === 'success' ? 'bg-green-100 text-green-700' :
                      workflow.conclusion === 'failure' ? 'bg-red-100 text-red-700' :
                        workflow.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                      }`}>
                      {workflow.conclusion || workflow.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {workflow.head_branch}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(workflow.created_at)}
                    </div>
                    {workflow.actor && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {workflow.actor.login}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Workflow Info */}
        {selectedWorkflow && (
          <Card className="p-6 bg-card border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Branch</p>
                <p className="font-mono text-sm text-foreground">{selectedWorkflow.head_branch}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Commit</p>
                <p className="font-mono text-sm text-foreground">{selectedWorkflow.head_sha.substring(0, 7)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Triggered By</p>
                <p className="font-mono text-sm text-foreground">{selectedWorkflow.actor?.login || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Started</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-foreground">{formatDate(selectedWorkflow.created_at)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => window.open(selectedWorkflow.html_url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Pipeline Stages */}
        {stages.length > 0 && (
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold text-foreground mb-6">Workflow Stages</h2>
            <PipelineVisualization stages={stages} />
          </Card>
        )}

        {/* No workflows message */}
        {workflows.length === 0 && !isLoading && (
          <Card className="p-12 bg-card border-border text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Workflows Found</h3>
            <p className="text-muted-foreground mb-4">
              No GitHub Actions workflows found for this repository.
            </p>
            <Button onClick={refreshWorkflows} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && workflows.length === 0 && (
          <Card className="p-12 bg-card border-border text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Loading Workflows</h3>
            <p className="text-muted-foreground">Fetching GitHub Actions workflows...</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
