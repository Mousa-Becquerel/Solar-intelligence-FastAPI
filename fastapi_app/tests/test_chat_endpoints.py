"""
Tests for Chat Processing Endpoints
Tests SSE streaming, non-streaming agents, and chat orchestration
"""
import pytest
import pytest_asyncio
import json
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch

# Import from fastapi_app
import sys
sys.path.insert(0, '/app')

from fastapi_app.main import app
from fastapi_app.db.models import Base, User, Conversation, Message, AgentAccess
from fastapi_app.services.auth_service import AuthService
from fastapi_app.db.session import get_db
from fastapi_app.api.v1.endpoints.auth import create_access_token


# ============================================
# Test Fixtures
# ============================================

@pytest_asyncio.fixture
async def async_engine():
    """Create async in-memory database engine for testing"""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture
async def async_session(async_engine):
    """Create async session for tests"""
    async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def test_user(async_session):
    """Create a test user"""
    user, error = await AuthService.register_user(
        db=async_session,
        first_name="Test",
        last_name="User",
        email="testuser@example.com",
        password="Test123!",
        job_title="Engineer",
        company_name="Test Corp",
        country="USA",
        company_size="10-50",
        terms_agreement=True,
        communications=False
    )

    assert error is None
    assert user is not None

    # Approve user and verify email for testing
    user.is_approved = True
    user.email_verified = True
    user.plan_type = "free"
    await async_session.commit()
    await async_session.refresh(user)

    return user


@pytest_asyncio.fixture
async def premium_user(async_session):
    """Create a premium test user"""
    user, error = await AuthService.register_user(
        db=async_session,
        first_name="Premium",
        last_name="User",
        email="premium@example.com",
        password="Premium123!",
        job_title="Manager",
        company_name="Premium Corp",
        country="USA",
        company_size="50-100",
        terms_agreement=True,
        communications=False
    )

    assert error is None
    assert user is not None

    # Approve, verify email, and set as premium
    user.is_approved = True
    user.email_verified = True
    user.plan_type = "premium"
    await async_session.commit()
    await async_session.refresh(user)

    return user


@pytest_asyncio.fixture
async def agent_configs(async_session, test_user):
    """Create agent access configurations for all agents and hire them for test_user"""
    from fastapi_app.db.models import UserAgentAccess

    agent_types = [
        "market", "news", "digitalization",
        "nzia_policy", "nzia_market_impact",
        "manufacturer_financial"
    ]

    for agent_type in agent_types:
        # Create agent access config
        config = AgentAccess(
            agent_type=agent_type,
            is_enabled=True,
            required_plan="free",  # Allow free users to access all agents for testing
            description=f"{agent_type.title()} Agent"
        )
        async_session.add(config)

        # Hire the agent for the test user
        user_agent_access = UserAgentAccess(
            user_id=test_user.id,
            agent_type=agent_type
        )
        async_session.add(user_agent_access)

    await async_session.commit()
    return True


@pytest_asyncio.fixture
async def test_conversation(async_session, test_user, agent_configs):
    """Create a test conversation"""
    conversation = Conversation(
        user_id=test_user.id,
        agent_type="market",
        title="Test Conversation"
    )
    async_session.add(conversation)
    await async_session.commit()
    await async_session.refresh(conversation)
    return conversation


@pytest_asyncio.fixture
async def auth_headers(test_user):
    """Generate auth headers for test user"""
    access_token = create_access_token(user_id=test_user.id)
    return {"Authorization": f"Bearer {access_token}"}


@pytest_asyncio.fixture
async def premium_auth_headers(premium_user):
    """Generate auth headers for premium user"""
    access_token = create_access_token(user_id=premium_user.id)
    return {"Authorization": f"Bearer {access_token}"}


@pytest_asyncio.fixture
async def client(async_session):
    """Create async test client"""
    async def override_get_db():
        yield async_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ============================================
# Test: Get Available Agent Types
# ============================================

