import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from parent directory's .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const server = createServer(app);

// Configure CORS for both development and production
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:3000"
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// Log authentication status on startup
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
console.log('🌍 Allowed Origins:', allowedOrigins.join(', '));
console.log('🔑 GitHub Token configured:', !!process.env.GITHUB_TOKEN);
if (process.env.GITHUB_TOKEN) {
    console.log('🔐 Token starts with:', process.env.GITHUB_TOKEN.substring(0, 10) + '...');
}
console.log('📦 GitHub Repo:', `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`);

// Store active deployments
const activeDeployments = new Map();
let lastWorkflowCheck = new Map(); // Store last known workflow statuses

// Function to check for workflow status changes
const checkWorkflowChanges = async () => {
    try {
        const response = await octokit.rest.actions.listWorkflowRunsForRepo({
            owner: process.env.GITHUB_OWNER || 'utkarsh232005',
            repo: process.env.GITHUB_REPO || 'CI-CD',
            per_page: 5 // Reduce the number of items to decrease API usage
        });

        const workflows = response.data.workflow_runs || [];

        // Check for status changes
        workflows.forEach(workflow => {
            const lastKnown = lastWorkflowCheck.get(workflow.id);

            if (!lastKnown || lastKnown.status !== workflow.status || lastKnown.conclusion !== workflow.conclusion) {
                // Status changed, emit update
                io.emit('github:workflow', {
                    action: workflow.status === 'in_progress' ? 'in_progress' :
                        workflow.status === 'completed' ? 'completed' : 'requested',
                    workflow: {
                        id: workflow.id,
                        name: workflow.name,
                        status: workflow.status,
                        conclusion: workflow.conclusion,
                        html_url: workflow.html_url,
                        created_at: workflow.created_at,
                        updated_at: workflow.updated_at
                    },
                    timestamp: new Date().toISOString()
                });

                console.log(`Workflow status change detected: ${workflow.name} - ${workflow.status}`);
            }

            // Update last known status
            lastWorkflowCheck.set(workflow.id, {
                status: workflow.status,
                conclusion: workflow.conclusion
            });
        });
    } catch (error) {
        if (error.status === 403 && error.message.includes('rate limit')) {
            console.log('Rate limit hit, will retry next cycle');
        } else {
            console.error('Error checking workflow changes:', error.message);
        }
    }
};

// Check for workflow changes every 30 seconds to avoid rate limiting
setInterval(checkWorkflowChanges, 30000);

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
            owner: process.env.GITHUB_OWNER || 'utkarsh232005',
            repo: process.env.GITHUB_REPO || 'CI-CD',
            per_page: 10
        });

        res.json(response.data);
    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({
            error: error.message,
            workflow_runs: [] // Return empty array as fallback
        });
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

// Root endpoint - Welcome page
app.get('/', (req, res) => {
    res.json({
        name: 'CI/CD WebSocket Server',
        status: 'running',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            workflows: '/api/github/workflows',
            deploy: '/api/deploy (POST)',
            webhooks: {
                github: '/api/webhook/github (POST)',
                deployment: '/api/webhook/deployment (POST)'
            }
        },
        websocket: {
            status: 'active',
            connectedClients: io.engine.clientsCount || 0
        },
        github: {
            configured: !!process.env.GITHUB_TOKEN,
            repository: `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`
        },
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        activeDeployments: activeDeployments.size,
        connectedClients: io.engine.clientsCount || 0
    });
});

const PORT = process.env.PORT || 3001;

// Handle server errors gracefully
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.log('💡 Try one of the following:');
        console.log(`   1. Kill the process using the port: lsof -ti:${PORT} | xargs kill -9`);
        console.log(`   2. Use a different port: PORT=3002 node server/websocket-server.js`);
        console.log(`   3. Wait a moment and try again (port may be in TIME_WAIT state)`);
        process.exit(1);
    } else {
        console.error('Server error:', error);
        process.exit(1);
    }
});

server.listen(PORT, () => {
    console.log(`🚀 WebSocket server running on port ${PORT}`);
    console.log(`📊 Dashboard available at http://localhost:${PORT}/health`);
});
