"""
Async Conversation Service for FastAPI

Handles all conversation and message operations including:
- Conversation CRUD operations
- Message management
- Conversation history
- Auto-title generation
- Cleanup operations

Migrated from Flask's sync ConversationService to async.
"""

from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import json
import logging

from fastapi_app.db.models import Conversation, Message, User

logger = logging.getLogger(__name__)


class ConversationService:
    """Async service for conversation and message operations."""

    @staticmethod
    async def create_conversation(
        db: AsyncSession,
        user_id: int,
        agent_type: str = "market",
        title: Optional[str] = None
    ) -> Tuple[Optional[Conversation], Optional[str]]:
        """
        Create a new conversation.

        Args:
            db: Async database session
            user_id: ID of the user creating the conversation
            agent_type: Type of agent for this conversation
            title: Optional conversation title

        Returns:
            Tuple of (Conversation object, error message)
        """
        try:
            conversation = Conversation(
                user_id=user_id,
                agent_type=agent_type,
                title=title or f"{agent_type.capitalize()} Chat",
                created_at=datetime.utcnow()
            )

            db.add(conversation)
            await db.commit()
            await db.refresh(conversation)

            logger.info(f"Created conversation {conversation.id} for user {user_id}")
            return conversation, None

        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            await db.rollback()
            return None, "Failed to create conversation"

    @staticmethod
    async def get_conversation(
        db: AsyncSession,
        conversation_id: int,
        user_id: Optional[int] = None
    ) -> Tuple[Optional[Conversation], Optional[str]]:
        """
        Get conversation by ID.

        Args:
            db: Async database session
            conversation_id: ID of the conversation
            user_id: Optional user ID for authorization check

        Returns:
            Tuple of (Conversation object, error message)
        """
        try:
            if user_id:
                result = await db.execute(
                    select(Conversation).where(
                        Conversation.id == conversation_id,
                        Conversation.user_id == user_id
                    )
                )
            else:
                result = await db.execute(
                    select(Conversation).where(Conversation.id == conversation_id)
                )

            conversation = result.scalar_one_or_none()

            if not conversation:
                return None, "Conversation not found"

            return conversation, None

        except Exception as e:
            logger.error(f"Error getting conversation {conversation_id}: {e}")
            return None, "Failed to load conversation"

    @staticmethod
    async def get_user_conversations(
        db: AsyncSession,
        user_id: int,
        agent_type: Optional[str] = None,
        limit: int = 50,
        include_message_count: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get user's conversations with optional filtering.

        Args:
            db: Async database session
            user_id: ID of the user
            agent_type: Optional filter by agent type
            limit: Maximum number of conversations to return
            include_message_count: Whether to include message count

        Returns:
            List of conversation dictionaries with preview of last message
        """
        try:
            # Build query
            query = select(Conversation).where(Conversation.user_id == user_id)

            if agent_type:
                query = query.where(Conversation.agent_type == agent_type)

            query = query.order_by(Conversation.created_at.desc()).limit(limit)

            result = await db.execute(query)
            conversations = result.scalars().all()

            # Build result list
            result_list = []
            for conv in conversations:
                # Get last user message for preview
                last_msg_query = select(Message).where(
                    Message.conversation_id == conv.id,
                    Message.sender == 'user'
                ).order_by(Message.timestamp.desc()).limit(1)

                last_msg_result = await db.execute(last_msg_query)
                last_message = last_msg_result.scalar_one_or_none()

                # Create preview from last message (first 60 chars)
                preview = None
                if last_message:
                    try:
                        # Try to parse JSON content
                        content = json.loads(last_message.content)
                        if isinstance(content, dict) and 'value' in content:
                            preview = content['value']
                        else:
                            preview = str(content)
                    except:
                        preview = last_message.content

                    # Truncate to 60 characters
                    if preview and len(preview) > 60:
                        preview = preview[:60] + '...'

                # Get message count if requested
                message_count = 0
                if include_message_count:
                    count_query = select(func.count(Message.id)).where(
                        Message.conversation_id == conv.id
                    )
                    count_result = await db.execute(count_query)
                    message_count = count_result.scalar() or 0

                result_list.append({
                    'id': conv.id,
                    'title': conv.title,
                    'preview': preview or conv.title or '',
                    'agent_type': conv.agent_type,
                    'created_at': conv.created_at,
                    'message_count': message_count
                })

            return result_list

        except Exception as e:
            logger.error(f"Error getting conversations for user {user_id}: {e}")
            return []

    @staticmethod
    async def get_or_create_fresh_conversation(
        db: AsyncSession,
        user_id: int,
        agent_type: str = "market"
    ) -> Tuple[Optional[int], Optional[str]]:
        """
        Get an empty conversation or create a new one.

        This is optimized to reuse empty conversations to reduce database bloat.

        Args:
            db: Async database session
            user_id: ID of the user
            agent_type: Type of agent

        Returns:
            Tuple of (conversation_id, error message)
        """
        try:
            # Find empty conversation with efficient SQL query
            # Left join to find conversations with no messages
            query = select(Conversation).outerjoin(
                Message,
                Conversation.id == Message.conversation_id
            ).where(
                Conversation.user_id == user_id,
                Message.id.is_(None)  # No messages
            ).limit(1)

            result = await db.execute(query)
            empty_conversation = result.scalar_one_or_none()

            if empty_conversation:
                logger.info(f"Reusing empty conversation {empty_conversation.id}")
                return empty_conversation.id, None

            # Create new conversation if no empty one exists
            conversation = Conversation(
                user_id=user_id,
                agent_type=agent_type,
                title=None,  # Will be set from first message
                created_at=datetime.utcnow()
            )

            db.add(conversation)
            await db.commit()
            await db.refresh(conversation)

            logger.info(f"Created fresh conversation {conversation.id} for user {user_id}")
            return conversation.id, None

        except Exception as e:
            logger.error(f"Error getting/creating fresh conversation: {e}")
            await db.rollback()
            return None, "Failed to create conversation"

    @staticmethod
    async def update_conversation_title(
        db: AsyncSession,
        conversation_id: int,
        user_id: int,
        title: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Update conversation title.

        Args:
            db: Async database session
            conversation_id: ID of the conversation
            user_id: ID of the user (for authorization)
            title: New title

        Returns:
            Tuple of (success, error message)
        """
        try:
            result = await db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            )
            conversation = result.scalar_one_or_none()

            if not conversation:
                return False, "Conversation not found"

            conversation.title = title
            await db.commit()

            logger.info(f"Updated title for conversation {conversation_id}")
            return True, None

        except Exception as e:
            logger.error(f"Error updating conversation title: {e}")
            await db.rollback()
            return False, "Failed to update title"

    @staticmethod
    async def delete_conversation(
        db: AsyncSession,
        conversation_id: int,
        user_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Delete a conversation and all its messages.

        Args:
            db: Async database session
            conversation_id: ID of the conversation
            user_id: ID of the user (for authorization)

        Returns:
            Tuple of (success, error message)
        """
        try:
            result = await db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            )
            conversation = result.scalar_one_or_none()

            if not conversation:
                return False, "Conversation not found"

            # Delete all messages first
            await db.execute(
                Message.__table__.delete().where(
                    Message.conversation_id == conversation_id
                )
            )

            # Delete conversation
            await db.delete(conversation)
            await db.commit()

            logger.info(f"Deleted conversation {conversation_id} by user {user_id}")
            return True, None

        except Exception as e:
            logger.error(f"Error deleting conversation {conversation_id}: {e}")
            await db.rollback()
            return False, "Failed to delete conversation"

    @staticmethod
    async def save_message(
        db: AsyncSession,
        conversation_id: int,
        sender: str,
        content: str,
        user_id: Optional[int] = None
    ) -> Tuple[Optional[Message], Optional[str]]:
        """
        Save a message to a conversation.

        Args:
            db: Async database session
            conversation_id: ID of the conversation
            sender: 'user' or 'bot'
            content: Message content (JSON string or plain text)
            user_id: Optional user ID for authorization

        Returns:
            Tuple of (Message object, error message)
        """
        try:
            # Verify conversation ownership if user_id provided
            if user_id:
                result = await db.execute(
                    select(Conversation).where(
                        Conversation.id == conversation_id,
                        Conversation.user_id == user_id
                    )
                )
                conversation = result.scalar_one_or_none()

                if not conversation:
                    return None, "Conversation not found"

            message = Message(
                conversation_id=conversation_id,
                sender=sender,
                content=content,
                timestamp=datetime.utcnow()
            )

            db.add(message)
            await db.commit()
            await db.refresh(message)

            logger.debug(f"Saved message to conversation {conversation_id}")
            return message, None

        except Exception as e:
            logger.error(f"Error saving message: {e}")
            await db.rollback()
            return None, "Failed to save message"

    @staticmethod
    async def get_conversation_messages(
        db: AsyncSession,
        conversation_id: int,
        user_id: Optional[int] = None,
        limit: int = 50
    ) -> Tuple[List[Message], Optional[str]]:
        """
        Get messages for a conversation.

        Args:
            db: Async database session
            conversation_id: ID of the conversation
            user_id: Optional user ID for authorization
            limit: Maximum number of messages to return

        Returns:
            Tuple of (list of Message objects, error message)
        """
        try:
            # Verify conversation ownership if user_id provided
            if user_id:
                result = await db.execute(
                    select(Conversation).where(
                        Conversation.id == conversation_id,
                        Conversation.user_id == user_id
                    )
                )
                conversation = result.scalar_one_or_none()

                if not conversation:
                    return [], "Conversation not found"

            # Get messages
            query = select(Message).where(
                Message.conversation_id == conversation_id
            ).order_by(Message.timestamp.asc()).limit(limit)

            result = await db.execute(query)
            messages = result.scalars().all()

            return list(messages), None

        except Exception as e:
            logger.error(f"Error getting messages for conversation {conversation_id}: {e}")
            return [], "Failed to load messages"

    @staticmethod
    async def get_messages_for_agent(
        db: AsyncSession,
        conversation_id: int,
        limit: int = 50
    ) -> List[Dict[str, str]]:
        """
        Get messages formatted for AI agent consumption.

        Args:
            db: Async database session
            conversation_id: ID of the conversation
            limit: Maximum number of messages

        Returns:
            List of message dictionaries with 'role' and 'content'
        """
        try:
            query = select(Message).where(
                Message.conversation_id == conversation_id
            ).order_by(Message.timestamp.asc()).limit(limit)

            result = await db.execute(query)
            messages = result.scalars().all()

            return [
                {
                    'role': 'user' if msg.sender == 'user' else 'assistant',
                    'content': msg.content,
                    'timestamp': msg.timestamp.isoformat()
                }
                for msg in messages
            ]

        except Exception as e:
            logger.error(f"Error getting messages for agent: {e}")
            return []

    @staticmethod
    async def clear_conversation_messages(
        db: AsyncSession,
        conversation_id: int,
        user_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Clear all messages from a conversation.

        Args:
            db: Async database session
            conversation_id: ID of the conversation
            user_id: ID of the user (for authorization)

        Returns:
            Tuple of (success, error message)
        """
        try:
            # Verify conversation ownership
            result = await db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            )
            conversation = result.scalar_one_or_none()

            if not conversation:
                return False, "Conversation not found"

            # Delete all messages
            delete_result = await db.execute(
                Message.__table__.delete().where(
                    Message.conversation_id == conversation_id
                )
            )
            deleted_count = delete_result.rowcount
            await db.commit()

            logger.info(f"Cleared {deleted_count} messages from conversation {conversation_id}")
            return True, None

        except Exception as e:
            logger.error(f"Error clearing conversation messages: {e}")
            await db.rollback()
            return False, "Failed to clear messages"

    @staticmethod
    async def auto_generate_conversation_title(
        db: AsyncSession,
        conversation_id: int,
        user_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Auto-generate conversation title from first user message.

        Args:
            db: Async database session
            conversation_id: ID of the conversation
            user_id: ID of the user (for authorization)

        Returns:
            Tuple of (success, error message)
        """
        try:
            result = await db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            )
            conversation = result.scalar_one_or_none()

            if not conversation:
                return False, "Conversation not found"

            # Don't override existing title
            if conversation.title:
                return True, None

            # Get first user message
            query = select(Message).where(
                Message.conversation_id == conversation_id,
                Message.sender == 'user'
            ).order_by(Message.timestamp.asc()).limit(1)

            result = await db.execute(query)
            first_message = result.scalar_one_or_none()

            if not first_message:
                return True, None  # No messages yet

            # Generate title from first message
            try:
                content = json.loads(first_message.content)
                if content.get('type') == 'string' and content.get('value'):
                    value = str(content['value'])
                    words = value.split()
                    title = ' '.join(words[:6]) + '...' if len(words) > 6 else value
                    conversation.title = title[:256]  # Limit to 256 chars
                    await db.commit()
                    logger.info(f"Auto-generated title for conversation {conversation_id}")
            except (json.JSONDecodeError, KeyError, TypeError, AttributeError) as e:
                logger.debug(f"Could not parse message for title: {e}")
                # Fallback to generic title
                conversation.title = f"Conversation {conversation_id}"
                await db.commit()

            return True, None

        except Exception as e:
            logger.error(f"Error auto-generating title: {e}")
            await db.rollback()
            return False, "Failed to generate title"

    @staticmethod
    async def cleanup_empty_conversations(
        db: AsyncSession,
        user_id: Optional[int] = None,
        days_old: int = 7
    ) -> Tuple[int, Optional[str]]:
        """
        Clean up empty conversations older than specified days.

        Args:
            db: Async database session
            user_id: Optional user ID to limit cleanup to specific user
            days_old: Delete empty conversations older than this many days

        Returns:
            Tuple of (number deleted, error message)
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)

            # Find empty conversations
            query = select(Conversation).outerjoin(
                Message,
                Conversation.id == Message.conversation_id
            ).where(
                Message.id.is_(None),  # No messages
                Conversation.created_at < cutoff_date
            )

            if user_id:
                query = query.where(Conversation.user_id == user_id)

            result = await db.execute(query)
            empty_conversations = result.scalars().all()

            deleted_count = 0
            for conv in empty_conversations:
                await db.delete(conv)
                deleted_count += 1

            await db.commit()

            logger.info(f"Cleaned up {deleted_count} empty conversations")
            return deleted_count, None

        except Exception as e:
            logger.error(f"Error cleaning up empty conversations: {e}")
            await db.rollback()
            return 0, "Failed to cleanup conversations"
