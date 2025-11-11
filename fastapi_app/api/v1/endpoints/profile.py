"""
Profile API Endpoints

Handles user profile management including:
- View profile information
- Update profile
- Change password
- Usage statistics
- Contact requests
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta

from fastapi_app.db.session import get_db
from fastapi_app.db.models import User, Conversation, Message, ContactRequest, UserSurvey, UserSurveyStage2
from fastapi_app.core.deps import get_current_active_user
import bcrypt

router = APIRouter()


# Pydantic Models
class ProfileResponse(BaseModel):
    username: str
    full_name: str
    role: str
    created_at: datetime
    plan_type: str
    query_count: int
    monthly_query_count: int


class PlanInfo(BaseModel):
    type: str
    status: str
    end_date: Optional[datetime]


class UsageStats(BaseModel):
    monthly_queries: int
    query_limit: str
    queries_remaining: str
    total_queries: int
    total_conversations: int
    total_messages: int
    account_age_days: int
    last_query_date: Optional[datetime]


class ContactRequestResponse(BaseModel):
    id: int
    name: str
    email: str
    company: Optional[str]
    message: str
    source: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileData(BaseModel):
    user: ProfileResponse
    plan_info: PlanInfo
    usage_stats: UsageStats
    contact_requests: List[ContactRequestResponse]


class UpdateProfileRequest(BaseModel):
    full_name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


@router.get("/profile", response_model=ProfileData, tags=["Profile"])
async def get_profile(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get complete profile information including usage stats and contact requests

    **Requires**: Authentication (Bearer token)

    **Returns**: Complete profile data with:
    - User information
    - Plan details
    - Usage statistics
    - Contact requests
    """
    # Get user info
    user_data = ProfileResponse(
        username=current_user.username,
        full_name=current_user.full_name or "",
        role=current_user.role,
        created_at=current_user.created_at,
        plan_type=current_user.plan_type,
        query_count=current_user.query_count,
        monthly_query_count=current_user.monthly_query_count
    )

    # Get plan info
    plan_info = PlanInfo(
        type=current_user.plan_type,
        status="Active" if current_user.plan_type == "premium" else "Free Tier",
        end_date=current_user.plan_end_date
    )

    # Calculate usage stats
    # Get total conversations
    conv_result = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.user_id == current_user.id)
    )
    total_conversations = conv_result.scalar() or 0

    # Get total messages
    msg_result = await db.execute(
        select(func.count(Message.id))
        .select_from(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.user_id == current_user.id)
    )
    total_messages = msg_result.scalar() or 0

    # Calculate account age
    account_age_days = (datetime.utcnow() - current_user.created_at).days

    # Get base query limit
    base_limit = current_user.get_query_limit()

    # Add survey bonuses for free tier users
    total_limit = base_limit
    if current_user.plan_type == 'free':
        # Check Stage 1 survey completion
        stage1_result = await db.execute(
            select(UserSurvey).where(UserSurvey.user_id == current_user.id)
        )
        stage1_survey = stage1_result.scalar_one_or_none()
        if stage1_survey:
            total_limit += stage1_survey.bonus_queries_granted

        # Check Stage 2 survey completion
        stage2_result = await db.execute(
            select(UserSurveyStage2).where(UserSurveyStage2.user_id == current_user.id)
        )
        stage2_survey = stage2_result.scalar_one_or_none()
        if stage2_survey:
            total_limit += stage2_survey.bonus_queries_granted

    query_limit = total_limit
    query_limit_str = "Unlimited" if query_limit == float('inf') else str(int(query_limit))

    # Calculate remaining queries
    if query_limit == float('inf'):
        queries_remaining = "Unlimited"
    else:
        remaining = max(0, int(query_limit) - current_user.monthly_query_count)
        queries_remaining = str(remaining)

    usage_stats = UsageStats(
        monthly_queries=current_user.monthly_query_count,
        query_limit=query_limit_str,
        queries_remaining=queries_remaining,
        total_queries=current_user.query_count,
        total_conversations=total_conversations,
        total_messages=total_messages,
        account_age_days=account_age_days,
        last_query_date=current_user.last_query_date
    )

    # Get contact requests
    contact_result = await db.execute(
        select(ContactRequest).where(
            ContactRequest.email == current_user.username
        ).order_by(ContactRequest.created_at.desc()).limit(10)
    )
    contact_requests = contact_result.scalars().all()

    contact_requests_data = [
        ContactRequestResponse(
            id=req.id,
            name=req.name,
            email=req.email,
            company=req.company,
            message=req.message,
            source=req.source,
            status=req.status,
            created_at=req.created_at
        )
        for req in contact_requests
    ]

    return ProfileData(
        user=user_data,
        plan_info=plan_info,
        usage_stats=usage_stats,
        contact_requests=contact_requests_data
    )


@router.put("/profile", response_model=ProfileResponse, tags=["Profile"])
async def update_profile(
    update_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user profile information

    **Requires**: Authentication (Bearer token)

    **Body**:
    - full_name: New full name

    **Returns**: Updated user profile
    """
    current_user.full_name = update_data.full_name
    await db.commit()
    await db.refresh(current_user)

    return ProfileResponse(
        username=current_user.username,
        full_name=current_user.full_name or "",
        role=current_user.role,
        created_at=current_user.created_at,
        plan_type=current_user.plan_type,
        query_count=current_user.query_count,
        monthly_query_count=current_user.monthly_query_count
    )


@router.post("/profile/change-password", tags=["Profile"])
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change user password

    **Requires**: Authentication (Bearer token)

    **Body**:
    - current_password: Current password
    - new_password: New password (min 8 characters)
    - confirm_password: Confirm new password

    **Returns**: Success message
    """
    # Validate passwords match
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )

    # Validate new password length
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    # Verify current password
    if not bcrypt.checkpw(
        password_data.current_password.encode('utf-8'),
        current_user.password_hash.encode('utf-8')
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Hash new password
    new_password_hash = bcrypt.hashpw(
        password_data.new_password.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

    # Update password
    current_user.password_hash = new_password_hash
    await db.commit()

    return {"message": "Password updated successfully"}
