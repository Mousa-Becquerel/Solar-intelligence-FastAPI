# CI/CD Pipeline Setup Guide

Complete guide for setting up GitHub Actions CI/CD pipeline for Solar Intelligence application.

## Overview

The CI/CD pipeline includes:
- **TypeScript type checking** - Ensures code quality before deployment
- **Backend testing** - Runs pytest with coverage reporting
- **Docker image builds** - Builds and pushes frontend and backend images
- **Security scanning** - Scans Docker images for vulnerabilities
- **Automated deployment** - Deploys to staging and production environments

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Push to GitHub                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│  TypeScript   │              │   Backend     │
│ Type Checking │              │    Tests      │
└───────┬───────┘              └───────┬───────┘
        │                               │
        │         ┌─────────────────────┘
        │         │
        └─────────┼──────────┐
                  │          │
                  ▼          ▼
        ┌─────────────────────────┐
        │  Build Docker Images    │
        │  - Frontend (Nginx)     │
        │  - Backend (FastAPI)    │
        └──────────┬──────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │  Security Scanning  │
        │  (Trivy)            │
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐    ┌───────────────┐
│  Deploy to    │    │  Deploy to    │
│  Staging      │    │  Production   │
│  (develop)    │    │  (main)       │
└───────────────┘    └───────────────┘
```

## Required GitHub Secrets

### Step 1: Set up Docker Hub

1. **Create Docker Hub Account** (if you don't have one):
   - Go to https://hub.docker.com/signup
   - Create account

2. **Create Access Token**:
   - Go to https://hub.docker.com/settings/security
   - Click "New Access Token"
   - Name: `github-actions`
   - Permissions: Read, Write, Delete
   - Copy the token (you won't see it again!)

3. **Add to GitHub Secrets**:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"

   Add these secrets:
   ```
   DOCKERHUB_USERNAME=your_dockerhub_username
   DOCKERHUB_TOKEN=your_access_token_from_step_2
   ```

### Step 2: Set up AWS Credentials (For Deployment)

**Only needed if you want automated deployment to AWS**

1. **Create IAM User** in AWS Console:
   - Service: IAM
   - Users → Add users
   - Name: `github-actions-deploy`
   - Permissions: Attach policies directly
   - Policies needed:
     - `AmazonECS_FullAccess`
     - `AmazonEC2ContainerRegistryPowerUser`
     - `CloudWatchLogsFullAccess`

2. **Create Access Keys**:
   - Click on the user
   - Security credentials → Create access key
   - Use case: Application running outside AWS
   - Copy Access Key ID and Secret Access Key

3. **Add to GitHub Secrets**:
   ```
   AWS_ACCESS_KEY_ID=your_access_key_id
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   AWS_REGION=us-east-1  (or your preferred region)
   ```

### Step 3: Set up Application Secrets

Add these secrets to GitHub:

```
# OpenAI (Required for backend tests)
OPENAI_API_KEY=sk-proj-your-openai-api-key

# API URL (for frontend build)
API_BASE_URL=https://api.yourdomain.com  (or http://localhost:8000 for testing)
```

### Step 4: Configure GitHub Environments (Optional but Recommended)

This adds manual approval for production deployments.

1. **Go to Settings → Environments**

2. **Create Staging Environment**:
   - Name: `staging`
   - URL: `https://staging.yourdomain.com`
   - No protection rules needed

3. **Create Production Environment**:
   - Name: `production`
   - URL: `https://yourdomain.com`
   - Protection rules:
     - ✅ Required reviewers (add yourself)
     - ✅ Wait timer: 5 minutes (optional)
     - ✅ Deployment branches: `main` only

## Complete GitHub Secrets Checklist

### Required Secrets (Minimum):
- [ ] `DOCKERHUB_USERNAME` - Your Docker Hub username
- [ ] `DOCKERHUB_TOKEN` - Docker Hub access token
- [ ] `OPENAI_API_KEY` - OpenAI API key (for tests)

### Optional Secrets (For AWS Deployment):
- [ ] `AWS_ACCESS_KEY_ID` - AWS access key
- [ ] `AWS_SECRET_ACCESS_KEY` - AWS secret key
- [ ] `AWS_REGION` - AWS region (e.g., us-east-1)
- [ ] `API_BASE_URL` - Production API URL