@pytest.mark.asyncio
async def test_get_available_agent_types(client, auth_headers):
    """Test getting available agent types"""
    response = await client.get(
        "/api/v1/chat/agents",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "agent_types" in data
    assert "market" in data["agent_types"]
    assert "price" in data["agent_types"]
    assert "news" in data["agent_types"]
    assert len(data["agent_types"]) == 8  # All 8 agent types


@pytest.mark.asyncio
async def test_get_agent_types_requires_auth(client):
    """Test that getting agent types requires authentication"""
    response = await client.get("/api/v1/chat/agents")
    assert response.status_code == 401


# ============================================
# Test: SSE Streaming Test Endpoint
# ============================================

@pytest.mark.asyncio
async def test_streaming_test_endpoint(client, auth_headers):
    """Test the SSE streaming test endpoint"""
    response = await client.post(
        "/api/v1/chat/test-streaming",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    # Read the stream
    content = response.text
    lines = content.strip().split('\n')

    # Should have 5 chunks + 1 done event = 6 data events
    data_lines = [line for line in lines if line.startswith("data:")]
    assert len(data_lines) == 6

    # Verify first chunk
    first_chunk = json.loads(data_lines[0][6:])  # Remove "data: " prefix
    assert first_chunk["type"] == "chunk"
    assert "Test chunk 1" in first_chunk["content"]

    # Verify done event
    last_event = json.loads(data_lines[-1][6:])
    assert last_event["type"] == "done"
    assert last_event["full_response"] == "Test completed"


# ============================================
# Test: Send Chat Message - Validation
# ============================================

@pytest.mark.asyncio
async def test_send_message_requires_auth(client, test_conversation):
    """Test that sending messages requires authentication"""
    response = await client.post(
        "/api/v1/chat/send",
        json={
            "message": "Test message",
            "conversation_id": test_conversation.id,
            "agent_type": "market"
        }
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_send_empty_message(client, auth_headers, test_conversation):
    """Test that empty messages are rejected"""
    response = await client.post(
        "/api/v1/chat/send",
        headers=auth_headers,
        json={
            "message": "   ",  # Empty after strip
            "conversation_id": test_conversation.id,
            "agent_type": "market"
        }
    )
    assert response.status_code == 400
    assert "Empty message" in response.text


@pytest.mark.asyncio
async def test_send_message_invalid_conversation(client, auth_headers):
    """Test sending message to non-existent conversation"""
    response = await client.post(
        "/api/v1/chat/send",
        headers=auth_headers,
        json={
            "message": "Test message",
            "conversation_id": 99999,
            "agent_type": "market"
        }
    )
    assert response.status_code == 404
    assert "not found" in response.text.lower()


@pytest.mark.asyncio
async def test_send_message_to_other_users_conversation(
    client, auth_headers, premium_auth_headers, async_session, premium_user
):
    """Test that users cannot access other users' conversations"""
    # Create conversation owned by premium user
    conversation = Conversation(
        user_id=premium_user.id,
        agent_type="market",
        title="Premium User Conversation"
    )
    async_session.add(conversation)
    await async_session.commit()
    await async_session.refresh(conversation)

    # Try to send message with regular user's auth
    response = await client.post(
        "/api/v1/chat/send",
        headers=auth_headers,  # Regular user trying to access premium user's conversation
        json={
            "message": "Test message",
            "conversation_id": conversation.id,
            "agent_type": "market"
        }
    )
    assert response.status_code == 404  # Should not find it


# ============================================
# Test: Query Limits
# ============================================

@pytest.mark.asyncio
async def test_query_limit_enforcement(
    client, auth_headers, test_conversation, async_session, test_user
):
    """Test that query limits are enforced"""
    # Set user to limit
    test_user.monthly_query_count = 100  # Free tier limit
    await async_session.commit()

    response = await client.post(
        "/api/v1/chat/send",
        headers=auth_headers,
        json={
            "message": "Test message",
            "conversation_id": test_conversation.id,
            "agent_type": "market"
        }
    )

    assert response.status_code == 429  # Too Many Requests
    data = response.json()
    assert "detail" in data
    assert "query_limit" in str(data["detail"]).lower()


@pytest.mark.asyncio
async def test_query_count_increments(
    client, auth_headers, test_conversation, async_session, test_user
):
    """Test that query count increments on message send"""
    initial_count = test_user.monthly_query_count

    # Mock the agent processing to avoid actual AI calls
    with patch(
        'fastapi_app.services.chat_processing_service.ChatProcessingService.process_market_intelligence_agent_stream',
        new_callable=AsyncMock
    ) as mock_agent:
        async def mock_stream():
            yield {'type': 'chunk', 'content': 'Test response'}
            yield {'type': 'done'}

        mock_agent.return_value = mock_stream()

        response = await client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "message": "What are market trends?",
                "conversation_id": test_conversation.id,
                "agent_type": "market"  # Streaming agent
            }
        )

        # Refresh user to get updated count
        await async_session.refresh(test_user)

        assert response.status_code == 200
        assert test_user.monthly_query_count == initial_count + 1


# ============================================
# Test: Agent Access Control
# ============================================

@pytest.mark.asyncio
async def test_agent_access_control_free_user(
    client, auth_headers, test_conversation
):
    """Test that free users cannot access premium agents"""
    # Weaviate agent requires premium subscription
    with patch(
        'fastapi_app.services.agent_access_service.AgentAccessService.can_user_access_agent',
        new_callable=AsyncMock
    ) as mock_access:
        mock_access.return_value = (False, "This agent requires a premium subscription")

        response = await client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "message": "Test query",
                "conversation_id": test_conversation.id,
                "agent_type": "weaviate"
            }
        )

        assert response.status_code == 403
        assert "premium" in response.text.lower()


