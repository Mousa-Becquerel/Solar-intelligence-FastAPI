# Full Production Architecture Implementation Plan

## Overview
Transform the chatbot from **4 concurrent users** to **100+ concurrent users** with true async architecture.

---

## Prerequisites Check

### Required Infrastructure
- [x] PostgreSQL database (already configured)
- [ ] Redis server (optional but recommended)
  - **Option A:** Use Redis for conversation memory (scalable, multi-server)
  - **Option B:** Keep in-memory with locks (single-server, simpler)

### Required Python Packages
```bash
# Already have:
- Flask
- gunicorn
- pydantic-ai

# Need to add:
- uvicorn[standard]  # Async ASGI server
- asyncio            # Built-in
- aiofiles           # Async file operations (if needed)
```

**For Redis option:**
```bash
- redis[hiredis]>=5.0.0
```

---

## Implementation Steps (Sequential)

### Phase 1: Core Async Infrastructure (2 hours)
**Goal:** Make agent truly async, eliminate blocking

#### Step 1.1: Create Request Context Manager
**New file:** `request_context.py`
```python
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Optional
import pandas as pd
from pydantic_weaviate_agent import MarketPlotDataResult

@dataclass
class RequestContext:
    """Isolated context for each request - no shared state"""
    conversation_id: str
    user_query: str = ""
    dataframe: Optional[pd.DataFrame] = None
    plot_result: Optional[MarketPlotDataResult] = None

request_context: ContextVar[Optional[RequestContext]] = ContextVar('request_context', default=None)
```

**Why:** Eliminates race conditions by isolating each request's state

---

#### Step 1.2: Add Async Methods to PydanticWeaviateAgent
**File:** `pydantic_weaviate_agent.py`

**Changes:**
1. Add async lock for conversation memory
2. Create `async def process_query_async()` - truly async version
3. Replace `self.last_*` with `request_context.get()`
4. Make conversation memory access thread-safe

**Pseudocode:**
```python
import asyncio
from request_context import request_context, RequestContext

class PydanticWeaviateAgent:
    def __init__(self):
        self.conversation_memory: Dict[str, List[ModelMessage]] = {}
        self.memory_lock = asyncio.Lock()  # NEW: Thread-safe access

    async def process_query_async(self, user_message: str, conversation_id: str = None):
        """Non-blocking async query processing"""

        # Create isolated request context
        ctx = RequestContext(
            conversation_id=conversation_id,
            user_query=user_message
        )
        request_context.set(ctx)

        # Thread-safe memory read
        message_history = []
        if conversation_id:
            async with self.memory_lock:
                if conversation_id in self.conversation_memory:
                    message_history = self.conversation_memory[conversation_id].copy()

        # ✅ Direct await - no blocking!
        result = await self.data_analysis_agent.run(
            user_message,
            message_history=message_history,
            usage_limits=UsageLimits(request_limit=10, total_tokens_limit=20000)
        )

        # Thread-safe memory write
        if conversation_id:
            async with self.memory_lock:
                self.conversation_memory[conversation_id] = filter_large_tool_returns(
                    result.all_messages(), max_content_length=500
                )

        return self._process_result(result, ctx)

    def _process_result(self, result, ctx: RequestContext):
        """Process result using request context instead of self.last_*"""
        # Use ctx.user_query instead of self.last_user_query
        # Use ctx.dataframe instead of self.last_dataframe
        # Use ctx.plot_result instead of self.last_market_plot_data_result
        ...
```

**Why:** Eliminates blocking `run_until_complete()` calls

---

#### Step 1.3: Update All Tools to Use Request Context
**File:** `pydantic_weaviate_agent.py`

**Changes in tools:**
```python
# BEFORE (shared state - race conditions)
def get_market_plot_data_output(...):
    self.last_user_query = user_query  # ❌ Shared
    self.last_market_plot_data_result = result  # ❌ Shared

# AFTER (isolated state - thread-safe)
def get_market_plot_data_output(...):
    ctx = request_context.get()
    ctx.user_query = user_query  # ✅ Request-scoped
    ctx.plot_result = result  # ✅ Request-scoped
```

**Files affected:**
- `get_market_plot_data_output()` - Use ctx for plot results
- `_generate_stacked_plot()` - Use ctx.user_query instead of self.last_user_query
- `_generate_pie_plot()` - Use ctx.user_query instead of self.last_user_query
- Result processing logic - Use ctx.plot_result instead of self.last_market_plot_data_result

