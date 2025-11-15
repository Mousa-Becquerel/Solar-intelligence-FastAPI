"""
Session Factory for OpenAI Agents
Provides stateless session management with PostgreSQL backend
Designed for easy migration to Redis in the future
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Session backend configuration
# Set SESSION_BACKEND to 'redis' to migrate to Redis
SESSION_BACKEND = os.getenv("SESSION_BACKEND", "postgresql")  # postgresql | redis
DATABASE_URL = os.getenv("FASTAPI_DATABASE_URL", "postgresql+asyncpg://solar_admin:datahub1@postgres-db:5432/solar_intelligence_fastapi")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


def create_agent_session(conversation_id: str, agent_type: Optional[str] = None, ttl: Optional[int] = None):
    """
    Create a stateless session for OpenAI Agents

    Args:
        conversation_id: Unique conversation identifier
        agent_type: Agent type for session isolation in multi-agent conversations
        ttl: Time-to-live in seconds (Redis only, ignored for PostgreSQL)

    Returns:
        Session object (SQLAlchemySession or RedisSession)

    Usage:
        session = create_agent_session(conversation_id, agent_type='market')
        result = await Runner.run(agent, message, session=session)

    Note:
        In multi-agent conversations, each agent gets an isolated session by
        scoping the conversation_id with the agent_type (e.g., "123_market").
        This ensures agents only see their own previous messages.
    """
    # Scope conversation_id by agent_type for multi-agent isolation
    scoped_conversation_id = f"{conversation_id}_{agent_type}" if agent_type else conversation_id

    if SESSION_BACKEND == "redis":
        try:
            from agents.extensions.memory import RedisSession
            logger.info(f"Creating Redis session for conversation {scoped_conversation_id}")
            return RedisSession.from_url(
                scoped_conversation_id,
                url=REDIS_URL,
                ttl=ttl or 86400,  # 24 hours default
                key_prefix="solar_intel:sessions"
            )
        except ImportError:
            logger.warning("Redis session requested but agents[redis] not installed. Falling back to PostgreSQL.")
            # Fall back to PostgreSQL below

    # PostgreSQL backend (default)
    try:
        from agents.extensions.memory.sqlalchemy_session import SQLAlchemySession
        logger.info(f"Creating PostgreSQL session for conversation {scoped_conversation_id}")

        # Use asyncpg for async PostgreSQL connections
        return SQLAlchemySession.from_url(
            scoped_conversation_id,
            url=DATABASE_URL,
            create_tables=True  # Auto-create tables on first use
        )
    except ImportError as e:
        logger.error(f"SQLAlchemy session creation failed: {e}")
        logger.error("Please install: pip install 'agents[sqlalchemy]'")
        raise


def clear_agent_session(conversation_id: str, agent_type: Optional[str] = None):
    """
    Clear a corrupted agent session

    This is useful when a session has corrupted state (e.g., missing reasoning items
    from OpenAI's extended reasoning models). Clearing the session allows the agent
    to start fresh.

    Args:
        conversation_id: Unique conversation identifier
        agent_type: Agent type for session isolation
    """
    scoped_conversation_id = f"{conversation_id}_{agent_type}" if agent_type else conversation_id

    try:
        from agents.extensions.memory.sqlalchemy_session import SQLAlchemySession
        session = SQLAlchemySession.from_url(
            scoped_conversation_id,
            url=DATABASE_URL,
            create_tables=True
        )
        # Clear the session by deleting all items
        session.clear()
        logger.warning(f"Cleared corrupted session for conversation {scoped_conversation_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to clear session {scoped_conversation_id}: {e}")
        return False


def get_session_info():
    """Get current session backend configuration"""
    return {
        "backend": SESSION_BACKEND,
        "database_url": DATABASE_URL if SESSION_BACKEND == "postgresql" else None,
        "redis_url": REDIS_URL if SESSION_BACKEND == "redis" else None,
        "stateless": True,
        "description": "Sessions stored in shared database" if SESSION_BACKEND == "postgresql" else "Sessions stored in Redis cache"
    }


# Migration helper: Check if we need to install additional dependencies
def check_dependencies():
    """Check if required session dependencies are installed"""
    if SESSION_BACKEND == "redis":
        try:
            import redis
            from agents.extensions.memory import RedisSession
            return True, "Redis session support ready"
        except ImportError:
            return False, "Install Redis support: pip install 'agents[redis]' redis"

    try:
        from agents.extensions.memory.sqlalchemy_session import SQLAlchemySession
        import asyncpg
        return True, "PostgreSQL session support ready"
    except ImportError as e:
        return False, f"Install PostgreSQL support: pip install 'agents[sqlalchemy]' asyncpg - Error: {e}"
