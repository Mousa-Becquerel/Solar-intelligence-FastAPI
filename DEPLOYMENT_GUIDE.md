# 🚀 Solar Intelligence - AWS Deployment Guide
## Migration from Flask to FastAPI with New RDS Database

---

## 📋 Overview

This guide walks you through migrating your production Solar Intelligence application from the old Flask/vanilla JS version to the new FastAPI/React version with a fresh RDS database.

**Timeline:** ~2-3 hours total, ~10 minutes downtime

---

## ✅ Prerequisites Checklist

Before starting, ensure you have:

- [ ] New RDS database created and in "Available" state
- [ ] New database endpoint, username, and password
- [ ] AWS CLI configured with proper credentials
- [ ] Docker and Docker Compose installed locally
- [ ] Access to AWS ECS console
- [ ] Access to AWS ECR console

---

## 📝 Step-by-Step Deployment

### **Phase 1: Prepare New Database** (30 minutes)

#### **Step 1.1: Get New Database Information**

Once your RDS database is available, collect:

1. Go to AWS RDS Console
2. Click on `solar-intelligence-v2` database
3. Copy these values:

```
Endpoint: solar-intelligence-v2.xxxxx.eu-north-1.rds.amazonaws.com
Port: 5432
Master username: solar_admin_v2
Master password: (the one you created)
Database name: solar_intelligence_v2
```

#### **Step 1.2: Configure Security Group**

Allow your local machine to connect:

1. Go to EC2 → Security Groups
2. Find `solar-intelligence-sg` (or the one attached to your database)
3. Click "Edit inbound rules"
4. Add rule:
   - Type: PostgreSQL
   - Port: 5432
   - Source: My IP
   - Description: Temporary - for migration
5. Save rules

#### **Step 1.3: Test Connection**

Update `test_new_db_connection.py`:

```python
NEW_DB_URL = "postgresql+asyncpg://solar_admin_v2:YOUR_PASSWORD@YOUR_ENDPOINT:5432/solar_intelligence_v2"
```

Run test:
```bash
python test_new_db_connection.py
```

Expected output:
```
✅ Connection successful!
PostgreSQL version: PostgreSQL 15.x
Database is empty and ready for initialization
```

---

### **Phase 2: Run Data Migration** (30 minutes)

#### **Step 2.1: Update Migration Script**

Edit `migrate_to_new_db.py` and update line 20:

```python
NEW_DB_URL = "postgresql+asyncpg://solar_admin_v2:YOUR_ACTUAL_PASSWORD@YOUR_ACTUAL_ENDPOINT:5432/solar_intelligence_v2"
```

#### **Step 2.2: Run Migration**

```bash
python migrate_to_new_db.py
```

This script will:
1. ✅ Create all FastAPI tables in new database
2. ✅ Migrate 97 users from old → new
3. ✅ Migrate 1,064 conversations
4. ✅ Migrate 4,151 messages
5. ✅ Migrate 197 hired agents
6. ✅ Migrate all other data (waitlist, surveys, contacts, etc.)
7. ✅ Validate all data migrated correctly

Expected duration: ~5-10 minutes

#### **Step 2.3: Verify Migration**

Check the validation output at the end:

```
📊 Validation Results:
✅ Users               Old:     97  New:     97  MATCH
✅ Conversations       Old:   1064  New:   1064  MATCH
✅ Messages            Old:   4151  New:   4151  MATCH
✅ Hired Agents        Old:    197  New:    197  MATCH
```

All should show ✅ MATCH!

---

### **Phase 3: Build and Push Docker Images** (30 minutes)

#### **Step 3.1: Create ECR Repositories**

```bash
# Create backend repository
aws ecr create-repository \
  --repository-name solar-intelligence-backend \
  --region eu-north-1

# Create frontend repository
aws ecr create-repository \
  --repository-name solar-intelligence-frontend \
  --region eu-north-1
```

