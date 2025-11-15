# Multi-Agent Memory Isolation Implementation

## Problem
In multi-agent conversations, when a user switches from one agent (e.g., Nova/Digitalization) to another (e.g., Aniza/NZIA Policy) within the same conversation, the second agent was able to see all the messages from the first agent in its conversation history. This creates a confusing experience where agents respond based on context they shouldn't have access to.

## Solution
Implemented **per-agent session isolation** by scoping the conversation_id with the agent_type when creating agent sessions.

**Bug Fix (2025-11-14)**: Initially, 4 out of 6 agents were not passing the `agent_type` parameter when creating sessions, causing session isolation to fail. This was fixed by ensuring all agents pass their `agent_type` to `create_agent_session()`.

### How It Works

1. **Scoped Conversation IDs**: When creating a session for an agent, the `conversation_id` is scoped with the `agent_type`:
   - Original conversation_id: `"123"`
   - Nova's (Digitalization) session ID: `"123_digitalization"`
   - Aniza's (NZIA Policy) session ID: `"123_nzia_policy"`

2. **Isolated Session Storage**: Each agent maintains its own isolated session in the PostgreSQL session store, managed by the OpenAI Agents SDK's SQLAlchemySession.

3. **Message Visibility**: Each agent only sees:
   - All user messages (stored in `fastapi_messages` table with `agent_type` field)
   - Only their own bot messages (from their isolated session)

### Implementation Details

#### 1. Updated Session Factory ([fastapi_app/utils/session_factory.py](../fastapi_app/utils/session_factory.py))

```python
def create_agent_session(conversation_id: str, agent_type: Optional[str] = None, ttl: Optional[int] = None):
    """
    Create a stateless session for OpenAI Agents with agent isolation.

    In multi-agent conversations, each agent gets an isolated session by
    scoping the conversation_id with the agent_type (e.g., "123_market").
    This ensures agents only see their own previous messages.
    """
    # Scope conversation_id by agent_type for multi-agent isolation
    scoped_conversation_id = f"{conversation_id}_{agent_type}" if agent_type else conversation_id

    # Create session with scoped ID
    return SQLAlchemySession.from_url(
        scoped_conversation_id,  # Uses scoped ID instead of raw conversation_id
        url=DATABASE_URL,
        create_tables=True
    )
```

#### 2. Updated All Agent Files

All 6 agents now pass their `agent_type` when creating sessions:

- **digitalization_trend_agent.py**:
  ```python
  session = create_agent_session(conversation_id, agent_type='digitalization')
  ```

- **market_intelligence_agent.py**:
  ```python
  session = create_agent_session(conversation_id, agent_type='market')
  ```

- **manufacturer_financial_agent.py**:
  ```python
  session = create_agent_session(conversation_id, agent_type='manufacturer_financial')
  ```

- **nzia_policy_agent.py**:
  ```python
  session = create_agent_session(conversation_id, agent_type='nzia_policy')
  ```

- **news_agent.py**:
  ```python
  session = create_agent_session(conversation_id, agent_type='news')
  ```

- **nzia_market_impact_agent.py**:
  ```python
  session = create_agent_session(conversation_id, agent_type='nzia_market_impact')
  ```

### Database Structure

#### Session Tables (OpenAI Agents SDK)
The OpenAI Agents SDK creates its own tables to store session data:
- Session ID format: `{conversation_id}_{agent_type}` (e.g., `"123_digitalization"`)
- Each agent has completely isolated session storage

#### Message Tables (FastAPI)
The `fastapi_messages` table tracks which agent sent each message:
```sql
CREATE TABLE fastapi_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    sender VARCHAR(16),  -- 'user' or 'bot'
    content TEXT,
    agent_type VARCHAR(50),  -- NEW: Which agent sent this message
    timestamp TIMESTAMP DEFAULT NOW()
);
```

### Benefits

1. **Clean Agent Memory**: Each agent only knows about its own conversation with the user
2. **No Cross-Contamination**: Agents can't accidentally respond based on other agents' context
3. **Preserved User Messages**: All user messages are still visible to all agents (as they should be)
4. **Backward Compatible**: Existing conversations continue to work (agent_type defaults to None for legacy sessions)

### Example Scenario

**User's conversation (ID: 123)**:
1. User asks Nova (Digitalization): "Tell me about AI in solar panels"
2. Nova responds with AI insights (stored in session `"123_digitalization"`)
3. User switches to Aniza (NZIA Policy): "What are the NZIA requirements?"
4. Aniza responds based ONLY on:
   - User's messages (from `fastapi_messages` where `conversation_id=123`)
   - Aniza's own previous messages (from session `"123_nzia_policy"`)
   - **NOT** Nova's messages (isolated in session `"123_digitalization"`)

### Testing

To test the implementation:
1. Start a conversation with Nova (Digitalization agent)
2. Ask several questions to Nova
3. Switch to Aniza (NZIA Policy agent) in the same conversation
4. Ask Aniza a question - verify she doesn't reference Nova's responses
5. Switch back to Nova - verify Nova still has access to her previous context

### Deployment

The changes are automatically deployed when the FastAPI container restarts:
```bash
docker-compose -f docker-compose.fastapi.yml restart fastapi-app
```

All agent files and the session factory are volume-mapped, so changes are immediately reflected in the running container.

## Related Files

- [fastapi_app/utils/session_factory.py](../fastapi_app/utils/session_factory.py) - Session creation with scoping
- [fastapi_app/db/models.py](../fastapi_app/db/models.py) - Message model with agent_type
- [fastapi_app/services/agent_service.py](../fastapi_app/services/agent_service.py) - Agent service utilities
- All agent files: digitalization_trend_agent.py, market_intelligence_agent.py, etc.

## Migration Notes

- **No database migration required** - session scoping is handled in-memory
- **Backward compatible** - existing sessions continue to work
- **New conversations** automatically get scoped sessions
- **Existing conversations** will create new scoped sessions when agents are switched
