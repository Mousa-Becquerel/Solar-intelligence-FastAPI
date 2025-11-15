# Docker Stack Testing Guide

Complete guide to test your Dockerized frontend and backend.

## Prerequisites

- Docker Desktop running
- Ports 80, 8000, and 5433 available
- `.env.prod` file configured (copy from `.env.prod.example`)

## Step-by-Step Testing

### Step 1: Create Production Environment File

```bash
# Copy example file
cp .env.prod.example .env.prod

# Edit with your actual values
notepad .env.prod
```

**Minimum required values**:
```env
POSTGRES_PASSWORD=your_strong_password_here
SECRET_KEY=generate_random_32_chars
JWT_SECRET_KEY=generate_random_32_chars
OPENAI_API_KEY=your_openai_key
```

**Generate secrets** (run in Python):
```python
import secrets
print("SECRET_KEY:", secrets.token_urlsafe(32))
print("JWT_SECRET_KEY:", secrets.token_urlsafe(32))
```

### Step 2: Build Docker Images

```bash
# Build all images (frontend, backend, database)
docker-compose -f docker-compose.prod.yml build

# This will take 2-5 minutes
```

Expected output:
```
✅ Building frontend... (12 seconds)
✅ Building backend... (2-3 minutes)
✅ Pulling postgres... (if not cached)
```

### Step 3: Start the Stack

```bash
# Start all containers in detached mode
docker-compose -f docker-compose.prod.yml up -d
```

Expected output:
```
Creating network "solar-network" ... done
Creating volume "postgres_data_prod" ... done
Creating solar-intelligence-db-prod ... done
Creating solar-intelligence-api-prod ... done
Creating solar-intelligence-frontend-prod ... done
```

### Step 4: Verify Containers are Running

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps
```

Expected output (all should show "Up"):
```
NAME                              STATUS
solar-intelligence-db-prod        Up (healthy)
solar-intelligence-api-prod       Up (healthy)
solar-intelligence-frontend-prod  Up (healthy)
```

### Step 5: Check Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# Or specific service
docker-compose -f docker-compose.prod.yml logs fastapi-app
docker-compose -f docker-compose.prod.yml logs react-frontend
docker-compose -f docker-compose.prod.yml logs postgres
```

Look for:
- ✅ "FastAPI startup complete"
- ✅ "Database initialized"
- ✅ No error messages

### Step 6: Test Endpoints

#### A. Frontend Tests

**1. Health Check**
```bash
curl http://localhost/health
```
Expected: `healthy`

**2. Homepage**
```bash
curl http://localhost/
```
Expected: HTML content (React app)

**3. Visit in Browser**
```
http://localhost
```
Expected: See the Solar Intelligence login/signup page

#### B. Backend Tests

**1. Health Check**
```bash
curl http://localhost:8000/health
```
Expected:
```json
{
  "status": "healthy",
  "environment": "production",
  "version": "2.0.0",
  "database": "connected",
  "app": "fastapi"
}
```

**2. Root Endpoint**
```bash
curl http://localhost:8000/
```
Expected:
```json
{
  "name": "Solar Intelligence API",
  "version": "2.0.0",
  "status": "online",
  ...
}
```

**3. API Documentation**

Visit in browser:
```
http://localhost:8000/docs
```
Expected: Swagger UI with all API endpoints

**4. OpenAPI Schema**
```bash
curl http://localhost:8000/api/v1/openapi.json
```
Expected: JSON schema

#### C. Security Headers Test

```bash
# Test CORS
curl -I -X OPTIONS http://localhost:8000/api/v1/health \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: GET"
```
Expected headers:
- `access-control-allow-origin: http://localhost`
- `access-control-allow-credentials: true`

```bash
# Test Security Headers
curl -I http://localhost/
```
Expected headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: ...`

#### D. Database Connection Test

```bash
# Execute SQL query via docker
docker exec solar-intelligence-db-prod psql -U fastapi_user_prod -d fastapi_db_prod -c "\dt"
```
Expected: List of database tables

### Step 7: Test Full User Flow

**1. Open Browser**
```
http://localhost
```

**2. Register a New User**
- Fill in registration form
- Should see success message

**3. Login**
- Use credentials from step 2
- Should redirect to dashboard/agents page

**4. Test Backend Communication**
- Navigate to agents page
- Should load available agents from backend
- Try to interact with features

**5. Check Browser Console**
- Press F12
- Go to Console tab
- Should see no CORS errors
- Should see successful API calls

**6. Check Network Tab**
- Press F12 → Network tab
- Refresh page
- Check API calls to http://localhost:8000
- All should return 200 OK (except unauthorized endpoints)

### Step 8: Performance Test

**Check Bundle Sizes**
- Open DevTools → Network tab
- Disable cache
- Reload page
- Check main bundle size (~93 KB gzipped)

**Check Response Times**
- API calls should be < 500ms
- Page load should be < 2 seconds

### Step 9: Stop the Stack

```bash
# Stop all containers
docker-compose -f docker-compose.prod.yml down

