# Agent Memory/Context Issue

## Problem Description

The Market Intelligence Agent is showing incorrect conversation history when users ask "What did I ask before?". Instead of showing actual previous questions, it's showing a formatted list or just repeating the current question.

## Root Cause

**Dual Memory System Mismatch:**

1. **FastAPI Backend** stores conversation messages in **PostgreSQL**
   - Table: `fastapi_messages`
   - Stores ALL user and bot messages
   - Persistent across sessions

2. **Market Intelligence Agent** uses **SQLiteSession** (OpenAI Agents SDK)
   - Stores conversation history in **separate SQLite file**
   - Per-conversation sessions stored in memory (`self.conversation_sessions`)
   - **NOT synchronized with PostgreSQL**

### The Flow Problem

```
User sends "Hi" → PostgreSQL ✅ | SQLiteSession ✅
Bot responds    → PostgreSQL ✅ | SQLiteSession ✅

User sends "Who are you?" → PostgreSQL ✅ | SQLiteSession ✅
Bot responds               → PostgreSQL ✅ | SQLiteSession ✅

User sends "What did I ask before?" → PostgreSQL ✅ | SQLiteSession ?
```

The agent's SQLiteSession may:
- Have incomplete history (if agent was restarted)
- Have different message formatting
- Be out of sync with PostgreSQL

## Evidence from Code

### PostgreSQL Storage
[chat_processing_service.py:492-498](fastapi_app/services/chat_processing_service.py#L492-L498):
```python
bot_msg = Message(
    conversation_id=conv_id,
    sender='bot',
    content=json.dumps(content_to_save)
)
db.add(bot_msg)
await db.commit()
```

### SQLiteSession Usage
[market_intelligence_agent.py:1153-1160](market_intelligence_agent.py#L1153-L1160):
```python
if conversation_id not in self.conversation_sessions:
    session_id = f"market_intel_{conversation_id}"
    self.conversation_sessions[conversation_id] = SQLiteSession(
        session_id=session_id
    )

session = self.conversation_sessions[conversation_id]
```

## Why This is a Problem

1. **Agent restarts** → SQLiteSession memory lost, but PostgreSQL has full history
2. **Multi-agent conversations** → Each agent may have different session data
3. **No synchronization** → PostgreSQL and SQLiteSession drift apart
4. **Memory queries fail** → Agent can't access full conversation history

## Solutions

### Option 1: Load PostgreSQL History into SQLiteSession (RECOMMENDED)

Before calling the agent, load the conversation history from PostgreSQL and populate the SQLiteSession.

**Implementation:**
```python
async def process_market_intelligence_agent_stream(
    db: AsyncSession,
    user_message: str,
    conv_id: int
) -> AsyncGenerator[str, None]:
    market_intelligence_agent = get_market_intelligence_agent_instance()

    # NEW: Load conversation history from PostgreSQL
    history = await AgentService.format_conversation_history_for_agent(db, conv_id)

    # NEW: Initialize or update SQLiteSession with history
    session = market_intelligence_agent.get_or_create_session(str(conv_id))
    await market_intelligence_agent.sync_session_with_history(session, history)

    # Continue with agent processing...
    async for chunk in market_intelligence_agent.analyze_stream(...):
        yield chunk
```

**Pros:**
- Preserves existing agent architecture
- Works with agent restarts
- Full conversation history available

**Cons:**
- Requires modifying `market_intelligence_agent.py`
- Need to implement `sync_session_with_history()` method
- May have performance impact for long conversations

### Option 2: Custom Memory Implementation

Replace SQLiteSession with a custom memory class that reads directly from PostgreSQL.

**Pros:**
- Single source of truth (PostgreSQL)
- No synchronization needed
- Works across agent restarts

**Cons:**
- Requires significant refactoring
- May not work with OpenAI Agents SDK patterns
- More complex implementation

### Option 3: Store Everything in SQLiteSession Only

Remove PostgreSQL message storage and only use SQLiteSession.

**Pros:**
- Simple, single memory system
- Agent has full control

**Cons:**
- **NOT recommended for production**
- Lose message persistence across restarts
- Can't query conversation history from database
- Breaks existing backend architecture

## Recommended Approach

**Implement Option 1** with the following steps:

### Step 1: Add sync method to Market Intelligence Agent

```python
# In market_intelligence_agent.py

async def sync_session_with_history(
    self,
    session: SQLiteSession,
    history: List[Dict[str, str]]
):
    """
    Sync SQLiteSession with PostgreSQL conversation history

    Args:
        session: SQLiteSession to update
        history: List of messages from PostgreSQL [{role, content}, ...]
    """
    # Check if session is empty or needs update
    # Add missing messages to session
    # Implementation depends on SQLiteSession API
    pass
```

### Step 2: Update chat processing service

```python
# In fastapi_app/services/chat_processing_service.py

async def process_market_intelligence_agent_stream(...):
    # Get agent instance
    market_intelligence_agent = get_market_intelligence_agent_instance()

    # Load conversation history from PostgreSQL
    from fastapi_app.services.agent_service import AgentService
    history = await AgentService.format_conversation_history_for_agent(
        db, conv_id, limit=50
    )

    # Get or create session
    session = market_intelligence_agent.get_or_create_session(str(conv_id))

    # Sync session with PostgreSQL history
    await market_intelligence_agent.sync_session_with_history(session, history)

    # Continue with streaming...
```

### Step 3: Test

1. Start new conversation
2. Ask several questions
3. Restart FastAPI container (clears SQLiteSession memory)
4. Ask "What did I ask before?"
5. Verify agent shows correct history from PostgreSQL

## Current Workaround

Until this is fixed, users will experience:
- Incomplete conversation history after agent restarts
- "Conversation Record" responses instead of natural answers
- Repeated or missing context in multi-turn conversations

## Files to Modify

1. **[market_intelligence_agent.py](market_intelligence_agent.py)**
   - Add `sync_session_with_history()` method
   - Add `get_or_create_session()` helper
   - Test with conversation history injection

2. **[fastapi_app/services/chat_processing_service.py](fastapi_app/services/chat_processing_service.py#L387-L500)**
   - Update `process_market_intelligence_agent_stream()`
   - Load and sync history before calling agent

3. **Other agents** (if they also use SQLiteSession):
   - `news_agent.py`
   - `nzia_policy_agent.py`
   - `manufacturer_financial_agent.py`
   - `nzia_market_impact_agent.py`
   - `digitalization_trend_agent.py`

## Related Issues

- Agent access 403 errors → FIXED (agent_access configuration)
- Registration page missing fields → FIXED
- Agents page styling → FIXED
- **Agent memory/context** → THIS ISSUE

## Next Steps

1. Investigate SQLiteSession API to understand how to inject messages
2. Implement `sync_session_with_history()` in market_intelligence_agent.py
3. Test with conversation history synchronization
4. Apply same fix to other agents using SQLiteSession
5. Add automated tests for memory synchronization
