# WebSocket Server for Real-Time Monitoring

This server provides real-time updates for the CI/CD pipeline dashboard.

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode (with auto-restart)
npm run dev
```

## Environment Variables

Create a `.env` file:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=utkarsh232005
GITHUB_REPO=CI-CD
```

## API Endpoints

- `POST /api/deploy` - Trigger deployment
- `GET /api/github/workflows` - Get workflow status
- `POST /api/webhook/github` - GitHub webhook
- `POST /api/webhook/deployment` - Deployment notifications
- `GET /health` - Health check

## WebSocket Events

- `deployment:started`
- `deployment:progress`
- `deployment:log`
- `deployment:completed`
- `deployment:failed`
- `github:workflow`

Server runs on http://localhost:3001
