# 🚀 Windows Deployment Guide - Solar Intelligence v2

This guide provides step-by-step commands for deploying from Windows PowerShell.

---

## ✅ Prerequisites

- [x] New RDS database created: `solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com`
- [x] Data migrated: 97 users, 1,064 conversations, 197 hired agents
- [ ] AWS CLI installed and configured
- [ ] Docker Desktop installed and running

---

## 📝 Deployment Steps

### **Phase 1: Verify AWS Configuration**

```powershell
# Test AWS credentials
aws sts get-caller-identity

# Expected output should show your AWS account ID: 196621412948
```

### **Phase 2: Create ECR Repositories**

```powershell
# Create backend repository
aws ecr create-repository `
  --repository-name solar-intelligence-backend `
  --region eu-north-1 `
  --image-scanning-configuration scanOnPush=true

# Create frontend repository
aws ecr create-repository `
  --repository-name solar-intelligence-frontend `
  --region eu-north-1 `
  --image-scanning-configuration scanOnPush=true
```

**Note**: If repositories already exist, you'll see an error. That's okay - proceed to next step.

---

### **Phase 3: Login to ECR**

```powershell
# Login to ECR
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 196621412948.dkr.ecr.eu-north-1.amazonaws.com
```

**Expected output**: `Login Succeeded`

---

### **Phase 4: Build Docker Images**

#### **Build Backend Image**

```powershell
# Navigate to project root (if not already there)
cd "C:\Users\MousaSondoqah-Becque\OneDrive - ICARES\Desktop\Solar_intelligence\Final_migration\Full_data_DH_bot"

# Build backend image
docker build -f fastapi_app/Dockerfile.prod -t solar-intelligence-backend:latest .
```

**Expected**: This will take 5-10 minutes. Wait for "Successfully built" message.

#### **Build Frontend Image**

```powershell
# Navigate to frontend directory
cd react-frontend

# Build frontend image
docker build -t solar-intelligence-frontend:latest --build-arg VITE_API_BASE_URL=http://solar-intelligence-alb-1925430211.eu-north-1.elb.amazonaws.com .

# Navigate back to project root
cd ..
```

**Expected**: This will take 3-5 minutes.

---

### **Phase 5: Tag and Push Images to ECR**

#### **Backend Image**

```powershell
# Tag backend image
docker tag solar-intelligence-backend:latest 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-backend:latest

# Push backend image to ECR
docker push 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-backend:latest
```

**Expected**: Upload progress bars, then "latest: digest: sha256:..." message.

#### **Frontend Image**

```powershell
# Tag frontend image
docker tag solar-intelligence-frontend:latest 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-frontend:latest

# Push frontend image to ECR
docker push 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-frontend:latest
```

---

### **Phase 6: Create CloudWatch Log Group**

```powershell
# Create log group
aws logs create-log-group --log-group-name /ecs/solar-intelligence-v2 --region eu-north-1
```

**Note**: If it already exists, you'll see an error. That's okay - proceed.

---

### **Phase 7: Register Task Definition**

```powershell
# Register the task definition
aws ecs register-task-definition --cli-input-json file://task-definition-v2.json --region eu-north-1
```

**Expected output**: JSON response showing the registered task definition with revision number.

---

### **Phase 8: Update ECS Service** ⚠️ (This causes downtime)

**IMPORTANT**: This step will cause 2-5 minutes of downtime while the service updates.

```powershell
# Update the ECS service to use the new task definition
aws ecs update-service `
  --cluster solar-intelligence-cluster `
  --service solar-intelligence-service `
  --task-definition solar-intelligence-v2:1 `
  --force-new-deployment `
  --region eu-north-1
```

**Expected**: JSON response showing deployment status.

---

### **Phase 9: Monitor Deployment**

#### **Option 1: Watch deployment status**

```powershell
# Check service status (run this multiple times)
aws ecs describe-services `
  --cluster solar-intelligence-cluster `
  --services solar-intelligence-service `
  --region eu-north-1 `
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Deployments:deployments[*].[status,taskDefinition]}'
```

#### **Option 2: Watch task status**

```powershell
# List tasks
aws ecs list-tasks `
  --cluster solar-intelligence-cluster `
  --service-name solar-intelligence-service `
  --region eu-north-1
```

#### **Option 3: View CloudWatch logs**

```powershell
# Tail backend logs
aws logs tail /ecs/solar-intelligence-v2 --follow --filter-pattern "backend" --region eu-north-1

# In a separate terminal, tail frontend logs
aws logs tail /ecs/solar-intelligence-v2 --follow --filter-pattern "frontend" --region eu-north-1
```

