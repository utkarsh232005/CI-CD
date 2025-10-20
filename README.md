# Vite React Application with CI/CD Pipeline

A modern React application built with Vite, TypeScript, and Tailwind CSS, featuring automated CI/CD deployment with GitHub Actions to **Vercel** or **Firebase**.

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn-ui
- **Containerization**: Docker + Nginx (optional, for self-hosting)
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel (default) or Firebase Hosting

## 📋 Prerequisites

- Node.js 20+ and npm
- Git
- GitHub account
- **Choose one**: Vercel account OR Firebase account

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
7. ✅ Build and test Docker image

### Continuous Deployment (CD)

Triggered on: Push to `main` branch

**Default: Deploy to Vercel**
1. ✅ Build application
2. ✅ Deploy to Vercel
3. ✅ Automatic preview URLs for PRs
4. ✅ Production URL on main branch

**Alternative: Deploy to Firebase**
1. ✅ Build application
2. ✅ Deploy to Firebase Hosting
3. ✅ Global CDN distribution
4. ✅ Automatic SSL certificate

## � Deployment Options

### Option 1: Vercel (Default - Easiest)

**Setup in 3 steps:**

1. **Get Vercel credentials:**
   ```bash
   npm install -g vercel
   vercel login
   vercel link
   ```

2. **Add GitHub Secrets:**
   - `VERCEL_TOKEN` - From https://vercel.com/account/tokens
   - `VERCEL_ORG_ID` - From `.vercel/project.json`
   - `VERCEL_PROJECT_ID` - From `.vercel/project.json`

3. **Deploy:**
   ```bash
   git push origin main
   ```

**Your app will be live at:** `https://your-project.vercel.app`

### Option 2: Firebase Hosting

**Setup in 3 steps:**

1. **Initialize Firebase:**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   ```

2. **Add GitHub Secrets:**
   - `FIREBASE_SERVICE_ACCOUNT` - From Firebase Console
   - `FIREBASE_PROJECT_ID` - Your Firebase project ID

3. **Switch workflow:**
   ```bash
   mv .github/workflows/cd.yml .github/workflows/cd-vercel.yml
   mv .github/workflows/cd-firebase.yml .github/workflows/cd.yml
   git push origin main
   ```

**Your app will be live at:** `https://your-project.web.app`

### Option 3: Docker (Self-Hosting)

**For custom servers/VPS:**
- See `docker-compose.yml` for local testing
- See original documentation for Docker Hub deployment
- Includes Nginx configuration for production

📖 **Full deployment guide:** See [DEPLOYMENT_PLATFORMS.md](./DEPLOYMENT_PLATFORMS.md)

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
