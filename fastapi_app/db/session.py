"""
Async database session management
ISOLATED from Flask app - uses separate database

Connection Pooling Strategy:
- Pool Size: 20 permanent connections
- Max Overflow: 40 additional connections during peak load
- Pool Timeout: 30s to wait for a connection
- Pool Recycle: 1 hour (prevents stale connections)
- Pre-Ping: Enabled (tests connections before use)
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from sqlalchemy import event, text
from fastapi_app.core.config import settings
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Log database URL (hide password for security)
try:
    db_url_parts = settings.DATABASE_URL.split('@')
    if len(db_url_parts) > 1:
        db_url_display = settings.DATABASE_URL.replace(db_url_parts[0].split('://')[-1], '***')
    else:
        db_url_display = "***"
    logger.info(f"🔗 Connecting to database: {db_url_display}")
except Exception as e:
    logger.warning(f"Could not log database URL: {e}")

# Ensure URL uses async dialect
database_url = settings.DATABASE_URL
is_postgresql = False

if database_url.startswith('postgresql+asyncpg://'):
    # Already in async format
    is_postgresql = True
    logger.info("✅ Using PostgreSQL with asyncpg driver (already async)")
elif database_url.startswith('postgresql://'):
    # Convert sync postgresql:// to async postgresql+asyncpg://
    database_url = database_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    is_postgresql = True
    logger.info("✅ Using PostgreSQL with asyncpg driver (converted from sync)")
elif database_url.startswith('sqlite'):
    logger.info("⚠️ Using SQLite (connection pooling disabled for SQLite)")
    is_postgresql = False
else:
    logger.warning(f"⚠️ Unknown database URL format: {database_url[:20]}...")
    # Default to PostgreSQL for safety
    is_postgresql = True

# Build engine arguments based on database type
engine_args = {
    "echo": settings.DEBUG,
    "future": True,
}

# Configure connection pooling (PostgreSQL only)
if is_postgresql:
    # PostgreSQL: Use connection pooling for production
    engine_args.update({
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_recycle": settings.DB_POOL_RECYCLE,
        "pool_pre_ping": settings.DB_POOL_PRE_PING,
        "echo_pool": settings.DB_ECHO_POOL,
        "connect_args": {
            "timeout": settings.DB_CONNECT_TIMEOUT,
            "command_timeout": settings.DB_COMMAND_TIMEOUT,
            "server_settings": {
                "application_name": "solar_intelligence_fastapi",
                "jit": "off",  # Disable JIT for faster simple queries
            }
        }
    })
    logger.info(f"🏊 Connection pool configured: size={settings.DB_POOL_SIZE}, max_overflow={settings.DB_MAX_OVERFLOW}")
else:
    # SQLite: Disable pooling (SQLite doesn't support concurrent connections well)
    engine_args["poolclass"] = NullPool
    engine_args["connect_args"] = {"check_same_thread": False}
    logger.info("🔧 SQLite mode: Connection pooling disabled")

# Create async engine with optimized connection pooling
engine = create_async_engine(database_url, **engine_args)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# Base for models
Base = declarative_base()


async def get_db():
    """
    Dependency for getting async database session.

    Usage in FastAPI:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database - create tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ FastAPI Database initialized (isolated from Flask)")


async def close_db():
    """Close database connections"""
    await engine.dispose()
    logger.info("✅ FastAPI Database connections closed")


async def get_pool_status() -> dict:
    """
    Get current connection pool status

    Returns:
        dict: Pool statistics including size, checked_in, checked_out, overflow, etc.
    """
    try:
        pool = engine.pool
        return {
            "pool_size": pool.size(),
            "checked_in_connections": pool.checkedin(),
            "checked_out_connections": pool.checkedout(),
            "overflow_connections": pool.overflow(),
            "total_connections": pool.checkedout() + pool.checkedin(),
            "max_capacity": settings.DB_POOL_SIZE + settings.DB_MAX_OVERFLOW,
            "utilization_percent": round(
                ((pool.checkedout() + pool.checkedin()) / (settings.DB_POOL_SIZE + settings.DB_MAX_OVERFLOW)) * 100, 2
            )
        }
    except Exception as e:
        logger.error(f"Error getting pool status: {e}")
        return {"error": str(e)}


async def health_check() -> dict:
    """
    Perform database health check

    Tests:
    - Connection availability
    - Query execution
    - Pool status

    Returns:
        dict: Health check results
    """
    health_status = {
        "database": "unknown",
        "connection": "unknown",
        "pool": "unknown",
        "details": {}
    }

    try:
        # Test database connection and query
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            result.scalar()
            health_status["connection"] = "healthy"
            health_status["database"] = "healthy"

        # Get pool status
        pool_status = await get_pool_status()
        health_status["pool"] = "healthy"
        health_status["details"]["pool"] = pool_status

        # Check pool utilization
        if pool_status.get("utilization_percent", 0) > 90:
            health_status["pool"] = "warning"
            health_status["details"]["warning"] = "Pool utilization above 90%"

        return health_status

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        health_status["database"] = "unhealthy"
        health_status["connection"] = "unhealthy"
        health_status["details"]["error"] = str(e)
        return health_status


# Connection pool event listeners (for monitoring)
if is_postgresql and settings.DB_ECHO_POOL:
    @event.listens_for(engine.sync_engine, "connect")
    def receive_connect(dbapi_conn, connection_record):
        """Log when a new connection is created"""
        logger.debug(f"🔗 New database connection established: {id(dbapi_conn)}")

    @event.listens_for(engine.sync_engine, "checkout")
    def receive_checkout(dbapi_conn, connection_record, connection_proxy):
        """Log when a connection is checked out from the pool"""
        logger.debug(f"📤 Connection checked out: {id(dbapi_conn)}")

    @event.listens_for(engine.sync_engine, "checkin")
    def receive_checkin(dbapi_conn, connection_record):
        """Log when a connection is returned to the pool"""
        logger.debug(f"📥 Connection checked in: {id(dbapi_conn)}")
