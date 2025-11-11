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

from fastapi_app.core.config import settings
from fastapi_app.db.session import init_db, close_db
from fastapi_app.api.v1.router import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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

# CORS middleware
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
