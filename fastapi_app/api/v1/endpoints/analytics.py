"""
Analytics API Endpoints - Admin analytics with anonymized user data
GDPR-compliant analytics for platform monitoring
"""
from typing import Optional
from datetime import datetime
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from fastapi_app.db.session import get_db
from fastapi_app.db.models import User
from fastapi_app.core.deps import get_current_admin_user
from fastapi_app.services.analytics_service import AnalyticsService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/overview")
async def get_overview_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get high-level platform overview statistics

    Returns total users, active users, conversations, messages,
    plan distribution, and recent signup trends.
    """
    try:
        stats = await AnalyticsService.get_overview_stats(db)
        return {"status": "success", "data": stats}
    except Exception as e:
        logger.error(f"Error fetching overview stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch overview statistics"
        )


@router.get("/usage-over-time")
async def get_usage_over_time(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to include"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get daily usage statistics over a time period

    Returns daily query counts, active users, and new conversations.
    """
    try:
        data = await AnalyticsService.get_usage_over_time(db, days)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Error fetching usage over time: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch usage data"
        )


@router.get("/agent-usage")
async def get_agent_usage_stats(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to include"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get usage statistics broken down by agent type

    Returns query counts, unique users, and conversation counts per agent.
    """
    try:
        data = await AnalyticsService.get_agent_usage_stats(db, days)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Error fetching agent usage stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch agent usage data"
        )


@router.get("/recent-queries")
async def get_recent_queries(
    limit: int = Query(default=20, ge=1, le=500, description="Number of queries to return"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    agent: Optional[str] = Query(default=None, description="Filter by agent type"),
    search: Optional[str] = Query(default=None, description="Search in query content"),
    days: Optional[int] = Query(default=None, ge=1, le=365, description="Filter to last N days"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get recent user queries with anonymized user info

    Returns query content, agent type, timestamp, and anonymized user hash.
    User identities are protected through one-way hashing.
    Supports pagination, agent filtering, search, and time filtering.
    """
    try:
        result = await AnalyticsService.get_recent_queries(
            db, limit=limit, offset=offset, agent_filter=agent, search=search, days=days
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error fetching recent queries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch recent queries"
        )


@router.get("/user-engagement")
async def get_user_engagement_stats(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get user engagement statistics (anonymized)

    Returns average queries per user, top users (anonymized),
    and retention metrics.
    """
    try:
        data = await AnalyticsService.get_user_engagement_stats(db, days)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Error fetching engagement stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch engagement data"
        )


@router.get("/hourly-distribution")
async def get_hourly_distribution(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get query distribution by hour of day

    Returns query counts for each hour (0-23) to identify peak usage times.
    """
    try:
        data = await AnalyticsService.get_hourly_distribution(db, days)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Error fetching hourly distribution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch hourly distribution"
        )


@router.get("/full-report")
async def get_full_analytics_report(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to include"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get comprehensive analytics report

    Returns all analytics data in a single response for dashboard rendering.
    """
    try:
        report = await AnalyticsService.get_full_analytics_report(db, days)
        return {"status": "success", "data": report}
    except Exception as e:
        logger.error(f"Error generating full report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate analytics report"
        )


@router.get("/surveys")
async def get_survey_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get survey responses analytics

    Returns all survey responses with aggregated statistics.
    Includes both Stage 1 (Profile) and Stage 2 (Market Activity) surveys.
    """
    try:
        data = await AnalyticsService.get_survey_analytics(db)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Error fetching survey analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch survey analytics"
        )


@router.get("/export-queries-csv")
async def export_queries_csv(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to include"),
    agent: Optional[str] = Query(default=None, description="Filter by agent type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Export user queries as CSV file

    Returns a downloadable CSV file with:
    - timestamp: When the query was made
    - agent_type: Which agent handled the query
    - query: The user's query text
    - anonymized_user_id: Anonymized user identifier

    Supports filtering by time period and agent type.
    User identities are protected through one-way hashing.
    """
    try:
        # Fetch all queries (no pagination limit for export)
        result = await AnalyticsService.get_recent_queries(
            db,
            limit=10000,  # High limit for export
            offset=0,
            agent_filter=agent,
            search=None,
            days=days
        )

        queries = result.get('queries', [])

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(['timestamp', 'agent_type', 'query', 'anonymized_user_id'])

        # Write data rows
        for query in queries:
            # Clean query text for CSV (remove newlines, limit length)
            query_text = query.get('query', '')
            if query_text:
                query_text = query_text.replace('\n', ' ').replace('\r', ' ')
                # Limit to reasonable length for CSV
                if len(query_text) > 1000:
                    query_text = query_text[:1000] + '...'

            writer.writerow([
                query.get('timestamp', ''),
                query.get('agent', ''),
                query_text,
                query.get('user_hash', '')
            ])

        # Prepare response
        output.seek(0)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"user_queries_export_{timestamp}.csv"

        # Add agent to filename if filtered
        if agent and agent != 'all':
            filename = f"user_queries_{agent}_{timestamp}.csv"

        logger.info(f"Admin {current_user.username} exported {len(queries)} queries to CSV")

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/csv; charset=utf-8"
            }
        )

    except Exception as e:
        logger.error(f"Error exporting queries to CSV: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export queries"
        )