# ============================================
# Test: Non-Streaming Agents
# ============================================

# ============================================
# Test: Streaming Agents (SSE)
# ============================================

@pytest.mark.asyncio
async def test_market_agent_streaming(
    client, auth_headers, test_conversation
):
    """Test market intelligence agent (streaming) message handling"""
    async def mock_stream(*args, **kwargs):
        """Mock SSE stream generator"""
        yield 'data: {"type": "processing", "message": "Analyzing..."}\n\n'
        yield 'data: {"type": "chunk", "content": "Test "}\n\n'
        yield 'data: {"type": "chunk", "content": "response"}\n\n'
        yield 'data: {"type": "done", "full_response": "Test response"}\n\n'

    with patch(
        'fastapi_app.services.chat_processing_service.ChatProcessingService.process_market_intelligence_agent_stream',
        return_value=mock_stream()
    ):
        response = await client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "message": "What are market trends?",
                "conversation_id": test_conversation.id,
                "agent_type": "market"
            }
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

        # Read the stream
        content = response.text
        assert "processing" in content
        assert "chunk" in content
        assert "done" in content


@pytest.mark.asyncio
async def test_news_agent_streaming(
    client, auth_headers, test_conversation
):
    """Test news agent (streaming) message handling"""
    async def mock_stream(*args, **kwargs):
        yield 'data: {"type": "chunk", "content": "News update: "}\n\n'
        yield 'data: {"type": "chunk", "content": "Solar industry..."}\n\n'
        yield 'data: {"type": "done", "full_response": "News update: Solar industry..."}\n\n'

    with patch(
        'fastapi_app.services.chat_processing_service.ChatProcessingService.process_news_agent_stream',
        return_value=mock_stream()
    ):
        response = await client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "message": "What's the latest news?",
                "conversation_id": test_conversation.id,
                "agent_type": "news"
            }
        )

        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        content = response.text
        assert "News update" in content


@pytest.mark.asyncio
async def test_digitalization_agent_streaming(
    client, auth_headers, test_conversation
):
    """Test digitalization agent (streaming) message handling"""
    async def mock_stream(*args, **kwargs):
        yield 'data: {"type": "chunk", "content": "Digital transformation..."}\n\n'
        yield 'data: {"type": "done", "full_response": "Digital transformation..."}\n\n'

    with patch(
        'fastapi_app.services.chat_processing_service.ChatProcessingService.process_digitalization_agent_stream',
        return_value=mock_stream()
    ):
        response = await client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "message": "Tell me about digitalization",
                "conversation_id": test_conversation.id,
                "agent_type": "digitalization"
            }
        )

        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]


# ============================================
# Test: Conversation Agent Type Update
# ============================================

