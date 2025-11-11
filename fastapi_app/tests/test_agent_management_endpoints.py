"""
Comprehensive Tests for Agent Management Endpoints
Tests all agent metadata, availability, hiring, and usage tracking
"""
import pytest
import pytest_asyncio
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from fastapi_app.main import app
from fastapi_app.db.models import Base, User, Conversation, Message, HiredAgent
from fastapi_app.db.session import get_db
from fastapi_app.services.agent_service import AgentService


# ============================================
# Test Database Setup
# ============================================

@pytest_asyncio.fixture
async def async_engine():
    """Create async in-memory SQLite database for testing"""
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
async def client(async_session):
    """Create HTTP client with database override"""
    async def override_get_db():
        yield async_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ============================================
# User Fixtures
# ============================================

@pytest_asyncio.fixture
async def test_user(async_session):
    """Create a test user"""
    user = User(
        username="testuser@example.com",
        full_name="Test User",
        role="user",
        is_active=True,
        plan_type="free",
        email_verified=True,
        query_count=10,
        monthly_query_count=5
    )
    user.set_password("testpass123")

    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    return user


@pytest_asyncio.fixture
async def premium_user(async_session):
    """Create a premium user"""
    user = User(
        username="premium@example.com",
        full_name="Premium User",
        role="user",
        is_active=True,
        plan_type="premium",
        email_verified=True
    )
    user.set_password("premiumpass123")

    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    return user


@pytest_asyncio.fixture
async def auth_headers(client, test_user):
    """Get auth headers for test_user"""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.username,
            "password": "testpass123"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def premium_auth_headers(client, premium_user):
    """Get auth headers for premium_user"""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": premium_user.username,
            "password": "premiumpass123"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ============================================
# Tests: Get Available Agents
# ============================================

