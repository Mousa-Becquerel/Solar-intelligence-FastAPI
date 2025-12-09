"""
Agent Access API Endpoints
Handles agent access control, whitelisting, and permissions
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from fastapi_app.db.session import get_db
from fastapi_app.core.deps import get_current_active_user, get_current_admin_user
from fastapi_app.db.models import User
from fastapi_app.services.agent_access_service import AgentAccessService

router = APIRouter()


# ============================================
# Pydantic Schemas
# ============================================

class AgentAccessResponse(BaseModel):
    """Response for agent access check"""
    agent_type: str
    description: Optional[str]
    required_plan: str
    is_enabled: bool
    can_access: bool
    access_reason: Optional[str]
    is_whitelisted: bool
    is_grandfathered: bool
    is_hired: bool = False  # Whether user has explicitly hired this agent

    class Config:
        from_attributes = True


class AgentAccessCheckResponse(BaseModel):
    """Response for simple access check"""
    can_access: bool
    reason: Optional[str] = None


class WhitelistGrantRequest(BaseModel):
    """Request to grant whitelist access"""
    user_id: int = Field(..., description="User ID to grant access to")
    agent_type: str = Field(..., description="Agent type (e.g., 'market', 'technical')")
    expires_at: Optional[datetime] = Field(None, description="Optional expiration date")
    reason: Optional[str] = Field(None, description="Reason for granting access")


class WhitelistRevokeRequest(BaseModel):
    """Request to revoke whitelist access"""
    user_id: int = Field(..., description="User ID to revoke access from")
    agent_type: str = Field(..., description="Agent type")


class AgentConfigUpdateRequest(BaseModel):
    """Request to update agent configuration"""
    agent_type: str = Field(..., description="Agent type")
    required_plan: Optional[str] = Field(None, description="Required plan: 'free', 'premium', 'max', 'admin'")
    is_enabled: Optional[bool] = Field(None, description="Enable/disable agent globally")
    description: Optional[str] = Field(None, description="Agent description")


class WhitelistUserResponse(BaseModel):
    """Response for whitelisted user"""
    user_id: int
    username: str
    full_name: str
    granted_by: Optional[int]
    granted_at: Optional[str]
    expires_at: Optional[str]
    is_active: bool
    reason: Optional[str]


class AgentHireRequest(BaseModel):
    """Request to record agent hire"""
    agent_type: str = Field(..., description="Agent type to hire")


class AgentStatisticsResponse(BaseModel):
    """Response for agent statistics"""
    total_hired: int
    total_whitelisted: int


class GenericMessage(BaseModel):
    """Generic success message"""
    message: str


# ============================================
# User Endpoints
# ============================================

@router.get(
    "/check/{agent_type}",
    response_model=AgentAccessCheckResponse,
    summary="Check if user can access agent",
    description="Check if the current user has access to a specific agent"
)
async def check_agent_access(
    agent_type: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if user can access a specific agent"""
    can_access, reason = await AgentAccessService.can_user_access_agent(
        db, current_user, agent_type
    )

    return {
        "can_access": can_access,
        "reason": reason
    }


