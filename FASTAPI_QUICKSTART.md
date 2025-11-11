# FastAPI Quick Start Guide

## Overview

This guide helps you run the new FastAPI version **in parallel** with your existing Flask app in Docker.

**Key Points:**
- ✅ Flask app runs on port **5000** (unchanged)
- ✅ FastAPI app runs on port **8000** (new)
- ✅ **Separate databases** - no interference
- ✅ Both apps can run simultaneously

---

## Prerequisites

- Docker & Docker Compose installed
- `.env` file configured (reuses existing)
- Poetry installed (optional, Docker handles it)

---

## Quick Start (Docker)

### 1. Build and Start Both Apps

```bash
# Start both Flask and FastAPI
docker-compose -f docker-compose.fastapi.yml up --build

# Or run in detached mode
docker-compose -f docker-compose.fastapi.yml up -d --build
```

### 2. Access the Applications

**FastAPI** (New):
- API Documentation: http://localhost:8000/docs (Swagger UI)
- Alternative Docs: http://localhost:8000/redoc
- Health Check: http://localhost:8000/health
- Root Endpoint: http://localhost:8000/

**Flask** (Existing):
- Web Interface: http://localhost:5000/
- Health Check: http://localhost:5000/health

### 3. Stop the Applications

```bash
# Stop all services
docker-compose -f docker-compose.fastapi.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.fastapi.yml down -v
```

---

## Testing FastAPI

### Step 1: Check Health

```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "environment": "development",
  "version": "2.0.0-alpha",
  "database": "connected",
  "app": "fastapi"
}
```

### Step 2: Register a Test User

Open http://localhost:8000/docs and:

1. Find `POST /api/v1/auth/register`
2. Click "Try it out"
3. Enter test data:
   ```json
   {
     "username": "test@example.com",
     "password": "TestPass123!",
     "full_name": "Test User"
   }
   ```
4. Click "Execute"

**Or use curl:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@example.com",
    "password": "TestPass123!",
    "full_name": "Test User"
  }'
```

### Step 3: Login and Get JWT Token

1. Find `POST /api/v1/auth/login` in docs
2. Click "Try it out"
3. Enter:
   - **username**: `test@example.com`
   - **password**: `TestPass123!`
4. Click "Execute"

**Or use curl:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=TestPass123!"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Step 4: Test Protected Endpoint

1. Copy the `access_token` from login response
2. Click the "Authorize" button at top of Swagger UI
3. Paste token (without "Bearer" prefix)
4. Click "Authorize"
5. Try `GET /api/v1/auth/me`

**Or use curl:**
```bash
TOKEN="your_token_here"
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Database Isolation

### Flask Database
- **Host**: `postgres-flask:5432` (internal) / `localhost:5432` (external)
- **Database**: `solar_intelligence_flask`
- **Tables**: Existing production tables

### FastAPI Database
- **Host**: `postgres-fastapi:5432` (internal) / `localhost:5433` (external)
- **Database**: `solar_intelligence_fastapi`
- **Tables**: `fastapi_users`, `fastapi_conversations`, `fastapi_messages`

**Note**: Different table names prevent any conflicts!

---

## Development Workflow

### 1. Local Development (Without Docker)

```bash
# Install dependencies
poetry install --no-root -C . --with dev

# Or use the fastapi pyproject
poetry install --no-root --project pyproject-fastapi.toml

# Run FastAPI locally
python -m uvicorn fastapi_app.main:app --reload --port 8000
```

### 2. View Logs

```bash
# All services
docker-compose -f docker-compose.fastapi.yml logs -f

# Just FastAPI
docker-compose -f docker-compose.fastapi.yml logs -f fastapi-app

# Just Flask
docker-compose -f docker-compose.fastapi.yml logs -f flask-app
```

### 3. Restart a Service

```bash
# Restart FastAPI after code changes
docker-compose -f docker-compose.fastapi.yml restart fastapi-app

# Rebuild FastAPI after dependency changes
docker-compose -f docker-compose.fastapi.yml up -d --build fastapi-app
```

### 4. Access Database

```bash
# FastAPI database
docker exec -it $(docker ps -qf "name=postgres-fastapi") \
  psql -U solar_admin -d solar_intelligence_fastapi

# Flask database
docker exec -it $(docker ps -qf "name=postgres-flask") \
  psql -U solar_admin -d solar_intelligence_flask
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│          Docker Network                 │
│                                         │
│  ┌──────────────┐    ┌──────────────┐ │
│  │  Flask App   │    │ FastAPI App  │ │
│  │  Port: 5000  │    │  Port: 8000  │ │
│  └──────┬───────┘    └──────┬───────┘ │
│         │                   │          │
│         ↓                   ↓          │
│  ┌──────────────┐    ┌──────────────┐ │
│  │ PostgreSQL   │    │ PostgreSQL   │ │
│  │ :5432 (5432) │    │ :5432 (5433) │ │
│  │ flask DB     │    │ fastapi DB   │ │
│  └──────────────┘    └──────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 8000
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows

# Stop conflicting service or change port in docker-compose
```

### Database Connection Failed

```bash
# Check if PostgreSQL is healthy
docker-compose -f docker-compose.fastapi.yml ps

# Restart database
docker-compose -f docker-compose.fastapi.yml restart postgres-fastapi

# Check logs
docker-compose -f docker-compose.fastapi.yml logs postgres-fastapi
```

### Import Errors

```bash
# Rebuild container
docker-compose -f docker-compose.fastapi.yml up -d --build fastapi-app

# Check if dependencies installed
docker exec -it $(docker ps -qf "name=fastapi-app") poetry show
```

---

## Next Steps

1. ✅ **Phase 0 Complete** - FastAPI running in Docker
2. 🔄 **Phase 1** - Convert first service to async
3. 🔄 **Phase 2** - Implement agent endpoints
4. 🔄 **Phase 3** - Add WebSocket streaming
5. 🔄 **Phase 4** - Build React frontend

---

## Key Files

```
fastapi_app/
├── main.py                    # FastAPI entry point
├── core/
│   ├── config.py             # Configuration
│   └── deps.py               # Dependency injection
├── api/v1/
│   ├── router.py             # API router
│   └── endpoints/
│       ├── auth.py           # Authentication
│       ├── agents.py         # Agent operations
│       └── chat.py           # Chat/query
└── db/
    ├── session.py            # Async database session
    └── models.py             # Database models

docker-compose.fastapi.yml    # Docker composition
Dockerfile.fastapi            # FastAPI container
pyproject-fastapi.toml        # Poetry dependencies
```

---

## Success Criteria

✅ Both apps running simultaneously
✅ Swagger UI accessible at `/docs`
✅ User registration working
✅ JWT authentication working
✅ Protected endpoints requiring auth
✅ Isolated databases (no conflicts)
✅ Health checks passing

**Status**: 🟢 Ready for Phase 1 (Service Migration)
