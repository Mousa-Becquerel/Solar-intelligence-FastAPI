"""
Comprehensive tests for Authentication Endpoints

Tests all new authentication features:
- Password reset
- Email verification
- Account deletion
- Waitlist integration
"""
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from httpx import AsyncClient, ASGITransport
from fastapi import status

# Import from fastapi_app
import sys
sys.path.insert(0, '/app')

from fastapi_app.main import app
from fastapi_app.db.models import User, Waitlist, Base
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

    # Manually verify email for testing (bypass email verification requirement)
    user.email_verified = True
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

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


# ============================================================================
# Password Reset Tests
# ============================================================================

@pytest.mark.asyncio
async def test_request_password_reset_success(client, test_user):
    """Test requesting password reset for existing user"""
    response = await client.post(
        "/api/v1/auth/request-password-reset",
        json={"email": "testuser@example.com"}
    )

    assert response.status_code == 200
    assert "password reset link" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_request_password_reset_nonexistent_email(client):
    """Test requesting password reset for non-existent email (should not reveal)"""
    response = await client.post(
        "/api/v1/auth/request-password-reset",
        json={"email": "nonexistent@example.com"}
    )

    # Should still return success to prevent email enumeration
    assert response.status_code == 200
    assert "password reset link" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_reset_password_with_valid_token(async_session, client, test_user):
    """Test resetting password with valid token"""
    # First, request password reset to get token
    success, error = await AuthService.request_password_reset(
        db=async_session,
        email="testuser@example.com"
    )

    assert success is True
    assert error is None

    # Fetch user to get reset token
    await async_session.refresh(test_user)
    reset_token = test_user.reset_token

    assert reset_token is not None

    # Now reset password
    response = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": "NewPassword123!"
        }
    )

    assert response.status_code == 200
    assert "successfully reset" in response.json()["message"].lower()

    # Verify old password doesn't work
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser@example.com",
            "password": "Test123!"
        }
    )
    assert login_response.status_code == 401

    # Verify new password works
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser@example.com",
            "password": "NewPassword123!"
        }
    )
    assert login_response.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_with_invalid_token(client):
    """Test resetting password with invalid token"""
    response = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": "invalid-token-123",
            "new_password": "NewPassword123!"
        }
    )

    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reset_password_too_short(async_session, client, test_user):
    """Test resetting password with password that's too short"""
    # Get valid reset token
    success, error = await AuthService.request_password_reset(
        db=async_session,
        email="testuser@example.com"
    )
    await async_session.refresh(test_user)
    reset_token = test_user.reset_token

    # Try to reset with short password
    response = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": "short"
        }
    )

    assert response.status_code == 400
    assert "8 characters" in response.json()["detail"].lower()


# ============================================================================
# Email Verification Tests
# ============================================================================

@pytest.mark.asyncio
async def test_send_verification_email(client, auth_headers):
    """Test sending verification email"""
    response = await client.post(
        "/api/v1/auth/send-verification",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert "verification email sent" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_send_verification_already_verified(async_session, client, test_user, auth_headers):
    """Test sending verification when already verified"""
    # Mark user as verified
    test_user.email_verified = True
    await async_session.commit()

    response = await client.post(
        "/api/v1/auth/send-verification",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert "already verified" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_verify_email_with_valid_token(async_session, client, test_user):
    """Test verifying email with valid token"""
    # Send verification email to get token
    success, error = await AuthService.send_verification_email(
        db=async_session,
        user=test_user
    )

    assert success is True
    await async_session.refresh(test_user)
    verification_token = test_user.verification_token

    assert verification_token is not None

    # Verify email
    response = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": verification_token}
    )

    assert response.status_code == 200
    assert "successfully verified" in response.json()["message"].lower()

    # Check user is now verified
    await async_session.refresh(test_user)
    assert test_user.email_verified is True
    assert test_user.verification_token is None


@pytest.mark.asyncio
async def test_verify_email_with_invalid_token(client):
    """Test verifying email with invalid token"""
    response = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": "invalid-token-456"}
    )

    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()


# ============================================================================
# Account Deletion Tests
# ============================================================================

