"""
Agent Management API Endpoints
Handles agent metadata, availability, hiring, and usage statistics
Note: Actual AI/LLM processing is handled by existing agents.py and chat.py
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from fastapi_app.db.session import get_db
from fastapi_app.core.deps import get_current_active_user
from fastapi_app.db.models import User, HiredAgent
from fastapi_app.services.agent_service import AgentService

router = APIRouter()


# ============================================
# Pydantic Schemas
# ============================================

class AgentInfo(BaseModel):
    """Information about an agent"""
    agent_type: str
    display_name: str
    is_hired: bool
    requires_subscription: bool
    capabilities: List[str]


class AgentAvailabilityResponse(BaseModel):
    """Response for agent availability check"""
    is_available: bool
    reason: Optional[str] = None


class AgentHireRequest(BaseModel):
    """Request to hire an agent"""
    agent_type: str = Field(..., description="Type of agent to hire")


class AgentReleaseRequest(BaseModel):
    """Request to release an agent"""
    agent_type: str = Field(..., description="Type of agent to release")


class HiredAgentResponse(BaseModel):
    """Response for hired agent"""
    id: int
    user_id: int
    agent_type: str
    hired_at: str
    is_active: bool

    class Config:
        from_attributes = True


class AgentUsageStats(BaseModel):
    """Agent usage statistics"""
    total_queries: int
    monthly_queries: int
    query_limit: int
    queries_remaining: int
    by_agent_type: dict


class QueryValidationResponse(BaseModel):
    """Response for query validation"""
    is_valid: bool
    error_message: Optional[str]
    conversation_id: Optional[int]


class AgentTypeResponse(BaseModel):
    """Response for agent type determination"""
    suggested_agent_type: str
    agent_display_name: str


class ConversationHistoryItem(BaseModel):
    """Single item in conversation history"""
    role: str
    content: str


class GenericMessage(BaseModel):
    """Generic success message"""
    message: str


# ============================================
# Agent Information Endpoints
# ============================================

@router.get(
    "/available",
    response_model=List[AgentInfo],
    summary="Get available agents",
    description="Get list of all available agents with their capabilities and hire status"
)
async def get_available_agents(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of available agents for current user"""
    agents = await AgentService.get_available_agents(db, current_user)
    return agents


@router.get(
    "/check-availability/{agent_type}",
    response_model=AgentAvailabilityResponse,
    summary="Check agent availability",
    description="Check if a specific agent is available for current user"
)
async def check_agent_availability(
    agent_type: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if agent is available for user"""
    is_available, reason = await AgentService.check_agent_availability(
        db, agent_type, current_user
    )

    return {
        "is_available": is_available,
        "reason": reason
    }


@router.post(
    "/suggest-agent-type",
    response_model=AgentTypeResponse,
    summary="Suggest agent type",
    description="Automatically suggest which agent should handle a query based on keywords"
)
async def suggest_agent_type(
    query: str = Query(..., min_length=1, description="User's query text"),
    current_user: User = Depends(get_current_active_user)
):
    """Suggest agent type based on query content"""
    agent_type = AgentService.determine_agent_type(query)
    display_name = AgentService.AGENT_TYPES.get(agent_type, "Unknown Agent")

    return {
        "suggested_agent_type": agent_type,
        "agent_display_name": display_name
    }


# ============================================
# Agent Hiring Endpoints
# ============================================

@router.post(
    "/hire",
    response_model=GenericMessage,
    status_code=status.HTTP_201_CREATED,
    summary="Hire an agent",
    description="Hire an agent to add it to user's available agents"
)
async def hire_agent(
    request: AgentHireRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Hire an agent"""
    success, error = await AgentService.hire_agent(
        db, current_user, request.agent_type
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to hire agent"
        )

    return {"message": f"Successfully hired agent '{request.agent_type}'"}


@router.post(
    "/release",
    response_model=GenericMessage,
    summary="Release an agent",
    description="Release (deactivate) an agent from user's hired agents"
)
async def release_agent(
    request: AgentReleaseRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Release an agent"""
    success, error = await AgentService.release_agent(
        db, current_user, request.agent_type
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to release agent"
        )

    return {"message": f"Successfully released agent '{request.agent_type}'"}


@router.get(
    "/hired",
    response_model=List[HiredAgentResponse],
    summary="Get hired agents",
    description="Get list of agents currently hired by the user"
)
async def get_hired_agents(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's hired agents"""
    hired_agents = await AgentService.get_user_hired_agents(db, current_user)

    return [
        {
            "id": agent.id,
            "user_id": agent.user_id,
            "agent_type": agent.agent_type,
            "hired_at": agent.hired_at.isoformat() if agent.hired_at else None,
            "is_active": agent.is_active
        }
        for agent in hired_agents
    ]


# ============================================
# Usage Statistics Endpoints
# ============================================

@router.get(
    "/usage-stats",
    response_model=AgentUsageStats,
    summary="Get usage statistics",
    description="Get agent usage statistics for current user"
)
async def get_usage_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's agent usage statistics"""
    stats = await AgentService.get_agent_usage_stats(db, current_user)
    return stats


# ============================================
# Query Validation Endpoints
# ============================================

@router.post(
    "/validate-query",
    response_model=QueryValidationResponse,
    summary="Validate query",
    description="Validate a query before processing (checks limits, conversation access, etc.)"
)
async def validate_query(
    conversation_id: int = Query(..., description="Conversation ID"),
    query: str = Query(..., min_length=1, description="Query text"),
    agent_type: str = Query("market", description="Agent type to use"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Validate query before processing"""
    is_valid, error_message, conversation = await AgentService.validate_query(
        db, current_user, conversation_id, query, agent_type
    )

    return {
        "is_valid": is_valid,
        "error_message": error_message,
        "conversation_id": conversation.id if conversation else None
    }


@router.get(
    "/conversation-history/{conversation_id}",
    response_model=List[ConversationHistoryItem],
    summary="Get conversation history",
    description="Get formatted conversation history for agent processing"
)
async def get_conversation_history(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=100, description="Maximum messages to retrieve"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get conversation history formatted for agent"""
    # Note: This doesn't validate ownership - that should be done by validate_query first
    history = await AgentService.format_conversation_history_for_agent(
        db, conversation_id, limit
    )
    return history


# ============================================
# Agent Types Information
# ============================================

@router.get(
    "/types",
    summary="Get agent types",
    description="Get all available agent types with their display names"
)
async def get_agent_types(
    current_user: User = Depends(get_current_active_user)
):
    """Get all agent types"""
    return {
        "agent_types": AgentService.AGENT_TYPES
    }
