"""
Authentication endpoints - FastAPI version
JWT-based authentication (replaces Flask-Login)
"""
from datetime import datetime, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from fastapi_app.core.config import settings
from fastapi_app.db.session import get_db
from fastapi_app.db.models import User
from fastapi_app.core.deps import get_current_active_user
from fastapi_app.services.auth_service import AuthService

router = APIRouter()

# Initialize limiter for this router
limiter = Limiter(key_func=get_remote_address)


# Schemas
class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User information response"""
    id: int
    username: str
    full_name: str
    role: str
    is_active: bool
    plan_type: str
    monthly_query_count: int = 0

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """User registration schema - matches Flask registration form"""
    first_name: str
    last_name: str
    email: str  # username
    password: str
    job_title: str
    company_name: str
    country: str
    company_size: str
    terms_agreement: bool
    communications: bool = False


class PasswordResetRequest(BaseModel):
    """Password reset request schema"""
    email: str


class PasswordReset(BaseModel):
    """Password reset completion schema"""
    token: str
    new_password: str


class EmailVerificationRequest(BaseModel):
    """Email verification request schema"""
    token: str


class AccountDeletionRequest(BaseModel):
    """Account deletion request schema"""
    reason: str | None = None


class WaitlistJoin(BaseModel):
    """Waitlist join schema"""
    email: str
    interested_agents: str | None = None


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str


class WaitlistStatusResponse(BaseModel):
    """Waitlist status response"""
    in_waitlist: bool
    message: str


def create_access_token(user_id: int) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow()
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt


@router.post("/login", response_model=Token, tags=["Authentication"])
@limiter.limit("5/minute")  # Prevent brute-force attacks - 5 login attempts per minute
async def login(
    request: Request,  # Required for rate limiting
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(get_db)
):
    """
    Login endpoint - returns JWT token

    **OAuth2 Password Flow**:
    - username: User's email/username
    - password: User's password

    Returns JWT token for subsequent authenticated requests.
    """
    # Authenticate user using service
    user, error = await AuthService.authenticate_user(
        db=db,
        username=form_data.username,
        password=form_data.password
    )

    if error or not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error or "Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
@limiter.limit("3/hour")  # Prevent spam registration - 3 registrations per hour per IP
async def register(
    request: Request,  # Required for rate limiting
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user

    Matches Flask registration - collects full user profile data
    """
    # Validate terms agreement
    if not user_data.terms_agreement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must agree to the terms of service and privacy policy"
        )

    # Check if user exists
    result = await db.execute(
        select(User).where(User.username == user_data.email)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )

    # Create new user - matches Flask behavior
    consent_timestamp = datetime.utcnow()
    new_user = User(
        username=user_data.email,  # Use email as username
        full_name=f"{user_data.first_name} {user_data.last_name}",
        role='user',
        is_active=True,  # Auto-activate in FastAPI (Flask checks waitlist)

        # GDPR Consent Tracking
        gdpr_consent_given=True,
        gdpr_consent_date=consent_timestamp,
        terms_accepted=True,
        terms_accepted_date=consent_timestamp,
        marketing_consent=user_data.communications,
        marketing_consent_date=consent_timestamp if user_data.communications else None,
        privacy_policy_version='1.0',
        terms_version='1.0'
    )
    new_user.set_password(user_data.password)

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.get("/me", response_model=UserResponse, tags=["Authentication"])
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user information

    Requires authentication (Bearer token in Authorization header)
    """
    return current_user


@router.post("/logout", tags=["Authentication"])
async def logout():
    """
    Logout endpoint

    **Note**: JWT is stateless, so this just returns success.
    Client should delete the token.
    """
    return {"message": "Successfully logged out. Please delete your token."}


# ============================================================================
# Password Reset Endpoints
# ============================================================================

@router.post("/request-password-reset", response_model=MessageResponse, tags=["Password Reset"])
async def request_password_reset(
    request_data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request a password reset email

    **Flow**:
    1. User provides email address
    2. System generates secure token (valid 1 hour)
    3. Email sent with reset link
    4. User clicks link and provides new password

    **Note**: Always returns success (doesn't reveal if email exists)
    """
    success, error = await AuthService.request_password_reset(
        db=db,
        email=request_data.email,
        reset_url=f"{settings.FRONTEND_URL}/reset-password"
    )

    # Always return success to prevent email enumeration
    return {
        "message": "If the email exists, a password reset link has been sent."
    }


