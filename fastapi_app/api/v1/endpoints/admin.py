"""
Admin API Endpoints
Handles administrative operations: user management, statistics, and system maintenance
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from fastapi_app.db.session import get_db
from fastapi_app.core.deps import get_current_admin_user
from fastapi_app.db.models import User
from fastapi_app.services.admin_service import AdminService

router = APIRouter()


# ============================================
# Pydantic Schemas
# ============================================

class UserResponse(BaseModel):
    """Response for user data"""
    id: int
    username: str
    full_name: str
    role: str
    plan_type: str
    is_active: bool
    created_at: datetime
    email_verified: bool
    query_count: int
    monthly_query_count: int

    class Config:
        from_attributes = True


class UserDetailResponse(BaseModel):
    """Detailed user information"""
    id: int
    username: str
    full_name: str
    role: str
    plan_type: str
    is_active: bool
    created_at: Optional[str]
    email_verified: bool
    query_count: int
    monthly_query_count: int
    last_query_date: Optional[str]
    conversation_count: int
    message_count: int
    hired_agents: List[str]
    gdpr_consent_given: bool
    terms_accepted: bool


class UserCreateRequest(BaseModel):
    """Request to create a new user"""
    username: str = Field(..., description="User's email/username")
    password: str = Field(..., min_length=8, description="User's password")
    full_name: str = Field(..., description="User's full name")
    role: str = Field(default="user", description="User role: 'user' or 'admin'")
    plan_type: str = Field(default="free", description="Plan type: 'free', 'premium', 'max'")
    is_active: bool = Field(default=True, description="Whether user is active immediately")


class UserUpdateRequest(BaseModel):
    """Request to update user information"""
    full_name: Optional[str] = Field(None, description="New full name")
    role: Optional[str] = Field(None, description="New role: 'user' or 'admin'")
    plan_type: Optional[str] = Field(None, description="New plan: 'free', 'premium', 'max'")
    is_active: Optional[bool] = Field(None, description="New active status")


class SystemStatsResponse(BaseModel):
    """System-wide statistics"""
    total_users: int
    active_users: int
    pending_users: int
    total_conversations: int
    total_messages: int
    premium_users: int
    free_users: int
    new_users_this_week: int
    most_active_users: List[dict]


class ActivityReportResponse(BaseModel):
    """User activity report"""
    period_days: int
    daily_queries: List[dict]
    queries_by_agent: dict
    total_queries: int


class GenericMessage(BaseModel):
    """Generic success message"""
    message: str


class UserApprovalResponse(BaseModel):
    """Response for user approval"""
    success: bool
    message: str


class UserToggleResponse(BaseModel):
    """Response for user status toggle"""
    success: bool
    new_status: bool
    message: str


class CleanupResponse(BaseModel):
    """Response for cleanup operation"""
    deleted_count: int
    message: str


# ============================================
# User Management Endpoints
# ============================================

@router.get(
    "/users",
    response_model=List[UserResponse],
    summary="Get all users",
    description="Get list of all users in the system (admin only)"
)
async def get_all_users(
    include_inactive: bool = Query(True, description="Include inactive users"),
    limit: Optional[int] = Query(None, description="Limit number of results"),
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all users in the system"""
    users = await AdminService.get_all_users(db, include_inactive, limit)
    return users


