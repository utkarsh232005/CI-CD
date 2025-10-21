import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// Store active deployments
const activeDeployments = new Map();

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// API Routes
app.post('/api/deploy', async (req, res) => {
    try {
        const { branch = 'main' } = req.body;
        const deploymentId = Date.now().toString();

        // Store deployment info
        activeDeployments.set(deploymentId, {
            id: deploymentId,
            branch,
            startTime: new Date().toISOString(),
            status: 'started'
        });

        // Emit deployment started
        io.emit('deployment:started', {
            id: deploymentId,
            branch,
            timestamp: new Date().toISOString()
        });

        // Trigger deployment simulation
        simulateDeployment(deploymentId, branch);

        res.json({ success: true, deploymentId });
    } catch (error) {
        console.error('Deployment error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/github/workflows', async (req, res) => {
    try {
        const response = await octokit.rest.actions.listWorkflowRunsForRepo({
            owner: 'utkarsh232005',
            repo: 'CI-CD',
            per_page: 10
        });

        res.json(response.data);
    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook handler for GitHub Actions
app.post('/api/webhook/github', (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    if (event === 'workflow_run') {
        const { action, workflow_run } = payload;

        io.emit('github:workflow', {
            action,
            workflow: {
                id: workflow_run.id,
                name: workflow_run.name,
                status: workflow_run.status,
                conclusion: workflow_run.conclusion,
                html_url: workflow_run.html_url,
                created_at: workflow_run.created_at
            },
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({ received: true });
});

// Webhook handler for deployment notifications
app.post('/api/webhook/deployment', (req, res) => {
    const { action, step, progress, error, url } = req.body;

    const timestamp = new Date().toISOString();

    switch (action) {
        case 'started':
            io.emit('deployment:started', { timestamp });
            break;
        case 'progress':
            io.emit('deployment:progress', { step, progress, message: step, timestamp });
            break;
        case 'completed':
            io.emit('deployment:completed', { url, timestamp });
            break;
        case 'failed':
            io.emit('deployment:failed', { error, timestamp });
            break;
    }

    res.status(200).json({ received: true });
});

// Simulate deployment process
async function simulateDeployment(deploymentId, branch) {
    const steps = [
        { name: 'Checking out code', duration: 2000, progress: 10 },
        { name: 'Installing dependencies', duration: 5000, progress: 30 },
        { name: 'Running tests', duration: 3000, progress: 50 },
        { name: 'Building application', duration: 4000, progress: 70 },
        { name: 'Deploying to platform', duration: 6000, progress: 90 },
        { name: 'Finalizing deployment', duration: 2000, progress: 100 }
    ];

    try {
        for (const step of steps) {
            // Emit progress update
            io.emit('deployment:progress', {
                id: deploymentId,
                step: step.name,
                progress: step.progress,
                message: `${step.name}...`,
                timestamp: new Date().toISOString()
            });

            // Simulate step execution time
            await new Promise(resolve => setTimeout(resolve, step.duration));

            // Emit step completion
            io.emit('deployment:log', {
                id: deploymentId,
                type: 'success',
                message: `✅ ${step.name} completed`,
                timestamp: new Date().toISOString()
            });
        }

        // Deployment completed
        const deploymentUrl = `https://ci-cd-${deploymentId.slice(-6)}.vercel.app`;
        io.emit('deployment:completed', {
            id: deploymentId,
            url: deploymentUrl,
            timestamp: new Date().toISOString()
        });

        activeDeployments.delete(deploymentId);
    } catch (error) {
        io.emit('deployment:failed', {
            id: deploymentId,
            error: error.message,
            timestamp: new Date().toISOString()
        });
        activeDeployments.delete(deploymentId);
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        activeDeployments: activeDeployments.size
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 WebSocket server running on port ${PORT}`);
    console.log(`📊 Dashboard available at http://localhost:${PORT}/health`);
});
