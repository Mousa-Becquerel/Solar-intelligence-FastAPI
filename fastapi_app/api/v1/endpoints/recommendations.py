"""
Agent Recommendations API Endpoint

Provides AI-powered agent recommendations based on user queries.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List

from fastapi_app.services.recommendation_service import get_agent_recommendations
from fastapi_app.core.deps import get_current_user

router = APIRouter()


class RecommendationRequest(BaseModel):
    query: str


class RecommendationResponse(BaseModel):
    recommended_agents: List[str]


@router.post("/recommend", response_model=RecommendationResponse)
async def recommend_agents(
    request: RecommendationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Get AI-powered agent recommendations based on user query.

    Args:
        request: RecommendationRequest with user query
        current_user: Authenticated user (from JWT)

    Returns:
        List of recommended agent IDs in frontend AgentType format
    """
    try:
        if not request.query or not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")

        # Get recommendations from AI agent
        recommended_agents = await get_agent_recommendations(request.query)

        return RecommendationResponse(recommended_agents=recommended_agents)

    except Exception as e:
        # Log the error (you may want to add proper logging here)
        print(f"Error getting agent recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get agent recommendations. Please try again."
        )
