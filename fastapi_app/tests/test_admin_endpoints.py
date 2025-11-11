"""
Comprehensive Tests for Admin Endpoints
Tests all administrative operations: user management, statistics, maintenance
"""
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from fastapi_app.main import app
from fastapi_app.db.models import Base, User, Conversation, Message, HiredAgent
from fastapi_app.db.session import get_db
from fastapi_app.services.admin_service import AdminService


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
async def admin_user(async_session):
    """Create an admin user"""
    user = User(
        username="admin@example.com",
        full_name="Admin User",
        role="admin",
        is_active=True,
        plan_type="free",
        email_verified=True,
        gdpr_consent_given=True,
        terms_accepted=True
    )
    user.set_password("adminpass123")

    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    return user


@pytest_asyncio.fixture
async def regular_user(async_session):
    """Create a regular active user"""
    user = User(
        username="user@example.com",
        full_name="Regular User",
        role="user",
        is_active=True,
        plan_type="free",
        email_verified=True,
        query_count=10,
        monthly_query_count=5
    )
    user.set_password("userpass123")

    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    return user


@pytest_asyncio.fixture
async def pending_user(async_session):
    """Create a pending (inactive) user"""
    user = User(
        username="pending@example.com",
        full_name="Pending User",
        role="user",
        is_active=False,
        plan_type="free",
        email_verified=False
    )
    user.set_password("pendingpass123")

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
        email_verified=True,
        query_count=50
    )
    user.set_password("premiumpass123")

    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    return user


# ============================================
# Auth Headers Fixtures
# ============================================

@pytest_asyncio.fixture
async def admin_auth_headers(client, admin_user):
    """Get auth headers for admin user"""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": admin_user.username,
            "password": "adminpass123"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def user_auth_headers(client, regular_user):
    """Get auth headers for regular user"""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": regular_user.username,
            "password": "userpass123"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ============================================
# Tests: Get All Users
# ============================================

