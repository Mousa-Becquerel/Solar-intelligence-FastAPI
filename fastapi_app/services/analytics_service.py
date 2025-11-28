"""
Analytics Service - Platform usage analytics with anonymized data
Provides insights for admin dashboard while protecting user privacy
"""
from typing import Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy import select, func, case, text
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import hashlib

from fastapi_app.db.models import User, Conversation, Message, HiredAgent, UserSurvey, UserSurveyStage2

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for platform analytics with anonymized data"""

    # Development team user IDs to exclude from analytics
    EXCLUDED_USER_IDS = {1, 4, 5, 6, 7, 8, 9, 77, 97, 104, 105, 106, 127, 128, 129, 130}

    @staticmethod
    def anonymize_user_id(user_id: int) -> str:
        """Generate an anonymized identifier for a user"""
        # Create a hash that's consistent but not reversible
        hash_input = f"user_{user_id}_salt_solar_intel"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:12]

    @staticmethod
    async def get_overview_stats(db: AsyncSession) -> Dict[str, Any]:
        """
        Get high-level overview statistics

        Returns:
            Dictionary with overview metrics
        """
        try:
            stats = {}
            excluded = AnalyticsService.EXCLUDED_USER_IDS

            # Total users (excluding dev team)
            result = await db.execute(
                select(func.count(User.id)).where(
                    User.id.notin_(excluded)
                )
            )
            stats['total_users'] = result.scalar() or 0

            # Active users (not deleted, is_active=True, excluding dev team)
            result = await db.execute(
                select(func.count(User.id)).where(
                    User.is_active == True,
                    User.deleted == False,
                    User.id.notin_(excluded)
                )
            )
            stats['active_users'] = result.scalar() or 0

            # Total conversations (excluding dev team)
            result = await db.execute(
                select(func.count(Conversation.id)).where(
                    Conversation.user_id.notin_(excluded)
                )
            )
            stats['total_conversations'] = result.scalar() or 0

            # Total messages (excluding dev team conversations)
            result = await db.execute(
                select(func.count(Message.id)).join(
                    Conversation,
                    Message.conversation_id == Conversation.id
                ).where(
                    Conversation.user_id.notin_(excluded)
                )
            )
            stats['total_messages'] = result.scalar() or 0

            # Total user queries (messages from users, excluding dev team)
            result = await db.execute(
                select(func.count(Message.id)).join(
                    Conversation,
                    Message.conversation_id == Conversation.id
                ).where(
                    Message.sender == 'user',
                    Conversation.user_id.notin_(excluded)
                )
            )
            stats['total_queries'] = result.scalar() or 0

            # Total agent responses (excluding dev team)
            result = await db.execute(
                select(func.count(Message.id)).join(
                    Conversation,
                    Message.conversation_id == Conversation.id
                ).where(
                    Message.sender == 'bot',
                    Conversation.user_id.notin_(excluded)
                )
            )
            stats['total_responses'] = result.scalar() or 0

            # Users by plan type (excluding dev team)
            result = await db.execute(
                select(
                    User.plan_type,
                    func.count(User.id)
                ).where(
                    User.deleted == False,
                    User.id.notin_(excluded)
                ).group_by(User.plan_type)
            )
            plan_distribution = {row[0] or 'free': row[1] for row in result.all()}
            stats['plan_distribution'] = plan_distribution

            # New users this week (excluding dev team)
            week_ago = datetime.utcnow() - timedelta(days=7)
            result = await db.execute(
                select(func.count(User.id)).where(
                    User.created_at >= week_ago,
                    User.id.notin_(excluded)
                )
            )
            stats['new_users_week'] = result.scalar() or 0

            # New users this month (excluding dev team)
            month_ago = datetime.utcnow() - timedelta(days=30)
            result = await db.execute(
                select(func.count(User.id)).where(
                    User.created_at >= month_ago,
                    User.id.notin_(excluded)
                )
            )
            stats['new_users_month'] = result.scalar() or 0

            return stats

        except Exception as e:
            logger.error(f"Error getting overview stats: {e}")
            return {}

    @staticmethod
    async def get_usage_over_time(
        db: AsyncSession,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get usage statistics over time (daily breakdown)

        Args:
            db: Database session
            days: Number of days to include

        Returns:
            Dictionary with daily usage data
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            excluded = AnalyticsService.EXCLUDED_USER_IDS

            # Daily query counts (user messages, excluding dev team)
            result = await db.execute(
                select(
                    func.date(Message.timestamp).label('date'),
                    func.count(Message.id).label('count')
                ).join(
                    Conversation,
                    Message.conversation_id == Conversation.id
                ).where(
                    Message.timestamp >= cutoff_date,
                    Message.sender == 'user',
                    Conversation.user_id.notin_(excluded)
                ).group_by(
                    func.date(Message.timestamp)
                ).order_by(
                    func.date(Message.timestamp).asc()
                )
            )
            daily_queries = [
                {'date': str(row.date), 'queries': row.count}
                for row in result.all()
            ]

            # Daily active users (users who sent messages, excluding dev team)
            result = await db.execute(
                select(
                    func.date(Message.timestamp).label('date'),
                    func.count(func.distinct(Conversation.user_id)).label('active_users')
                ).join(
                    Conversation,
                    Message.conversation_id == Conversation.id
                ).where(
                    Message.timestamp >= cutoff_date,
                    Message.sender == 'user',
                    Conversation.user_id.notin_(excluded)
                ).group_by(
                    func.date(Message.timestamp)
                ).order_by(
                    func.date(Message.timestamp).asc()
                )
            )
            daily_active_users = {
                str(row.date): row.active_users
                for row in result.all()
            }

            # Merge data
            for day in daily_queries:
                day['active_users'] = daily_active_users.get(day['date'], 0)

            # Daily new conversations (excluding dev team)
            result = await db.execute(
                select(
                    func.date(Conversation.created_at).label('date'),
                    func.count(Conversation.id).label('count')
                ).where(
                    Conversation.created_at >= cutoff_date,
                    Conversation.user_id.notin_(excluded)
                ).group_by(
                    func.date(Conversation.created_at)
                ).order_by(
                    func.date(Conversation.created_at).asc()
                )
            )
            daily_conversations = {
                str(row.date): row.count
                for row in result.all()
            }

            for day in daily_queries:
                day['new_conversations'] = daily_conversations.get(day['date'], 0)

            return {
                'period_days': days,
                'daily_data': daily_queries,
                'total_queries': sum(d['queries'] for d in daily_queries)
            }

        except Exception as e:
            logger.error(f"Error getting usage over time: {e}")
            return {'period_days': days, 'daily_data': [], 'total_queries': 0}

    @staticmethod
    async def get_agent_usage_stats(
        db: AsyncSession,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get usage statistics by agent type

        Args:
            db: Database session
            days: Number of days to include

        Returns:
            Dictionary with agent usage data
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            excluded = AnalyticsService.EXCLUDED_USER_IDS

            # Queries by agent type (excluding dev team)
            result = await db.execute(
                select(
                    Conversation.agent_type,
                    func.count(Message.id).label('query_count')
                ).join(
                    Message,
                    Conversation.id == Message.conversation_id
                ).where(
                    Message.timestamp >= cutoff_date,
                    Message.sender == 'user',
                    Conversation.user_id.notin_(excluded)
                ).group_by(
                    Conversation.agent_type
                ).order_by(
                    func.count(Message.id).desc()
                )
            )
            agent_queries = [
                {'agent': row.agent_type or 'unknown', 'queries': row.query_count}
                for row in result.all()
            ]

            # Unique users per agent (excluding dev team)
            result = await db.execute(
                select(
                    Conversation.agent_type,
                    func.count(func.distinct(Conversation.user_id)).label('unique_users')
                ).join(
                    Message,
                    Conversation.id == Message.conversation_id
                ).where(
                    Message.timestamp >= cutoff_date,
                    Message.sender == 'user',
                    Conversation.user_id.notin_(excluded)
                ).group_by(
                    Conversation.agent_type
                )
            )
            unique_users_map = {
                row.agent_type: row.unique_users
                for row in result.all()
            }

            # Add unique users to agent data
            for agent in agent_queries:
                agent['unique_users'] = unique_users_map.get(agent['agent'], 0)

            # Conversations per agent (excluding dev team)
            result = await db.execute(
                select(
                    Conversation.agent_type,
                    func.count(Conversation.id).label('conv_count')
                ).where(
                    Conversation.created_at >= cutoff_date,
                    Conversation.user_id.notin_(excluded)
                ).group_by(
                    Conversation.agent_type
                )
            )
            conv_map = {
                row.agent_type: row.conv_count
                for row in result.all()
            }

            for agent in agent_queries:
                agent['conversations'] = conv_map.get(agent['agent'], 0)

            # Hired agents count (current active, excluding dev team)
            result = await db.execute(
                select(
                    HiredAgent.agent_type,
                    func.count(HiredAgent.id).label('hired_count')
                ).where(
                    HiredAgent.is_active == True,
                    HiredAgent.user_id.notin_(excluded)
                ).group_by(
                    HiredAgent.agent_type
                )
            )
            hired_map = {
                row.agent_type: row.hired_count
                for row in result.all()
            }

            for agent in agent_queries:
                agent['currently_hired'] = hired_map.get(agent['agent'], 0)

            return {
                'period_days': days,
                'agents': agent_queries,
                'total_queries': sum(a['queries'] for a in agent_queries)
            }

        except Exception as e:
            logger.error(f"Error getting agent usage stats: {e}")
            return {'period_days': days, 'agents': [], 'total_queries': 0}

    @staticmethod
    def clean_query_content(content) -> str:
        """
        Extract clean query text from message content
        Handles JSON structures and removes artifacts like {"type": "string", "value": ...}
        """
        import json
        import re

        if content is None:
            return ''

        query_text = ''

        # Handle dict content
        if isinstance(content, dict):
            # Try to get 'value' key first (common structure)
            if 'value' in content:
                query_text = str(content['value'])
            elif 'text' in content:
                query_text = str(content['text'])
            elif 'content' in content:
                query_text = str(content['content'])
            elif 'message' in content:
                query_text = str(content['message'])
            else:
                # Last resort: stringify but try to extract meaningful content
                query_text = str(content)
        elif isinstance(content, str):
            query_text = content
            # Try to parse as JSON string
            try:
                parsed = json.loads(content)
                if isinstance(parsed, dict):
                    if 'value' in parsed:
                        query_text = str(parsed['value'])
                    elif 'text' in parsed:
                        query_text = str(parsed['text'])
            except (json.JSONDecodeError, TypeError):
                pass
        else:
            query_text = str(content)

        # Clean up common JSON artifacts
        # Remove patterns like {"type": "string", "value": "..."} showing as text
        patterns_to_remove = [
            r'\{"type":\s*"[^"]*",\s*"value":\s*"?',  # {"type": "string", "value":
            r'"\s*\}$',  # trailing "}
            r'^\s*\{[^}]*"value":\s*"?',  # leading {"...": "value":
            r'"?\s*\}\s*$',  # trailing }
        ]

        for pattern in patterns_to_remove:
            query_text = re.sub(pattern, '', query_text)

        # Clean up escaped quotes and whitespace
        query_text = query_text.replace('\\"', '"')
        query_text = query_text.replace('\\n', ' ')
        query_text = re.sub(r'\s+', ' ', query_text)
        query_text = query_text.strip()

        return query_text

    @staticmethod
    async def get_recent_queries(
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
        agent_filter: str = None,
        search: str = None,
        days: int = None
    ) -> Dict[str, Any]:
        """
        Get recent queries with anonymized user info

        Args:
            db: Database session
            limit: Maximum number of queries to return
            offset: Offset for pagination
            agent_filter: Filter by agent type
            search: Search string for query content
            days: Filter to last N days (None = all time)

        Returns:
            Dict with queries list, total count, and pagination info
        """
        try:
            excluded = AnalyticsService.EXCLUDED_USER_IDS

            # Base query conditions
            base_conditions = [
                Message.sender == 'user',
                Conversation.user_id.notin_(excluded)
            ]

            # Add agent filter if specified
            if agent_filter and agent_filter != 'all':
                base_conditions.append(Conversation.agent_type == agent_filter)

            # Add time filter if specified
            if days is not None and days > 0:
                cutoff_date = datetime.utcnow() - timedelta(days=days)
                base_conditions.append(Message.timestamp >= cutoff_date)

            # Get total count first
            count_query = select(func.count(Message.id)).join(
                Conversation,
                Message.conversation_id == Conversation.id
            ).where(*base_conditions)

            total_result = await db.execute(count_query)
            total_count = total_result.scalar() or 0

            # Get paginated results
            result = await db.execute(
                select(
                    Message.id,
                    Message.content,
                    Message.timestamp,
                    Conversation.agent_type,
                    Conversation.user_id
                ).join(
                    Conversation,
                    Message.conversation_id == Conversation.id
                ).where(
                    *base_conditions
                ).order_by(
                    Message.timestamp.desc()
                ).offset(offset).limit(limit)
            )

            queries = []
            for row in result.all():
                # Extract and clean query text
                query_text = AnalyticsService.clean_query_content(row.content)

                # Apply search filter if specified (post-processing)
                if search and search.lower() not in query_text.lower():
                    continue

                queries.append({
                    'id': row.id,
                    'query': query_text,
                    'agent': row.agent_type or 'unknown',
                    'timestamp': row.timestamp.isoformat() if row.timestamp else None,
                    'user_hash': AnalyticsService.anonymize_user_id(row.user_id)
                })

            return {
                'queries': queries,
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': offset + len(queries) < total_count
            }

        except Exception as e:
            logger.error(f"Error getting recent queries: {e}")
            return {'queries': [], 'total': 0, 'limit': limit, 'offset': offset, 'has_more': False}

    @staticmethod
    async def get_user_engagement_stats(
        db: AsyncSession,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get user engagement statistics (anonymized)

        Args:
            db: Database session
            days: Number of days to analyze

        Returns:
            Dictionary with engagement metrics
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            excluded = AnalyticsService.EXCLUDED_USER_IDS

            # Average queries per active user (excluding dev team)
            result = await db.execute(
                select(
                    func.count(Message.id).label('total_queries'),
                    func.count(func.distinct(Conversation.user_id)).label('unique_users')
                ).join(
                    Conversation,
                    Message.conversation_id == Conversation.id
                ).where(
                    Message.timestamp >= cutoff_date,
                    Message.sender == 'user',
                    Conversation.user_id.notin_(excluded)
                )
            )
            row = result.one()
            total_queries = row.total_queries or 0
            unique_users = row.unique_users or 1  # Avoid division by zero

            avg_queries_per_user = round(total_queries / unique_users, 2)

            # Distribution of queries per user (anonymized, excluding dev team)
            result = await db.execute(
                select(
                    Conversation.user_id,
                    func.count(Message.id).label('query_count')
                ).join(
                    Message,
                    Conversation.id == Message.conversation_id
                ).where(
                    Message.timestamp >= cutoff_date,
                    Message.sender == 'user',
                    Conversation.user_id.notin_(excluded)
                ).group_by(
                    Conversation.user_id
                ).order_by(
                    func.count(Message.id).desc()
                ).limit(20)
            )

            top_users = [
                {
                    'user_hash': AnalyticsService.anonymize_user_id(row.user_id),
                    'queries': row.query_count
                }
                for row in result.all()
            ]

            # User retention: users active in both first and last half of period
            mid_date = datetime.utcnow() - timedelta(days=days // 2)

            # Users active in first half (excluding dev team)
            result = await db.execute(
                select(func.count(func.distinct(Conversation.user_id))).join(
                    Message,
                    Conversation.id == Message.conversation_id
                ).where(
                    Message.timestamp >= cutoff_date,
                    Message.timestamp < mid_date,
                    Message.sender == 'user',
                    Conversation.user_id.notin_(excluded)
                )
            )
            first_half_users = result.scalar() or 0

            # Users active in second half (excluding dev team)
            result = await db.execute(
                select(func.count(func.distinct(Conversation.user_id))).join(
                    Message,
                    Conversation.id == Message.conversation_id
                ).where(
                    Message.timestamp >= mid_date,
                    Message.sender == 'user',
                    Conversation.user_id.notin_(excluded)
                )
            )
            second_half_users = result.scalar() or 0

            return {
                'period_days': days,
                'total_queries': total_queries,
                'unique_active_users': unique_users,
                'avg_queries_per_user': avg_queries_per_user,
                'top_users_anonymized': top_users,
                'first_half_active_users': first_half_users,
                'second_half_active_users': second_half_users
            }

        except Exception as e:
            logger.error(f"Error getting user engagement stats: {e}")
            return {}

    @staticmethod
    async def get_hourly_distribution(
        db: AsyncSession,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get query distribution by hour of day

        Args:
            db: Database session
            days: Number of days to analyze

        Returns:
            Dictionary with hourly distribution
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            excluded = AnalyticsService.EXCLUDED_USER_IDS

            # Extract hour from timestamp and count (excluding dev team)
            result = await db.execute(
                select(
                    func.extract('hour', Message.timestamp).label('hour'),
                    func.count(Message.id).label('count')
                ).join(
                    Conversation,
                    Message.conversation_id == Conversation.id
                ).where(
                    Message.timestamp >= cutoff_date,
                    Message.sender == 'user',
                    Conversation.user_id.notin_(excluded)
                ).group_by(
                    func.extract('hour', Message.timestamp)
                ).order_by(
                    func.extract('hour', Message.timestamp)
                )
            )

            hourly_data = {int(row.hour): row.count for row in result.all()}

            # Fill in missing hours with 0
            distribution = [
                {'hour': h, 'queries': hourly_data.get(h, 0)}
                for h in range(24)
            ]

            # Find peak hours
            peak_hour = max(distribution, key=lambda x: x['queries'])

            return {
                'period_days': days,
                'hourly_distribution': distribution,
                'peak_hour': peak_hour['hour'],
                'peak_queries': peak_hour['queries']
            }

        except Exception as e:
            logger.error(f"Error getting hourly distribution: {e}")
            return {'hourly_distribution': [], 'peak_hour': 0, 'peak_queries': 0}

    @staticmethod
    async def get_full_analytics_report(
        db: AsyncSession,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get comprehensive analytics report

        Args:
            db: Database session
            days: Number of days to include

        Returns:
            Complete analytics report
        """
        try:
            overview = await AnalyticsService.get_overview_stats(db)
            usage_over_time = await AnalyticsService.get_usage_over_time(db, days)
            agent_stats = await AnalyticsService.get_agent_usage_stats(db, days)
            engagement = await AnalyticsService.get_user_engagement_stats(db, days)
            hourly = await AnalyticsService.get_hourly_distribution(db, days)

            return {
                'generated_at': datetime.utcnow().isoformat(),
                'period_days': days,
                'overview': overview,
                'usage_over_time': usage_over_time,
                'agent_stats': agent_stats,
                'user_engagement': engagement,
                'hourly_distribution': hourly
            }

        except Exception as e:
            logger.error(f"Error generating full analytics report: {e}")
            return {'error': str(e)}

    @staticmethod
    async def get_survey_analytics(db: AsyncSession) -> Dict[str, Any]:
        """
        Get survey responses analytics with aggregated data

        Returns:
            Dictionary with survey statistics and individual responses
        """
        import json

        try:
            excluded = AnalyticsService.EXCLUDED_USER_IDS

            # Get Stage 1 survey count
            stage1_count_result = await db.execute(
                select(func.count(UserSurvey.id)).where(
                    UserSurvey.user_id.notin_(excluded)
                )
            )
            stage1_count = stage1_count_result.scalar() or 0

            # Get Stage 2 survey count
            stage2_count_result = await db.execute(
                select(func.count(UserSurveyStage2.id)).where(
                    UserSurveyStage2.user_id.notin_(excluded)
                )
            )
            stage2_count = stage2_count_result.scalar() or 0

            # Get Stage 1 surveys with user info
            stage1_result = await db.execute(
                select(
                    UserSurvey.id,
                    UserSurvey.user_id,
                    UserSurvey.role,
                    UserSurvey.role_other,
                    UserSurvey.regions,
                    UserSurvey.familiarity,
                    UserSurvey.insights,
                    UserSurvey.tailored,
                    UserSurvey.created_at,
                    UserSurvey.bonus_queries_granted,
                    User.username.label('email')
                ).outerjoin(
                    User, UserSurvey.user_id == User.id
                ).where(
                    UserSurvey.user_id.notin_(excluded)
                ).order_by(UserSurvey.created_at.desc())
            )

            stage1_surveys = []
            for row in stage1_result.all():
                # Parse JSON fields safely
                try:
                    regions = json.loads(row.regions) if row.regions else []
                except (json.JSONDecodeError, TypeError):
                    regions = []

                try:
                    insights = json.loads(row.insights) if row.insights else []
                except (json.JSONDecodeError, TypeError):
                    insights = []

                stage1_surveys.append({
                    'id': row.id,
                    'user_hash': AnalyticsService.anonymize_user_id(row.user_id),
                    'email': row.email or 'Unknown',
                    'role': row.role,
                    'role_other': row.role_other,
                    'regions': regions,
                    'familiarity': row.familiarity,
                    'insights': insights,
                    'tailored': row.tailored,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                    'bonus_queries_granted': row.bonus_queries_granted or 0
                })

            # Get Stage 2 surveys with user info
            stage2_result = await db.execute(
                select(
                    UserSurveyStage2.id,
                    UserSurveyStage2.user_id,
                    UserSurveyStage2.work_focus,
                    UserSurveyStage2.work_focus_other,
                    UserSurveyStage2.pv_segments,
                    UserSurveyStage2.technologies,
                    UserSurveyStage2.technologies_other,
                    UserSurveyStage2.challenges,
                    UserSurveyStage2.weekly_insight,
                    UserSurveyStage2.created_at,
                    UserSurveyStage2.bonus_queries_granted,
                    User.username.label('email')
                ).outerjoin(
                    User, UserSurveyStage2.user_id == User.id
                ).where(
                    UserSurveyStage2.user_id.notin_(excluded)
                ).order_by(UserSurveyStage2.created_at.desc())
            )

            stage2_surveys = []
            for row in stage2_result.all():
                # Parse JSON fields safely
                try:
                    pv_segments = json.loads(row.pv_segments) if row.pv_segments else []
                except (json.JSONDecodeError, TypeError):
                    pv_segments = []

                try:
                    technologies = json.loads(row.technologies) if row.technologies else []
                except (json.JSONDecodeError, TypeError):
                    technologies = []

                try:
                    challenges = json.loads(row.challenges) if row.challenges else []
                except (json.JSONDecodeError, TypeError):
                    challenges = []

                stage2_surveys.append({
                    'id': row.id,
                    'user_hash': AnalyticsService.anonymize_user_id(row.user_id),
                    'email': row.email or 'Unknown',
                    'work_focus': row.work_focus,
                    'work_focus_other': row.work_focus_other,
                    'pv_segments': pv_segments,
                    'technologies': technologies,
                    'technologies_other': row.technologies_other,
                    'challenges': challenges,
                    'weekly_insight': row.weekly_insight,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                    'bonus_queries_granted': row.bonus_queries_granted or 0
                })

            # Aggregate role distribution from Stage 1
            role_counts = {}
            for survey in stage1_surveys:
                role = survey['role'] or 'Unknown'
                role_counts[role] = role_counts.get(role, 0) + 1

            # Aggregate familiarity distribution from Stage 1
            familiarity_counts = {}
            for survey in stage1_surveys:
                fam = survey['familiarity'] or 'Unknown'
                familiarity_counts[fam] = familiarity_counts.get(fam, 0) + 1

            # Aggregate region distribution from Stage 1
            region_counts = {}
            for survey in stage1_surveys:
                for region in survey.get('regions', []):
                    region_counts[region] = region_counts.get(region, 0) + 1

            # Aggregate work focus from Stage 2
            work_focus_counts = {}
            for survey in stage2_surveys:
                focus = survey['work_focus'] or 'Unknown'
                work_focus_counts[focus] = work_focus_counts.get(focus, 0) + 1

            return {
                'total_stage1': stage1_count,
                'total_stage2': stage2_count,
                'stage1_surveys': stage1_surveys,
                'stage2_surveys': stage2_surveys,
                'aggregates': {
                    'role_distribution': role_counts,
                    'familiarity_distribution': familiarity_counts,
                    'region_distribution': region_counts,
                    'work_focus_distribution': work_focus_counts
                }
            }

        except Exception as e:
            logger.error(f"Error getting survey analytics: {e}")
            return {
                'total_stage1': 0,
                'total_stage2': 0,
                'stage1_surveys': [],
                'stage2_surveys': [],
                'aggregates': {}
            }