## Pipeline Triggers

### Automatic Triggers:

1. **On Push to `main` or `develop`**:
   - Runs all tests
   - Builds Docker images
   - Pushes images to Docker Hub
   - Deploys to environment (staging for develop, production for main)

2. **On Pull Request to `main` or `develop`**:
   - Runs TypeScript checks
   - Runs backend tests
   - Does NOT build or deploy

3. **Manual Trigger**:
   - Go to Actions → CI/CD Pipeline → Run workflow
   - Select branch and click "Run workflow"

## Pipeline Jobs

### Job 1: TypeScript Type Checking
**Duration**: ~2-3 minutes

**What it does**:
- Installs Node.js dependencies
- Runs `tsc --noEmit` to check for type errors
- Runs ESLint for code quality

**When it fails**:
- Fix TypeScript errors in your code
- Push changes and pipeline will re-run

### Job 2: Backend Tests
**Duration**: ~3-5 minutes

**What it does**:
- Starts PostgreSQL test database
- Installs Python dependencies
- Runs pytest with coverage
- Uploads coverage to Codecov

**When it fails**:
- Check test logs in GitHub Actions
- Fix failing tests locally first: `pytest fastapi_app/tests/ -v`
- Ensure all tests pass before pushing

### Job 3: Build Frontend Docker Image
**Duration**: ~2-3 minutes (with cache)

**What it does**:
- Builds multi-stage Docker image
- Pushes to Docker Hub
- Tags with branch name, commit SHA, and `latest`

**Output**:
- Image: `your_username/solar-intelligence-frontend:latest`
- Image: `your_username/solar-intelligence-frontend:main-abc1234`

### Job 4: Build Backend Docker Image
**Duration**: ~3-5 minutes (with cache)

**What it does**:
- Builds production FastAPI image
- Pushes to Docker Hub
- Tags with branch name, commit SHA, and `latest`

**Output**:
- Image: `your_username/solar-intelligence-backend:latest`
- Image: `your_username/solar-intelligence-backend:main-abc1234`

### Job 5: Security Scanning
**Duration**: ~2-3 minutes

**What it does**:
- Scans both Docker images with Trivy
- Checks for known vulnerabilities
- Uploads results to GitHub Security tab

**When it fails**:
- Review security warnings
- Update vulnerable dependencies
- Re-build images

### Job 6: Deploy to Staging
**Duration**: ~5-10 minutes

**When it runs**: Only on push to `develop` branch

**What it does**:
- Updates ECS services to use new images
- Forces new deployment
- Waits for services to stabilize

**Prerequisites**:
- ECS cluster `solar-intelligence-staging` must exist
- ECS services must be created and running

### Job 7: Deploy to Production
**Duration**: ~5-10 minutes

**When it runs**: Only on push to `main` branch (with manual approval)

**What it does**:
- Waits for manual approval (if environment protection enabled)
- Updates ECS services to use new images
- Forces new deployment
- Waits for services to stabilize
- Sends notification

**Prerequisites**:
- ECS cluster `solar-intelligence-prod` must exist
- ECS services must be created and running

## Local Testing Before Push

### Test TypeScript:
```bash
cd react-frontend
npm run build  # Will show type errors if any
npx tsc --noEmit  # Type check without building
npm run lint  # Run ESLint
```

### Test Backend:
```bash
# Make sure you have a test database running
docker-compose up -d postgres

# Install dependencies
pip install -r requirements-fastapi.txt
pip install pytest pytest-asyncio httpx

# Run tests
pytest fastapi_app/tests/ -v

# Run with coverage
pytest fastapi_app/tests/ -v --cov=fastapi_app --cov-report=term
```

### Test Docker Builds:
```bash
# Test frontend build
cd react-frontend
docker build -t test-frontend .

# Test backend build
cd ../fastapi_app
docker build -f Dockerfile.prod -t test-backend .
```

## Workflow Files

### Main Workflow: `.github/workflows/ci-cd.yml`
Complete CI/CD pipeline as described above.

## Monitoring Pipeline

