# Stateless Session Migration Guide

## Overview

Migrating from **stateful SQLiteSession** to **stateless PostgreSQL sessions** for horizontal scalability and container restart resilience.

## Benefits

✅ **Stateless Architecture**: Any FastAPI container can handle any request
✅ **Container Restart Safe**: Sessions persist in PostgreSQL, not local files
✅ **Horizontally Scalable**: Run 3+ FastAPI instances behind load balancer
✅ **Easy Redis Migration**: Change one environment variable to switch to Redis
✅ **No File Management**: No SQLite `.db` files to manage or backup

---

## Architecture Changes

### Current (Stateful)
```
Request → FastAPI Container → SQLite File (.db) → In-memory cache
Problem: Container restart = lost sessions, can't scale horizontally
```

### New (Stateless)
```
Request → Any FastAPI Container → Shared PostgreSQL → Session data
Benefit: Container restart safe, horizontally scalable
```

---

## Step 1: Install Dependencies

Add to `requirements-fastapi.txt`:
```txt
# OpenAI Agents with SQLAlchemy support
openai-agents-sdk[sqlalchemy]
asyncpg
```

Or for Redis (future):
```txt
openai-agents-sdk[redis]
redis
```

---

## Step 2: Update Agent Files

### Pattern to Replace

**OLD (Stateful)**:
```python
from agents import Agent, Runner, SQLiteSession

class MyAgent:
    def __init__(self):
        self.conversation_sessions = {}  # In-memory cache

    async def analyze_stream(self, query, conversation_id=None):
        session = None
        if conversation_id:
            if conversation_id not in self.conversation_sessions:
                session_id = f"agent_{conversation_id}"
                self.conversation_sessions[conversation_id] = SQLiteSession(
                    session_id=session_id
                )
            session = self.conversation_sessions[conversation_id]

        result = Runner.run_streamed(self.agent, query, session=session)
```

**NEW (Stateless)**:
```python
from agents import Agent, Runner
from fastapi_app.utils.session_factory import create_agent_session

class MyAgent:
    def __init__(self):
        # No more in-memory session cache needed
        pass

    async def analyze_stream(self, query, conversation_id=None):
        session = None
        if conversation_id:
            # Create stateless session (no caching)
            session = create_agent_session(conversation_id)

        result = Runner.run_streamed(self.agent, query, session=session)
```

---

## Step 3: Update Each Agent File

Apply the pattern above to these files:

### 1. **news_agent.py**
- Line 19: Remove `SQLiteSession` from imports
- Line 19: Add `from fastapi_app.utils.session_factory import create_agent_session`
- Remove: `self.conversation_sessions = {}` from `__init__`
- Lines 274-281: Replace SQLiteSession creation with `create_agent_session(conversation_id)`
- Lines 345-352: Same replacement in `analyze` method

### 2. **market_intelligence_agent.py**
- Line 29: Remove `SQLiteSession` from imports
- Add: `from fastapi_app.utils.session_factory import create_agent_session`
- Remove: `self.conversation_sessions = {}` from `__init__`
- Lines 1006-1013: Replace with `create_agent_session(conversation_id)`
- Lines 1153-1160: Same replacement

### 3. **digitalization_trend_agent.py**
- Line 19: Remove `SQLiteSession` from imports
- Add: `from fastapi_app.utils.session_factory import create_agent_session`
- Remove: `self.conversation_sessions = {}` from `__init__`
- Lines 180-187: Replace with `create_agent_session(conversation_id)`
- Lines 246-253: Same replacement

### 4. **manufacturer_financial_agent.py**
- Line 19: Remove `SQLiteSession` from imports
- Add: `from fastapi_app.utils.session_factory import create_agent_session`
- Remove: `self.conversation_sessions = {}` from `__init__`
- Lines 237-244: Replace with `create_agent_session(conversation_id)`
- Lines 303-310: Same replacement

### 5. **nzia_policy_agent.py**
- Line 19: Remove `SQLiteSession` from imports
- Add: `from fastapi_app.utils.session_factory import create_agent_session`
- Remove: `self.conversation_sessions = {}` from `__init__`
- Lines 198-205: Replace with `create_agent_session(conversation_id)`
- Lines 264-271: Same replacement