**Why:** Each request gets isolated state, no interference

---

### Phase 2: Async Flask Endpoints (1 hour)
**Goal:** Make Flask fully async

#### Step 2.1: Convert Chat Endpoint to Async
**File:** `app.py`

**Changes:**
```python
# BEFORE (blocking)
@app.route('/chat', methods=['POST'])
@login_required
@limiter.limit("30 per minute")
def chat():
    # ... validation ...

    # ❌ Blocks thread
    agent_result = pydantic_agent.process_query(user_message, conversation_id=str(conv_id))

    # ... process result ...

# AFTER (non-blocking)
@app.route('/chat', methods=['POST'])
@login_required
@limiter.limit("30 per minute")
async def chat():
    # ... validation ...

    # ✅ Releases thread while waiting
    agent_result = await pydantic_agent.process_query_async(user_message, conversation_id=str(conv_id))

    # ... process result ...
```

**Why:** Thread can handle other requests while waiting for LLM

---

#### Step 2.2: Handle Flask-Login with Async
**File:** `app.py`

**Issue:** `@login_required` decorator is sync
**Solution:** Create async wrapper

```python
from functools import wraps
from flask_login import current_user

def async_login_required(f):
    @wraps(f)
    async def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('login'))
        return await f(*args, **kwargs)
    return decorated_function

# Use it:
@app.route('/chat', methods=['POST'])
@async_login_required  # Instead of @login_required
async def chat():
    ...
```

---

### Phase 3: Async ASGI Server (30 mins)
**Goal:** Run Flask with async-capable server

#### Step 3.1: Update Gunicorn Config
**File:** `scripts/deployment/gunicorn.conf.py`

**Changes:**
```python
# BEFORE
workers = 1
worker_class = "gthread"
threads = 4
# = 4 concurrent requests

# AFTER
workers = 4                                      # Multiple processes
worker_class = "uvicorn.workers.UvicornWorker"  # Async worker
threads = 8                                      # Threads per worker
# = 32+ concurrent async requests (can handle 100s due to non-blocking)
```

**Why:** Uvicorn is ASGI-compatible, supports async/await natively

---

#### Step 3.2: Update Requirements
**File:** `pyproject.toml` or `requirements.txt`

**Add:**
```toml
[tool.poetry.dependencies]
uvicorn = {extras = ["standard"], version = "^0.24.0"}
```

Or in `requirements.txt`:
```
uvicorn[standard]>=0.24.0
```

---

### Phase 4: Redis Integration (Optional - 1 hour)
**Goal:** Move conversation memory to Redis for multi-server scaling

#### Step 4.1: Add Redis Client
**File:** `pydantic_weaviate_agent.py`

```python
import redis.asyncio as redis
import json

class PydanticWeaviateAgent:
    def __init__(self):
        # If Redis URL provided, use Redis; otherwise use in-memory dict
        redis_url = os.getenv('REDIS_URL')
        if redis_url:
            self.redis = redis.from_url(redis_url)
            self.use_redis = True
        else:
            self.conversation_memory = {}
            self.memory_lock = asyncio.Lock()
            self.use_redis = False

    async def _get_conversation_memory(self, conversation_id: str):
        if self.use_redis:
            data = await self.redis.get(f"conv:{conversation_id}")
            return json.loads(data) if data else []
        else:
            async with self.memory_lock:
                return self.conversation_memory.get(conversation_id, [])

    async def _set_conversation_memory(self, conversation_id: str, messages):
        if self.use_redis:
            await self.redis.setex(
                f"conv:{conversation_id}",
                3600,  # 1 hour TTL
                json.dumps(messages)
            )
        else:
            async with self.memory_lock:
                self.conversation_memory[conversation_id] = messages
```

**Environment variable:**
```bash
# .env
REDIS_URL=redis://localhost:6379  # Optional
```

**Why:**
- Allows multiple servers to share conversation state
- Automatic memory cleanup (TTL)
- Can scale horizontally

---

### Phase 5: Testing & Validation (1 hour)

#### Step 5.1: Unit Tests
**New file:** `tests/test_concurrent_users.py`