### View Pipeline Status:
1. Go to GitHub repository
2. Click "Actions" tab
3. See all workflow runs

### View Logs:
1. Click on any workflow run
2. Click on specific job (e.g., "Backend Tests")
3. Expand steps to see detailed logs

### Check Coverage:
1. Set up Codecov account (https://codecov.io)
2. Install Codecov GitHub App
3. Coverage reports automatically uploaded

## Troubleshooting

### Issue: "DOCKERHUB_USERNAME secret not found"

**Fix**:
1. Go to Settings → Secrets and variables → Actions
2. Add `DOCKERHUB_USERNAME` secret
3. Re-run workflow

### Issue: "Docker build failed - out of memory"

**Fix**:
- GitHub Actions runners have 7GB RAM
- Reduce Docker layer size
- Use multi-stage builds (already implemented)

### Issue: "Backend tests failed - database connection refused"

**Fix**:
- Tests use PostgreSQL service
- Check if service is starting correctly
- Verify `DATABASE_URL` in workflow file

### Issue: "ECS deployment failed - service not found"

**Fix**:
- Create ECS cluster and services first (see DEPLOYMENT.md)
- Or comment out deployment jobs until ECS is set up

### Issue: "Rate limit exceeded on Docker Hub"

**Fix**:
- Free Docker Hub accounts have pull rate limits
- Upgrade to Pro account ($5/month)
- Or use AWS ECR instead

## Skipping Deployment Jobs (Initial Setup)

If you haven't set up AWS ECS yet, you can disable deployment jobs:

**Option 1**: Comment out deployment jobs in `.github/workflows/ci-cd.yml`

**Option 2**: Don't add AWS secrets - jobs will be skipped automatically

**Option 3**: Use workflow conditions to manually enable:
```yaml
deploy-production:
  if: github.ref == 'refs/heads/main' && vars.ENABLE_DEPLOYMENT == 'true'
```

## Performance Optimization

### Build Cache:
- Docker layer caching enabled (saves ~60% build time)
- npm cache enabled (saves ~40% install time)
- pip cache enabled (saves ~30% install time)

### Expected Build Times:

**First Build** (no cache):
- TypeScript check: ~3 minutes
- Backend tests: ~5 minutes
- Frontend build: ~4 minutes
- Backend build: ~6 minutes
- **Total**: ~20 minutes

**Subsequent Builds** (with cache):
- TypeScript check: ~2 minutes
- Backend tests: ~3 minutes
- Frontend build: ~2 minutes
- Backend build: ~3 minutes
- **Total**: ~12 minutes

## Cost Estimation

### GitHub Actions:
- **Free tier**: 2,000 minutes/month (for public repos: unlimited)
- **Paid tier**: $0.008/minute (for private repos)
- Estimated usage: ~400 minutes/month (20 builds)
- **Cost**: $0 (public) or $3.20/month (private)

### Docker Hub:
- **Free tier**: Unlimited public repos, 200 container pulls/6 hours
- **Pro tier**: $5/month for unlimited pulls
- **Recommended**: Pro tier for production

### Total CI/CD Cost:
- **Public repo**: ~$5/month (Docker Hub Pro)
- **Private repo**: ~$8/month (GitHub Actions + Docker Hub)

## Next Steps

1. **Set up GitHub Secrets** (see checklist above)
2. **Test Pipeline**: Push a small change and watch it run
3. **Fix any failing tests** before enabling deployment
4. **Set up AWS ECS** (if you want automated deployment)
5. **Configure notifications** (Slack, Discord, email)

## Additional Features to Add

### Future Enhancements:
- [ ] Slack/Discord notifications on success/failure
- [ ] Database migration checks before deployment
- [ ] Smoke tests after deployment
- [ ] Rollback automation on failure
- [ ] Blue-green deployment strategy
- [ ] Canary deployments
- [ ] Performance testing (Lighthouse CI)

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [AWS ECS Deploy Action](https://github.com/aws-actions/amazon-ecs-deploy-task-definition)
- [Codecov Documentation](https://docs.codecov.com/)

---

**Status**: ✅ CI/CD Pipeline Ready to Use

**Next Action**: Add GitHub secrets and test the pipeline with a small commit
