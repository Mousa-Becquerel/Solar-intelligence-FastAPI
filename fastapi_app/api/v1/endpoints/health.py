"""
Health Check Endpoints - Monitor system health and database connection pool
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime

from fastapi_app.db.session import health_check, get_pool_status
from fastapi_app.core.deps import get_current_admin_user
from fastapi_app.db.models import User

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================
# Pydantic Schemas
# ============================================

class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    database: str
    connection: str
    pool: str
    details: Dict[str, Any]


class PoolStatusResponse(BaseModel):
    """Connection pool status response"""
    pool_size: int
    checked_in_connections: int
    checked_out_connections: int
    overflow_connections: int
    total_connections: int
    max_capacity: int
    utilization_percent: float


# ============================================
# Health Check Endpoints
# ============================================

@router.get(
    "/",
    response_model=HealthCheckResponse,
    summary="System health check",
    description="Check overall system health including database and connection pool"
)
async def get_health_check():
    """
    Perform comprehensive health check

    Checks:
    - Database connectivity
    - Query execution
    - Connection pool status
    - Pool utilization

    Returns:
        HealthCheckResponse: Health status of all components
    """
    try:
        health_status = await health_check()

        # Determine overall status
        if health_status["database"] == "unhealthy":
            overall_status = "unhealthy"
        elif health_status["pool"] == "warning":
            overall_status = "warning"
        else:
            overall_status = "healthy"

        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            **health_status
        }

    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )


@router.get(
    "/pool",
    response_model=PoolStatusResponse,
    summary="Connection pool status",
    description="Get detailed connection pool statistics (admin only)",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_connection_pool_status():
    """
    Get detailed connection pool statistics

    Admin only endpoint for monitoring:
    - Pool size and utilization
    - Checked in/out connections
    - Overflow connections

    Returns:
        PoolStatusResponse: Connection pool statistics
    """
    try:
        pool_status = await get_pool_status()

        if "error" in pool_status:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=pool_status["error"]
            )

        return pool_status

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pool status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get pool status: {str(e)}"
        )


@router.get(
    "/ping",
    summary="Simple ping endpoint",
    description="Lightweight endpoint to check if API is responding"
)
async def ping():
    """
    Simple ping endpoint for load balancers

    Returns:
        dict: Simple pong response
    """
    return {
        "status": "ok",
        "message": "pong",
        "timestamp": datetime.utcnow().isoformat()
    }
