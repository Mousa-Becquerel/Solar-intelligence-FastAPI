"""
Admin Service - Async version for FastAPI
Handles administrative operations including user management, system maintenance, and monitoring
"""
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import select, func, delete, or_, exc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import logging

from fastapi_app.db.models import User, Conversation, Message, HiredAgent

logger = logging.getLogger(__name__)


class AdminService:
    """Service for administrative operations"""

    @staticmethod
    def verify_admin(user: User) -> bool:
        """
        Verify that a user has admin privileges

        Args:
            user: User object to check

        Returns:
            True if user is admin, False otherwise
        """
        return user and user.role == 'admin'

    @staticmethod
    async def get_all_users(
        db: AsyncSession,
        include_inactive: bool = True,
        limit: Optional[int] = None
    ) -> List[User]:
        """
        Get all users in the system

        Args:
            db: Database session
            include_inactive: Whether to include inactive users
            limit: Optional limit on number of users

        Returns:
            List of User objects
        """
        try:
            query = select(User)

            if not include_inactive:
                query = query.where(User.is_active == True)

            query = query.order_by(User.created_at.desc())

            if limit:
                query = query.limit(limit)

            result = await db.execute(query)
            users = result.scalars().all()

            logger.debug(f"Retrieved {len(users)} users")
            return list(users)

        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            return []

    @staticmethod
    async def get_pending_users(db: AsyncSession) -> List[User]:
        """
        Get all users pending approval

        Returns:
            List of User objects with is_active=False and not deleted
        """
        try:
            # Get pending users (inactive AND not deleted)
            query = select(User).where(
                User.is_active == False,
                or_(User.deleted == False, User.deleted.is_(None))
            ).order_by(User.created_at.asc())

            result = await db.execute(query)
            pending = result.scalars().all()

            logger.info(f"Found {len(pending)} pending users")
            for user in pending:
                logger.debug(f"  PENDING: ID {user.id}: {user.full_name} ({user.username})")

            return list(pending)

        except Exception as e:
            logger.error(f"Error getting pending users: {e}")
            return []

    @staticmethod
    async def approve_user(
        db: AsyncSession,
        user_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Approve a pending user account

        Args:
            db: Database session
            user_id: ID of the user to approve

        Returns:
            Tuple of (success, error_message)
        """
        try:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, "User not found"

            if user.is_active:
                return False, "User is already active"

            user.is_active = True
            await db.commit()

            logger.info(f"User {user_id} ({user.username}) approved")
            return True, None

        except Exception as e:
            logger.error(f"Error approving user {user_id}: {e}")
            await db.rollback()
            return False, "Failed to approve user"

    @staticmethod
    async def create_user_by_admin(
        db: AsyncSession,
        username: str,
        password: str,
        full_name: str,
        role: str = 'user',
        plan_type: str = 'free',
        is_active: bool = True
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Create a new user (admin function)

        Args:
            db: Database session
            username: User's username (email)
            password: User's password
            full_name: User's full name
            role: User role (user, admin)
            plan_type: Plan type (free, premium)
            is_active: Whether user is active immediately

        Returns:
            Tuple of (User object, error_message)
        """
        try:
            # Check if user already exists
            result = await db.execute(
                select(User).where(User.username == username)
            )
            existing = result.scalar_one_or_none()

            if existing:
                return None, "User with this username already exists"

            # Create user
            user = User(
                username=username,
                full_name=full_name,
                role=role,
                plan_type=plan_type,
                is_active=is_active,
                gdpr_consent_given=True,  # Admin created
                terms_accepted=True,
                gdpr_consent_date=datetime.utcnow(),
                terms_accepted_date=datetime.utcnow()
            )
            user.set_password(password)

            db.add(user)
            await db.commit()
            await db.refresh(user)

            logger.info(f"User created by admin: {username}")
            return user, None

        except Exception as e:
            logger.error(f"Error creating user: {e}")
            await db.rollback()
            return None, "Failed to create user"

    @staticmethod
    async def update_user_by_admin(
        db: AsyncSession,
        user_id: int,
        full_name: Optional[str] = None,
        role: Optional[str] = None,
        plan_type: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Update user information (admin function)

        Args:
            db: Database session
            user_id: ID of the user
            full_name: Optional new full name
            role: Optional new role
            plan_type: Optional new plan type
            is_active: Optional new active status

        Returns:
            Tuple of (success, error_message)
        """
        try:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, "User not found"

            # Update fields if provided
            if full_name is not None:
                user.full_name = full_name

            if role is not None:
                if role not in ['user', 'admin']:
                    return False, "Invalid role"
                user.role = role

            if plan_type is not None:
                if plan_type not in ['free', 'premium', 'max']:
                    return False, "Invalid plan type"
                user.plan_type = plan_type

            if is_active is not None:
                user.is_active = is_active

            await db.commit()

            logger.info(f"User {user_id} updated by admin")
            return True, None

        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            await db.rollback()
            return False, "Failed to update user"

    @staticmethod
    async def delete_user_by_admin(
        db: AsyncSession,
        user_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Delete a user and all associated data (admin function)

        This is a permanent deletion with proper cascade handling

        Args:
            db: Database session
            user_id: ID of the user to delete

        Returns:
            Tuple of (success, error_message)
        """
        try:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, "User not found"

            # Get all conversation IDs for bulk delete
            result = await db.execute(
                select(Conversation.id).where(Conversation.user_id == user_id)
            )
            conversation_ids = result.scalars().all()

            if conversation_ids:
                # Bulk delete all messages
                await db.execute(
                    delete(Message).where(Message.conversation_id.in_(conversation_ids))
                )

            # Delete all conversations
            await db.execute(
                delete(Conversation).where(Conversation.user_id == user_id)
            )

            # Delete related records
            await db.execute(
                delete(HiredAgent).where(HiredAgent.user_id == user_id)
            )

            # Delete the user
            await db.delete(user)

            # Commit all changes in single transaction
            await db.commit()

            logger.info(f"User {user_id} ({user.username}) deleted by admin")
            return True, None

        except exc.IntegrityError as e:
            await db.rollback()
            logger.error(f"Integrity error deleting user {user_id}: {e}")
            return False, "Cannot delete user due to database constraints"
        except Exception as e:
            await db.rollback()
            logger.error(f"Error deleting user {user_id}: {e}")
            return False, "Failed to delete user"

    @staticmethod
    async def toggle_user_active_status(
        db: AsyncSession,
        user_id: int
    ) -> Tuple[bool, Optional[str], Optional[bool]]:
        """
        Toggle user's active status

        Args:
            db: Database session
            user_id: ID of the user

        Returns:
            Tuple of (success, error_message, new_status)
        """
        try:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, "User not found", None

            # Toggle status
            user.is_active = not user.is_active
            await db.commit()

            logger.info(f"User {user_id} active status toggled to {user.is_active}")
            return True, None, user.is_active

        except Exception as e:
            logger.error(f"Error toggling user status {user_id}: {e}")
            await db.rollback()
            return False, "Failed to toggle user status", None

    @staticmethod
    async def get_system_statistics(db: AsyncSession) -> Dict[str, Any]:
        """
        Get system-wide statistics

        Args:
            db: Database session

        Returns:
            Dictionary of system statistics
        """
        try:
            stats = {}

            # Total users
            result = await db.execute(select(func.count(User.id)))
            stats['total_users'] = result.scalar() or 0

            # Active users
            result = await db.execute(
                select(func.count(User.id)).where(User.is_active == True)
            )
            stats['active_users'] = result.scalar() or 0

            # Pending users
            result = await db.execute(
                select(func.count(User.id)).where(User.is_active == False)
            )
            stats['pending_users'] = result.scalar() or 0

            # Total conversations
            result = await db.execute(select(func.count(Conversation.id)))
            stats['total_conversations'] = result.scalar() or 0

            # Total messages
            result = await db.execute(select(func.count(Message.id)))
            stats['total_messages'] = result.scalar() or 0

            # Premium users
            result = await db.execute(
                select(func.count(User.id)).where(User.plan_type == 'premium')
            )
            stats['premium_users'] = result.scalar() or 0

            # Free users
            result = await db.execute(
                select(func.count(User.id)).where(User.plan_type == 'free')
            )
            stats['free_users'] = result.scalar() or 0

            # Get user registrations in last 7 days
            week_ago = datetime.utcnow() - timedelta(days=7)
            result = await db.execute(
                select(func.count(User.id)).where(User.created_at >= week_ago)
            )
            stats['new_users_this_week'] = result.scalar() or 0

            # Get most active users
            result = await db.execute(
                select(
                    User.id,
                    User.username,
                    User.query_count
                ).order_by(User.query_count.desc()).limit(5)
            )
            most_active = result.all()

            stats['most_active_users'] = [
                {'id': user_id, 'username': username, 'query_count': count}
                for user_id, username, count in most_active
            ]

            return stats

        except Exception as e:
            logger.error(f"Error getting system statistics: {e}")
            return {}

    @staticmethod
    async def cleanup_empty_conversations(
        db: AsyncSession,
        days_old: int = 7
    ) -> Tuple[int, Optional[str]]:
        """
        Clean up empty conversations older than specified days

        Args:
            db: Database session
            days_old: Delete conversations older than this many days

        Returns:
            Tuple of (number_deleted, error_message)
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)

            # Find empty conversations (subquery approach for async)
            # Get all conversation IDs
            result = await db.execute(
                select(Conversation.id).where(Conversation.created_at < cutoff_date)
            )
            all_conv_ids = set(result.scalars().all())

            # Get conversation IDs that have messages
            result = await db.execute(
                select(Message.conversation_id.distinct())
            )
            convs_with_messages = set(result.scalars().all())

            # Empty conversations = all conversations - conversations with messages
            empty_conv_ids = all_conv_ids - convs_with_messages

            count = len(empty_conv_ids)

            if empty_conv_ids:
                # Delete empty conversations
                await db.execute(
                    delete(Conversation).where(Conversation.id.in_(empty_conv_ids))
                )
                await db.commit()

            logger.info(f"Cleaned up {count} empty conversations")
            return count, None

        except Exception as e:
            logger.error(f"Error cleaning up empty conversations: {e}")
            await db.rollback()
            return 0, "Failed to cleanup conversations"

    @staticmethod
    async def get_user_activity_report(
        db: AsyncSession,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get user activity report for specified period

        Args:
            db: Database session
            days: Number of days to include in report

        Returns:
            Dictionary with activity data
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)

            # Daily query counts
            result = await db.execute(
                select(
                    func.date(Message.timestamp).label('date'),
                    func.count(Message.id).label('count')
                ).where(
                    Message.timestamp >= cutoff_date,
                    Message.sender == 'user'
                ).group_by(
                    func.date(Message.timestamp)
                ).order_by(
                    func.date(Message.timestamp).asc()
                )
            )
            daily_queries = result.all()

            # Queries by agent type
            result = await db.execute(
                select(
                    Conversation.agent_type,
                    func.count(Message.id).label('count')
                ).join(
                    Message,
                    Conversation.id == Message.conversation_id
                ).where(
                    Message.timestamp >= cutoff_date,
                    Message.sender == 'user'
                ).group_by(
                    Conversation.agent_type
                )
            )
            queries_by_agent = result.all()

            return {
                'period_days': days,
                'daily_queries': [
                    {'date': str(date), 'count': count}
                    for date, count in daily_queries
                ],
                'queries_by_agent': {
                    agent_type: count
                    for agent_type, count in queries_by_agent
                },
                'total_queries': sum(count for _, count in daily_queries)
            }

        except Exception as e:
            logger.error(f"Error getting activity report: {e}")
            return {'error': str(e)}

    @staticmethod
    async def reset_user_query_count(
        db: AsyncSession,
        user_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Reset user's monthly query count (admin function)

        Args:
            db: Database session
            user_id: ID of the user

        Returns:
            Tuple of (success, error_message)
        """
        try:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, "User not found"

            user.monthly_query_count = 0
            user.last_reset_date = datetime.utcnow()
            await db.commit()

            logger.info(f"Query count reset for user {user_id}")
            return True, None

        except Exception as e:
            logger.error(f"Error resetting query count for user {user_id}: {e}")
            await db.rollback()
            return False, "Failed to reset query count"

    @staticmethod
    async def search_users(
        db: AsyncSession,
        search_term: str,
        limit: int = 50
    ) -> List[User]:
        """
        Search users by username or full name

        Args:
            db: Database session
            search_term: Search term to match
            limit: Maximum number of results

        Returns:
            List of matching User objects
        """
        try:
            search_pattern = f"%{search_term}%"

            query = select(User).where(
                or_(
                    User.username.ilike(search_pattern),
                    User.full_name.ilike(search_pattern)
                )
            ).order_by(User.created_at.desc()).limit(limit)

            result = await db.execute(query)
            users = result.scalars().all()

            logger.debug(f"Found {len(users)} users matching '{search_term}'")
            return list(users)

        except Exception as e:
            logger.error(f"Error searching users: {e}")
            return []

    @staticmethod
    async def get_user_details(
        db: AsyncSession,
        user_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a user

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dictionary with user details or None
        """
        try:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                return None

            # Get conversation count
            result = await db.execute(
                select(func.count(Conversation.id)).where(Conversation.user_id == user_id)
            )
            conversation_count = result.scalar() or 0

            # Get message count
            result = await db.execute(
                select(func.count(Message.id)).join(
                    Conversation,
                    Message.conversation_id == Conversation.id
                ).where(Conversation.user_id == user_id)
            )
            message_count = result.scalar() or 0

            # Get hired agents
            result = await db.execute(
                select(HiredAgent).where(
                    HiredAgent.user_id == user_id,
                    HiredAgent.is_active == True
                )
            )
            hired_agents = result.scalars().all()

            return {
                'id': user.id,
                'username': user.username,
                'full_name': user.full_name,
                'role': user.role,
                'plan_type': user.plan_type,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'email_verified': user.email_verified,
                'query_count': user.query_count,
                'monthly_query_count': user.monthly_query_count,
                'last_query_date': user.last_query_date.isoformat() if user.last_query_date else None,
                'conversation_count': conversation_count,
                'message_count': message_count,
                'hired_agents': [agent.agent_type for agent in hired_agents],
                'gdpr_consent_given': user.gdpr_consent_given,
                'terms_accepted': user.terms_accepted
            }

        except Exception as e:
            logger.error(f"Error getting user details: {e}")
            return None