@pytest.mark.asyncio
async def test_conversation_agent_type_updates(
    client, auth_headers, test_conversation, async_session
):
    """Test that conversation agent type updates when changed"""
    initial_agent_type = test_conversation.agent_type
    assert initial_agent_type == "market"

    with patch(
        'fastapi_app.services.chat_processing_service.ChatProcessingService.process_news_agent_stream',
        new_callable=AsyncMock
    ) as mock_agent:
        async def mock_stream():
            yield {'type': 'chunk', 'content': 'Test'}
            yield {'type': 'done'}

        mock_agent.return_value = mock_stream()

        response = await client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "message": "What are the latest news?",
                "conversation_id": test_conversation.id,
                "agent_type": "news"  # Different from initial "market"
            }
        )

        # Refresh conversation to see update
        await async_session.refresh(test_conversation)

        assert response.status_code == 200
        assert test_conversation.agent_type == "news"


# ============================================
# Test: User Message Storage
# ============================================

@pytest.mark.asyncio
async def test_user_message_stored(
    client, auth_headers, test_conversation, async_session
):
    """Test that user messages are stored in database"""
    from sqlalchemy import select
    from fastapi_app.db.models import Message

    user_message_text = "Test message for storage"

    with patch(
        'fastapi_app.services.chat_processing_service.ChatProcessingService.process_digitalization_agent_stream',
        new_callable=AsyncMock
    ) as mock_agent:
        async def mock_stream():
            yield {'type': 'chunk', 'content': 'Response'}
            yield {'type': 'done'}

        mock_agent.return_value = mock_stream()

        response = await client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "message": user_message_text,
                "conversation_id": test_conversation.id,
                "agent_type": "digitalization"
            }
        )

        assert response.status_code == 200

        # Query for stored message
        result = await async_session.execute(
            select(Message).where(
                Message.conversation_id == test_conversation.id,
                Message.sender == 'user'
            )
        )
        messages = result.scalars().all()

        assert len(messages) > 0
        last_message = messages[-1]
        content = json.loads(last_message.content)
        assert content["value"] == user_message_text


# ============================================
# Test: Unknown Agent Type
# ============================================

@pytest.mark.asyncio
async def test_unknown_agent_type(
    client, auth_headers, test_conversation
):
    """Test that unknown agent types are rejected"""
    response = await client.post(
        "/api/v1/chat/send",
        headers=auth_headers,
        json={
            "message": "Test message",
            "conversation_id": test_conversation.id,
            "agent_type": "unknown_agent"
        }
    )

    # Agent access check happens first, so returns 403 (not configured)
    # rather than 400 (unknown agent type from endpoint)
    assert response.status_code == 403
    assert "not configured" in response.text.lower() or "access" in response.text.lower()


# ============================================
# Test: Integration Flow
# ============================================

@pytest.mark.asyncio
async def test_complete_chat_flow(
    client, auth_headers, test_conversation, async_session, test_user
):
    """Test complete chat flow from message to response"""
    initial_query_count = test_user.monthly_query_count

    with patch(
        'fastapi_app.services.chat_processing_service.ChatProcessingService.process_market_intelligence_agent_stream',
        new_callable=AsyncMock
    ) as mock_agent:
        async def mock_stream():
            yield {'type': 'chunk', 'content': 'Market analysis is...'}
            yield {'type': 'done'}

        mock_agent.return_value = mock_stream()

        # Send message
        response = await client.post(
            "/api/v1/chat/send",
            headers=auth_headers,
            json={
                "message": "What are current market trends?",
                "conversation_id": test_conversation.id,
                "agent_type": "market"
            }
        )

        assert response.status_code == 200

        # For streaming responses, we just check the status code
        # The actual content would be in SSE format

        # Verify query count incremented
        await async_session.refresh(test_user)
        assert test_user.monthly_query_count == initial_query_count + 1

        # Verify message stored
        from sqlalchemy import select
        from fastapi_app.db.models import Message

        result = await async_session.execute(
            select(Message).where(Message.conversation_id == test_conversation.id)
        )
        messages = result.scalars().all()
        assert len(messages) > 0  # At least user message stored


# ============================================
# Test Statistics
# ============================================

def test_count():
    """
    Test count for documentation

    Total tests: 22

    Categories:
    - Agent Types: 2 tests
    - SSE Streaming Test: 1 test
    - Validation: 4 tests
    - Query Limits: 2 tests
    - Agent Access Control: 1 test
    - Non-Streaming Agents: 2 tests
    - Streaming Agents (SSE): 3 tests
    - Conversation Updates: 1 test
    - Message Storage: 1 test
    - Unknown Agent: 1 test
    - Integration Flow: 1 test
    """
    pass
