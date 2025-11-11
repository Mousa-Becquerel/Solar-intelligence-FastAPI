# Phase 1: Service Migration Plan

## Overview

Migrate all Flask service layer components to async FastAPI architecture. This completes Phase 1 of the modernization.

---

## Services to Migrate

### ✅ Completed
1. **AuthService** (437 lines) - ✅ Done
   - User registration, login, password reset
   - Email verification, account deletion
   - Waitlist integration
   - **Status**: 100% complete with tests

### 🔄 To Migrate (Priority Order)

2. **ConversationService** (559 lines) - 🎯 **Next**
   - Create/read/update/delete conversations
   - Message management
   - Conversation history
   - Auto-title generation
   - **Complexity**: Medium
   - **Estimated Time**: 2-3 hours

3. **AgentAccessService** (330 lines)
   - Agent access control per user
   - Premium agent restrictions
   - **Complexity**: Low-Medium
   - **Estimated Time**: 1-2 hours

4. **AdminService** (529 lines)
   - User management
   - Statistics and analytics
   - Admin operations
   - **Complexity**: Medium
   - **Estimated Time**: 2-3 hours

5. **AgentService** (537 lines)
   - AI agent initialization
   - Agent configuration
   - **Complexity**: Medium-High
   - **Estimated Time**: 3-4 hours

### ⏳ Special Cases

6. **ChatProcessing** (1089 lines)
   - Real-time chat handling
   - Streaming responses
   - **Complexity**: High
   - **Estimated Time**: 4-6 hours
   - **Note**: May require WebSocket/SSE implementation

7. **EmailService** (254 lines)
   - Already have async version for auth
   - Will merge/enhance existing implementation
   - **Complexity**: Low
   - **Estimated Time**: 1 hour

---

## Migration Strategy

### Step 1: ConversationService (Current Focus)

#### Methods to Migrate (14 methods):
1. `create_conversation()` - Create new conversation
2. `get_conversation()` - Get by ID
3. `get_user_conversations()` - List user's conversations
4. `get_or_create_fresh_conversation()` - Reuse empty conversations
5. `update_conversation_title()` - Update title
6. `delete_conversation()` - Delete conversation + messages
7. `save_message()` - Save message to conversation
8. `get_conversation_messages()` - Get messages
9. `get_messages_for_agent()` - Format for AI
10. `clear_conversation_messages()` - Clear all messages
11. `auto_generate_conversation_title()` - Auto-gen title from first message
12. `cleanup_empty_conversations()` - Cleanup old empty ones

#### Database Models Needed:
- ✅ `Conversation` - Already exists in `fastapi_app/db/models.py`
- ✅ `Message` - Already exists in `fastapi_app/db/models.py`

#### Changes Required:
- Replace `db.session` with `AsyncSession` parameter
- Replace `.query` with `await db.execute(select(...))`
- Replace `.commit()` with `await db.commit()`
- Replace `.rollback()` with `await db.rollback()`
- Add `async def` to all methods
- Add `await` to all database operations

#### Testing Strategy:
- Unit tests for each method
- Integration tests for conversation flows
- Message creation/retrieval tests
- Authorization tests (user can only access own conversations)

---

## Step 2: AgentAccessService

#### Methods to Migrate:
- Access control per agent
- Premium restrictions
- Agent availability checks

#### Key Features:
- Check user access to specific agents
- Manage premium agent restrictions
- Track agent usage

---

## Step 3: AdminService

#### Methods to Migrate:
- User statistics
- Agent usage analytics
- System health metrics
- User management (promote to admin, etc.)

#### Considerations:
- Admin-only endpoints
- Performance for large datasets
- Caching for statistics

---

## Step 4: AgentService

#### Methods to Migrate:
- Agent initialization
- Agent configuration
- Agent registry

#### Considerations:
- Async agent creation
- Agent pooling/caching
- Thread safety for async

---

## Step 5: ChatProcessing (Complex)

#### Special Requirements:
- Real-time streaming
- WebSocket or Server-Sent Events (SSE)
- Async agent communication

#### Options:
1. **SSE (Server-Sent Events)** - Simpler, one-way
2. **WebSockets** - Full duplex, more complex
3. **HTTP Long Polling** - Fallback option

