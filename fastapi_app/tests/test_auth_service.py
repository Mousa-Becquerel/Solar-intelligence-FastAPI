"""
Comprehensive tests for AuthService

Run these tests inside the Docker container to ensure they work in the deployed environment.
"""
import pytest
import pytest_asyncio
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

# Import from fastapi_app
import sys
sys.path.insert(0, '/app')

from fastapi_app.db.models import User, Base
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


@pytest.mark.asyncio
async def test_register_user_success(async_session):
    """Test successful user registration"""
    user, error = await AuthService.register_user(
        db=async_session,
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        password="SecurePass123!",
        job_title="Developer",
        company_name="Test Corp",
        country="USA",
        company_size="10-50",
        terms_agreement=True,
        communications=False
    )

    assert user is not None, "User should be created"
    assert error is None, "No error should occur"
    assert user.username == "john.doe@example.com"
    assert user.full_name == "John Doe"
    assert user.is_active is True
    assert user.verify_password("SecurePass123!")


@pytest.mark.asyncio
async def test_register_duplicate_user(async_session):
    """Test registering duplicate user fails"""
    # Register first user
    user1, error1 = await AuthService.register_user(
        db=async_session,
        first_name="Jane",
        last_name="Smith",
        email="jane@example.com",
        password="Pass123!",
        job_title="Designer",
        company_name="Design Co",
        country="UK",
        company_size="1-10",
        terms_agreement=True
    )

    assert user1 is not None
    assert error1 is None

    # Try to register duplicate
    user2, error2 = await AuthService.register_user(
        db=async_session,
        first_name="Jane",
        last_name="Smith",
        email="jane@example.com",  # Same email
        password="Pass123!",
        job_title="Designer",
        company_name="Design Co",
        country="UK",
        company_size="1-10",
        terms_agreement=True
    )

    assert user2 is None, "Duplicate user should not be created"
    assert error2 == "An account with this email already exists"


@pytest.mark.asyncio
async def test_register_without_terms(async_session):
    """Test registration fails without terms agreement"""
    user, error = await AuthService.register_user(
        db=async_session,
        first_name="Bob",
        last_name="Test",
        email="bob@example.com",
        password="Pass123!",
        job_title="Tester",
        company_name="Test Inc",
        country="Canada",
        company_size="50-100",
        terms_agreement=False  # No terms agreement
    )

    assert user is None
    assert "terms of service" in error.lower()


@pytest.mark.asyncio
async def test_authenticate_user_success(async_session):
    """Test successful authentication"""
    # First register a user
    user, _ = await AuthService.register_user(
        db=async_session,
        first_name="Auth",
        last_name="Test",
        email="auth@example.com",
        password="AuthPass123!",
        job_title="Developer",
        company_name="Auth Corp",
        country="USA",
        company_size="10-50",
        terms_agreement=True
    )

    # Now authenticate
    auth_user, error = await AuthService.authenticate_user(
        db=async_session,
        username="auth@example.com",
        password="AuthPass123!"
    )

    assert auth_user is not None
    assert error is None
    assert auth_user.id == user.id


@pytest.mark.asyncio
async def test_authenticate_wrong_password(async_session):
    """Test authentication fails with wrong password"""
    # Register user
    await AuthService.register_user(
        db=async_session,
        first_name="Wrong",
        last_name="Pass",
        email="wrong@example.com",
        password="CorrectPass123!",
        job_title="Developer",
        company_name="Test Corp",
        country="USA",
        company_size="10-50",
        terms_agreement=True
    )

    # Try wrong password
    auth_user, error = await AuthService.authenticate_user(
        db=async_session,
        username="wrong@example.com",
        password="WrongPass123!"
    )

    assert auth_user is None
    assert "Invalid username or password" in error


@pytest.mark.asyncio
async def test_authenticate_nonexistent_user(async_session):
    """Test authentication fails for non-existent user"""
    auth_user, error = await AuthService.authenticate_user(
        db=async_session,
        username="nonexistent@example.com",
        password="SomePass123!"
    )

    assert auth_user is None
    assert "Invalid username or password" in error