@pytest.mark.asyncio
async def test_get_available_agents(client, auth_headers):
    """Test getting list of available agents"""
    response = await client.get(
        "/api/v1/agent-management/available",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Should return list of agents
    assert isinstance(data, list)
    assert len(data) > 0

    # Check structure
    for agent in data:
        assert "agent_type" in agent
        assert "display_name" in agent
        assert "is_hired" in agent
        assert "requires_subscription" in agent
        assert "capabilities" in agent
        assert isinstance(agent["capabilities"], list)


@pytest.mark.asyncio
async def test_get_available_agents_shows_hired_status(
    client, auth_headers, async_session, test_user
):
    """Test that hired agents are marked correctly"""
    # Hire an agent
    hired = HiredAgent(
        user_id=test_user.id,
        agent_type="market",
        hired_at=datetime.utcnow(),
        is_active=True
    )
    async_session.add(hired)
    await async_session.commit()

    response = await client.get(
        "/api/v1/agent-management/available",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Find market agent
    market_agent = next(a for a in data if a["agent_type"] == "market")
    assert market_agent["is_hired"] is True


# ============================================
# Tests: Check Agent Availability
# ============================================

@pytest.mark.asyncio
async def test_check_agent_availability_valid(client, auth_headers):
    """Test checking availability for valid agent"""
    response = await client.get(
        "/api/v1/agent-management/check-availability/market",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["is_available"] is True
    assert data["reason"] is None


@pytest.mark.asyncio
async def test_check_agent_availability_premium_only(client, auth_headers):
    """Test checking availability for premium-only agent"""
    response = await client.get(
        "/api/v1/agent-management/check-availability/weaviate",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["is_available"] is False
    assert "premium" in data["reason"].lower()


@pytest.mark.asyncio
async def test_check_agent_availability_invalid_agent(client, auth_headers):
    """Test checking availability for invalid agent"""
    response = await client.get(
        "/api/v1/agent-management/check-availability/nonexistent",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["is_available"] is False
    assert "invalid" in data["reason"].lower()


# ============================================
# Tests: Suggest Agent Type
# ============================================

@pytest.mark.asyncio
async def test_suggest_agent_type_price(client, auth_headers):
    """Test agent type suggestion for price-related query"""
    response = await client.post(
        "/api/v1/agent-management/suggest-agent-type",
        params={"query": "What is the current module price in USD?"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["suggested_agent_type"] == "price"
    assert "Price" in data["agent_display_name"]


@pytest.mark.asyncio
async def test_suggest_agent_type_news(client, auth_headers):
    """Test agent type suggestion for news-related query"""
    response = await client.post(
        "/api/v1/agent-management/suggest-agent-type",
        params={"query": "Show me the latest news about solar panels"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["suggested_agent_type"] == "news"


@pytest.mark.asyncio
async def test_suggest_agent_type_default(client, auth_headers):
    """Test agent type suggestion defaults to market"""
    response = await client.post(
        "/api/v1/agent-management/suggest-agent-type",
        params={"query": "General solar industry question"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["suggested_agent_type"] == "market"


# ============================================
# Tests: Hire Agent
# ============================================

@pytest.mark.asyncio
async def test_hire_agent(client, auth_headers, async_session, test_user):
    """Test hiring an agent"""
    response = await client.post(
        "/api/v1/agent-management/hire",
        headers=auth_headers,
        json={"agent_type": "market"}
    )

    assert response.status_code == 201
    data = response.json()
    assert "successfully hired" in data["message"].lower()

    # Verify in database
    result = await async_session.execute(
        select(HiredAgent).where(
            HiredAgent.user_id == test_user.id,
            HiredAgent.agent_type == "market"
        )
    )
    hired = result.scalar_one_or_none()
    assert hired is not None
    assert hired.is_active is True


@pytest.mark.asyncio
async def test_hire_agent_invalid_type(client, auth_headers):
    """Test hiring invalid agent type"""
    response = await client.post(
        "/api/v1/agent-management/hire",
        headers=auth_headers,
        json={"agent_type": "nonexistent"}
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_hire_agent_already_hired(client, auth_headers, async_session, test_user):
    """Test hiring already hired agent"""
    # First hire
    hired = HiredAgent(
        user_id=test_user.id,
        agent_type="market",
        hired_at=datetime.utcnow(),
        is_active=True
    )
    async_session.add(hired)
    await async_session.commit()

    # Try to hire again
    response = await client.post(
        "/api/v1/agent-management/hire",
        headers=auth_headers,
        json={"agent_type": "market"}
    )

    assert response.status_code == 400
    assert "already hired" in response.json()["detail"].lower()


# ============================================
# Tests: Release Agent
# ============================================

@pytest.mark.asyncio
async def test_release_agent(client, auth_headers, async_session, test_user):
    """Test releasing an agent"""
    # First hire the agent
    hired = HiredAgent(
        user_id=test_user.id,
        agent_type="market",
        hired_at=datetime.utcnow(),
        is_active=True
    )
    async_session.add(hired)
    await async_session.commit()

    # Release it
    response = await client.post(
        "/api/v1/agent-management/release",
        headers=auth_headers,
        json={"agent_type": "market"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "successfully released" in data["message"].lower()

    # Verify in database
    await async_session.refresh(hired)
    assert hired.is_active is False


@pytest.mark.asyncio
async def test_release_agent_not_hired(client, auth_headers):
    """Test releasing agent that wasn't hired"""
    response = await client.post(
        "/api/v1/agent-management/release",
        headers=auth_headers,
        json={"agent_type": "market"}
    )

    assert response.status_code == 400
    assert "not hired" in response.json()["detail"].lower()


# ============================================
# Tests: Get Hired Agents
# ============================================

@pytest.mark.asyncio
async def test_get_hired_agents_empty(client, auth_headers):
    """Test getting hired agents when none are hired"""
    response = await client.get(
        "/api/v1/agent-management/hired",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


@pytest.mark.asyncio
async def test_get_hired_agents_with_agents(
    client, auth_headers, async_session, test_user
):
    """Test getting hired agents when some are hired"""
    # Hire multiple agents
    agents = [
        HiredAgent(user_id=test_user.id, agent_type="market", is_active=True),
        HiredAgent(user_id=test_user.id, agent_type="price", is_active=True)
    ]
    for agent in agents:
        async_session.add(agent)
    await async_session.commit()

    response = await client.get(
        "/api/v1/agent-management/hired",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 2
    agent_types = [a["agent_type"] for a in data]
    assert "market" in agent_types
    assert "price" in agent_types


# ============================================
# Tests: Usage Statistics
# ============================================

@pytest.mark.asyncio
async def test_get_usage_stats(client, auth_headers, test_user):
    """Test getting usage statistics"""
    response = await client.get(
        "/api/v1/agent-management/usage-stats",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert "total_queries" in data
    assert "monthly_queries" in data
    assert "query_limit" in data
    assert "queries_remaining" in data
    assert "by_agent_type" in data

    # Verify values match user
    assert data["total_queries"] == test_user.query_count
    assert data["monthly_queries"] == test_user.monthly_query_count
    assert data["query_limit"] == test_user.get_query_limit()


@pytest.mark.asyncio
async def test_get_usage_stats_with_agent_breakdown(
    client, auth_headers, async_session, test_user
):
    """Test usage stats includes agent breakdown"""
    # Create conversation and messages
    conv = Conversation(user_id=test_user.id, agent_type="market")
    async_session.add(conv)
    await async_session.commit()
    await async_session.refresh(conv)

    msg = Message(
        conversation_id=conv.id,
        sender="user",
        content='{"type": "string", "value": "test query"}'
    )
    async_session.add(msg)
    await async_session.commit()

    response = await client.get(
        "/api/v1/agent-management/usage-stats",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert "by_agent_type" in data
    assert isinstance(data["by_agent_type"], dict)


# ============================================
# Tests: Query Validation
# ============================================

@pytest.mark.asyncio
async def test_validate_query_success(
    client, auth_headers, async_session, test_user
):
    """Test successful query validation"""
    # Create a conversation
    conv = Conversation(user_id=test_user.id, agent_type="market")
    async_session.add(conv)
    await async_session.commit()
    await async_session.refresh(conv)

    response = await client.post(
        "/api/v1/agent-management/validate-query",
        params={
            "conversation_id": conv.id,
            "query": "What are solar panel prices?",
            "agent_type": "market"
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["is_valid"] is True
    assert data["error_message"] is None
    assert data["conversation_id"] == conv.id


@pytest.mark.asyncio
async def test_validate_query_too_long(
    client, auth_headers, async_session, test_user
):
    """Test query validation fails for too long query"""
    # Create a conversation
    conv = Conversation(user_id=test_user.id, agent_type="market")
    async_session.add(conv)
    await async_session.commit()
    await async_session.refresh(conv)

    long_query = "a" * 6000  # Over 5000 limit

    response = await client.post(
        "/api/v1/agent-management/validate-query",
        params={
            "conversation_id": conv.id,
            "query": long_query,
            "agent_type": "market"
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["is_valid"] is False
    assert "too long" in data["error_message"].lower()


@pytest.mark.asyncio
async def test_validate_query_invalid_conversation(client, auth_headers):
    """Test query validation fails for invalid conversation"""
    response = await client.post(
        "/api/v1/agent-management/validate-query",
        params={
            "conversation_id": 99999,
            "query": "Test query",
            "agent_type": "market"
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["is_valid"] is False
    assert "not found" in data["error_message"].lower()


# ============================================
# Tests: Conversation History
# ============================================

@pytest.mark.asyncio
async def test_get_conversation_history(
    client, auth_headers, async_session, test_user
):
    """Test getting conversation history"""
    # Create conversation with messages
    conv = Conversation(user_id=test_user.id, agent_type="market")
    async_session.add(conv)
    await async_session.commit()
    await async_session.refresh(conv)

    messages = [
        Message(
            conversation_id=conv.id,
            sender="user",
            content='{"type": "string", "value": "Hello"}'
        ),
        Message(
            conversation_id=conv.id,
            sender="bot",
            content='{"type": "string", "value": "Hi there!"}'
        )
    ]
    for msg in messages:
        async_session.add(msg)
    await async_session.commit()

    response = await client.get(
        f"/api/v1/agent-management/conversation-history/{conv.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["role"] == "user"
    assert data[0]["content"] == "Hello"
    assert data[1]["role"] == "assistant"
    assert data[1]["content"] == "Hi there!"


@pytest.mark.asyncio
async def test_get_conversation_history_with_limit(
    client, auth_headers, async_session, test_user
):
    """Test conversation history respects limit"""
    # Create conversation with multiple messages
    conv = Conversation(user_id=test_user.id, agent_type="market")
    async_session.add(conv)
    await async_session.commit()
    await async_session.refresh(conv)

    for i in range(10):
        msg = Message(
            conversation_id=conv.id,
            sender="user",
            content=f'{{"type": "string", "value": "Message {i}"}}'
        )
        async_session.add(msg)
    await async_session.commit()

    response = await client.get(
        f"/api/v1/agent-management/conversation-history/{conv.id}?limit=5",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 5


# ============================================
# Tests: Agent Types
# ============================================

@pytest.mark.asyncio
async def test_get_agent_types(client, auth_headers):
    """Test getting all agent types"""
    response = await client.get(
        "/api/v1/agent-management/types",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert "agent_types" in data
    assert isinstance(data["agent_types"], dict)
    assert "market" in data["agent_types"]
    assert "price" in data["agent_types"]


# ============================================
# Tests: Authorization
# ============================================

@pytest.mark.asyncio
async def test_endpoints_require_authentication(client):
    """Test all endpoints require authentication"""
    endpoints = [
        "/api/v1/agent-management/available",
        "/api/v1/agent-management/hired",
        "/api/v1/agent-management/usage-stats",
        "/api/v1/agent-management/types"
    ]

    for endpoint in endpoints:
        response = await client.get(endpoint)
        assert response.status_code == 401


# ============================================
# Tests: Integration Flow
# ============================================

@pytest.mark.asyncio
async def test_full_agent_management_flow(
    client, auth_headers, async_session, test_user
):
    """Test complete agent management workflow"""
    # 1. Get available agents
    response = await client.get(
        "/api/v1/agent-management/available",
        headers=auth_headers
    )
    assert response.status_code == 200
    agents = response.json()
    assert len(agents) > 0

    # 2. Check agent availability
    response = await client.get(
        "/api/v1/agent-management/check-availability/market",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["is_available"] is True

    # 3. Hire the agent
    response = await client.post(
        "/api/v1/agent-management/hire",
        headers=auth_headers,
        json={"agent_type": "market"}
    )
    assert response.status_code == 201

    # 4. Verify it appears in hired agents
    response = await client.get(
        "/api/v1/agent-management/hired",
        headers=auth_headers
    )
    assert response.status_code == 200
    hired = response.json()
    assert len(hired) == 1
    assert hired[0]["agent_type"] == "market"

    # 5. Create a conversation
    conv = Conversation(user_id=test_user.id, agent_type="market")
    async_session.add(conv)
    await async_session.commit()
    await async_session.refresh(conv)

    # 6. Validate a query
    response = await client.post(
        "/api/v1/agent-management/validate-query",
        params={
            "conversation_id": conv.id,
            "query": "What are solar prices?",
            "agent_type": "market"
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["is_valid"] is True

    # 7. Get usage stats
    response = await client.get(
        "/api/v1/agent-management/usage-stats",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert "total_queries" in response.json()

    # 8. Release the agent
    response = await client.post(
        "/api/v1/agent-management/release",
        headers=auth_headers,
        json={"agent_type": "market"}
    )
    assert response.status_code == 200

    # 9. Verify it's removed from hired
    response = await client.get(
        "/api/v1/agent-management/hired",
        headers=auth_headers
    )
    assert response.status_code == 200
    hired = response.json()
    assert len(hired) == 0