---

## File Structure

```
fastapi_app/
├── services/
│   ├── __init__.py
│   ├── auth_service.py ✅
│   ├── conversation_service.py 🔄 (Next)
│   ├── agent_access_service.py ⏳
│   ├── admin_service.py ⏳
│   ├── agent_service.py ⏳
│   ├── chat_processing.py ⏳
│   └── email_service.py ✅ (partially)
├── api/
│   └── v1/
│       └── endpoints/
│           ├── auth.py ✅
│           ├── conversations.py 🔄 (Next)
│           ├── agents.py ⏳
│           ├── admin.py ⏳
│           └── chat.py ⏳
└── tests/
    ├── test_auth_service.py ✅
    ├── test_auth_endpoints.py ✅
    ├── test_conversation_service.py 🔄 (Next)
    └── test_conversation_endpoints.py 🔄
```

---

## Success Criteria

For each service migration:

1. ✅ **Service Layer**
   - All methods converted to async
   - Type hints on all parameters
   - Proper error handling
   - Logging maintained

2. ✅ **API Endpoints**
   - RESTful endpoints created
   - Pydantic schemas for request/response
   - Authentication/authorization
   - Swagger documentation

3. ✅ **Tests**
   - Unit tests for service methods
   - Integration tests for endpoints
   - 80%+ test coverage
   - All tests passing

4. ✅ **Documentation**
   - API docs in Swagger
   - Code comments
   - Migration summary document

---

## Timeline Estimates

| Service | Complexity | Time | Total Hours |
|---------|-----------|------|-------------|
| ✅ AuthService | Medium | 2-3h | ✅ Complete |
| 🔄 ConversationService | Medium | 2-3h | **In Progress** |
| AgentAccessService | Low-Med | 1-2h | - |
| AdminService | Medium | 2-3h | - |
| AgentService | Med-High | 3-4h | - |
| ChatProcessing | High | 4-6h | - |
| **Total** | - | **14-21h** | **~3 days** |

---

## Phase 1 Completion Checklist

- [x] AuthService migrated ✅
- [x] Authentication endpoints created ✅
- [x] Authentication tests (21 tests) ✅
- [ ] ConversationService migrated 🔄
- [ ] Conversation endpoints created
- [ ] Conversation tests
- [ ] AgentAccessService migrated
- [ ] Agent access endpoints
- [ ] AdminService migrated
- [ ] Admin endpoints
- [ ] AgentService migrated
- [ ] Agent endpoints
- [ ] ChatProcessing migrated
- [ ] Real-time chat working

---

## Current Status

**Completed**: 1/7 services (14%)
**In Progress**: ConversationService
**Next Up**: AgentAccessService

**Total Progress**: Phase 1 - ~15% complete

---

## Notes

### Database Compatibility
- Using separate FastAPI tables (`fastapi_users`, `fastapi_conversations`, `fastapi_messages`)
- Zero impact on Flask app during migration
- Can run both apps simultaneously

### Testing Strategy
- Test each service in isolation first
- Integration tests with real database
- Performance benchmarks (async vs sync)

### Rollback Plan
- Flask app remains untouched
- Can switch back instantly by reverting proxy/load balancer
- No data migration required (separate tables)

---

## Next Steps

1. **Migrate ConversationService** ← 🎯 Current Focus
   - Copy structure from Flask service
   - Convert to async patterns
   - Add type hints
   - Create comprehensive tests

2. **Create Conversation Endpoints**
   - POST `/api/v1/conversations` - Create
   - GET `/api/v1/conversations` - List user's conversations
   - GET `/api/v1/conversations/{id}` - Get conversation
   - PUT `/api/v1/conversations/{id}` - Update title
   - DELETE `/api/v1/conversations/{id}` - Delete
   - GET `/api/v1/conversations/{id}/messages` - Get messages
   - POST `/api/v1/conversations/{id}/messages` - Save message
   - DELETE `/api/v1/conversations/{id}/messages` - Clear messages

3. **Test Everything**
   - Service layer tests
   - Endpoint tests
   - Authorization tests

4. **Repeat for Next Service**

---

**Last Updated**: 2025-11-06
**Current Task**: Migrating ConversationService to async
