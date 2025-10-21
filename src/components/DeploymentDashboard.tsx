import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const DeploymentDashboard = () => {
    const [deploymentStatus, setDeploymentStatus] = useState({
        stage: 'idle',
        progress: 0,
        logs: [],
        isActive: false,
        startTime: null,
        currentStep: ''
    });

    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Connect to WebSocket for real-time updates
        const newSocket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:3001');
        setSocket(newSocket);

        // Listen for deployment events
        newSocket.on('deployment:started', (data) => {
            setDeploymentStatus(prev => ({
                ...prev,
                isActive: true,
                stage: 'started',
                startTime: data.timestamp,
                logs: [...prev.logs, { type: 'info', message: 'Deployment started', timestamp: data.timestamp }]
            }));
        });

        newSocket.on('deployment:progress', (data) => {
            setDeploymentStatus(prev => ({
                ...prev,
                progress: data.progress,
                currentStep: data.step,
                logs: [...prev.logs, { type: 'info', message: data.message, timestamp: data.timestamp }]
            }));
        });

        newSocket.on('deployment:log', (data) => {
            setDeploymentStatus(prev => ({
                ...prev,
                logs: [...prev.logs, { type: data.type, message: data.message, timestamp: data.timestamp }]
            }));
        });

        newSocket.on('deployment:completed', (data) => {
            setDeploymentStatus(prev => ({
                ...prev,
                isActive: false,
                stage: 'completed',
                progress: 100,
                logs: [...prev.logs, { type: 'success', message: `Deployment completed! URL: ${data.url}`, timestamp: data.timestamp }]
            }));
        });

        newSocket.on('deployment:failed', (data) => {
            setDeploymentStatus(prev => ({
                ...prev,
                isActive: false,
                stage: 'failed',
                logs: [...prev.logs, { type: 'error', message: `Deployment failed: ${data.error}`, timestamp: data.timestamp }]
            }));
        });

        newSocket.on('github:workflow', (data) => {
            const statusMessage = `GitHub Workflow: ${data.workflow.name} - ${data.action}`;
            setDeploymentStatus(prev => ({
                ...prev,
                logs: [...prev.logs, { type: 'info', message: statusMessage, timestamp: data.timestamp }]
            }));
        });

        return () => newSocket.close();
    }, []);

    const triggerDeployment = async () => {
        try {
            const response = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch: 'main' })
            });

            if (response.ok) {
                const data = await response.json();
                setDeploymentStatus(prev => ({
                    ...prev,
                    logs: [...prev.logs, { type: 'info', message: 'Deployment triggered manually', timestamp: new Date().toISOString() }]
                }));
            }
        } catch (error) {
            console.error('Failed to trigger deployment:', error);
        }
    };

    const clearLogs = () => {
        setDeploymentStatus(prev => ({
            ...prev,
            logs: []
        }));
    };

    const getStatusColor = (stage) => {
        switch (stage) {
            case 'idle': return 'text-gray-500';
            case 'started': return 'text-blue-500';
            case 'completed': return 'text-green-500';
            case 'failed': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getLogTypeColor = (type) => {
        switch (type) {
            case 'error': return 'text-red-400';
            case 'success': return 'text-green-400';
            case 'warning': return 'text-yellow-400';
            default: return 'text-gray-300';
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">🚀 Deployment Dashboard</h1>

                {/* Status Header */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            <div className={`text-xl font-semibold ${getStatusColor(deploymentStatus.stage)}`}>
                                Status: {deploymentStatus.stage.toUpperCase()}
                            </div>
                            {deploymentStatus.isActive && (
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                    <span className="text-blue-400">Processing...</span>
                                </div>
                            )}
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={clearLogs}
                                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Clear Logs
                            </button>
                            <button
                                onClick={triggerDeployment}
                                disabled={deploymentStatus.isActive}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                {deploymentStatus.isActive ? 'Deploying...' : 'Deploy Now'}
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {deploymentStatus.isActive && (
                        <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                                <span>{deploymentStatus.currentStep}</span>
                                <span>{deploymentStatus.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${deploymentStatus.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Deployment Info */}
                    {deploymentStatus.startTime && (
                        <div className="text-sm text-gray-400">
                            Started: {new Date(deploymentStatus.startTime).toLocaleString()}
                        </div>
                    )}
                </div>

                {/* Real-time Logs */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">📋 Real-time Logs</h2>
                    <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
                        {deploymentStatus.logs.length === 0 ? (
                            <div className="text-gray-500 text-center py-8">
                                No deployment activity yet. Trigger a deployment to see logs.
                            </div>
                        ) : (
                            deploymentStatus.logs.map((log, index) => (
                                <div key={index} className="mb-1 flex">
                                    <span className="text-gray-500 mr-2 whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className={`${getLogTypeColor(log.type)} mr-2 whitespace-nowrap`}>
                                        [{log.type.toUpperCase()}]
                                    </span>
                                    <span className="flex-1">{log.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* GitHub Actions Status */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">🔄 GitHub Actions</h2>
                    <GitHubActionsStatus />
                </div>
            </div>
        </div>
    );
};

// Component to show GitHub Actions status
const GitHubActionsStatus = () => {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWorkflowRuns();
        const interval = setInterval(fetchWorkflowRuns, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchWorkflowRuns = async () => {
        try {
            const response = await fetch('/api/github/workflows');
            if (response.ok) {
                const data = await response.json();
                setWorkflows(data.workflow_runs || []);
            }
        } catch (error) {
            console.error('Failed to fetch workflow runs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status, conclusion) => {
        if (status === 'in_progress') return '🔄';
        if (conclusion === 'success') return '✅';
        if (conclusion === 'failure') return '❌';
        if (conclusion === 'cancelled') return '⏹️';
        return '⏳';
    };

    const getStatusText = (status, conclusion) => {
        if (status === 'in_progress') return 'Running';
        if (conclusion) return conclusion.charAt(0).toUpperCase() + conclusion.slice(1);
        return 'Queued';
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Loading workflow runs...
            </div>
        );
    }

    if (workflows.length === 0) {
        return (
            <div className="text-center py-4 text-gray-400">
                No recent workflow runs found. Deploy to see GitHub Actions activity.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {workflows.slice(0, 5).map((workflow) => (
                <div key={workflow.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                        <span className="text-lg">
                            {getStatusIcon(workflow.status, workflow.conclusion)}
                        </span>
                        <div>
                            <div className="font-medium">{workflow.name}</div>
                            <div className="text-sm text-gray-400">
                                {workflow.head_commit?.message || 'No commit message'}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium">
                            {getStatusText(workflow.status, workflow.conclusion)}
                        </div>
                        <div className="text-xs text-gray-400">
                            {new Date(workflow.created_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            ))}
            <div className="text-center pt-2">
                <a
                    href="https://github.com/utkarsh232005/CI-CD/actions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                >
                    View all workflows on GitHub →
                </a>
            </div>
        </div>
    );
};

export default DeploymentDashboard;
