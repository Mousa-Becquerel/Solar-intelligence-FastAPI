"""
Data Breach Management API Endpoints

Handles GDPR-compliant breach management:
- Creating breach logs
- Sending notifications
- Tracking breach resolution
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from fastapi_app.db.session import get_db
from fastapi_app.db.models import User, DataBreachLog
from fastapi_app.core.deps import get_current_active_user
from fastapi_app.services.breach_notification_service import BreachNotificationService

router = APIRouter()


# Pydantic Models
class CreateBreachRequest(BaseModel):
    breach_type: str  # unauthorized_access, data_leak, system_compromise, accidental_disclosure
    severity: str  # low, medium, high, critical
    description: str
    risk_level: str  # low, moderate, high
    affected_data_categories: List[str]
    estimated_affected_users: int = 0
    breach_occurred_at: Optional[datetime] = None
    discovered_by: Optional[str] = None
    discovery_method: Optional[str] = None


class NotifyDPARequest(BaseModel):
    breach_id: int
    likely_consequences: str
    technical_measures: str
    organizational_measures: str
    remediation_steps: str


class NotifyUsersRequest(BaseModel):
    breach_id: int
    user_actions: str


class UpdateBreachStatusRequest(BaseModel):
    status: str  # investigating, contained, resolved, closed
    contained_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None


class BreachResponse(BaseModel):
    id: int
    breach_type: str
    severity: str
    description: str
    risk_level: str
    status: str
    discovered_at: datetime
    estimated_affected_users: Optional[int]
    internal_team_notified: bool
    dpa_notified: bool
    users_notified: bool

    class Config:
        from_attributes = True


def require_admin(current_user: User = Depends(get_current_active_user)):
    """Dependency to require admin role"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.post("/breach/create", response_model=BreachResponse, tags=["Breach Management", "Admin"])
async def create_breach(
    breach_data: CreateBreachRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new data breach log

    **Admin Only** - GDPR Article 33-34

    **Requires**: Admin authentication

    **Body**:
    - breach_type: Type of breach
    - severity: Severity level (low, medium, high, critical)
    - description: What happened
    - risk_level: Risk level (low, moderate, high)
    - affected_data_categories: List of affected data categories
    - estimated_affected_users: Number of users affected
    - breach_occurred_at: When breach occurred (optional)
    - discovered_by: Who discovered it (optional)
    - discovery_method: How it was discovered (optional)

    **Returns**: Breach log entry

    **Note**: This automatically notifies the internal team
    """
    try:
        breach = await BreachNotificationService.create_breach(
            db=db,
            breach_type=breach_data.breach_type,
            severity=breach_data.severity,
            description=breach_data.description,
            risk_level=breach_data.risk_level,
            affected_data_categories=breach_data.affected_data_categories,
            estimated_affected_users=breach_data.estimated_affected_users,
            breach_occurred_at=breach_data.breach_occurred_at,
            discovered_by=breach_data.discovered_by,
            discovery_method=breach_data.discovery_method,
            created_by_user_id=current_user.id
        )

        return breach

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create breach log: {str(e)}"
        )


@router.post("/breach/notify-dpa", tags=["Breach Management", "Admin"])
async def notify_dpa(
    notification_data: NotifyDPARequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Notify Data Protection Authority about a breach

    **Admin Only** - GDPR Article 33 (within 72 hours)

    **Requires**: Admin authentication

    **Body**:
    - breach_id: Breach ID
    - likely_consequences: Assessment of consequences
    - technical_measures: Technical safeguards in place
    - organizational_measures: Organizational safeguards
    - remediation_steps: Steps taken to remediate

    **Returns**: Success message
    """
    try:
        success = await BreachNotificationService.notify_dpa(
            db=db,
            breach_id=notification_data.breach_id,
            likely_consequences=notification_data.likely_consequences,
            technical_measures=notification_data.technical_measures,
            organizational_measures=notification_data.organizational_measures,
            remediation_steps=notification_data.remediation_steps
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DPA notification not required or failed"
            )

        return {"message": "DPA notified successfully", "breach_id": notification_data.breach_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to notify DPA: {str(e)}"
        )


@router.post("/breach/notify-users", tags=["Breach Management", "Admin"])
async def notify_users(
    notification_data: NotifyUsersRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Notify affected users about a breach

    **Admin Only** - GDPR Article 34

    **Requires**: Admin authentication

    **Body**:
    - breach_id: Breach ID
    - user_actions: Recommended actions for users

    **Returns**: Number of users notified
    """
    try:
        notified_count = await BreachNotificationService.notify_affected_users(
            db=db,
            breach_id=notification_data.breach_id,
            user_actions=notification_data.user_actions
        )

        if notified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User notification not required or no users to notify"
            )

        return {
            "message": f"Notified {notified_count} users successfully",
            "breach_id": notification_data.breach_id,
            "users_notified": notified_count
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to notify users: {str(e)}"
        )


@router.patch("/breach/{breach_id}/status", tags=["Breach Management", "Admin"])
async def update_breach_status(
    breach_id: int,
    status_data: UpdateBreachStatusRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update breach status

    **Admin Only**

    **Requires**: Admin authentication

    **Path Parameters**:
    - breach_id: Breach ID

    **Body**:
    - status: New status (investigating, contained, resolved, closed)
    - contained_at: When breach was contained (optional)
    - resolved_at: When breach was resolved (optional)
    - notes: Additional notes (optional)

    **Returns**: Success message
    """
    try:
        success = await BreachNotificationService.update_breach_status(
            db=db,
            breach_id=breach_id,
            status=status_data.status,
            contained_at=status_data.contained_at,
            resolved_at=status_data.resolved_at,
            notes=status_data.notes
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Breach {breach_id} not found"
            )

        return {
            "message": "Breach status updated successfully",
            "breach_id": breach_id,
            "new_status": status_data.status
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update breach status: {str(e)}"
        )


@router.get("/breach/active", response_model=List[BreachResponse], tags=["Breach Management", "Admin"])
async def get_active_breaches(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active (non-closed) breaches

    **Admin Only**

    **Requires**: Admin authentication

    **Returns**: List of active breaches
    """
    try:
        breaches = await BreachNotificationService.get_active_breaches(db)
        return breaches

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch active breaches: {str(e)}"
        )


@router.get("/breach/pending-dpa-notification", response_model=List[BreachResponse], tags=["Breach Management", "Admin"])
async def get_pending_dpa_notifications(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get breaches requiring DPA notification (within 72-hour window)

    **Admin Only**

    **Requires**: Admin authentication

    **Returns**: List of breaches requiring DPA notification
    """
    try:
        breaches = await BreachNotificationService.get_breaches_requiring_dpa_notification(db)
        return breaches

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending DPA notifications: {str(e)}"
        )


@router.get("/breach/{breach_id}", response_model=BreachResponse, tags=["Breach Management", "Admin"])
async def get_breach(
    breach_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get breach details by ID

    **Admin Only**

    **Requires**: Admin authentication

    **Path Parameters**:
    - breach_id: Breach ID

    **Returns**: Breach details
    """
    try:
        result = await db.execute(
            select(DataBreachLog).where(DataBreachLog.id == breach_id)
        )
        breach = result.scalar_one_or_none()

        if not breach:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Breach {breach_id} not found"
            )

        return breach

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch breach: {str(e)}"
        )