### 6. **nzia_market_impact_agent.py**
- Line 19: Remove `SQLiteSession` from imports
- Add: `from fastapi_app.utils.session_factory import create_agent_session`
- Remove: `self.conversation_sessions = {}` from `__init__`
- Lines 214-221: Replace with `create_agent_session(conversation_id)`
- Lines 280-287: Same replacement

---

## Step 4: Update Docker Compose (Optional - Future Redis)

Add Redis service to `docker-compose.fastapi.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes
    restart: unless-stopped

  fastapi-app:
    # ... existing config ...
    environment:
      # ... existing vars ...
      - SESSION_BACKEND=postgresql  # or 'redis' for Redis
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      postgres-db:
        condition: service_healthy
      # redis:  # Uncomment when using Redis
      #   condition: service_healthy

volumes:
  redis_data:  # Add this
    driver: local
```

---

## Step 5: Test Migration

### 1. Build and restart containers:
```bash
docker-compose -f docker-compose.fastapi.yml down
docker-compose -f docker-compose.fastapi.yml up -d --build
```

### 2. Test conversation continuity:
1. Start a conversation
2. Ask a question
3. Restart container: `docker-compose -f docker-compose.fastapi.yml restart fastapi-app`
4. Continue conversation (should remember context)

### 3. Check session storage:
```bash
# Connect to PostgreSQL
docker exec -it <postgres-container> psql -U solar_admin -d solar_intelligence_fastapi

# Check if session tables exist
\dt

# Should see tables like: agents_session_*
```

---

## Step 6: Migrate to Redis (Future)

When you need better performance or auto-expiration:

1. Add Redis to docker-compose (see Step 4)
2. Install dependencies: `pip install 'agents[redis]' redis`
3. Set environment variable: `SESSION_BACKEND=redis`
4. Restart containers

**That's it!** The `session_factory.py` handles the switch automatically.

---

## Migration Checklist

- [ ] Install dependencies (`asyncpg`, `openai-agents-sdk[sqlalchemy]`)
- [ ] Update `news_agent.py` (remove SQLiteSession, add create_agent_session)
- [ ] Update `market_intelligence_agent.py`
- [ ] Update `digitalization_trend_agent.py`
- [ ] Update `manufacturer_financial_agent.py`
- [ ] Update `nzia_policy_agent.py`
- [ ] Update `nzia_market_impact_agent.py`
- [ ] Rebuild Docker containers
- [ ] Test conversation continuity after container restart
- [ ] Verify sessions stored in PostgreSQL
- [ ] (Optional) Add Redis for future migration

---

## Rollback Plan

If issues occur, revert changes:

1. Restore original agent files from git:
   ```bash
   git checkout news_agent.py market_intelligence_agent.py ...
   ```

2. Rebuild containers:
   ```bash
   docker-compose -f docker-compose.fastapi.yml up -d --build
   ```

---

## Performance Comparison

| Metric | SQLite (Stateful) | PostgreSQL (Stateless) | Redis (Stateless) |
|--------|-------------------|------------------------|-------------------|
| Latency | ~1ms | ~5-10ms | ~1-2ms |
| Scalability | Single instance | Horizontal | Horizontal |
| Restart Safe | ❌ | ✅ | ✅ |
| TTL Support | ❌ | ❌ | ✅ (native) |
| File Management | Required | Not needed | Not needed |

---

## Next Steps

1. **Test with PostgreSQL** (this migration)
2. **Monitor performance** (check for any latency issues)
3. **Scale horizontally** (add more FastAPI containers)
4. **Migrate to Redis** (if you need TTL or sub-5ms latency)

---

## Questions?

- PostgreSQL sessions: Persistent, ACID-compliant, good for production
- Redis sessions: Faster, auto-expiration (TTL), better for high-traffic

**Recommendation**: Start with PostgreSQL (you already have it), migrate to Redis only if you need:
- Sub-5ms session latency
- Auto-expiring sessions (GDPR compliance)
- 1000+ requests/second

---

## Summary

**What changed**: SQLiteSession (local files) → SQLAlchemySession (shared PostgreSQL)
**Why**: Stateless architecture enables horizontal scaling and container restart safety
**Future**: Easy migration to Redis by changing one environment variable
**Impact**: Minimal code changes, major architectural improvement