@router.get(
    "/users/pending",
    response_model=List[UserResponse],
    summary="Get pending users",
    description="Get all users awaiting approval (admin only)"
)
async def get_pending_users(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all pending users"""
    users = await AdminService.get_pending_users(db)
    return users


@router.get(
    "/users/search",
    response_model=List[UserResponse],
    summary="Search users",
    description="Search users by username or full name (admin only)"
)
async def search_users(
    q: str = Query(..., min_length=2, description="Search term"),
    limit: int = Query(50, description="Maximum number of results"),
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Search users by username or full name"""
    users = await AdminService.search_users(db, q, limit)
    return users


@router.get(
    "/users/{user_id}",
    response_model=UserDetailResponse,
    summary="Get user details",
    description="Get detailed information about a specific user (admin only)"
)
async def get_user_details(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed user information"""
    user_details = await AdminService.get_user_details(db, user_id)

    if not user_details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user_details


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create user",
    description="Create a new user account (admin only)"
)
async def create_user(
    request: UserCreateRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user"""
    user, error = await AdminService.create_user_by_admin(
        db=db,
        username=request.username,
        password=request.password,
        full_name=request.full_name,
        role=request.role,
        plan_type=request.plan_type,
        is_active=request.is_active
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return user


@router.put(
    "/users/{user_id}",
    response_model=GenericMessage,
    summary="Update user",
    description="Update user information (admin only)"
)
async def update_user(
    user_id: int,
    request: UserUpdateRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user information"""
    success, error = await AdminService.update_user_by_admin(
        db=db,
        user_id=user_id,
        full_name=request.full_name,
        role=request.role,
        plan_type=request.plan_type,
        is_active=request.is_active
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to update user"
        )

    return {"message": f"User {user_id} updated successfully"}


@router.delete(
    "/users/{user_id}",
    response_model=GenericMessage,
    summary="Delete user",
    description="Permanently delete a user and all associated data (admin only)"
)
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user permanently"""
    # Prevent admin from deleting themselves
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    success, error = await AdminService.delete_user_by_admin(db, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to delete user"
        )

    return {"message": f"User {user_id} deleted successfully"}


@router.post(
    "/users/{user_id}/approve",
    response_model=UserApprovalResponse,
    summary="Approve user",
    description="Approve a pending user account (admin only)"
)
async def approve_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Approve a pending user"""
    success, error = await AdminService.approve_user(db, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to approve user"
        )

    return {
        "success": True,
        "message": f"User {user_id} approved successfully"
    }


@router.post(
    "/users/{user_id}/toggle-status",
    response_model=UserToggleResponse,
    summary="Toggle user status",
    description="Toggle user active/inactive status (admin only)"
)
async def toggle_user_status(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle user's active status"""
    # Prevent admin from deactivating themselves
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own status"
        )

    success, error, new_status = await AdminService.toggle_user_active_status(db, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to toggle user status"
        )

    status_text = "activated" if new_status else "deactivated"
    return {
        "success": True,
        "new_status": new_status,
        "message": f"User {user_id} {status_text} successfully"
    }


@router.post(
    "/users/{user_id}/reset-query-count",
    response_model=GenericMessage,
    summary="Reset query count",
    description="Reset user's monthly query count (admin only)"
)
async def reset_query_count(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Reset user's monthly query count"""
    success, error = await AdminService.reset_user_query_count(db, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to reset query count"
        )

    return {"message": f"Query count reset for user {user_id}"}


# ============================================
# Statistics & Analytics Endpoints
# ============================================

@router.get(
    "/statistics/system",
    response_model=SystemStatsResponse,
    summary="Get system statistics",
    description="Get system-wide statistics (admin only)"
)
async def get_system_statistics(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get system-wide statistics"""
    stats = await AdminService.get_system_statistics(db)
    return stats


@router.get(
    "/statistics/activity",
    response_model=ActivityReportResponse,
    summary="Get activity report",
    description="Get user activity report for specified period (admin only)"
)
async def get_activity_report(
    days: int = Query(30, ge=1, le=365, description="Number of days to include"),
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user activity report"""
    report = await AdminService.get_user_activity_report(db, days)
    return report


# ============================================
# System Maintenance Endpoints
# ============================================

@router.post(
    "/maintenance/cleanup-conversations",
    response_model=CleanupResponse,
    summary="Cleanup empty conversations",
    description="Delete empty conversations older than specified days (admin only)"
)
async def cleanup_conversations(
    days_old: int = Query(7, ge=1, description="Delete conversations older than this many days"),
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Cleanup empty conversations"""
    count, error = await AdminService.cleanup_empty_conversations(db, days_old)

    if error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )

    return {
        "deleted_count": count,
        "message": f"Deleted {count} empty conversations older than {days_old} days"
    }
