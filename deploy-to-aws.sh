#!/bin/bash
# ==============================================================================
# Solar Intelligence - AWS Deployment Script
# ==============================================================================
# This script automates the deployment of the FastAPI/React application to AWS
#
# Prerequisites:
# - AWS CLI configured with proper credentials
# - Docker installed and running
# - New RDS database created and accessible
# - ECR repositories created
#
# Usage:
#   bash deploy-to-aws.sh
# ==============================================================================

set -e  # Exit on error

# Configuration
AWS_REGION="eu-north-1"
AWS_ACCOUNT_ID="196621412948"
ECR_BACKEND_REPO="solar-intelligence-backend"
ECR_FRONTEND_REPO="solar-intelligence-frontend"
ECS_CLUSTER="solar-intelligence-cluster"
ECS_SERVICE="solar-intelligence-service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Helper Functions
# ==============================================================================

print_header() {
    echo -e "\n${BLUE}===================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ==============================================================================
# Phase 1: Pre-deployment Checks
# ==============================================================================

print_header "Phase 1: Pre-deployment Checks"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install it first."
    exit 1
fi
print_success "AWS CLI found"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install it first."
    exit 1
fi
print_success "Docker found"

# Verify AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi
print_success "AWS credentials verified"

# Check if task definition file exists
if [ ! -f "task-definition-v2.json" ]; then
    print_error "task-definition-v2.json not found in current directory"
    exit 1
fi
print_success "Task definition file found"

# ==============================================================================
# Phase 2: Create ECR Repositories (if they don't exist)
# ==============================================================================

print_header "Phase 2: ECR Repository Setup"

create_ecr_repo() {
    local repo_name=$1

    if aws ecr describe-repositories --repository-names "$repo_name" --region "$AWS_REGION" &> /dev/null; then
        print_info "Repository '$repo_name' already exists"
    else
        print_info "Creating repository '$repo_name'..."
        aws ecr create-repository \
            --repository-name "$repo_name" \
            --region "$AWS_REGION" \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256
        print_success "Repository '$repo_name' created"
    fi
}

create_ecr_repo "$ECR_BACKEND_REPO"
create_ecr_repo "$ECR_FRONTEND_REPO"

# ==============================================================================
# Phase 3: Login to ECR
# ==============================================================================

print_header "Phase 3: ECR Authentication"

print_info "Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
print_success "Successfully logged into ECR"

# ==============================================================================
# Phase 4: Build Docker Images
# ==============================================================================

print_header "Phase 4: Building Docker Images"

# Build Backend
print_info "Building backend image..."
docker build \
    -f fastapi_app/Dockerfile.prod \
    -t "${ECR_BACKEND_REPO}:latest" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    .
print_success "Backend image built successfully"

# Build Frontend
print_info "Building frontend image..."
cd react-frontend
docker build \
    -t "${ECR_FRONTEND_REPO}:latest" \
    --build-arg VITE_API_BASE_URL=http://solar-intelligence-alb-1925430211.eu-north-1.elb.amazonaws.com \
    .
cd ..
print_success "Frontend image built successfully"

# ==============================================================================
# Phase 5: Tag and Push Images to ECR
# ==============================================================================

print_header "Phase 5: Pushing Images to ECR"

# Tag and push backend
print_info "Tagging backend image..."
docker tag "${ECR_BACKEND_REPO}:latest" \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND_REPO}:latest"

print_info "Pushing backend image to ECR..."
docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND_REPO}:latest"
print_success "Backend image pushed successfully"

# Tag and push frontend
print_info "Tagging frontend image..."
docker tag "${ECR_FRONTEND_REPO}:latest" \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND_REPO}:latest"

print_info "Pushing frontend image to ECR..."
docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND_REPO}:latest"
print_success "Frontend image pushed successfully"

# ==============================================================================
# Phase 6: Create CloudWatch Log Group
# ==============================================================================

print_header "Phase 6: CloudWatch Log Group Setup"

