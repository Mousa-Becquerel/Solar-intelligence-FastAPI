"""
Agent endpoints - FastAPI version
Placeholder for agent operations
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from fastapi_app.db.session import get_db
from fastapi_app.db.models import User
from fastapi_app.core.deps import get_current_active_user

router = APIRouter()


class AgentInfo(BaseModel):
    """Agent information"""
    agent_type: str
    display_name: str
    description: str
    status: str


@router.get("/available", tags=["Agents"])
async def get_available_agents(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of available AI agents

    **Placeholder** - Will be implemented in Phase 2
    """
    agents = [
        {
            "agent_type": "market",
            "display_name": "Market Intelligence Agent",
            "description": "PV market data analysis and insights",
            "status": "available"
        },
        {
            "agent_type": "price",
            "display_name": "Module Prices Agent",
            "description": "PV module pricing analysis",
            "status": "coming_soon"
        },
        {
            "agent_type": "news",
            "display_name": "News Agent",
            "description": "Solar industry news aggregation",
            "status": "coming_soon"
        }
    ]

    return {"agents": agents, "total": len(agents)}