```python
import asyncio
import pytest
from app import app

@pytest.mark.asyncio
async def test_concurrent_users():
    """Test 10 users sending requests simultaneously"""
    async with app.test_client() as client:
        tasks = []
        for i in range(10):
            task = client.post('/chat', json={
                'message': f'User {i} query',
                'conversation_id': i
            })
            tasks.append(task)

        # All execute concurrently
        responses = await asyncio.gather(*tasks)

        # Verify all succeeded
        for resp in responses:
            assert resp.status_code == 200
```

---

#### Step 5.2: Load Testing
**New file:** `scripts/load_test.py`

```python
import asyncio
import aiohttp
import time

async def simulate_user(session, user_id):
    start = time.time()
    async with session.post('http://localhost:5000/chat', json={
        'message': f'Show me China market data',
        'conversation_id': user_id
    }) as resp:
        duration = time.time() - start
        print(f"User {user_id}: {resp.status} in {duration:.2f}s")

async def main():
    async with aiohttp.ClientSession() as session:
        # Simulate 50 concurrent users
        tasks = [simulate_user(session, i) for i in range(50)]
        await asyncio.gather(*tasks)

asyncio.run(main())
```

**Expected result:**
- Before: Users 5-50 wait in queue (sequential processing)
- After: All 50 users get responses concurrently (~same time)

---

## Implementation Order (Recommended)

### Step-by-Step Execution

1. **Create request_context.py** (5 min)
2. **Add async lock to PydanticWeaviateAgent** (10 min)
3. **Create process_query_async() method** (30 min)
4. **Update tools to use request context** (45 min)
5. **Convert app.py chat endpoint to async** (20 min)
6. **Create async_login_required decorator** (10 min)
7. **Update gunicorn.conf.py** (5 min)
8. **Add uvicorn to requirements** (5 min)
9. **Test with load_test.py** (15 min)
10. **Optional: Add Redis** (60 min)

**Total: ~3-4 hours** (without Redis)
**With Redis: ~4-5 hours**

---

## Files Modified Summary

### New Files (3)
- `request_context.py` - Request isolation
- `tests/test_concurrent_users.py` - Unit tests
- `scripts/load_test.py` - Load testing

### Modified Files (3)
- `pydantic_weaviate_agent.py` - Async methods, request context
- `app.py` - Async endpoints
- `scripts/deployment/gunicorn.conf.py` - Async workers
- `pyproject.toml` / `requirements.txt` - Dependencies

### Configuration (1)
- `.env` - Add REDIS_URL (optional)

---

## Rollback Plan

If something breaks:

1. **Keep old sync method:** `process_query()` stays unchanged as fallback
2. **Feature flag:** Use env var to toggle async
   ```python
   USE_ASYNC = os.getenv('USE_ASYNC_AGENT', 'false').lower() == 'true'
   ```
3. **Git branch:** Do all work in `feature/async-architecture` branch
4. **Gradual rollout:** Test in staging first

---

## Expected Results

### Before (Current)
```
Concurrent users: 4
User experience: User 2-4 wait for User 1
Throughput: 4 requests / 30 seconds = 0.13 req/s
```

### After (Phase 1-3: Async + Workers)
```
Concurrent users: 100+
User experience: All users get immediate responses
Throughput: 32 concurrent async = ~10 req/s
```

### After (Phase 4: Redis)
```
Concurrent users: Unlimited (horizontal scaling)
User experience: Instant responses under any load
Throughput: Limited only by server count
Can deploy: Multiple servers behind load balancer
```

---

## Risk Assessment

### Low Risk ✅
- Adding new async methods (old sync methods still work)
- Adding request context (opt-in usage)
- Increasing workers (can revert config)

### Medium Risk ⚠️
- Converting Flask endpoints to async (test thoroughly)
- Thread safety with locks (need good testing)

### High Risk (Mitigated) 🔴
- Redis integration (optional, fallback to in-memory)
- Breaking existing functionality (keep old methods as fallback)

**Mitigation:** Implement in feature branch, test extensively before merging

---

## Questions Before We Start

1. **Do you have Redis available?**
   - Yes → We'll use Redis for conversation memory (best scaling)
   - No → We'll use in-memory with locks (works great for single server)

2. **Can we test in staging first?**
   - Yes → Safer rollout
   - No → We'll add feature flags for safe production deploy

3. **Current deployment platform?**
   - Docker → Easy to add Redis container
   - Render/Heroku → Can add Redis addon
   - VPS → Need to install Redis

4. **Acceptable downtime for deployment?**
   - We can do zero-downtime with feature flags
   - Or quick restart (~30 seconds) to activate changes
