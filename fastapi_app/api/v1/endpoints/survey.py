"""
Survey endpoints - User profiling surveys for query limit bonuses
"""
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import json

from fastapi_app.db.session import get_db
from fastapi_app.db.models import User, UserSurvey, UserSurveyStage2
from fastapi_app.core.deps import get_current_active_user

router = APIRouter()


# Schemas
class UserSurveySubmit(BaseModel):
    """Stage 1 survey submission"""
    role: str
    role_other: str | None = None
    regions: List[str]
    familiarity: str
    insights: List[str]
    tailored: str | None = None


class UserSurveyStage2Submit(BaseModel):
    """Stage 2 survey submission"""
    work_focus: str
    work_focus_other: str | None = None
    pv_segments: List[str]
    technologies: List[str]
    technologies_other: str | None = None
    challenges: List[str]  # Max 3
    weekly_insight: str | None = None


class SurveyStatusResponse(BaseModel):
    """Survey completion status"""
    stage1_completed: bool
    stage2_completed: bool


class SurveySubmitResponse(BaseModel):
    """Survey submission response"""
    success: bool
    message: str
    new_query_count: int | str
    new_query_limit: int | str


@router.post("/submit-user-survey", response_model=SurveySubmitResponse)
async def submit_user_survey(
    survey_data: UserSurveySubmit,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Handle user profiling survey submission (Stage 1) and grant 5 extra queries

    This is the first survey that free users complete at the 5-query threshold.
    It asks about their role, regions of interest, familiarity with PV markets, and insights needed.
    """
    # Check if user has already submitted Stage 1 survey
    result = await db.execute(
        select(UserSurvey).where(UserSurvey.user_id == current_user.id)
    )
    existing_survey = result.scalar_one_or_none()

    if existing_survey:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already completed the survey and received your bonus queries."
        )

    # Validate required fields (already done by Pydantic, but we can add business logic)
    if not all([survey_data.role, survey_data.regions, survey_data.familiarity, survey_data.insights]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All required fields must be provided"
        )

    # Create survey record
    survey = UserSurvey(
        user_id=current_user.id,
        role=survey_data.role,
        role_other=survey_data.role_other,
        regions=json.dumps(survey_data.regions),
        familiarity=survey_data.familiarity,
        insights=json.dumps(survey_data.insights),
        tailored=survey_data.tailored,
        bonus_queries_granted=5
    )

    db.add(survey)
    await db.commit()
    await db.refresh(current_user)

    # Get updated query limits (now includes survey bonus)
    # Need to query for survey bonuses
    stage1_result = await db.execute(
        select(UserSurvey).where(UserSurvey.user_id == current_user.id)
    )
    stage1_survey = stage1_result.scalar_one_or_none()

    stage2_result = await db.execute(
        select(UserSurveyStage2).where(UserSurveyStage2.user_id == current_user.id)
    )
    stage2_survey = stage2_result.scalar_one_or_none()

    # Calculate query limit with bonuses
    base_limit = 5 if current_user.plan_type == 'free' else 1000
    total_limit = base_limit

    if stage1_survey:
        total_limit += stage1_survey.bonus_queries_granted
    if stage2_survey:
        total_limit += stage2_survey.bonus_queries_granted

    new_query_count = total_limit - (current_user.monthly_query_count or 0)

    return SurveySubmitResponse(
        success=True,
        message="Survey completed! 5 extra queries unlocked.",
        new_query_count=int(new_query_count) if new_query_count != float('inf') else 'unlimited',
        new_query_limit=int(total_limit) if total_limit != float('inf') else 'unlimited'
    )


@router.post("/submit-user-survey-stage2", response_model=SurveySubmitResponse)
async def submit_user_survey_stage2(
    survey_data: UserSurveyStage2Submit,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Handle Stage 2 survey submission (Market Activity & Behaviour) and grant 5 extra queries

    This is the second survey that free users complete at the 10-query threshold.
    It asks deeper questions about work focus, PV segments, technologies, and challenges.
    """
    # Check if user has completed Stage 1 first
    stage1_result = await db.execute(
        select(UserSurvey).where(UserSurvey.user_id == current_user.id)
    )
    stage1_survey = stage1_result.scalar_one_or_none()

    if not stage1_survey:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete the User Profiling survey before accessing this survey."
        )

    # Check if user has already submitted Stage 2 survey
    stage2_result = await db.execute(
        select(UserSurveyStage2).where(UserSurveyStage2.user_id == current_user.id)
    )
    existing_survey = stage2_result.scalar_one_or_none()

    if existing_survey:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already completed the Stage 2 survey and received your bonus queries."
        )

    # Validate challenges (max 3)
    if len(survey_data.challenges) > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select a maximum of 3 challenges"
        )

    # Create Stage 2 survey record
    survey = UserSurveyStage2(
        user_id=current_user.id,
        work_focus=survey_data.work_focus,
        work_focus_other=survey_data.work_focus_other,
        pv_segments=json.dumps(survey_data.pv_segments),
        technologies=json.dumps(survey_data.technologies),
        technologies_other=survey_data.technologies_other,
        challenges=json.dumps(survey_data.challenges),
        weekly_insight=survey_data.weekly_insight,
        bonus_queries_granted=5
    )

    db.add(survey)
    await db.commit()
    await db.refresh(current_user)

    # Get updated query limits (now includes both survey bonuses)
    stage1_refreshed = await db.execute(
        select(UserSurvey).where(UserSurvey.user_id == current_user.id)
    )
    stage1 = stage1_refreshed.scalar_one_or_none()

    stage2_refreshed = await db.execute(
        select(UserSurveyStage2).where(UserSurveyStage2.user_id == current_user.id)
    )
    stage2 = stage2_refreshed.scalar_one_or_none()

    # Calculate query limit with bonuses
    base_limit = 5 if current_user.plan_type == 'free' else 1000
    total_limit = base_limit

    if stage1:
        total_limit += stage1.bonus_queries_granted
    if stage2:
        total_limit += stage2.bonus_queries_granted

    new_query_count = total_limit - (current_user.monthly_query_count or 0)

    return SurveySubmitResponse(
        success=True,
        message="Stage 2 survey completed! 5 extra queries unlocked.",
        new_query_count=int(new_query_count) if new_query_count != float('inf') else 'unlimited',
        new_query_limit=int(total_limit) if total_limit != float('inf') else 'unlimited'
    )


@router.get("/check-survey-status", response_model=SurveyStatusResponse)
async def check_survey_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Check which surveys the user has completed
    """
    stage1_result = await db.execute(
        select(UserSurvey).where(UserSurvey.user_id == current_user.id)
    )
    stage1_completed = stage1_result.scalar_one_or_none() is not None

    stage2_result = await db.execute(
        select(UserSurveyStage2).where(UserSurveyStage2.user_id == current_user.id)
    )
    stage2_completed = stage2_result.scalar_one_or_none() is not None

    return SurveyStatusResponse(
        stage1_completed=stage1_completed,
        stage2_completed=stage2_completed
    )