# Or stop and remove volumes (⚠️ deletes database data)
docker-compose -f docker-compose.prod.yml down -v
```

## Automated Testing Script

### For Linux/Mac:
```bash
# Make script executable
chmod +x test-docker-stack.sh

# Run tests
./test-docker-stack.sh
```

### For Windows (PowerShell):

Create `test-docker-stack.ps1`:
```powershell
# PowerShell test script
Write-Host "Testing Docker Stack..." -ForegroundColor Cyan

# Test frontend
$frontendHealth = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing
if ($frontendHealth.StatusCode -eq 200) {
    Write-Host "✓ Frontend health: PASS" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend health: FAIL" -ForegroundColor Red
}

# Test backend
$backendHealth = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
if ($backendHealth.StatusCode -eq 200) {
    Write-Host "✓ Backend health: PASS" -ForegroundColor Green
} else {
    Write-Host "✗ Backend health: FAIL" -ForegroundColor Red
}

# Test API docs
$apiDocs = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing
if ($apiDocs.StatusCode -eq 200) {
    Write-Host "✓ API docs: PASS" -ForegroundColor Green
} else {
    Write-Host "✗ API docs: FAIL" -ForegroundColor Red
}

Write-Host "`nAll tests completed!" -ForegroundColor Cyan
```

Run with:
```powershell
.\test-docker-stack.ps1
```

## Troubleshooting

### Issue: Containers not starting

**Check logs**:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

**Common causes**:
1. Port already in use → Change ports in docker-compose.prod.yml
2. Missing .env.prod → Create from .env.prod.example
3. Invalid environment variables → Check syntax

### Issue: Frontend shows 502 Bad Gateway

**Cause**: Backend not ready yet

**Solution**: Wait 30 seconds for backend to start, then refresh

### Issue: Database connection failed

**Check database logs**:
```bash
docker logs solar-intelligence-db-prod
```

**Verify database is healthy**:
```bash
docker ps  # Check health status
```

### Issue: CORS errors in browser

**Check CORS configuration**:
```bash
curl -I -X OPTIONS http://localhost:8000/api/v1/health \
  -H "Origin: http://localhost"
```

**Should see**: `access-control-allow-origin` header

### Issue: Rate limiting errors (429)

**Expected behavior**: Rate limits are working!
- Login: 5/minute
- Register: 3/hour
- Chat: 60/minute

**Solution**: Wait a minute and try again

## Monitoring Commands

### Real-time logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f fastapi-app
```

### Resource usage
```bash
docker stats
```

### Container info
```bash
docker inspect solar-intelligence-api-prod
docker inspect solar-intelligence-frontend-prod
docker inspect solar-intelligence-db-prod
```

### Network info
```bash
docker network inspect solar-network
```

### Volume info
```bash
docker volume ls
docker volume inspect postgres_data_prod
```

## Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost | React app served by Nginx |
| Backend | http://localhost:8000 | FastAPI REST API |
| API Docs | http://localhost:8000/docs | Swagger UI |
| ReDoc | http://localhost:8000/redoc | Alternative API docs |
| Database | localhost:5433 | PostgreSQL (use DB client) |

## Success Checklist

- [ ] All 3 containers running (frontend, backend, database)
- [ ] Frontend accessible at http://localhost
- [ ] Backend health check returns 200
- [ ] API docs visible at http://localhost:8000/docs
- [ ] Security headers present in responses
- [ ] CORS headers present for cross-origin requests
- [ ] Can register and login via UI
- [ ] No console errors in browser
- [ ] Database tables created automatically
- [ ] Logs show no errors

## Next Steps After Testing

Once all tests pass:

1. **AWS Deployment**: Follow `DEPLOYMENT.md`
2. **CI/CD Setup**: Create GitHub Actions workflow
3. **Monitoring**: Set up Sentry and Logfire
4. **Database Migrations**: Set up Alembic
5. **Secrets Management**: Move to AWS Secrets Manager

---

**Need Help?**
- Check `DEPLOYMENT.md` for detailed deployment guide
- Check `DOCKER_SETUP_COMPLETE.md` for architecture overview
- Review container logs for specific errors
