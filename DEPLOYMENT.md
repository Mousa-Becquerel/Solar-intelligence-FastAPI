# Solar Intelligence - Production Deployment Guide

## Overview

This guide covers deploying the Solar Intelligence application using Docker in production mode.

## Architecture

```
┌─────────────────┐
│  React Frontend │ (Nginx on port 80)
│  (Container)    │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼────────┐ ┌─────▼──────────┐
│  FastAPI Backend│ │   PostgreSQL   │
│  (Port 8000)    │ │   Database     │
│  (Container)    │ │   (Container)  │
└─────────────────┘ └────────────────┘
```

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM
- Port 80 (HTTP) and 8000 (API) available

## Quick Start

### 1. Clone and Setup

```bash
cd /path/to/Solar_intelligence/Final_migration/Full_data_DH_bot
```

### 2. Create Production Environment File

```bash
# Copy example file
cp .env.prod.example .env.prod

# Edit with your values
nano .env.prod
```

**Required Variables:**
- `POSTGRES_PASSWORD`: Strong database password
- `SECRET_KEY`: Random secret (generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- `JWT_SECRET_KEY`: Random JWT secret (generate same way)
- `OPENAI_API_KEY`: Your OpenAI API key

**Optional but Recommended:**
- `FRONTEND_URL`: Your domain (e.g., https://yourdomain.com)
- `API_BASE_URL`: Your API domain (e.g., https://api.yourdomain.com)

### 3. Build and Start

```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Initialize Database

The database will be initialized automatically on first startup. To verify:

```bash
# Check FastAPI logs
docker logs solar-intelligence-api-prod

# You should see: "✅ FastAPI Database initialized"
```

### 5. Verify Deployment

```bash
# Health checks
curl http://localhost/health          # Frontend health
curl http://localhost:8000/health     # Backend health

# API documentation
open http://localhost:8000/docs       # Swagger UI
```

## Production Deployment (AWS)

### Architecture on AWS

```
CloudFront (CDN)
    ↓
Application Load Balancer (ALB)
    ↓
ECS Fargate Cluster
    ├─ Frontend Task (Nginx)
    ├─ Backend Task (FastAPI)
    └─ RDS PostgreSQL
```

### AWS Setup Steps

#### 1. Prerequisites

- AWS Account
- AWS CLI configured
- Domain name (for HTTPS)

#### 2. Create ECR Repositories

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Create repositories
aws ecr create-repository --repository-name solar-intelligence/frontend
aws ecr create-repository --repository-name solar-intelligence/backend
```

#### 3. Build and Push Images

```bash
# Build frontend
cd react-frontend
docker build -t solar-intelligence/frontend:latest .
docker tag solar-intelligence/frontend:latest YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/solar-intelligence/frontend:latest
docker push YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/solar-intelligence/frontend:latest

# Build backend
cd ../fastapi_app
docker build -f Dockerfile.prod -t solar-intelligence/backend:latest .
docker tag solar-intelligence/backend:latest YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/solar-intelligence/backend:latest
docker push YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/solar-intelligence/backend:latest
```

#### 4. Create RDS Database

```bash
# Using AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier solar-intelligence-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YOUR_STRONG_PASSWORD \
  --allocated-storage 20
```

#### 5. Store Secrets in AWS Secrets Manager

```bash
# Create secret for database credentials
aws secretsmanager create-secret \
  --name solar-intelligence/database \
  --secret-string '{"username":"admin","password":"YOUR_DB_PASSWORD"}'

# Create secret for application keys
aws secretsmanager create-secret \
  --name solar-intelligence/app-secrets \
  --secret-string '{"SECRET_KEY":"YOUR_SECRET","JWT_SECRET_KEY":"YOUR_JWT_SECRET","OPENAI_API_KEY":"YOUR_OPENAI_KEY"}'
```

#### 6. Create ECS Cluster and Tasks

Use the AWS Console or Infrastructure as Code (Terraform/CloudFormation):

1. Create ECS Cluster
2. Create Task Definitions for frontend and backend
3. Create ECS Services
4. Configure ALB with target groups
5. Set up CloudFront distribution

#### 7. Configure HTTPS

1. Request SSL certificate in ACM (AWS Certificate Manager)
2. Validate domain ownership
3. Attach certificate to ALB
4. Update CloudFront to use HTTPS

## Environment-Specific Configuration

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring and Maintenance

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f fastapi-app
docker-compose -f docker-compose.prod.yml logs -f react-frontend
```

### Database Backup

```bash
# Backup
docker exec solar-intelligence-db-prod pg_dump -U fastapi_user_prod fastapi_db_prod > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i solar-intelligence-db-prod psql -U fastapi_user_prod fastapi_db_prod < backup_20250115.sql
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Zero-Downtime Updates

```bash
# Build new images
docker-compose -f docker-compose.prod.yml build

# Update services one by one
docker-compose -f docker-compose.prod.yml up -d --no-deps --build fastapi-app
docker-compose -f docker-compose.prod.yml up -d --no-deps --build react-frontend
```

## Security Checklist

- [ ] Strong database password set
- [ ] Random SECRET_KEY generated
- [ ] Random JWT_SECRET_KEY generated
- [ ] .env.prod excluded from git
- [ ] HTTPS enabled (production)
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS configured for production domain
- [ ] Database backups scheduled
- [ ] Monitoring and alerts set up

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs SERVICE_NAME

# Check if port is in use
sudo lsof -i :80
sudo lsof -i :8000
```

### Database connection issues

```bash
# Test database connection
docker exec solar-intelligence-api-prod python -c "from fastapi_app.db.session import check_db; check_db()"
```

### Frontend can't reach backend

- Check CORS settings in backend
- Verify API_BASE_URL in frontend environment
- Check network connectivity between containers

## Cost Estimation (AWS)

- **ECS Fargate**: ~$15/month (0.25 vCPU, 0.5GB RAM)
- **RDS PostgreSQL**: ~$15/month (db.t3.micro)
- **ALB**: ~$20/month
- **CloudFront**: ~$10/month
- **Secrets Manager**: ~$2/month
- **Total**: ~$62/month

## Support

For issues, please check:
1. Application logs
2. Docker logs
3. GitHub Issues: https://github.com/your-repo/issues