#### **Step 3.2: Login to ECR**

```bash
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 196621412948.dkr.ecr.eu-north-1.amazonaws.com
```

#### **Step 3.3: Build Images**

**Backend:**
```bash
cd "C:\Users\MousaSondoqah-Becque\OneDrive - ICARES\Desktop\Solar_intelligence\Final_migration\Full_data_DH_bot"

docker build -f fastapi_app/Dockerfile.prod -t solar-intelligence-backend:latest --build-arg BUILDKIT_INLINE_CACHE=1 .
```

**Frontend:**
```bash
cd react-frontend

docker build -t solar-intelligence-frontend:latest --build-arg VITE_API_BASE_URL=http://localhost:8000 .
```

#### **Step 3.4: Tag and Push Images**

**Backend:**
```bash
docker tag solar-intelligence-backend:latest 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-backend:latest

docker push 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-backend:latest
```

**Frontend:**
```bash
docker tag solar-intelligence-frontend:latest 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-frontend:latest

docker push 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-frontend:latest
```

---

### **Phase 4: Create ECS Task Definition** (20 minutes)

#### **Step 4.1: Create Task Definition JSON**

Save this as `task-definition-v2.json`:

```json
{
  "family": "solar-intelligence-v2",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::196621412948:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp",
          "name": "backend-8000-tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql+asyncpg://solar_admin_v2:YOUR_PASSWORD@YOUR_ENDPOINT:5432/solar_intelligence_v2"
        },
        {
          "name": "SECRET_KEY",
          "value": "6bdd915f05f3f512b2cf32d34720476cf1f99ad910649750786457a2a18f506d"
        },
        {
          "name": "JWT_SECRET_KEY",
          "value": "YOUR_JWT_SECRET"
        },
        {
          "name": "OPENAI_API_KEY",
          "value": "YOUR_OPENAI_API_KEY"
        },
        {
          "name": "CORS_ORIGINS",
          "value": "*"
        },
        {
          "name": "LOGFIRE_TOKEN",
          "value": "YOUR_LOGFIRE_TOKEN"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/solar-intelligence-v2",
          "awslogs-region": "eu-north-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    },
    {
      "name": "frontend",
      "image": "196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-frontend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp",
          "name": "frontend-80-tcp"
        }
      ],
      "dependsOn": [
        {
          "containerName": "backend",
          "condition": "START"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/solar-intelligence-v2",
          "awslogs-region": "eu-north-1",
          "awslogs-stream-prefix": "frontend"
        }
      }
    }
  ]
}
```

**⚠️ IMPORTANT:** Replace:
- `YOUR_PASSWORD` with new database password
- `YOUR_ENDPOINT` with new database endpoint
- `YOUR_JWT_SECRET` with a new JWT secret

#### **Step 4.2: Create CloudWatch Log Group**

```bash
aws logs create-log-group \
  --log-group-name /ecs/solar-intelligence-v2 \
  --region eu-north-1
```

#### **Step 4.3: Register Task Definition**

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition-v2.json \
  --region eu-north-1
```

---

### **Phase 5: Update ECS Service** (~10 minutes downtime)

#### **Step 5.1: Update Target Group**

1. Go to EC2 → Target Groups
2. Click on `solar-intelligence-targets`
3. Change:
   - Port: 5000 → 80 (frontend port)
   - Health check path: `/` (or `/health`)

#### **Step 5.2: Update ECS Service**

```bash
aws ecs update-service \
  --cluster solar-intelligence-cluster \
  --service solar-intelligence-service \
  --task-definition solar-intelligence-v2:1 \
  --force-new-deployment \
  --region eu-north-1
```

#### **Step 5.3: Monitor Deployment**

```bash
aws ecs describe-services \
  --cluster solar-intelligence-cluster \
  --services solar-intelligence-service \
  --region eu-north-1 \
  --query 'services[0].deployments'