@pytest.mark.asyncio
async def test_request_account_deletion(client, auth_headers):
    """Test requesting account deletion"""
    response = await client.post(
        "/api/v1/auth/request-deletion",
        json={"reason": "No longer need the service"},
        headers=auth_headers
    )

    assert response.status_code == 200
    assert "30 days" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_request_account_deletion_without_reason(client, auth_headers):
    """Test requesting account deletion without reason"""
    response = await client.post(
        "/api/v1/auth/request-deletion",
        json={},
        headers=auth_headers
    )

    assert response.status_code == 200
    assert "30 days" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_cancel_account_deletion(async_session, client, test_user, auth_headers):
    """Test cancelling account deletion"""
    # First request deletion
    success, error = await AuthService.request_account_deletion(
        db=async_session,
        user=test_user,
        reason="Changed my mind test"
    )

    assert success is True
    await async_session.refresh(test_user)
    assert test_user.deleted is True

    # Now cancel it
    response = await client.post(
        "/api/v1/auth/cancel-deletion",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert "cancelled" in response.json()["message"].lower()

    # Verify deletion was cancelled
    await async_session.refresh(test_user)
    assert test_user.deleted is False
    assert test_user.deletion_requested_at is None


@pytest.mark.asyncio
async def test_cancel_deletion_when_not_requested(client, auth_headers):
    """Test cancelling deletion when none was requested"""
    response = await client.post(
        "/api/v1/auth/cancel-deletion",
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "not marked" in response.json()["detail"].lower()


# ============================================================================
# Waitlist Tests
# ============================================================================

@pytest.mark.asyncio
async def test_join_waitlist(client):
    """Test joining waitlist"""
    response = await client.post(
        "/api/v1/auth/waitlist/join",
        json={
            "email": "newuser@example.com",
            "interested_agents": "market,solar,price"
        }
    )

    assert response.status_code == 200
    assert "added to waitlist" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_join_waitlist_duplicate_email(async_session, client):
    """Test joining waitlist with duplicate email"""
    # Add to waitlist first time
    email = "duplicate@example.com"
    await AuthService.add_to_waitlist(
        db=async_session,
        email=email,
        interested_agents="market"
    )

    # Try to add again
    response = await client.post(
        "/api/v1/auth/waitlist/join",
        json={"email": email}
    )

    assert response.status_code == 400
    assert "already" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_check_waitlist_status_exists(async_session, client):
    """Test checking waitlist status for existing email"""
    email = "inwaitlist@example.com"

    # Add to waitlist
    await AuthService.add_to_waitlist(
        db=async_session,
        email=email
    )

    # Check status
    response = await client.get(f"/api/v1/auth/waitlist/check/{email}")

    assert response.status_code == 200
    assert response.json()["in_waitlist"] is True


@pytest.mark.asyncio
async def test_check_waitlist_status_not_exists(client):
    """Test checking waitlist status for non-existent email"""
    response = await client.get("/api/v1/auth/waitlist/check/notin@example.com")

    assert response.status_code == 200
    assert response.json()["in_waitlist"] is False


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.asyncio
async def test_full_password_reset_flow(async_session, client, test_user):
    """Test complete password reset flow from request to login"""
    original_password = "Test123!"
    new_password = "SuperSecure456!"

    # Step 1: Request password reset
    response = await client.post(
        "/api/v1/auth/request-password-reset",
        json={"email": "testuser@example.com"}
    )
    assert response.status_code == 200

    # Step 2: Get reset token from database
    await async_session.refresh(test_user)
    reset_token = test_user.reset_token
    assert reset_token is not None

    # Step 3: Reset password with token
    response = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": new_password
        }
    )
    assert response.status_code == 200

    # Step 4: Try to login with new password
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser@example.com",
            "password": new_password
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_full_email_verification_flow(async_session, client, test_user, auth_headers):
    """Test complete email verification flow"""
    # Step 1: User is not verified initially
    assert test_user.email_verified is False

    # Step 2: Send verification email
    response = await client.post(
        "/api/v1/auth/send-verification",
        headers=auth_headers
    )
    assert response.status_code == 200

    # Step 3: Get verification token
    await async_session.refresh(test_user)
    verification_token = test_user.verification_token
    assert verification_token is not None

    # Step 4: Verify email with token
    response = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": verification_token}
    )
    assert response.status_code == 200

    # Step 5: Check user is verified
    await async_session.refresh(test_user)
    assert test_user.email_verified is True


@pytest.mark.asyncio
async def test_full_account_deletion_flow(async_session, client, test_user, auth_headers):
    """Test complete account deletion and cancellation flow"""
    # Step 1: Request deletion
    response = await client.post(
        "/api/v1/auth/request-deletion",
        json={"reason": "Just testing"},
        headers=auth_headers
    )
    assert response.status_code == 200

    # Step 2: Verify deletion was marked
    await async_session.refresh(test_user)
    assert test_user.deleted is True
    assert test_user.deletion_requested_at is not None

    # Step 3: User can still login during grace period
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser@example.com",
            "password": "Test123!"
        }
    )
    assert response.status_code == 200

    # Step 4: Cancel deletion
    response = await client.post(
        "/api/v1/auth/cancel-deletion",
        headers=auth_headers
    )
    assert response.status_code == 200

    # Step 5: Verify deletion was cancelled
    await async_session.refresh(test_user)
    assert test_user.deleted is False
    assert test_user.deletion_requested_at is None


@pytest.mark.asyncio
async def test_unauthorized_access_to_protected_endpoints(client):
    """Test that protected endpoints require authentication"""
    protected_endpoints = [
        ("/api/v1/auth/send-verification", "POST"),
        ("/api/v1/auth/request-deletion", "POST"),
        ("/api/v1/auth/cancel-deletion", "POST"),
    ]

    for endpoint, method in protected_endpoints:
        if method == "POST":
            response = await client.post(endpoint, json={})
        else:
            response = await client.get(endpoint)

        assert response.status_code == 401  # Unauthorized