@pytest.mark.asyncio
async def test_get_user_by_id(async_session):
    """Test getting user by ID"""
    # Register user
    user, _ = await AuthService.register_user(
        db=async_session,
        first_name="Get",
        last_name="ById",
        email="getbyid@example.com",
        password="Pass123!",
        job_title="Developer",
        company_name="Test Corp",
        country="USA",
        company_size="10-50",
        terms_agreement=True
    )

    # Get by ID
    found_user = await AuthService.get_user_by_id(async_session, user.id)

    assert found_user is not None
    assert found_user.id == user.id
    assert found_user.username == "getbyid@example.com"


@pytest.mark.asyncio
async def test_get_user_by_username(async_session):
    """Test getting user by username"""
    # Register user
    user, _ = await AuthService.register_user(
        db=async_session,
        first_name="Get",
        last_name="ByUsername",
        email="getbyusername@example.com",
        password="Pass123!",
        job_title="Developer",
        company_name="Test Corp",
        country="USA",
        company_size="10-50",
        terms_agreement=True
    )

    # Get by username
    found_user = await AuthService.get_user_by_username(
        async_session,
        "getbyusername@example.com"
    )

    assert found_user is not None
    assert found_user.id == user.id
    assert found_user.username == "getbyusername@example.com"


@pytest.mark.asyncio
async def test_update_password(async_session):
    """Test password update"""
    # Register user
    user, _ = await AuthService.register_user(
        db=async_session,
        first_name="Update",
        last_name="Pass",
        email="updatepass@example.com",
        password="OldPass123!",
        job_title="Developer",
        company_name="Test Corp",
        country="USA",
        company_size="10-50",
        terms_agreement=True
    )

    # Update password
    success, error = await AuthService.update_user_password(
        async_session,
        user,
        "NewPass123!"
    )

    assert success is True
    assert error is None

    # Verify new password works
    assert user.verify_password("NewPass123!")
    assert not user.verify_password("OldPass123!")


@pytest.mark.asyncio
async def test_update_password_too_short(async_session):
    """Test password update fails if too short"""
    # Register user
    user, _ = await AuthService.register_user(
        db=async_session,
        first_name="Short",
        last_name="Pass",
        email="shortpass@example.com",
        password="ValidPass123!",
        job_title="Developer",
        company_name="Test Corp",
        country="USA",
        company_size="10-50",
        terms_agreement=True
    )

    # Try to update with short password
    success, error = await AuthService.update_user_password(
        async_session,
        user,
        "short"
    )

    assert success is False
    assert "at least 8 characters" in error


@pytest.mark.asyncio
async def test_activate_deactivate_user(async_session):
    """Test user activation and deactivation"""
    # Register user
    user, _ = await AuthService.register_user(
        db=async_session,
        first_name="Toggle",
        last_name="Active",
        email="toggle@example.com",
        password="Pass123!",
        job_title="Developer",
        company_name="Test Corp",
        country="USA",
        company_size="10-50",
        terms_agreement=True
    )

    assert user.is_active is True

    # Deactivate
    success, error = await AuthService.deactivate_user(async_session, user)
    assert success is True
    assert error is None

    # Refresh from DB
    await async_session.refresh(user)
    assert user.is_active is False

    # Activate
    success, error = await AuthService.activate_user(async_session, user)
    assert success is True
    assert error is None

    # Refresh from DB
    await async_session.refresh(user)
    assert user.is_active is True


@pytest.mark.asyncio
async def test_upgrade_to_premium(async_session):
    """Test upgrading user to premium"""
    # Register user
    user, _ = await AuthService.register_user(
        db=async_session,
        first_name="Premium",
        last_name="User",
        email="premium@example.com",
        password="Pass123!",
        job_title="Developer",
        company_name="Test Corp",
        country="USA",
        company_size="10-50",
        terms_agreement=True
    )

    assert user.plan_type == "free"

    # Upgrade to premium
    success, error = await AuthService.upgrade_to_premium(
        async_session,
        user,
        duration_days=30
    )

    assert success is True
    assert error is None

    # Refresh from DB
    await async_session.refresh(user)
    assert user.plan_type == "premium"


if __name__ == "__main__":
    print("Run tests with: pytest test_auth_service.py -v")