@router.get(
    "/my-agents",
    response_model=List[AgentAccessResponse],
    summary="Get user's accessible agents",
    description="Get list of all agents with access status for current user"
)
async def get_my_accessible_agents(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of all agents with access status for current user"""
    agents = await AgentAccessService.get_user_accessible_agents(db, current_user)
    return agents


@router.post(
    "/hire",
    response_model=GenericMessage,
    status_code=status.HTTP_201_CREATED,
    summary="Record agent hire",
    description="Record that the user has hired/activated an agent (for grandfathering)"
)
async def hire_agent(
    request: AgentHireRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Record that user has hired an agent"""
    success, error = await AgentAccessService.record_agent_hire(
        db, current_user.id, request.agent_type
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to record agent hire"
        )

    return {"message": f"Successfully hired agent '{request.agent_type}'"}


class TrialStatusResponse(BaseModel):
    """Response for trial status check"""
    is_trial_exhausted: bool
    agents_unhired: bool
    redirect_to_agents: bool
    message: Optional[str] = None


@router.get(
    "/trial-status",
    response_model=TrialStatusResponse,
    summary="Check trial status",
    description="Check if user's trial is exhausted and handle unhiring of agents"
)
async def check_trial_status(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if user's trial is exhausted.
    If exhausted, unhire all non-fallback agents and signal redirect to Agents page.
    """
    is_exhausted, agents_unhired = await AgentAccessService.check_and_handle_trial_exhaustion(
        db, current_user
    )

    if is_exhausted:
        return TrialStatusResponse(
            is_trial_exhausted=True,
            agents_unhired=agents_unhired,
            redirect_to_agents=True,
            message="Your trial has ended. All agents except Sam have been released. Please upgrade to continue using them."
        )

    return TrialStatusResponse(
        is_trial_exhausted=False,
        agents_unhired=False,
        redirect_to_agents=False,
        message=None
    )


# ============================================
# Admin Endpoints
# ============================================

@router.post(
    "/admin/grant-access",
    response_model=GenericMessage,
    summary="Grant user access (Admin)",
    description="Grant a user whitelist access to an agent (admin only)"
)
async def grant_user_access(
    request: WhitelistGrantRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Grant a user whitelist access to an agent (admin only)"""
    success, error = await AgentAccessService.grant_user_access(
        db=db,
        agent_type=request.agent_type,
        user_id=request.user_id,
        granted_by=current_admin.id,
        expires_at=request.expires_at,
        reason=request.reason
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to grant access"
        )

    return {"message": f"Successfully granted access to agent '{request.agent_type}' for user {request.user_id}"}


@router.post(
    "/admin/revoke-access",
    response_model=GenericMessage,
    summary="Revoke user access (Admin)",
    description="Revoke a user's whitelist access to an agent (admin only)"
)
async def revoke_user_access(
    request: WhitelistRevokeRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a user's whitelist access to an agent (admin only)"""
    success, error = await AgentAccessService.revoke_user_access(
        db=db,
        agent_type=request.agent_type,
        user_id=request.user_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to revoke access"
        )

    return {"message": f"Successfully revoked access to agent '{request.agent_type}' for user {request.user_id}"}


@router.put(
    "/admin/update-config",
    response_model=GenericMessage,
    summary="Update agent config (Admin)",
    description="Update agent configuration settings (admin only)"
)
async def update_agent_config(
    request: AgentConfigUpdateRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update agent configuration (admin only)"""
    success, error = await AgentAccessService.update_agent_config(
        db=db,
        agent_type=request.agent_type,
        required_plan=request.required_plan,
        is_enabled=request.is_enabled,
        description=request.description
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to update agent config"
        )

    return {"message": f"Successfully updated configuration for agent '{request.agent_type}'"}


@router.get(
    "/admin/whitelisted-users/{agent_type}",
    response_model=List[WhitelistUserResponse],
    summary="Get whitelisted users (Admin)",
    description="Get all whitelisted users for a specific agent (admin only)"
)
async def get_whitelisted_users(
    agent_type: str,
    include_expired: bool = False,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all whitelisted users for a specific agent (admin only)"""
    users = await AgentAccessService.get_whitelisted_users(
        db, agent_type, include_expired
    )
    return users


@router.get(
    "/admin/statistics/{agent_type}",
    response_model=AgentStatisticsResponse,
    summary="Get agent statistics (Admin)",
    description="Get statistics about agent usage and access (admin only)"
)
async def get_agent_statistics(
    agent_type: str,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics about agent usage (admin only)"""
    stats = await AgentAccessService.get_agent_statistics(db, agent_type)

    if agent_type not in stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No statistics found for agent '{agent_type}'"
        )

    return stats[agent_type]


@router.get(
    "/admin/all-statistics",
    summary="Get all agent statistics (Admin)",
    description="Get statistics for all agents (admin only)"
)
async def get_all_agent_statistics(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for all agents (admin only)"""
    stats = await AgentAccessService.get_agent_statistics(db, None)
    return stats
