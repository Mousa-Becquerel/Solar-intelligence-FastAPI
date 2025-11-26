# 🚀 Quick Deployment Reference

## 📋 Pre-Deployment Summary

### ✅ Completed
- [x] New RDS database created: `solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com`
- [x] Data migrated successfully:
  - 97 users (with passwords and GDPR data)
  - 1,064 conversations (metadata)
  - 197 hired agents
  - All agent access configurations
- [x] Task definition created: `task-definition-v2.json`
- [x] Deployment scripts prepared

### ⏳ Next Steps
1. Build Docker images
2. Push to ECR
3. Deploy to ECS
4. Validate production

---

## 🎯 One-Line Deployment (PowerShell)

**WARNING**: This will cause ~2-5 minutes downtime!

```powershell
# Run these commands in order:

# 1. Login to ECR
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 196621412948.dkr.ecr.eu-north-1.amazonaws.com

# 2. Build backend
docker build -f fastapi_app/Dockerfile.prod -t 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-backend:latest .

# 3. Build frontend
cd react-frontend; docker build -t 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-frontend:latest --build-arg VITE_API_BASE_URL=http://solar-intelligence-alb-1925430211.eu-north-1.elb.amazonaws.com .; cd ..

# 4. Push images
docker push 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-backend:latest
docker push 196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-frontend:latest

# 5. Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition-v2.json --region eu-north-1

# 6. Deploy
aws ecs update-service --cluster solar-intelligence-cluster --service solar-intelligence-service --task-definition solar-intelligence-v2:1 --force-new-deployment --region eu-north-1
```

---

## 📊 Key Information

### Application Details
- **Backend Port**: 8000
- **Frontend Port**: 80
- **Database**: PostgreSQL 15
- **Region**: eu-north-1

### AWS Resources
- **Account ID**: 196621412948
- **ECS Cluster**: solar-intelligence-cluster
- **ECS Service**: solar-intelligence-service
- **ALB URL**: http://solar-intelligence-alb-1925430211.eu-north-1.elb.amazonaws.com

### Database Connection
```
Host: solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com
Port: 5432
Database: solar_intelligence_v2
Username: solar_admin_v2
Password: Datahub1_
```

### ECR Repositories
- Backend: `196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-backend`
- Frontend: `196621412948.dkr.ecr.eu-north-1.amazonaws.com/solar-intelligence-frontend`

---

## 🔍 Monitoring

### Check Deployment Status
```powershell
aws ecs describe-services --cluster solar-intelligence-cluster --services solar-intelligence-service --region eu-north-1 --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
```

### View Logs
```powershell
# Backend logs
aws logs tail /ecs/solar-intelligence-v2 --follow --filter-pattern "backend" --region eu-north-1

# Frontend logs
aws logs tail /ecs/solar-intelligence-v2 --follow --filter-pattern "frontend" --region eu-north-1

# Error logs only
aws logs filter-log-events --log-group-name /ecs/solar-intelligence-v2 --filter-pattern "ERROR" --region eu-north-1
```

---

## 🔄 Rollback Command

If deployment fails:

```powershell
aws ecs update-service --cluster solar-intelligence-cluster --service solar-intelligence-service --task-definition solar-intelligence:9 --force-new-deployment --region eu-north-1
```

---

## ✅ Post-Deployment Validation

1. **Open application**: http://solar-intelligence-alb-1925430211.eu-north-1.elb.amazonaws.com
2. **Test login**: Use one of the 97 migrated users
3. **Check GDPR features**: Profile → Export Data
4. **Test chat**: Create new conversation
5. **Admin dashboard**: `/admin` (if admin user)

---

## 📁 Important Files

- `task-definition-v2.json` - ECS task configuration
- `DEPLOY_WINDOWS.md` - Detailed deployment guide
- `DEPLOYMENT_GUIDE.md` - Original comprehensive guide
- `migrate_to_new_db.py` - Database migration script (already executed)
- `test_new_db_connection.py` - Database connection test

---

## 🎯 Expected Timeline

| Phase | Duration |
|-------|----------|
| ECR Login | 30 seconds |
| Build Images | 10-15 minutes |
| Push Images | 5-10 minutes |
| Register Task Def | 10 seconds |
| Deploy to ECS | 5-10 minutes |
| **Total** | **~30-45 minutes** |

**Downtime**: Only 2-5 minutes during ECS service update

---

## 🆘 Emergency Contacts

- AWS Console: https://console.aws.amazon.com/
- ECS Service: https://eu-north-1.console.aws.amazon.com/ecs/v2/clusters/solar-intelligence-cluster/services
- RDS Instance: https://eu-north-1.console.aws.amazon.com/rds/home?region=eu-north-1#database:id=solar-intelligence-v2
- CloudWatch Logs: https://eu-north-1.console.aws.amazon.com/cloudwatch/home?region=eu-north-1#logsV2:log-groups/log-group/$252Fecs$252Fsolar-intelligence-v2

---

## 📖 Documentation

For detailed step-by-step instructions, see:
- **Windows Users**: [DEPLOY_WINDOWS.md](DEPLOY_WINDOWS.md)
- **Comprehensive Guide**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
