"""
FastAPI Main Application
Entry point for the Solar Intelligence API v2

ISOLATED from Flask app - runs on different port with separate database
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from fastapi_app.core.config import settings
from fastapi_app.db.session import init_db, close_db
from fastapi_app.api.v1.router import api_router
from fastapi_app.db.seed_agents import seed_agent_access

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Initialize rate limiter
# Uses client IP address to track request rates
# Disable rate limiting in testing environment
if settings.ENVIRONMENT != "testing":
    limiter = Limiter(key_func=get_remote_address)
else:
    # Create a mock limiter for testing that doesn't enforce limits
    limiter = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("🚀 Starting Solar Intelligence API v2 (FastAPI)...")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Database: {settings.DATABASE_URL[:50]}...")
    logger.info(f"   Port: 8000 (isolated from Flask on port 5000/5002)")

    # Initialize database
    await init_db()

    # Seed agent access configuration
    try:
        await seed_agent_access()
        logger.info("✅ Agent access seeded")
    except Exception as e:
        logger.warning(f"⚠️  Agent access seeding failed: {e}")

    # Configure Logfire if available
    if settings.LOGFIRE_TOKEN:
        try:
            import logfire
            logfire.configure(token=settings.LOGFIRE_TOKEN)
            logfire.instrument_fastapi(app)
            logger.info("✅ Logfire configured")
        except Exception as e:
            logger.warning(f"⚠️  Logfire configuration failed: {e}")

    logger.info("✅ FastAPI startup complete")

    yield

    # Shutdown
    logger.info("👋 Shutting down Solar Intelligence API v2...")

    # Close database connections
    await close_db()


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="""
    Solar Intelligence Platform - AI-powered market analysis

    **FastAPI Version** (Parallel Development)
    - Isolated database (no interference with Flask app)
    - Async/await architecture
    - Automatic OpenAPI documentation
    - JWT-based authentication

    **Status**: Alpha - Testing & Development
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
    }
)

# Configure rate limiter for the app (only if not in testing)
if limiter is not None:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Headers Middleware
# IMPORTANT: This must be defined BEFORE CORS middleware is added
# Middleware execution order: last defined runs first
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Add security headers to all responses

    Headers added:
    - X-Content-Type-Options: Prevents MIME type sniffing
    - X-Frame-Options: Prevents clickjacking attacks
    - X-XSS-Protection: Enables XSS filter in older browsers
    - Strict-Transport-Security: Enforces HTTPS
    - Content-Security-Policy: Restricts resource loading
    - Referrer-Policy: Controls referrer information
    - Permissions-Policy: Controls browser features
    """
    response = await call_next(request)

    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Prevent clickjacking - deny embedding in iframes
    response.headers["X-Frame-Options"] = "DENY"

    # XSS protection for older browsers
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Enforce HTTPS for 1 year (31536000 seconds)
    # Only add in production to avoid issues during development
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

    # Content Security Policy - adjust based on your needs
    # This is a strict policy; you may need to relax it based on your frontend requirements
    csp_directives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' http://localhost:5173 https://api.openai.com",
        "frame-ancestors 'none'",
    ]
    response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

    # Control referrer information
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Permissions Policy (formerly Feature-Policy)
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    return response


# CORS middleware
# IMPORTANT: Add CORS middleware AFTER security headers middleware is defined
# This ensures CORS runs first (middleware runs in reverse order of definition)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - API information

    Returns basic API information and status
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "online",
        "environment": settings.ENVIRONMENT,
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": f"{settings.API_V1_PREFIX}/openapi.json"
        },
        "note": "This is the FastAPI version running in parallel with Flask (isolated database)"
    }


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for load balancers and monitoring
    """
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION,
        "database": "connected",
        "app": "fastapi"
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "type": type(exc).__name__,
            "path": str(request.url)
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "fastapi_app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
