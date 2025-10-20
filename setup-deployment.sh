#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment Platform Setup Wizard     ${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Choose your deployment platform:${NC}"
echo -e "  ${GREEN}1${NC} - Vercel (Easiest, recommended)"
echo -e "  ${GREEN}2${NC} - Firebase Hosting"
echo -e "  ${GREEN}3${NC} - Docker Self-Hosting"
echo -e "  ${GREEN}4${NC} - Skip (I'll configure manually)"
echo ""
read -p "Enter your choice (1-4): " PLATFORM_CHOICE

case $PLATFORM_CHOICE in
  1)
    echo -e "\n${BLUE}=== Vercel Setup ===${NC}\n"
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
      echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
      npm install -g vercel
    fi
    
    echo -e "${GREEN}✓ Vercel CLI installed${NC}\n"
    
    echo -e "${YELLOW}Step 1: Login to Vercel${NC}"
    vercel login
    
    echo -e "\n${YELLOW}Step 2: Link your project${NC}"
    vercel link
    
    echo -e "\n${GREEN}✓ Project linked!${NC}\n"
    
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "1. Check the ${YELLOW}.vercel/project.json${NC} file for your credentials"
    echo -e "2. Add these secrets to GitHub (Settings → Secrets → Actions):"
    echo -e "   - ${YELLOW}VERCEL_TOKEN${NC} - Get from: https://vercel.com/account/tokens"
    echo -e "   - ${YELLOW}VERCEL_ORG_ID${NC} - From .vercel/project.json"
    echo -e "   - ${YELLOW}VERCEL_PROJECT_ID${NC} - From .vercel/project.json"
    echo -e "\n3. Push to main branch:"
    echo -e "   ${BLUE}git push origin main${NC}"
    echo -e "\n${GREEN}✓ Your app will be live at: https://your-project.vercel.app${NC}"
    ;;
    
  2)
    echo -e "\n${BLUE}=== Firebase Setup ===${NC}\n"
    
    # Check if Firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
      echo -e "${YELLOW}Firebase CLI not found. Installing...${NC}"
      npm install -g firebase-tools
    fi
    
    echo -e "${GREEN}✓ Firebase CLI installed${NC}\n"
    
    echo -e "${YELLOW}Step 1: Login to Firebase${NC}"
    firebase login
    
    echo -e "\n${YELLOW}Step 2: Initialize Firebase Hosting${NC}"
    echo -e "${BLUE}When prompted:${NC}"
    echo -e "  - Select ${YELLOW}Hosting${NC}"
    echo -e "  - Use existing project or create new"
    echo -e "  - Public directory: ${YELLOW}dist${NC}"
    echo -e "  - Single-page app: ${YELLOW}Yes${NC}"
    echo -e "  - GitHub Actions: ${YELLOW}No${NC} (we already have it)\n"
    
    firebase init hosting
    
    echo -e "\n${GREEN}✓ Firebase initialized!${NC}\n"
    
    # Switch workflow
    echo -e "${YELLOW}Switching to Firebase workflow...${NC}"
    if [ -f .github/workflows/cd.yml ]; then
      mv .github/workflows/cd.yml .github/workflows/cd-vercel.yml.backup
      echo -e "${GREEN}✓ Vercel workflow backed up${NC}"
    fi
    
    if [ -f .github/workflows/cd-firebase.yml ]; then
      mv .github/workflows/cd-firebase.yml .github/workflows/cd.yml
      echo -e "${GREEN}✓ Firebase workflow activated${NC}"
    fi
    
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo -e "1. Get Firebase Service Account:"
    echo -e "   - Go to: https://console.firebase.google.com"
    echo -e "   - Select your project"
    echo -e "   - Project Settings → Service Accounts"
    echo -e "   - Generate New Private Key"
    echo -e "   - Copy the entire JSON content"
    echo -e "\n2. Add these secrets to GitHub (Settings → Secrets → Actions):"
    echo -e "   - ${YELLOW}FIREBASE_SERVICE_ACCOUNT${NC} - The entire JSON from above"
    echo -e "   - ${YELLOW}FIREBASE_PROJECT_ID${NC} - Your project ID"
    echo -e "\n3. Commit and push:"
    echo -e "   ${BLUE}git add .${NC}"
    echo -e "   ${BLUE}git commit -m 'Configure Firebase deployment'${NC}"
    echo -e "   ${BLUE}git push origin main${NC}"
    echo -e "\n${GREEN}✓ Your app will be live at: https://your-project.web.app${NC}"
    ;;
    
  3)
    echo -e "\n${BLUE}=== Docker Self-Hosting Setup ===${NC}\n"
    echo -e "${YELLOW}This option requires:${NC}"
    echo -e "  - A VPS or cloud server"
    echo -e "  - Docker installed on the server"
    echo -e "  - SSH access to the server\n"
    
    read -p "Do you have a server ready? (y/n): " HAS_SERVER
    
    if [ "$HAS_SERVER" = "y" ] || [ "$HAS_SERVER" = "Y" ]; then
      echo -e "\n${BLUE}Testing Docker locally first...${NC}"
      
      if command -v docker &> /dev/null; then
        echo -e "${YELLOW}Building Docker image...${NC}"
        docker build -t vite-frontend .
        
        if [ $? -eq 0 ]; then
          echo -e "${GREEN}✓ Docker build successful!${NC}\n"
          
          read -p "Run container locally for testing? (y/n): " RUN_LOCAL
          if [ "$RUN_LOCAL" = "y" ] || [ "$RUN_LOCAL" = "Y" ]; then
            echo -e "${YELLOW}Starting container...${NC}"
            docker run -d -p 3000:80 --name vite-frontend-test vite-frontend
            echo -e "${GREEN}✓ Container running at http://localhost:3000${NC}"
            echo -e "Stop it later with: ${BLUE}docker stop vite-frontend-test${NC}"
          fi
        else
          echo -e "${RED}✗ Docker build failed${NC}"
          exit 1
        fi
      else
        echo -e "${RED}✗ Docker not found. Please install Docker first.${NC}"
        exit 1
      fi
      
      echo -e "\n${BLUE}Next Steps for Server Deployment:${NC}"
      echo -e "1. Add these secrets to GitHub:"
      echo -e "   - ${YELLOW}DOCKER_HUB_USERNAME${NC}"
      echo -e "   - ${YELLOW}DOCKER_HUB_ACCESS_TOKEN${NC}"
      echo -e "   - ${YELLOW}SERVER_IP${NC}"
      echo -e "   - ${YELLOW}SERVER_USER${NC}"
      echo -e "   - ${YELLOW}SSH_PRIVATE_KEY${NC}"
      echo -e "\n2. See ${YELLOW}DEPLOYMENT_PLATFORMS.md${NC} for detailed instructions"
    else
      echo -e "${YELLOW}Get a server first:${NC}"
      echo -e "  - DigitalOcean: https://digitalocean.com"
      echo -e "  - Linode: https://linode.com"
      echo -e "  - AWS EC2: https://aws.amazon.com/ec2"
      echo -e "  - Hetzner: https://hetzner.com"
    fi
    ;;
    
  4)
    echo -e "\n${YELLOW}Skipping automatic setup${NC}"
    echo -e "See ${BLUE}DEPLOYMENT_PLATFORMS.md${NC} for manual configuration"
    ;;
    
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}Setup complete! 🎉${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Additional Resources:${NC}"
echo -e "  - Full guide: ${BLUE}DEPLOYMENT_PLATFORMS.md${NC}"
echo -e "  - Quick start: ${BLUE}QUICK_START.md${NC}"
echo -e "  - README: ${BLUE}README.md${NC}"
echo -e "\n${GREEN}Happy deploying! 🚀${NC}\n"