```

Wait for:
- Old task to stop
- New task to start
- Health checks to pass
- Status: "ACTIVE"

---

### **Phase 6: Validation** (15 minutes)

#### **Step 6.1: Test Application**

1. Get ALB URL:
   ```
   http://solar-intelligence-alb-1925430211.eu-north-1.elb.amazonaws.com
   ```

2. Open in browser
3. Test:
   - [ ] Landing page loads
   - [ ] Login with existing user works
   - [ ] Old conversations are visible
   - [ ] Chat works
   - [ ] Profile page loads
   - [ ] Admin dashboard accessible (if admin)

#### **Step 6.2: Test GDPR Features**

- [ ] Data export works
- [ ] Restriction of processing works
- [ ] Admin breach management page loads

#### **Step 6.3: Monitor Logs**

```bash
# Check backend logs
aws logs tail /ecs/solar-intelligence-v2 \
  --follow \
  --filter-pattern "backend" \
  --region eu-north-1

# Check for errors
aws logs filter-log-events \
  --log-group-name /ecs/solar-intelligence-v2 \
  --filter-pattern "ERROR" \
  --region eu-north-1
```

---

## 🔄 Rollback Procedure (If Needed)

If something goes wrong:

```bash
# Rollback to old task definition
aws ecs update-service \
  --cluster solar-intelligence-cluster \
  --service solar-intelligence-service \
  --task-definition solar-intelligence:9 \
  --force-new-deployment \
  --region eu-north-1
```

This will restore the old Flask app with old database.

---

## 🧹 Cleanup (After 1-2 Weeks)

Once everything is working perfectly:

### **Step 1: Create Final Backup of Old Database**

```bash
aws rds create-db-snapshot \
  --db-instance-identifier solar-intelligence-db \
  --db-snapshot-identifier solar-intelligence-final-backup-2025 \
  --region eu-north-1
```

### **Step 2: Delete Old RDS Instance**

```bash
aws rds delete-db-instance \
  --db-instance-identifier solar-intelligence-db \
  --skip-final-snapshot \
  --region eu-north-1
```

**Savings:** ~$15-20/month

### **Step 3: Remove Temporary Security Group Rule**

Remove the "My IP" rule you added for migration.

---

## 📊 Cost Summary

| Item | Before | After | Savings |
|------|--------|-------|---------|
| RDS (old) | $15/mo | $0 | +$15/mo |
| RDS (new) | $0 | $15/mo | -$15/mo |
| ECS | $50/mo | $50/mo | $0 |
| ALB | $16/mo | $16/mo | $0 |
| **Total** | **$81/mo** | **$81/mo** | **$0** |

No additional costs! 🎉

---

## ✅ Success Criteria

Migration is successful when:

- [ ] All users can login with old credentials
- [ ] All conversations and messages visible
- [ ] Chat functionality works
- [ ] New GDPR features work
- [ ] No errors in CloudWatch logs
- [ ] Application stable for 48 hours

---

## 🆘 Troubleshooting

### **Issue: Can't connect to new database**
**Solution:** Check security group rules allow your ECS tasks

### **Issue: Login fails**
**Solution:** Verify password hashes migrated correctly

### **Issue: Old conversations not visible**
**Solution:** Check foreign keys in database

### **Issue: 502 Bad Gateway**
**Solution:** Check backend container logs for errors

---

## 📞 Support

If you encounter issues:
1. Check CloudWatch logs first
2. Verify database connection
3. Review ECS task health
4. Check security group rules

---

## 🎉 Post-Deployment

Congratulations! Your application is now running on:
- ✅ FastAPI backend (Python 3.11, async)
- ✅ React frontend (TypeScript, Vite)
- ✅ Fresh PostgreSQL 15 database
- ✅ All GDPR compliance features
- ✅ Data breach notification system
- ✅ Admin dashboard

Enjoy your modernized application! 🚀