---

### **Phase 10: Validation**

#### **1. Check Application URL**

Open in browser:
```
http://solar-intelligence-alb-1925430211.eu-north-1.elb.amazonaws.com
```

#### **2. Test Functionality**

- [ ] Landing page loads
- [ ] Login with existing user (one of the 97 migrated users)
- [ ] Chat functionality works
- [ ] Profile page accessible
- [ ] GDPR data export works
- [ ] Admin dashboard accessible (if admin user)

#### **3. Check for Errors**

```powershell
# Check for errors in logs
aws logs filter-log-events `
  --log-group-name /ecs/solar-intelligence-v2 `
  --filter-pattern "ERROR" `
  --region eu-north-1
```

---

## 🔄 Rollback Procedure (If Something Goes Wrong)

If the deployment fails or has issues:

```powershell
# Rollback to previous task definition (replace revision number as needed)
aws ecs update-service `
  --cluster solar-intelligence-cluster `
  --service solar-intelligence-service `
  --task-definition solar-intelligence:9 `
  --force-new-deployment `
  --region eu-north-1
```

This will restore the old Flask application.

---

## 📊 Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Users can login with old credentials
- [ ] Conversations are visible (metadata only, no old messages)
- [ ] Chat creates new messages successfully
- [ ] GDPR features work (data export, restriction requests)
- [ ] Admin breach management accessible
- [ ] No critical errors in CloudWatch logs
- [ ] Application stable for 24 hours

---

## 🎯 Expected Results

After successful deployment:

✅ **Backend**: FastAPI running on port 8000 inside container
✅ **Frontend**: React app served by Nginx on port 80
✅ **Database**: Connected to `solar-intelligence-v2` RDS instance
✅ **Users**: 97 migrated users can login
✅ **Conversations**: 1,064 conversation records (no old messages)
✅ **Hired Agents**: 197 agent assignments preserved

---

## 🆘 Troubleshooting

### **Issue: Docker build fails**
**Solution**: Ensure Docker Desktop is running and you have sufficient disk space.

### **Issue: ECR push fails**
**Solution**: Re-run the ECR login command from Phase 3.

### **Issue: Task fails to start**
**Solution**:
1. Check ECS task logs in AWS Console
2. Verify database endpoint and password in task-definition-v2.json
3. Check security group allows ECS to connect to RDS

### **Issue: 502 Bad Gateway**
**Solution**:
1. Check backend container logs for startup errors
2. Verify health check endpoint is working
3. Ensure database connection is successful

### **Issue: Can't login**
**Solution**:
1. Verify DATABASE_URL in task definition is correct
2. Check users were migrated: Should have 97 users
3. Test with a known user email

---

## 📞 Useful Commands

### **View running tasks**
```powershell
aws ecs list-tasks --cluster solar-intelligence-cluster --region eu-north-1
```

### **Describe a specific task**
```powershell
aws ecs describe-tasks --cluster solar-intelligence-cluster --tasks TASK_ARN --region eu-north-1
```

### **View service events**
```powershell
aws ecs describe-services `
  --cluster solar-intelligence-cluster `
  --services solar-intelligence-service `
  --region eu-north-1 `
  --query 'services[0].events[0:10]'
```

### **Force new deployment (without code changes)**
```powershell
aws ecs update-service `
  --cluster solar-intelligence-cluster `
  --service solar-intelligence-service `
  --force-new-deployment `
  --region eu-north-1
```

---

## 🧹 Cleanup (After 1-2 Weeks)

Once the new deployment is stable:

### **1. Create final backup of old database**
```powershell
aws rds create-db-snapshot `
  --db-instance-identifier solar-intelligence-db `
  --db-snapshot-identifier solar-intelligence-final-backup-2025 `
  --region eu-north-1
```

### **2. Delete old RDS instance**
```powershell
# Only do this after 1-2 weeks of stable operation!
aws rds delete-db-instance `
  --db-instance-identifier solar-intelligence-db `
  --skip-final-snapshot `
  --region eu-north-1
```

**Savings**: ~$15-20/month

---

## ✅ Success!

Congratulations! Your Solar Intelligence application is now running on:

- ✅ **FastAPI Backend** (Python 3.11, async SQLAlchemy)
- ✅ **React Frontend** (TypeScript, Vite)
- ✅ **PostgreSQL 15 Database** (Fresh RDS instance)
- ✅ **GDPR Compliant** (Data export, breach notification, restriction of processing)
- ✅ **Admin Dashboard** (User management, breach management)
- ✅ **Migrated Data** (97 users, 1,064 conversations, 197 hired agents)

🎉 Enjoy your modernized application!
