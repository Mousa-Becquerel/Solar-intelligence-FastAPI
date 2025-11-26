#!/bin/bash

# Deployment script for Solar Intelligence Platform
# Builds and deploys both frontend and backend to AWS ECS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# AWS Configuration
AWS_ACCOUNT_ID="196621412948"
AWS_REGION="eu-north-1"
ECR_BACKEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/solar-intelligence-backend"
ECR_FRONTEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/solar-intelligence-frontend"
ECS_CLUSTER="solar-intelligence-cluster"
ECS_SERVICE="solar-intelligence-service-v2"

# Parse arguments
DEPLOY_BACKEND=false
DEPLOY_FRONTEND=false
DEPLOY_BOTH=false

if [ "$1" == "backend" ]; then
    DEPLOY_BACKEND=true
elif [ "$1" == "frontend" ]; then
    DEPLOY_FRONTEND=true
elif [ "$1" == "both" ] || [ -z "$1" ]; then
    DEPLOY_BOTH=true
else
    echo -e "${RED}Error: Invalid argument. Use 'backend', 'frontend', or 'both'${NC}"
    echo "Usage: ./deploy.sh [backend|frontend|both]"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Solar Intelligence - Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Authenticate with ECR
echo -e "${YELLOW}[1/5] Authenticating with AWS ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
echo -e "${GREEN}✓ ECR authentication successful${NC}"
echo ""

# Build and push backend
if [ "$DEPLOY_BACKEND" = true ] || [ "$DEPLOY_BOTH" = true ]; then
    echo -e "${YELLOW}[2/5] Building backend Docker image...${NC}"
    docker build -f fastapi_app/Dockerfile.prod -t solar-intelligence-backend:latest .
    echo -e "${GREEN}✓ Backend image built${NC}"
    echo ""

    echo -e "${YELLOW}[3/5] Pushing backend to ECR...${NC}"
    docker tag solar-intelligence-backend:latest ${ECR_BACKEND_REPO}:latest
    docker push ${ECR_BACKEND_REPO}:latest
    echo -e "${GREEN}✓ Backend pushed to ECR${NC}"
    echo ""
fi

# Build and push frontend
if [ "$DEPLOY_FRONTEND" = true ] || [ "$DEPLOY_BOTH" = true ]; then
    echo -e "${YELLOW}[2/5] Building frontend Docker image...${NC}"
    cd react-frontend
    docker build -t solar-intelligence-frontend:latest .
    cd ..
    echo -e "${GREEN}✓ Frontend image built${NC}"
    echo ""

    echo -e "${YELLOW}[3/5] Pushing frontend to ECR...${NC}"
    docker tag solar-intelligence-frontend:latest ${ECR_FRONTEND_REPO}:latest
    docker push ${ECR_FRONTEND_REPO}:latest
    echo -e "${GREEN}✓ Frontend pushed to ECR${NC}"
    echo ""
fi

# Force new ECS deployment
echo -e "${YELLOW}[4/5] Triggering ECS deployment...${NC}"
aws ecs update-service \
    --cluster ${ECS_CLUSTER} \
    --service ${ECS_SERVICE} \
    --force-new-deployment \
    --region ${AWS_REGION} \
    --no-cli-pager > /dev/null
echo -e "${GREEN}✓ Deployment triggered${NC}"
echo ""

# Wait for deployment to complete
echo -e "${YELLOW}[5/5] Waiting for deployment to complete...${NC}"
echo -e "${BLUE}This may take 2-3 minutes...${NC}"

# Wait 30 seconds before checking
sleep 30

# Check deployment status every 15 seconds
MAX_WAIT=180  # 3 minutes
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    ROLLOUT_STATE=$(aws ecs describe-services \
        --cluster ${ECS_CLUSTER} \
        --services ${ECS_SERVICE} \
        --region ${AWS_REGION} \
        --query 'services[0].deployments[0].rolloutState' \
        --output text)

    if [ "$ROLLOUT_STATE" == "COMPLETED" ]; then
        echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
        echo ""

        # Get service details
        echo -e "${BLUE}Deployment Summary:${NC}"
        aws ecs describe-services \
            --cluster ${ECS_CLUSTER} \
            --services ${ECS_SERVICE} \
            --region ${AWS_REGION} \
            --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,TaskDefinition:taskDefinition}' \
            --output table

        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}Deployment successful!${NC}"
        echo -e "${GREEN}========================================${NC}"
        exit 0
    elif [ "$ROLLOUT_STATE" == "FAILED" ]; then
        echo -e "${RED}✗ Deployment failed!${NC}"
        exit 1
    else
        echo -e "${BLUE}Status: ${ROLLOUT_STATE} (${ELAPSED}s elapsed)${NC}"
        sleep 15
        ELAPSED=$((ELAPSED + 15))
    fi
done

echo -e "${YELLOW}Warning: Deployment still in progress after ${MAX_WAIT} seconds${NC}"
echo -e "${YELLOW}Check AWS Console for status: https://console.aws.amazon.com/ecs/v2/clusters/${ECS_CLUSTER}/services/${ECS_SERVICE}${NC}"
