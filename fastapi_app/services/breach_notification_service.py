"""
Data Breach Notification Service

Handles GDPR-compliant breach notifications:
- GDPR Article 33: Notification to supervisory authority (within 72 hours)
- GDPR Article 34: Notification to affected data subjects
"""
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from fastapi_app.db.models import DataBreachLog, User
from fastapi_app.services.email_service import EmailService

logger = logging.getLogger(__name__)


class BreachNotificationService:
    """Service for managing data breach notifications"""

    # Notification templates
    INTERNAL_TEMPLATE = """
🚨 DATA BREACH ALERT 🚨

Severity: {severity}
Breach Type: {breach_type}
Discovered: {discovered_at}

DESCRIPTION:
{description}

AFFECTED DATA:
{affected_data_categories}

ESTIMATED AFFECTED USERS: {estimated_affected_users}

RISK LEVEL: {risk_level}

IMMEDIATE ACTIONS REQUIRED:
1. Contain the breach
2. Assess full impact
3. Document all findings
4. Prepare DPA notification (if required within 72 hours)
5. Determine if users need to be notified

Breach ID: {breach_id}
"""

    DPA_TEMPLATE = """
NOTIFICATION OF PERSONAL DATA BREACH
Under GDPR Article 33

Organization: Becquerel Institute / Solar Intelligence Platform
Date of Notification: {notification_date}

1. BREACH DESCRIPTION:
{description}

2. DATA CATEGORIES AFFECTED:
{affected_data_categories}

3. APPROXIMATE NUMBER OF DATA SUBJECTS AFFECTED:
{estimated_affected_users}

4. CONTACT DETAILS:
Data Protection Officer
Email: dpo@becquerelinstitute.org

5. LIKELY CONSEQUENCES:
{likely_consequences}

6. MEASURES TAKEN OR PROPOSED:
Technical Measures:
{technical_measures}

Organizational Measures:
{organizational_measures}

Remediation Steps:
{remediation_steps}

7. TIMELINE:
Breach Occurred: {breach_occurred_at}
Breach Discovered: {discovered_at}
Breach Contained: {contained_at}

Breach Reference: {breach_id}
"""

    USER_TEMPLATE = """
Subject: Important Security Notification - Data Breach Alert

Dear User,

We are writing to inform you about a security incident that may have affected your personal data.

WHAT HAPPENED:
{description}

WHAT INFORMATION WAS INVOLVED:
{affected_data_categories}

WHAT WE ARE DOING:
{remediation_steps}

WHAT YOU CAN DO:
{user_actions}

We take the security of your personal data very seriously and sincerely apologize for this incident.

If you have any questions or concerns, please contact us at:
Email: support@solarintelligence.com

For more information about your data protection rights, please visit:
https://solarintelligence.com/privacy-policy

Sincerely,
Solar Intelligence Team
Becquerel Institute

Reference: Breach #{breach_id}
Notification Date: {notification_date}
"""

    @staticmethod
    async def create_breach(
        db: AsyncSession,
        breach_type: str,
        severity: str,
        description: str,
        risk_level: str,
        affected_data_categories: List[str],
        estimated_affected_users: int = 0,
        breach_occurred_at: Optional[datetime] = None,
        discovered_by: Optional[str] = None,
        discovery_method: Optional[str] = None,
        created_by_user_id: Optional[int] = None
    ) -> DataBreachLog:
        """
        Create a new data breach log entry

        Args:
            db: Database session
            breach_type: Type of breach (unauthorized_access, data_leak, system_compromise, accidental_disclosure)
            severity: Severity level (low, medium, high, critical)
            description: Description of what happened
            risk_level: Risk level (low, moderate, high)
            affected_data_categories: List of affected data categories
            estimated_affected_users: Number of users affected
            breach_occurred_at: When the breach occurred (if known)
            discovered_by: Who discovered the breach
            discovery_method: How it was discovered
            created_by_user_id: Admin who logged the breach

        Returns:
            DataBreachLog: The created breach log
        """
        try:
            # Determine notification requirements based on risk
            dpa_required = risk_level in ['moderate', 'high']
            users_required = risk_level == 'high'

            breach_log = DataBreachLog(
                breach_type=breach_type,
                severity=severity,
                description=description,
                affected_data_categories=json.dumps(affected_data_categories),
                estimated_affected_users=estimated_affected_users,
                breach_occurred_at=breach_occurred_at or datetime.utcnow(),
                discovered_by=discovered_by,
                discovery_method=discovery_method,
                risk_level=risk_level,
                dpa_notification_required=dpa_required,
                users_notification_required=users_required,
                status="open",
                created_by_user_id=created_by_user_id
            )

            db.add(breach_log)
            await db.commit()
            await db.refresh(breach_log)

            logger.info(f"Data breach logged: ID={breach_log.id}, Severity={severity}, Risk={risk_level}")

            # Automatically notify internal team
            await BreachNotificationService.notify_internal_team(db, breach_log)

            return breach_log

        except Exception as e:
            logger.error(f"Failed to create breach log: {e}")
            await db.rollback()
            raise

    @staticmethod
    async def notify_internal_team(
        db: AsyncSession,
        breach: DataBreachLog
    ) -> bool:
        """
        Notify internal team about a data breach (immediate)

        Args:
            db: Database session
            breach: DataBreachLog entry

        Returns:
            bool: Success status
        """
        try:
            message = BreachNotificationService.INTERNAL_TEMPLATE.format(
                severity=breach.severity.upper(),
                breach_type=breach.breach_type.replace('_', ' ').title(),
                discovered_at=breach.discovered_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
                description=breach.description,
                affected_data_categories=', '.join(json.loads(breach.affected_data_categories)) if breach.affected_data_categories else 'Unknown',
                estimated_affected_users=breach.estimated_affected_users or 'Unknown',
                risk_level=breach.risk_level.upper(),
                breach_id=breach.id
            )

            # Send to internal team (replace with actual email addresses)
            await EmailService.send_email(
                to_email="admin@solarintelligence.com",  # Replace with actual internal email
                subject=f"🚨 DATA BREACH ALERT - {breach.severity.upper()} SEVERITY",
                body=message,
                html=False
            )

            # Update breach log
            breach.internal_team_notified = True
            breach.internal_notification_date = datetime.utcnow()
            await db.commit()

            logger.info(f"Internal team notified about breach {breach.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to notify internal team: {e}")
            return False

    @staticmethod
    async def notify_dpa(
        db: AsyncSession,
        breach_id: int,
        likely_consequences: str,
        technical_measures: str,
        organizational_measures: str,
        remediation_steps: str
    ) -> bool:
        """
        Notify Data Protection Authority about a breach (within 72 hours)

        Args:
            db: Database session
            breach_id: Breach ID
            likely_consequences: Assessment of consequences
            technical_measures: Technical safeguards in place
            organizational_measures: Organizational safeguards
            remediation_steps: Steps taken to remediate

        Returns:
            bool: Success status
        """
        try:
            # Get breach
            result = await db.execute(
                select(DataBreachLog).where(DataBreachLog.id == breach_id)
            )
            breach = result.scalar_one_or_none()

            if not breach:
                raise ValueError(f"Breach {breach_id} not found")

            # Check if notification is required
            if not breach.dpa_notification_required:
                logger.info(f"DPA notification not required for breach {breach_id}")
                return False

            # Check 72-hour window
            hours_since_discovery = (datetime.utcnow() - breach.discovered_at).total_seconds() / 3600
            if hours_since_discovery > 72:
                logger.warning(f"DPA notification for breach {breach_id} is LATE (>{hours_since_discovery:.1f} hours)")

            # Update breach with assessment
            breach.likely_consequences = likely_consequences
            breach.technical_measures = technical_measures
            breach.organizational_measures = organizational_measures
            breach.remediation_steps = remediation_steps

            message = BreachNotificationService.DPA_TEMPLATE.format(
                notification_date=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
                description=breach.description,
                affected_data_categories=', '.join(json.loads(breach.affected_data_categories)) if breach.affected_data_categories else 'Unknown',
                estimated_affected_users=breach.estimated_affected_users or 'Unknown',
                likely_consequences=likely_consequences,
                technical_measures=technical_measures,
                organizational_measures=organizational_measures,
                remediation_steps=remediation_steps,
                breach_occurred_at=breach.breach_occurred_at.strftime('%Y-%m-%d %H:%M:%S UTC') if breach.breach_occurred_at else 'Unknown',
                discovered_at=breach.discovered_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
                contained_at=breach.contained_at.strftime('%Y-%m-%d %H:%M:%S UTC') if breach.contained_at else 'In Progress',
                breach_id=breach.id
            )

            # Send to DPA (replace with actual DPA contact)
            await EmailService.send_email(
                to_email="dpa@example.com",  # Replace with actual DPA email
                subject=f"GDPR Art. 33 Breach Notification - Ref: {breach.id}",
                body=message,
                html=False
            )

            # Update breach log
            breach.dpa_notified = True
            breach.dpa_notification_date = datetime.utcnow()
            await db.commit()

            logger.info(f"DPA notified about breach {breach.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to notify DPA: {e}")
            await db.rollback()
            return False

    @staticmethod
    async def notify_affected_users(
        db: AsyncSession,
        breach_id: int,
        user_actions: str
    ) -> int:
        """
        Notify affected users about a breach

        Args:
            db: Database session
            breach_id: Breach ID
            user_actions: Recommended actions for users

        Returns:
            int: Number of users notified
        """
        try:
            # Get breach
            result = await db.execute(
                select(DataBreachLog).where(DataBreachLog.id == breach_id)
            )
            breach = result.scalar_one_or_none()

            if not breach:
                raise ValueError(f"Breach {breach_id} not found")

            # Check if notification is required
            if not breach.users_notification_required:
                logger.info(f"User notification not required for breach {breach_id}")
                return 0

            # Get all active users (in a real scenario, you'd filter by affected users)
            users_result = await db.execute(
                select(User).where(
                    and_(
                        User.is_active == True,
                        User.deleted == False
                    )
                )
            )
            users = users_result.scalars().all()

            notified_count = 0

            for user in users:
                try:
                    message = BreachNotificationService.USER_TEMPLATE.format(
                        description=breach.description,
                        affected_data_categories=', '.join(json.loads(breach.affected_data_categories)) if breach.affected_data_categories else 'Unknown',
                        remediation_steps=breach.remediation_steps or 'We are actively working to resolve this issue.',
                        user_actions=user_actions,
                        breach_id=breach.id,
                        notification_date=datetime.utcnow().strftime('%Y-%m-%d')
                    )

                    await EmailService.send_email(
                        to_email=user.username,  # username is email
                        subject="Important Security Notification - Data Breach Alert",
                        body=message,
                        html=False
                    )

                    notified_count += 1

                except Exception as e:
                    logger.error(f"Failed to notify user {user.id}: {e}")

            # Update breach log
            breach.users_notified = True
            breach.users_notification_date = datetime.utcnow()
            await db.commit()

            logger.info(f"Notified {notified_count} users about breach {breach.id}")
            return notified_count

        except Exception as e:
            logger.error(f"Failed to notify users: {e}")
            await db.rollback()
            return 0

    @staticmethod
    async def update_breach_status(
        db: AsyncSession,
        breach_id: int,
        status: str,
        contained_at: Optional[datetime] = None,
        resolved_at: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> bool:
        """
        Update breach status

        Args:
            db: Database session
            breach_id: Breach ID
            status: New status (investigating, contained, resolved, closed)
            contained_at: When breach was contained
            resolved_at: When breach was resolved
            notes: Additional notes

        Returns:
            bool: Success status
        """
        try:
            result = await db.execute(
                select(DataBreachLog).where(DataBreachLog.id == breach_id)
            )
            breach = result.scalar_one_or_none()

            if not breach:
                raise ValueError(f"Breach {breach_id} not found")

            breach.status = status

            if contained_at:
                breach.contained_at = contained_at
            if resolved_at:
                breach.resolved_at = resolved_at
            if notes:
                breach.notes = (breach.notes or '') + f"\n[{datetime.utcnow()}] {notes}"

            breach.updated_at = datetime.utcnow()

            await db.commit()

            logger.info(f"Updated breach {breach_id} status to {status}")
            return True

        except Exception as e:
            logger.error(f"Failed to update breach status: {e}")
            await db.rollback()
            return False

    @staticmethod
    async def get_active_breaches(db: AsyncSession) -> List[DataBreachLog]:
        """Get all active (non-closed) breaches"""
        result = await db.execute(
            select(DataBreachLog).where(
                DataBreachLog.status != 'closed'
            ).order_by(DataBreachLog.discovered_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_breaches_requiring_dpa_notification(db: AsyncSession) -> List[DataBreachLog]:
        """Get breaches that require DPA notification but haven't been notified yet"""
        result = await db.execute(
            select(DataBreachLog).where(
                and_(
                    DataBreachLog.dpa_notification_required == True,
                    DataBreachLog.dpa_notified == False,
                    DataBreachLog.discovered_at >= datetime.utcnow() - timedelta(hours=72)
                )
            ).order_by(DataBreachLog.discovered_at.asc())
        )
        return result.scalars().all()
