# Vite React Application with CI/CD Pipeline

A modern React application built with Vite, TypeScript, and Tailwind CSS, featuring automated CI/CD deployment with Docker and GitHub Actions.

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn-ui
- **Containerization**: Docker + Nginx
- **CI/CD**: GitHub Actions
- **Deployment**: Docker Hub + Remote Server

## 📋 Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose
- Git
- GitHub account
- Docker Hub account (for deployment)

## 🛠️ Local Development

### Quick Start

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm test            # Run tests (if configured)
```

## 🐳 Docker Setup

### Build and Run with Docker

```bash
# Build Docker image
docker build -t vite-frontend .

# Run container
docker run -d -p 3000:80 vite-frontend
```

Access the app at `http://localhost:3000`

### Using Docker Compose

```bash
# Build and start services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop services
docker-compose down
```

## 🔄 CI/CD Pipeline

### Continuous Integration (CI)

Triggered on: Push and Pull Requests to `main` and `develop` branches

**Workflow Steps:**
1. ✅ Checkout code
2. ✅ Setup Node.js environment
3. ✅ Install dependencies
4. ✅ Lint code
5. ✅ Run tests
6. ✅ Build application
7. ✅ Build Docker image
8. ✅ Test Docker container

### Continuous Deployment (CD)

Triggered on: Push to `main` branch

**Workflow Steps:**
1. ✅ Build Docker image
2. ✅ Push to Docker Hub
3. ✅ SSH into remote server
4. ✅ Pull latest image
5. ✅ Deploy new container
6. ✅ Clean up old images

## 🔐 GitHub Secrets Setup

Configure these secrets in your GitHub repository:
`Settings → Secrets and variables → Actions → New repository secret`

### Required Secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `DOCKER_HUB_USERNAME` | Your Docker Hub username | `yourusername` |
| `DOCKER_HUB_ACCESS_TOKEN` | Docker Hub access token | Create at hub.docker.com/settings/security |
| `SERVER_IP` | Your server IP address | `123.45.67.89` |
| `SERVER_USER` | SSH username for server | `ubuntu` or `root` |
| `SSH_PRIVATE_KEY` | SSH private key for authentication | Your SSH private key content |
| `SERVER_PORT` | SSH port (optional) | `22` (default) |

### Generating SSH Key for Deployment

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key

# Copy public key to server
ssh-copy-id -i ~/.ssh/deploy_key.pub user@server-ip

# Copy private key content for GitHub secret
cat ~/.ssh/deploy_key
```

## 📦 Deployment Architecture

```
GitHub Push → CI Workflow → Build & Test → CD Workflow → Docker Hub → Remote Server
```

### Production Deployment Flow:

1. Push code to `main` branch
2. GitHub Actions builds Docker image
3. Image pushed to Docker Hub
4. SSH connects to production server
5. Pulls latest image from Docker Hub
6. Stops old container
7. Starts new container with latest image
8. Application live at `http://your-server:3000`

## 🏗️ Project Structure

```
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI workflow
│       └── cd.yml              # CD workflow
├── src/
│   ├── components/            # React components
│   ├── pages/                # Page components
│   ├── lib/                  # Utilities
│   └── hooks/                # Custom hooks
├── public/                   # Static assets
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Local Docker setup
├── nginx.conf              # Nginx configuration
├── .dockerignore           # Docker ignore rules
├── .gitignore             # Git ignore rules
└── package.json           # Dependencies & scripts
```

## 🌐 Nginx Configuration

The application uses Nginx to serve static files with:
- React Router support (SPA routing)
- Gzip compression
- Static asset caching
- Security headers
- Health check endpoint at `/health`

## 🧪 Testing Docker Locally

```bash
# Test the Docker build
docker build -t test-app .

# Run and test
docker run -d -p 8080:80 --name test-container test-app

# Check if it's working
curl http://localhost:8080

# View logs
docker logs test-container

# Cleanup
docker stop test-container
docker rm test-container
```

## 🚨 Troubleshooting

### Build Failures
- Check Node.js version (requires 20+)
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist`

### Docker Issues
- Check Docker is running: `docker ps`
- View container logs: `docker logs <container-name>`
- Rebuild without cache: `docker build --no-cache -t vite-frontend .`

### Deployment Issues
- Verify GitHub secrets are set correctly
- Check SSH key permissions on server
- Ensure port 3000 is not in use on server
- Check server firewall settings

## 📝 Additional Configuration

### Environment Variables

Create `.env` file for local development:
```env
VITE_API_URL=http://localhost:5000
VITE_APP_TITLE=My Vite App
```

### Custom Domain

If deploying with custom domain, update nginx.conf:
```nginx
server_name yourdomain.com www.yourdomain.com;
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- **Project URL**: https://lovable.dev/projects/ec08a1f3-3e99-4828-bce3-f0787a2a1236
- **Documentation**: [Custom Domain Setup](https://docs.lovable.dev/features/custom-domain)

---

**Built with ❤️ using Vite, React, and modern DevOps practices**