if aws logs describe-log-groups --log-group-name-prefix "/ecs/solar-intelligence-v2" --region "$AWS_REGION" | grep -q "/ecs/solar-intelligence-v2"; then
    print_info "Log group already exists"
else
    print_info "Creating CloudWatch log group..."
    aws logs create-log-group \
        --log-group-name /ecs/solar-intelligence-v2 \
        --region "$AWS_REGION"
    print_success "Log group created"
fi

# ==============================================================================
# Phase 7: Register Task Definition
# ==============================================================================

print_header "Phase 7: Registering ECS Task Definition"

print_info "Registering task definition 'solar-intelligence-v2'..."
TASK_DEF_ARN=$(aws ecs register-task-definition \
    --cli-input-json file://task-definition-v2.json \
    --region "$AWS_REGION" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

print_success "Task definition registered: $TASK_DEF_ARN"

# Extract revision number
REVISION=$(echo "$TASK_DEF_ARN" | grep -oP ':\d+$' | tr -d ':')
print_info "Task definition revision: $REVISION"

# ==============================================================================
# Phase 8: Update ECS Service
# ==============================================================================

print_header "Phase 8: Updating ECS Service"

print_warning "This will cause approximately 2-5 minutes of downtime"
read -p "Do you want to proceed with the deployment? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    print_warning "Deployment cancelled by user"
    exit 0
fi

print_info "Updating ECS service '$ECS_SERVICE' in cluster '$ECS_CLUSTER'..."
aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --task-definition "solar-intelligence-v2:$REVISION" \
    --force-new-deployment \
    --region "$AWS_REGION" \
    > /dev/null

print_success "Service update initiated"

# ==============================================================================
# Phase 9: Monitor Deployment
# ==============================================================================

print_header "Phase 9: Monitoring Deployment"

print_info "Waiting for deployment to complete..."
print_info "This may take 5-10 minutes..."

# Wait for service to stabilize
aws ecs wait services-stable \
    --cluster "$ECS_CLUSTER" \
    --services "$ECS_SERVICE" \
    --region "$AWS_REGION"

print_success "Deployment completed successfully!"

# ==============================================================================
# Phase 10: Validation
# ==============================================================================

print_header "Phase 10: Deployment Validation"

# Get service details
SERVICE_INFO=$(aws ecs describe-services \
    --cluster "$ECS_CLUSTER" \
    --services "$ECS_SERVICE" \
    --region "$AWS_REGION")

RUNNING_COUNT=$(echo "$SERVICE_INFO" | jq -r '.services[0].runningCount')
DESIRED_COUNT=$(echo "$SERVICE_INFO" | jq -r '.services[0].desiredCount')

echo "Service Status:"
echo "  Running tasks: $RUNNING_COUNT"
echo "  Desired tasks: $DESIRED_COUNT"

if [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ]; then
    print_success "All tasks are running"
else
    print_warning "Task count mismatch. Check ECS console for details."
fi

# ==============================================================================
# Summary
# ==============================================================================

print_header "Deployment Summary"

echo "🎉 Deployment completed successfully!"
echo ""
echo "Application URL:"
echo "  http://solar-intelligence-alb-1925430211.eu-north-1.elb.amazonaws.com"
echo ""
echo "Next steps:"
echo "  1. Test the application in your browser"
echo "  2. Verify user login works"
echo "  3. Check that GDPR features are working"
echo "  4. Monitor CloudWatch logs for any errors"
echo ""
echo "CloudWatch Logs:"
echo "  aws logs tail /ecs/solar-intelligence-v2 --follow --region eu-north-1"
echo ""
echo "Rollback (if needed):"
echo "  aws ecs update-service \\"
echo "    --cluster $ECS_CLUSTER \\"
echo "    --service $ECS_SERVICE \\"
echo "    --task-definition solar-intelligence:9 \\"
echo "    --force-new-deployment \\"
echo "    --region $AWS_REGION"
echo ""

print_success "Deployment script completed!"
