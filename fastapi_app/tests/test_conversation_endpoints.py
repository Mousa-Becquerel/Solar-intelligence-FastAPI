"""
Comprehensive tests for Conversation Endpoints

Tests all conversation and message operations:
- Conversation CRUD
- Message management
- Authorization
- Error handling
"""
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from httpx import AsyncClient, ASGITransport
from fastapi import status
import json

# Import from fastapi_app
import sys
sys.path.insert(0, '/app')

from fastapi_app.main import app
from fastapi_app.db.models import User, Conversation, Message, Base
from fastapi_app.db.session import get_db
from fastapi_app.services.auth_service import AuthService


# Test database setup
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def async_engine():
    """Create a test async engine"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup
    await engine.dispose()


@pytest_asyncio.fixture
async def async_session(async_engine):
    """Create a test async session"""
    async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def client(async_session):
    """Create test HTTP client with database override"""

    async def override_get_db():
        yield async_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


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

    return user


@pytest_asyncio.fixture
async def test_user2(async_session):
    """Create a second test user for authorization tests"""
    user, error = await AuthService.register_user(
        db=async_session,
        first_name="Test",
        last_name="User2",
        email="testuser2@example.com",
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

    return user


@pytest_asyncio.fixture
async def auth_headers(client, test_user):
    """Get authentication headers for test user"""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser@example.com",
            "password": "Test123!"
        }
    )

    assert response.status_code == 200
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_headers2(client, test_user2):
    """Get authentication headers for test user 2"""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser2@example.com",
            "password": "Test123!"
        }
    )

    assert response.status_code == 200
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# Conversation CRUD Tests
# ============================================================================

@pytest.mark.asyncio
async def test_create_conversation(client, auth_headers):
    """Test creating a new conversation"""
    response = await client.post(
        "/api/v1/conversations/",
        headers=auth_headers,
        json={
            "agent_type": "market",
            "title": "My Test Conversation"
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "My Test Conversation"
    assert data["agent_type"] == "market"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_conversation_default_values(client, auth_headers):
    """Test creating conversation with default values"""
    response = await client.post(
        "/api/v1/conversations/",
        headers=auth_headers,
        json={"agent_type": "solar"}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["agent_type"] == "solar"
    assert data["title"] == "Solar Chat"  # Default title


@pytest.mark.asyncio
async def test_create_conversation_requires_auth(client):
    """Test that creating conversation requires authentication"""
    response = await client.post(
        "/api/v1/conversations/",
        json={"agent_type": "market"}
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_conversations(client, auth_headers, async_session, test_user):
    """Test listing user's conversations"""
    # Create some conversations
    from fastapi_app.services.conversation_service import ConversationService

    await ConversationService.create_conversation(async_session, test_user.id, "market", "Conv 1")
    await ConversationService.create_conversation(async_session, test_user.id, "solar", "Conv 2")
    await ConversationService.create_conversation(async_session, test_user.id, "price", "Conv 3")

    response = await client.get(
        "/api/v1/conversations/",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert all("id" in conv for conv in data)
    assert all("title" in conv for conv in data)
    assert all("preview" in conv for conv in data)
    assert all("message_count" in conv for conv in data)


@pytest.mark.asyncio
async def test_list_conversations_filter_by_agent(client, auth_headers, async_session, test_user):
    """Test filtering conversations by agent type"""
    from fastapi_app.services.conversation_service import ConversationService

    await ConversationService.create_conversation(async_session, test_user.id, "market", "Market Conv")
    await ConversationService.create_conversation(async_session, test_user.id, "solar", "Solar Conv")
    await ConversationService.create_conversation(async_session, test_user.id, "market", "Market Conv 2")

    response = await client.get(
        "/api/v1/conversations/?agent_type=market",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(conv["agent_type"] == "market" for conv in data)


@pytest.mark.asyncio
async def test_get_conversation(client, auth_headers, async_session, test_user):
    """Test getting a specific conversation"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market", "Test Conv"
    )

    response = await client.get(
        f"/api/v1/conversations/{conv.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == conv.id
    assert data["title"] == "Test Conv"
    assert data["agent_type"] == "market"


@pytest.mark.asyncio
async def test_get_conversation_not_found(client, auth_headers):
    """Test getting non-existent conversation"""
    response = await client.get(
        "/api/v1/conversations/99999",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_conversation_title(client, auth_headers, async_session, test_user):
    """Test updating conversation title"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market", "Old Title"
    )

    response = await client.put(
        f"/api/v1/conversations/{conv.id}",
        headers=auth_headers,
        json={"title": "New Title"}
    )

    assert response.status_code == 200
    assert "updated successfully" in response.json()["message"]

    # Verify update
    await async_session.refresh(conv)
    assert conv.title == "New Title"


@pytest.mark.asyncio
async def test_delete_conversation(client, auth_headers, async_session, test_user):
    """Test deleting a conversation"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market", "To Delete"
    )

    response = await client.delete(
        f"/api/v1/conversations/{conv.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"]


@pytest.mark.asyncio
async def test_get_or_create_fresh_conversation(client, auth_headers):
    """Test getting or creating fresh conversation"""
    response = await client.get(
        "/api/v1/conversations/fresh/create-or-get?agent_type=market",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "conversation_id" in data
    assert isinstance(data["conversation_id"], int)


# ============================================================================
# Message Tests
# ============================================================================

@pytest.mark.asyncio
async def test_save_message(client, auth_headers, async_session, test_user):
    """Test saving a message"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market"
    )

    response = await client.post(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=auth_headers,
        json={
            "sender": "user",
            "content": "What are solar panel prices?"
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["sender"] == "user"
    assert data["content"] == "What are solar panel prices?"
    assert data["conversation_id"] == conv.id
    assert "id" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_save_message_invalid_sender(client, auth_headers, async_session, test_user):
    """Test saving message with invalid sender"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market"
    )

    response = await client.post(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=auth_headers,
        json={
            "sender": "invalid",
            "content": "Test message"
        }
    )

    assert response.status_code == 400
    assert "must be 'user' or 'bot'" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_messages(client, auth_headers, async_session, test_user):
    """Test getting messages for a conversation"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market"
    )

    # Add some messages
    await ConversationService.save_message(async_session, conv.id, "user", "Message 1")
    await ConversationService.save_message(async_session, conv.id, "bot", "Response 1")
    await ConversationService.save_message(async_session, conv.id, "user", "Message 2")

    response = await client.get(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["sender"] == "user"
    assert data[1]["sender"] == "bot"
    assert data[2]["sender"] == "user"


@pytest.mark.asyncio
async def test_get_messages_for_agent(client, auth_headers, async_session, test_user):
    """Test getting messages formatted for AI agent"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market"
    )

    await ConversationService.save_message(async_session, conv.id, "user", "Question?")
    await ConversationService.save_message(async_session, conv.id, "bot", "Answer!")

    response = await client.get(
        f"/api/v1/conversations/{conv.id}/messages/for-agent",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["role"] == "user"
    assert data[0]["content"] == "Question?"
    assert data[1]["role"] == "assistant"
    assert data[1]["content"] == "Answer!"
    assert "timestamp" in data[0]


@pytest.mark.asyncio
async def test_clear_messages(client, auth_headers, async_session, test_user):
    """Test clearing all messages from conversation"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market"
    )

    # Add messages
    await ConversationService.save_message(async_session, conv.id, "user", "Message 1")
    await ConversationService.save_message(async_session, conv.id, "bot", "Response 1")

    response = await client.delete(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert "cleared successfully" in response.json()["message"]

    # Verify messages were cleared
    messages, _ = await ConversationService.get_conversation_messages(
        async_session, conv.id, test_user.id
    )
    assert len(messages) == 0


# ============================================================================
# Utility Endpoint Tests
# ============================================================================

@pytest.mark.asyncio
async def test_auto_generate_title(client, auth_headers, async_session, test_user):
    """Test auto-generating conversation title"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market", None
    )

    # Add a message with content
    content = json.dumps({"type": "string", "value": "What are the best solar panels for residential use?"})
    await ConversationService.save_message(async_session, conv.id, "user", content)

    response = await client.post(
        f"/api/v1/conversations/{conv.id}/generate-title",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert "generated successfully" in response.json()["message"]

    # Verify title was generated
    await async_session.refresh(conv)
    assert conv.title is not None
    assert len(conv.title) > 0


@pytest.mark.asyncio
async def test_cleanup_empty_conversations(client, auth_headers, async_session, test_user):
    """Test cleaning up empty conversations"""
    from fastapi_app.services.conversation_service import ConversationService
    from datetime import datetime, timedelta

    # Create some old empty conversations
    conv1, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market"
    )
    conv2, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "solar"
    )

    # Make them old
    old_date = datetime.utcnow() - timedelta(days=10)
    conv1.created_at = old_date
    conv2.created_at = old_date
    await async_session.commit()

    response = await client.post(
        "/api/v1/conversations/cleanup/empty?days_old=7",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["deleted_count"] == 2
    assert "Deleted 2" in data["message"]


# ============================================================================
# Authorization Tests
# ============================================================================

@pytest.mark.asyncio
async def test_user_cannot_access_other_users_conversation(
    client, auth_headers, auth_headers2, async_session, test_user, test_user2
):
    """Test that users can only access their own conversations"""
    from fastapi_app.services.conversation_service import ConversationService

    # User 1 creates a conversation
    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market", "User 1 Conv"
    )

    # User 2 tries to access it
    response = await client.get(
        f"/api/v1/conversations/{conv.id}",
        headers=auth_headers2
    )

    assert response.status_code == 404  # Not found (authorization check)


@pytest.mark.asyncio
async def test_user_cannot_update_other_users_conversation(
    client, auth_headers, auth_headers2, async_session, test_user
):
    """Test that users cannot update other users' conversations"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market", "Original"
    )

    # User 2 tries to update it
    response = await client.put(
        f"/api/v1/conversations/{conv.id}",
        headers=auth_headers2,
        json={"title": "Hacked"}
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_user_cannot_delete_other_users_conversation(
    client, auth_headers, auth_headers2, async_session, test_user
):
    """Test that users cannot delete other users' conversations"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market"
    )

    # User 2 tries to delete it
    response = await client.delete(
        f"/api/v1/conversations/{conv.id}",
        headers=auth_headers2
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_user_cannot_add_message_to_other_users_conversation(
    client, auth_headers, auth_headers2, async_session, test_user
):
    """Test that users cannot add messages to other users' conversations"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market"
    )

    # User 2 tries to add message
    response = await client.post(
        f"/api/v1/conversations/{conv.id}/messages",
        headers=auth_headers2,
        json={"sender": "user", "content": "Hacked message"}
    )

    assert response.status_code == 404


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.asyncio
async def test_full_conversation_flow(client, auth_headers, async_session, test_user):
    """Test complete conversation flow from creation to deletion"""
    # 1. Create conversation
    create_response = await client.post(
        "/api/v1/conversations/",
        headers=auth_headers,
        json={"agent_type": "market", "title": "Full Flow Test"}
    )
    assert create_response.status_code == 201
    conv_id = create_response.json()["id"]

    # 2. Add user message
    msg1_response = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        headers=auth_headers,
        json={"sender": "user", "content": "Hello!"}
    )
    assert msg1_response.status_code == 201

    # 3. Add bot response
    msg2_response = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        headers=auth_headers,
        json={"sender": "bot", "content": "Hi there!"}
    )
    assert msg2_response.status_code == 201

    # 4. Get messages
    get_msgs_response = await client.get(
        f"/api/v1/conversations/{conv_id}/messages",
        headers=auth_headers
    )
    assert get_msgs_response.status_code == 200
    assert len(get_msgs_response.json()) == 2

    # 5. Update title
    update_response = await client.put(
        f"/api/v1/conversations/{conv_id}",
        headers=auth_headers,
        json={"title": "Updated Title"}
    )
    assert update_response.status_code == 200

    # 6. Get conversation
    get_conv_response = await client.get(
        f"/api/v1/conversations/{conv_id}",
        headers=auth_headers
    )
    assert get_conv_response.status_code == 200
    assert get_conv_response.json()["title"] == "Updated Title"

    # 7. Delete conversation
    delete_response = await client.delete(
        f"/api/v1/conversations/{conv_id}",
        headers=auth_headers
    )
    assert delete_response.status_code == 200

    # 8. Verify deleted
    verify_response = await client.get(
        f"/api/v1/conversations/{conv_id}",
        headers=auth_headers
    )
    assert verify_response.status_code == 404


@pytest.mark.asyncio
async def test_conversation_list_includes_message_preview(client, auth_headers, async_session, test_user):
    """Test that conversation list includes message preview"""
    from fastapi_app.services.conversation_service import ConversationService

    conv, _ = await ConversationService.create_conversation(
        async_session, test_user.id, "market", "Test"
    )

    # Add a message
    content = json.dumps({"type": "string", "value": "This is a preview message that should be truncated"})
    await ConversationService.save_message(async_session, conv.id, "user", content)

    response = await client.get(
        "/api/v1/conversations/",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert "preview" in data[0]
    # Preview should contain part of the message
    assert "preview" in data[0]["preview"] or "This is a preview" in data[0]["preview"]
