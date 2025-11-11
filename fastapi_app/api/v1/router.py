"""
API v1 Router - Aggregates all endpoint routers
"""
from fastapi import APIRouter

from fastapi_app.api.v1.endpoints import auth, agents, chat, conversations, agent_access, admin, agent_management, health, profile, survey

api_router = APIRouter()

# Health check endpoints (no auth required for basic health)
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["Health Check"]
)

# Include endpoint routers
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

api_router.include_router(
    conversations.router,
    prefix="/conversations",
    tags=["Conversations"]
)

api_router.include_router(
    agent_access.router,
    prefix="/agent-access",
    tags=["Agent Access"]
)

api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin"]
)

api_router.include_router(
    agent_management.router,
    prefix="/agent-management",
    tags=["Agent Management"]
)

api_router.include_router(
    agents.router,
    prefix="/agents",
    tags=["Agents"]
)

api_router.include_router(
    chat.router,
    prefix="/chat",
    tags=["Chat"]
)

api_router.include_router(
    profile.router,
    tags=["Profile"]
)

api_router.include_router(
    survey.router,
    prefix="/survey",
    tags=["Survey"]
)
