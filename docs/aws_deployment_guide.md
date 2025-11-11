# AWS Deployment Guide for Module Prices Agent

This guide provides multiple deployment options for your Module Prices Agent on AWS.

## 🚀 Deployment Options

### Option 1: AWS ECS with Fargate (Recommended)
**Best for**: Production workloads, auto-scaling, managed infrastructure

### Option 2: AWS EC2 with Docker
**Best for**: Full control, cost optimization, custom configurations

### Option 3: AWS App Runner
**Best for**: Simplest deployment, automatic scaling, minimal configuration

---

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Docker** installed locally
4. **OpenAI API Key**

### Install AWS CLI
```bash
pip install awscli
aws configure
```

---

## 🎯 Option 1: AWS ECS with Fargate (Recommended)

### Step 1: Build and Push Docker Image to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name module-prices-agent --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build image
cd Weaviate_datahub/cursor_langchain_enhanced
docker build -t module-prices-agent .

# Tag image
docker tag module-prices-agent:latest <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/module-prices-agent:latest

# Push image
docker push <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/module-prices-agent:latest
```

### Step 2: Create ECS Task Definition

Create `ecs-task-definition.json`:

```json
{
  "family": "module-prices-agent",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<your-account-id>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<your-account-id>:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "module-prices-agent",
      "image": "<your-account-id>.dkr.ecr.us-east-1.amazonaws.com/module-prices-agent:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "FLASK_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<your-account-id>:secret:openai-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/module-prices-agent",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:5000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Step 3: Create ECS Service

```bash
# Create cluster
aws ecs create-cluster --cluster-name module-prices-cluster

# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster module-prices-cluster \
  --service-name module-prices-service \
  --task-definition module-prices-agent:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-12345],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/module-prices-tg/1234567890,containerName=module-prices-agent,containerPort=5000
```

### **Estimated Cost**: $50-100/month (2 Fargate tasks, ALB)

---

## 🖥️ Option 2: AWS EC2 with Docker

### Step 1: Launch EC2 Instance

```bash
# Launch t3.medium instance (2GB RAM as per memory test)
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --count 1 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-12345 \
  --subnet-id subnet-12345 \
  --user-data file://user-data.sh
```

Create `user-data.sh`:
```bash
#!/bin/bash
yum update -y
yum install -y docker
service docker start
usermod -a -G docker ec2-user

# Install docker-compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone your repo and start service
cd /home/ec2-user
# You'll need to copy your files here
```

### Step 2: Deploy on EC2

```bash
# SSH to instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Copy your code (use scp or git clone)
scp -i your-key.pem -r ./Weaviate_datahub/cursor_langchain_enhanced ec2-user@your-instance-ip:/home/ec2-user/

# Set environment variables
echo "OPENAI_API_KEY=your-key-here" > .env

# Start services
docker-compose up -d
```

### **Estimated Cost**: $25-40/month (t3.medium instance)

---

## ☁️ Option 3: AWS App Runner (Simplest)

### Step 1: Create apprunner.yaml

```yaml
version: 1.0
runtime: docker
build:
  commands:
    build:
      - echo "Build phase started on `date`"
run:
  runtime-version: latest
  command: gunicorn --bind 0.0.0.0:8000 --workers 2 --timeout 120 app:app
  network:
    port: 8000
  env:
    - name: FLASK_ENV
      value: production
```

### Step 2: Deploy to App Runner

```bash
# Create App Runner service
aws apprunner create-service \
  --service-name module-prices-agent \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "<your-account-id>.dkr.ecr.us-east-1.amazonaws.com/module-prices-agent:latest",
      "ImageConfiguration": {
        "Port": "8000"
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true
  }' \
  --instance-configuration '{
    "Cpu": "1024",
    "Memory": "2048"
  }'
```

### **Estimated Cost**: $35-50/month (App Runner pricing)

---

## 🔐 Security Setup

### 1. Store OpenAI API Key in AWS Secrets Manager

```bash
# Create secret
aws secretsmanager create-secret \
  --name "openai-api-key" \
  --description "OpenAI API Key for Module Prices Agent" \
  --secret-string "your-openai-api-key"
```

### 2. Create IAM Roles

Create `ecs-task-role-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:openai-api-key*"
    }
  ]
}
```

```bash
# Create role
aws iam create-role --role-name ecsTaskRole --assume-role-policy-document file://trust-policy.json
aws iam put-role-policy --role-name ecsTaskRole --policy-name SecretsManagerPolicy --policy-document file://ecs-task-role-policy.json
```

---

## 🏥 Health Checks & Monitoring

### Add Health Endpoint to Flask App

Add to your `app.py`:
```python
@app.route('/health')
def health_check():
    return {'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}
```

### CloudWatch Monitoring

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/module-prices-agent
```

---

## 🚀 Deployment Commands

### Quick Deployment Script

Create `deploy.sh`:
```bash
#!/bin/bash
set -e

# Variables
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/module-prices-agent"

echo "Building and deploying Module Prices Agent..."

# Build and push image
docker build -t module-prices-agent .
docker tag module-prices-agent:latest $IMAGE_URI:latest
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $IMAGE_URI
docker push $IMAGE_URI:latest

# Update ECS service
aws ecs update-service \
  --cluster module-prices-cluster \
  --service module-prices-service \
  --force-new-deployment

echo "Deployment complete!"
```

---

## 📊 Performance Recommendations

Based on your memory test results:

- **Minimum RAM**: 1GB (your agent peaks at ~400MB)
- **Recommended**: 2GB (with safety margin)
- **CPU**: 1 vCPU sufficient for moderate load
- **Storage**: 10GB for datasets and generated plots

### Instance Types:
- **ECS Fargate**: 1024 CPU, 2048 Memory
- **EC2**: t3.medium (2 vCPU, 4GB RAM)
- **App Runner**: 1024 CPU, 2048 Memory

---

## 🔧 Troubleshooting

### Common Issues:

1. **Memory Issues**: Increase memory allocation in task definition
2. **Timeout Issues**: Increase timeout in load balancer/gunicorn
3. **Plot Generation**: Ensure matplotlib backend is set correctly
4. **Dataset Loading**: Verify datasets directory is properly mounted

### Debug Commands:
```bash
# Check ECS service status
aws ecs describe-services --cluster module-prices-cluster --services module-prices-service

# View logs
aws logs tail /ecs/module-prices-agent --follow

# Check container health
docker exec -it <container-id> curl localhost:5000/health
```

---

## 💰 Cost Optimization

1. **Use Spot Instances** for EC2 (50-70% savings)
2. **Auto-scaling** based on CPU/memory usage
3. **Reserved Instances** for predictable workloads
4. **CloudWatch** monitoring to optimize resource usage

---

Choose the deployment option that best fits your needs:
- **ECS Fargate**: Production-ready, managed, scalable
- **EC2**: Cost-effective, full control
- **App Runner**: Simplest, serverless-like experience 