@pytest.mark.asyncio
async def test_get_all_users_admin(
    client, admin_auth_headers, admin_user, regular_user, pending_user
):
    """Test admin can get all users"""
    response = await client.get(
        "/api/v1/admin/users",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Should include admin, regular, and pending users
    assert len(data) >= 3
    usernames = [u["username"] for u in data]
    assert admin_user.username in usernames
    assert regular_user.username in usernames
    assert pending_user.username in usernames


@pytest.mark.asyncio
async def test_get_all_users_exclude_inactive(
    client, admin_auth_headers, regular_user, pending_user
):
    """Test getting only active users"""
    response = await client.get(
        "/api/v1/admin/users?include_inactive=false",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Should not include pending user
    usernames = [u["username"] for u in data]
    assert regular_user.username in usernames
    assert pending_user.username not in usernames


@pytest.mark.asyncio
async def test_get_all_users_with_limit(
    client, admin_auth_headers
):
    """Test getting users with limit"""
    response = await client.get(
        "/api/v1/admin/users?limit=2",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) <= 2


@pytest.mark.asyncio
async def test_get_all_users_requires_admin(
    client, user_auth_headers
):
    """Test non-admin cannot get all users"""
    response = await client.get(
        "/api/v1/admin/users",
        headers=user_auth_headers
    )

    assert response.status_code == 403


# ============================================
# Tests: Get Pending Users
# ============================================

@pytest.mark.asyncio
async def test_get_pending_users(
    client, admin_auth_headers, pending_user
):
    """Test getting pending users"""
    response = await client.get(
        "/api/v1/admin/users/pending",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Should have at least the pending user
    assert len(data) >= 1
    pending_usernames = [u["username"] for u in data]
    assert pending_user.username in pending_usernames

    # All should be inactive
    for user in data:
        assert user["is_active"] is False


# ============================================
# Tests: Search Users
# ============================================

@pytest.mark.asyncio
async def test_search_users_by_username(
    client, admin_auth_headers, regular_user
):
    """Test searching users by username"""
    response = await client.get(
        f"/api/v1/admin/users/search?q=user@",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Should find the regular user
    assert len(data) >= 1
    assert any(u["username"] == regular_user.username for u in data)


@pytest.mark.asyncio
async def test_search_users_by_full_name(
    client, admin_auth_headers, regular_user
):
    """Test searching users by full name"""
    response = await client.get(
        "/api/v1/admin/users/search?q=Regular",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) >= 1
    assert any(u["full_name"] == regular_user.full_name for u in data)


@pytest.mark.asyncio
async def test_search_users_no_results(
    client, admin_auth_headers
):
    """Test search with no results"""
    response = await client.get(
        "/api/v1/admin/users/search?q=nonexistentuser12345",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


# ============================================
# Tests: Get User Details
# ============================================

@pytest.mark.asyncio
async def test_get_user_details(
    client, admin_auth_headers, async_session, regular_user
):
    """Test getting detailed user information"""
    # Create some data for the user
    conv = Conversation(
        user_id=regular_user.id,
        agent_type="market",
        title="Test Conv"
    )
    async_session.add(conv)
    await async_session.commit()
    await async_session.refresh(conv)

    msg = Message(
        conversation_id=conv.id,
        sender="user",
        content="Test message"
    )
    async_session.add(msg)
    await async_session.commit()

    response = await client.get(
        f"/api/v1/admin/users/{regular_user.id}",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["id"] == regular_user.id
    assert data["username"] == regular_user.username
    assert data["full_name"] == regular_user.full_name
    assert data["conversation_count"] == 1
    assert data["message_count"] == 1
    assert "hired_agents" in data


@pytest.mark.asyncio
async def test_get_user_details_not_found(
    client, admin_auth_headers
):
    """Test getting details for non-existent user"""
    response = await client.get(
        "/api/v1/admin/users/99999",
        headers=admin_auth_headers
    )

    assert response.status_code == 404


# ============================================
# Tests: Create User
# ============================================

@pytest.mark.asyncio
async def test_create_user_admin(
    client, admin_auth_headers, async_session
):
    """Test admin can create a new user"""
    response = await client.post(
        "/api/v1/admin/users",
        headers=admin_auth_headers,
        json={
            "username": "newuser@example.com",
            "password": "password123",
            "full_name": "New User",
            "role": "user",
            "plan_type": "free",
            "is_active": True
        }
    )

    assert response.status_code == 201
    data = response.json()

    assert data["username"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert data["role"] == "user"
    assert data["plan_type"] == "free"
    assert data["is_active"] is True

    # Verify in database
    result = await async_session.execute(
        select(User).where(User.username == "newuser@example.com")
    )
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.gdpr_consent_given is True
    assert user.terms_accepted is True


@pytest.mark.asyncio
async def test_create_user_duplicate_username(
    client, admin_auth_headers, regular_user
):
    """Test creating user with duplicate username fails"""
    response = await client.post(
        "/api/v1/admin/users",
        headers=admin_auth_headers,
        json={
            "username": regular_user.username,
            "password": "password123",
            "full_name": "Duplicate User"
        }
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


# ============================================
# Tests: Update User
# ============================================

@pytest.mark.asyncio
async def test_update_user_admin(
    client, admin_auth_headers, async_session, regular_user
):
    """Test admin can update user"""
    response = await client.put(
        f"/api/v1/admin/users/{regular_user.id}",
        headers=admin_auth_headers,
        json={
            "full_name": "Updated Name",
            "plan_type": "premium"
        }
    )

    assert response.status_code == 200
    assert "updated successfully" in response.json()["message"].lower()

    # Verify in database
    await async_session.refresh(regular_user)
    assert regular_user.full_name == "Updated Name"
    assert regular_user.plan_type == "premium"


@pytest.mark.asyncio
async def test_update_user_invalid_role(
    client, admin_auth_headers, regular_user
):
    """Test updating user with invalid role fails"""
    response = await client.put(
        f"/api/v1/admin/users/{regular_user.id}",
        headers=admin_auth_headers,
        json={
            "role": "superadmin"
        }
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_update_user_not_found(
    client, admin_auth_headers
):
    """Test updating non-existent user"""
    response = await client.put(
        "/api/v1/admin/users/99999",
        headers=admin_auth_headers,
        json={
            "full_name": "Test"
        }
    )

    assert response.status_code == 400


# ============================================
# Tests: Delete User
# ============================================

@pytest.mark.asyncio
async def test_delete_user_admin(
    client, admin_auth_headers, async_session, regular_user
):
    """Test admin can delete user"""
    user_id = regular_user.id

    response = await client.delete(
        f"/api/v1/admin/users/{user_id}",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"].lower()

    # Verify user is deleted
    result = await async_session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    assert user is None


@pytest.mark.asyncio
async def test_delete_user_cannot_delete_self(
    client, admin_auth_headers, admin_user
):
    """Test admin cannot delete their own account"""
    response = await client.delete(
        f"/api/v1/admin/users/{admin_user.id}",
        headers=admin_auth_headers
    )

    assert response.status_code == 400
    assert "cannot delete your own account" in response.json()["detail"].lower()


# ============================================
# Tests: Approve User
# ============================================

@pytest.mark.asyncio
async def test_approve_user(
    client, admin_auth_headers, async_session, pending_user
):
    """Test approving a pending user"""
    response = await client.post(
        f"/api/v1/admin/users/{pending_user.id}/approve",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "approved successfully" in data["message"].lower()

    # Verify user is now active
    await async_session.refresh(pending_user)
    assert pending_user.is_active is True


@pytest.mark.asyncio
async def test_approve_user_already_active(
    client, admin_auth_headers, regular_user
):
    """Test approving already active user"""
    response = await client.post(
        f"/api/v1/admin/users/{regular_user.id}/approve",
        headers=admin_auth_headers
    )

    assert response.status_code == 400


# ============================================
# Tests: Toggle User Status
# ============================================

@pytest.mark.asyncio
async def test_toggle_user_status(
    client, admin_auth_headers, async_session, regular_user
):
    """Test toggling user active status"""
    original_status = regular_user.is_active

    response = await client.post(
        f"/api/v1/admin/users/{regular_user.id}/toggle-status",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["new_status"] != original_status

    # Verify in database
    await async_session.refresh(regular_user)
    assert regular_user.is_active != original_status


@pytest.mark.asyncio
async def test_toggle_user_status_cannot_modify_self(
    client, admin_auth_headers, admin_user
):
    """Test admin cannot toggle their own status"""
    response = await client.post(
        f"/api/v1/admin/users/{admin_user.id}/toggle-status",
        headers=admin_auth_headers
    )

    assert response.status_code == 400
    assert "cannot modify your own status" in response.json()["detail"].lower()


# ============================================
# Tests: Reset Query Count
# ============================================

@pytest.mark.asyncio
async def test_reset_query_count(
    client, admin_auth_headers, async_session, regular_user
):
    """Test resetting user's query count"""
    # Set initial query count
    regular_user.monthly_query_count = 100
    await async_session.commit()

    response = await client.post(
        f"/api/v1/admin/users/{regular_user.id}/reset-query-count",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    assert "reset" in response.json()["message"].lower()

    # Verify count is reset
    await async_session.refresh(regular_user)
    assert regular_user.monthly_query_count == 0
    assert regular_user.last_reset_date is not None


# ============================================
# Tests: System Statistics
# ============================================

@pytest.mark.asyncio
async def test_get_system_statistics(
    client, admin_auth_headers, admin_user, regular_user, premium_user, pending_user
):
    """Test getting system statistics"""
    response = await client.get(
        "/api/v1/admin/statistics/system",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Check expected fields
    assert "total_users" in data
    assert "active_users" in data
    assert "pending_users" in data
    assert "total_conversations" in data
    assert "total_messages" in data
    assert "premium_users" in data
    assert "free_users" in data
    assert "new_users_this_week" in data
    assert "most_active_users" in data

    # Verify counts
    assert data["total_users"] >= 4  # admin, regular, premium, pending
    assert data["pending_users"] >= 1  # pending user
    assert data["premium_users"] >= 1  # premium user


# ============================================
# Tests: Activity Report
# ============================================

@pytest.mark.asyncio
async def test_get_activity_report(
    client, admin_auth_headers, async_session, regular_user
):
    """Test getting activity report"""
    # Create some test data
    conv = Conversation(user_id=regular_user.id, agent_type="market")
    async_session.add(conv)
    await async_session.commit()
    await async_session.refresh(conv)

    msg = Message(
        conversation_id=conv.id,
        sender="user",
        content="Test query",
        timestamp=datetime.utcnow()
    )
    async_session.add(msg)
    await async_session.commit()

    response = await client.get(
        "/api/v1/admin/statistics/activity?days=30",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["period_days"] == 30
    assert "daily_queries" in data
    assert "queries_by_agent" in data
    assert "total_queries" in data


# ============================================
# Tests: Cleanup Conversations
# ============================================

@pytest.mark.asyncio
async def test_cleanup_empty_conversations(
    client, admin_auth_headers, async_session, regular_user
):
    """Test cleaning up empty conversations"""
    # Create an old empty conversation
    old_date = datetime.utcnow() - timedelta(days=10)
    empty_conv = Conversation(
        user_id=regular_user.id,
        agent_type="market",
        created_at=old_date
    )
    async_session.add(empty_conv)

    # Create a recent empty conversation (should not be deleted)
    recent_conv = Conversation(
        user_id=regular_user.id,
        agent_type="technical",
        created_at=datetime.utcnow()
    )
    async_session.add(recent_conv)

    await async_session.commit()

    response = await client.post(
        "/api/v1/admin/maintenance/cleanup-conversations?days_old=7",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert "deleted_count" in data
    assert data["deleted_count"] >= 1


# ============================================
# Tests: Integration Flow
# ============================================

@pytest.mark.asyncio
async def test_full_user_management_flow(
    client, admin_auth_headers, async_session
):
    """Test complete user management workflow"""
    # 1. Create a new user
    create_response = await client.post(
        "/api/v1/admin/users",
        headers=admin_auth_headers,
        json={
            "username": "workflow@example.com",
            "password": "password123",
            "full_name": "Workflow User",
            "role": "user",
            "is_active": False  # Start as pending
        }
    )
    assert create_response.status_code == 201
    user_id = create_response.json()["id"]

    # 2. Get pending users (should include new user)
    pending_response = await client.get(
        "/api/v1/admin/users/pending",
        headers=admin_auth_headers
    )
    assert pending_response.status_code == 200
    pending_users = pending_response.json()
    assert any(u["id"] == user_id for u in pending_users)

    # 3. Approve the user
    approve_response = await client.post(
        f"/api/v1/admin/users/{user_id}/approve",
        headers=admin_auth_headers
    )
    assert approve_response.status_code == 200

    # 4. Update user to premium
    update_response = await client.put(
        f"/api/v1/admin/users/{user_id}",
        headers=admin_auth_headers,
        json={"plan_type": "premium"}
    )
    assert update_response.status_code == 200

    # 5. Get user details
    details_response = await client.get(
        f"/api/v1/admin/users/{user_id}",
        headers=admin_auth_headers
    )
    assert details_response.status_code == 200
    details = details_response.json()
    assert details["plan_type"] == "premium"
    assert details["is_active"] is True

    # 6. Toggle status (deactivate)
    toggle_response = await client.post(
        f"/api/v1/admin/users/{user_id}/toggle-status",
        headers=admin_auth_headers
    )
    assert toggle_response.status_code == 200
    assert toggle_response.json()["new_status"] is False

    # 7. Delete the user
    delete_response = await client.delete(
        f"/api/v1/admin/users/{user_id}",
        headers=admin_auth_headers
    )
    assert delete_response.status_code == 200

    # 8. Verify deleted
    details_response = await client.get(
        f"/api/v1/admin/users/{user_id}",
        headers=admin_auth_headers
    )
    assert details_response.status_code == 404
