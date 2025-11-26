"""
GDPR Compliance Service

Handles GDPR-related operations:
- Data processing activity logging (Art. 30)
- Data export (Art. 20 - Right to Data Portability)
- Processing records management
"""
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import Request

from fastapi_app.db.models import (
    User,
    DataProcessingLog,
    Conversation,
    Message,
    ContactRequest,
    UserSurvey,
    UserSurveyStage2,
    HiredAgent
)

logger = logging.getLogger(__name__)


class GDPRService:
    """Service for GDPR compliance operations"""

    @staticmethod
    async def log_data_processing(
        db: AsyncSession,
        user_id: int,
        activity_type: str,
        purpose: str,
        data_categories: List[str],
        legal_basis: str = "contract",
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        performed_by_user_id: Optional[int] = None
    ) -> bool:
        """
        Log a data processing activity for GDPR Article 30 compliance

        Args:
            db: Database session
            user_id: User whose data was processed
            activity_type: Type of activity (data_access, data_export, data_modification, data_deletion)
            purpose: Why the data was processed
            data_categories: List of data categories processed (e.g., ["profile", "conversations"])
            legal_basis: Legal basis for processing (consent, contract, legitimate_interest, legal_obligation)
            endpoint: API endpoint that triggered the processing
            method: HTTP method
            ip_address: IP address of requester
            user_agent: User agent string
            performed_by_user_id: User ID who performed the action (for admin access)

        Returns:
            bool: Success status
        """
        try:
            log_entry = DataProcessingLog(
                user_id=user_id,
                activity_type=activity_type,
                endpoint=endpoint,
                method=method,
                ip_address=ip_address,
                user_agent=user_agent,
                purpose=purpose,
                data_categories=json.dumps(data_categories),
                legal_basis=legal_basis,
                performed_by_user_id=performed_by_user_id
            )

            db.add(log_entry)
            await db.commit()

            logger.info(f"GDPR: Logged {activity_type} for user {user_id} - {purpose}")
            return True

        except Exception as e:
            logger.error(f"Failed to log data processing activity: {e}")
            await db.rollback()
            return False

    @staticmethod
    async def log_from_request(
        db: AsyncSession,
        request: Request,
        user: User,
        activity_type: str,
        purpose: str,
        data_categories: List[str],
        legal_basis: str = "contract"
    ) -> bool:
        """
        Convenience method to log data processing from a FastAPI request

        Args:
            db: Database session
            request: FastAPI Request object
            user: User whose data was processed
            activity_type: Type of activity
            purpose: Why the data was processed
            data_categories: List of data categories
            legal_basis: Legal basis for processing

        Returns:
            bool: Success status
        """
        # Extract IP address (handle proxy headers)
        ip_address = request.headers.get("X-Forwarded-For", request.client.host if request.client else None)
        if ip_address and "," in ip_address:
            ip_address = ip_address.split(",")[0].strip()

        # Extract user agent
        user_agent = request.headers.get("User-Agent", "Unknown")

        # Get endpoint and method
        endpoint = str(request.url.path)
        method = request.method

        return await GDPRService.log_data_processing(
            db=db,
            user_id=user.id,
            activity_type=activity_type,
            purpose=purpose,
            data_categories=data_categories,
            legal_basis=legal_basis,
            endpoint=endpoint,
            method=method,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @staticmethod
    async def export_user_data(
        db: AsyncSession,
        user: User,
        request: Optional[Request] = None
    ) -> Dict[str, Any]:
        """
        Export all user data in machine-readable format
        GDPR Article 20 - Right to Data Portability

        Args:
            db: Database session
            user: User requesting data export
            request: Optional FastAPI Request for logging

        Returns:
            Dict containing all user data
        """
        try:
            # Log this data access
            if request:
                await GDPRService.log_from_request(
                    db=db,
                    request=request,
                    user=user,
                    activity_type="data_export",
                    purpose="User requested full data export (GDPR Art. 20)",
                    data_categories=["profile", "conversations", "messages", "surveys", "agent_access", "contact_requests"],
                    legal_basis="consent"
                )

            # 1. User Profile Data
            user_profile = {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "email_verified": user.email_verified,
                "plan_type": user.plan_type,
                "query_count": user.query_count,
                "monthly_query_count": user.monthly_query_count,
                "last_query_date": user.last_query_date.isoformat() if user.last_query_date else None,
                "plan_start_date": user.plan_start_date.isoformat() if user.plan_start_date else None,
                "plan_end_date": user.plan_end_date.isoformat() if user.plan_end_date else None,
            }

            # 2. GDPR Consent Records
            gdpr_consents = {
                "gdpr_consent_given": user.gdpr_consent_given,
                "gdpr_consent_date": user.gdpr_consent_date.isoformat() if user.gdpr_consent_date else None,
                "terms_accepted": user.terms_accepted,
                "terms_accepted_date": user.terms_accepted_date.isoformat() if user.terms_accepted_date else None,
                "marketing_consent": user.marketing_consent,
                "marketing_consent_date": user.marketing_consent_date.isoformat() if user.marketing_consent_date else None,
                "privacy_policy_version": user.privacy_policy_version,
                "terms_version": user.terms_version,
            }

            # 3. Conversations
            conversations_result = await db.execute(
                select(Conversation).where(Conversation.user_id == user.id)
            )
            conversations = conversations_result.scalars().all()

            conversations_data = []
            for conv in conversations:
                # Get messages for this conversation
                messages_result = await db.execute(
                    select(Message).where(Message.conversation_id == conv.id).order_by(Message.timestamp)
                )
                messages = messages_result.scalars().all()

                messages_data = [
                    {
                        "id": msg.id,
                        "sender": msg.sender,
                        "agent_type": msg.agent_type,
                        "content": json.loads(msg.content) if msg.content else None,
                        "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                    }
                    for msg in messages
                ]

                conversations_data.append({
                    "id": conv.id,
                    "title": conv.title,
                    "agent_type": conv.agent_type,
                    "created_at": conv.created_at.isoformat() if conv.created_at else None,
                    "messages": messages_data,
                    "message_count": len(messages_data),
                })

            # 4. Survey Responses
            # Stage 1
            survey1_result = await db.execute(
                select(UserSurvey).where(UserSurvey.user_id == user.id)
            )
            survey1 = survey1_result.scalar_one_or_none()

            survey1_data = None
            if survey1:
                survey1_data = {
                    "role": survey1.role,
                    "role_other": survey1.role_other,
                    "regions": json.loads(survey1.regions) if survey1.regions else None,
                    "familiarity": survey1.familiarity,
                    "insights": json.loads(survey1.insights) if survey1.insights else None,
                    "tailored": survey1.tailored,
                    "created_at": survey1.created_at.isoformat() if survey1.created_at else None,
                    "bonus_queries_granted": survey1.bonus_queries_granted,
                }

            # Stage 2
            survey2_result = await db.execute(
                select(UserSurveyStage2).where(UserSurveyStage2.user_id == user.id)
            )
            survey2 = survey2_result.scalar_one_or_none()

            survey2_data = None
            if survey2:
                survey2_data = {
                    "work_focus": survey2.work_focus,
                    "work_focus_other": survey2.work_focus_other,
                    "pv_segments": json.loads(survey2.pv_segments) if survey2.pv_segments else None,
                    "technologies": json.loads(survey2.technologies) if survey2.technologies else None,
                    "technologies_other": survey2.technologies_other,
                    "challenges": json.loads(survey2.challenges) if survey2.challenges else None,
                    "weekly_insight": survey2.weekly_insight,
                    "created_at": survey2.created_at.isoformat() if survey2.created_at else None,
                    "bonus_queries_granted": survey2.bonus_queries_granted,
                }

            # 5. Hired Agents
            hired_agents_result = await db.execute(
                select(HiredAgent).where(
                    HiredAgent.user_id == user.id,
                    HiredAgent.is_active == True
                )
            )
            hired_agents = hired_agents_result.scalars().all()

            hired_agents_data = [
                {
                    "agent_type": agent.agent_type,
                    "hired_at": agent.hired_at.isoformat() if agent.hired_at else None,
                }
                for agent in hired_agents
            ]

            # 6. Contact Requests
            contact_requests_result = await db.execute(
                select(ContactRequest).where(ContactRequest.email == user.username)
            )
            contact_requests = contact_requests_result.scalars().all()

            contact_requests_data = [
                {
                    "id": req.id,
                    "name": req.name,
                    "company": req.company,
                    "message": req.message,
                    "source": req.source,
                    "status": req.status,
                    "created_at": req.created_at.isoformat() if req.created_at else None,
                }
                for req in contact_requests
            ]

            # 7. Data Processing Logs (transparency)
            processing_logs_result = await db.execute(
                select(DataProcessingLog)
                .where(DataProcessingLog.user_id == user.id)
                .order_by(DataProcessingLog.timestamp.desc())
                .limit(100)  # Last 100 activities
            )
            processing_logs = processing_logs_result.scalars().all()

            processing_logs_data = [
                {
                    "activity_type": log.activity_type,
                    "purpose": log.purpose,
                    "data_categories": json.loads(log.data_categories) if log.data_categories else None,
                    "legal_basis": log.legal_basis,
                    "endpoint": log.endpoint,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                }
                for log in processing_logs
            ]

            # Compile complete export
            export_data = {
                "export_metadata": {
                    "export_date": datetime.utcnow().isoformat(),
                    "export_format": "JSON",
                    "gdpr_article": "Article 20 - Right to Data Portability",
                    "data_controller": "Becquerel Institute",
                },
                "user_profile": user_profile,
                "gdpr_consents": gdpr_consents,
                "conversations": {
                    "total_conversations": len(conversations_data),
                    "total_messages": sum(conv["message_count"] for conv in conversations_data),
                    "data": conversations_data,
                },
                "surveys": {
                    "stage1": survey1_data,
                    "stage2": survey2_data,
                },
                "hired_agents": hired_agents_data,
                "contact_requests": contact_requests_data,
                "data_processing_logs": {
                    "description": "Last 100 data processing activities for transparency",
                    "data": processing_logs_data,
                },
            }

            logger.info(f"GDPR: Generated data export for user {user.id}")
            return export_data

        except Exception as e:
            logger.error(f"Failed to export user data: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise

    @staticmethod
    async def get_processing_logs(
        db: AsyncSession,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get data processing logs for a user (for transparency)

        Args:
            db: Database session
            user_id: User ID
            limit: Number of logs to return
            offset: Offset for pagination

        Returns:
            List of processing log dictionaries
        """
        try:
            result = await db.execute(
                select(DataProcessingLog)
                .where(DataProcessingLog.user_id == user_id)
                .order_by(DataProcessingLog.timestamp.desc())
                .limit(limit)
                .offset(offset)
            )
            logs = result.scalars().all()

            return [
                {
                    "id": log.id,
                    "activity_type": log.activity_type,
                    "purpose": log.purpose,
                    "data_categories": json.loads(log.data_categories) if log.data_categories else None,
                    "legal_basis": log.legal_basis,
                    "endpoint": log.endpoint,
                    "method": log.method,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                }
                for log in logs
            ]

        except Exception as e:
            logger.error(f"Failed to get processing logs: {e}")
            return []