@router.post("/reset-password", response_model=MessageResponse, tags=["Password Reset"])
async def reset_password(
    reset_data: PasswordReset,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset password using token from email

    **Requirements**:
    - Valid token (from email)
    - Token not expired (< 1 hour old)
    - New password meets requirements (min 8 chars)

    **Returns**: Success message if password reset
    """
    success, error = await AuthService.reset_password_with_token(
        db=db,
        token=reset_data.token,
        new_password=reset_data.new_password
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {"message": "Password successfully reset. You can now login with your new password."}


# ============================================================================
# Email Verification Endpoints
# ============================================================================

@router.post("/send-verification", response_model=MessageResponse, tags=["Email Verification"])
async def send_verification_email(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Send email verification email to current user

    **Requires**: Authentication (Bearer token)

    **Flow**:
    1. Generates verification token (valid 24 hours)
    2. Sends email with verification link
    3. User clicks link to verify email
    """
    if current_user.email_verified:
        return {"message": "Email already verified."}

    success, error = await AuthService.send_verification_email(
        db=db,
        user=current_user,
        verification_url=f"{settings.FRONTEND_URL}/verify-email"
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {"message": "Verification email sent. Please check your inbox."}


@router.post("/verify-email", response_model=MessageResponse, tags=["Email Verification"])
async def verify_email(
    verification_data: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify email using token from email

    **Requirements**:
    - Valid token (from email)
    - Token not expired (< 24 hours old)

    **Returns**: Success message if email verified
    """
    success, error = await AuthService.verify_email_with_token(
        db=db,
        token=verification_data.token
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {"message": "Email successfully verified!"}


# ============================================================================
# Account Deletion Endpoints
# ============================================================================

@router.post("/request-deletion", response_model=MessageResponse, tags=["Account Management"])
async def request_account_deletion(
    deletion_data: AccountDeletionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Request account deletion (30-day grace period)

    **Requires**: Authentication (Bearer token)

    **Flow**:
    1. Account marked for deletion
    2. 30-day grace period starts
    3. User can still login during grace period
    4. User can cancel deletion anytime
    5. After 30 days, account permanently deleted (scheduled job)

    **Note**: Optionally provide reason for deletion
    """
    success, error = await AuthService.request_account_deletion(
        db=db,
        user=current_user,
        reason=deletion_data.reason
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {
        "message": "Account deletion requested. You have 30 days to cancel this request. "
                  "A confirmation email has been sent."
    }


@router.post("/cancel-deletion", response_model=MessageResponse, tags=["Account Management"])
async def cancel_account_deletion(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Cancel account deletion request

    **Requires**: Authentication (Bearer token)

    **Only works if**:
    - Account is marked for deletion
    - 30-day grace period hasn't expired

    **Returns**: Success message if deletion cancelled
    """
    success, error = await AuthService.cancel_account_deletion(
        db=db,
        user=current_user
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {"message": "Account deletion cancelled. Your account is safe!"}


# ============================================================================
# Waitlist Endpoints
# ============================================================================

@router.post("/waitlist/join", response_model=MessageResponse, tags=["Waitlist"])
async def join_waitlist(
    waitlist_data: WaitlistJoin,
    db: AsyncSession = Depends(get_db)
):
    """
    Join the waitlist

    **Public endpoint** - no authentication required

    **Parameters**:
    - email: Email address
    - interested_agents: Optional comma-separated list (e.g., "market,solar,price")

    **Returns**: Success message
    """
    success, error = await AuthService.add_to_waitlist(
        db=db,
        email=waitlist_data.email,
        interested_agents=waitlist_data.interested_agents
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {
        "message": "Successfully added to waitlist! We'll notify you when access is available."
    }


@router.get("/waitlist/check/{email}", response_model=WaitlistStatusResponse, tags=["Waitlist"])
async def check_waitlist_status(
    email: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if email is in waitlist

    **Public endpoint** - no authentication required

    **Parameters**:
    - email: Email address to check

    **Returns**: Waitlist status (in_waitlist: true/false)
    """
    in_waitlist, message = await AuthService.check_waitlist_status(
        db=db,
        email=email
    )

    return {
        "in_waitlist": in_waitlist,
        "message": message or "Email not in waitlist"
    }
