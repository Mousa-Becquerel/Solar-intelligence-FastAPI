"""
FastAPI Configuration
Reuses environment variables from existing .env file but with isolated database
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings using Pydantic BaseSettings"""

    # App Info
    APP_NAME: str = "Solar Intelligence API"
    VERSION: str = "2.0.0-alpha"
    API_V1_PREFIX: str = "/api/v1"

    # Environment
    FLASK_ENV: str = 'production'
    ENVIRONMENT: str = 'production'

    @property
    def DEBUG(self) -> bool:
        return self.ENVIRONMENT == 'development' or self.FLASK_ENV == 'development'

    # Security
    FLASK_SECRET_KEY: str = 'dev-secret-key'
    SECRET_KEY: str = 'dev-secret-key'
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Frontend URL for email links
    FRONTEND_URL: str = "http://localhost:3000"

    # Database - ISOLATED from Flask app
    # Pydantic will automatically read FASTAPI_DATABASE_URL from environment
    FASTAPI_DATABASE_URL: str = 'sqlite+aiosqlite:///./fastapi_test.db'

    @property
    def DATABASE_URL(self) -> str:
        """Return the FastAPI database URL"""
        return self.FASTAPI_DATABASE_URL

    # OpenAI
    OPENAI_API_KEY: str = ''

    # Weaviate
    WEAVIATE_URL: str = ''
    WEAVIATE_API_KEY: str = ''

    # Logfire
    LOGFIRE_TOKEN: str = ''

    # CORS - Allow both Flask and React frontend
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",  # React dev server (Create React App)
        "http://localhost:5173",  # React dev server (Vite)
        "http://localhost:5174",  # React dev server (Vite alt port)
        "http://localhost:5175",  # React dev server (Vite alt port)
        "http://localhost:5176",  # React dev server (Vite alt port)
        "http://localhost:5177",  # React dev server (Vite alt port)
        "http://localhost:5000",  # Flask (during transition)
        "http://localhost:5002",  # Flask alt port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5002",
    ]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Database Connection Pool Settings
    DB_POOL_SIZE: int = 20  # Number of permanent connections in the pool
    DB_MAX_OVERFLOW: int = 40  # Max temporary connections beyond pool_size
    DB_POOL_TIMEOUT: int = 30  # Seconds to wait for a connection from the pool
    DB_POOL_RECYCLE: int = 3600  # Recycle connections after 1 hour (prevents stale connections)
    DB_POOL_PRE_PING: bool = True  # Test connections before using them
    DB_ECHO_POOL: bool = False  # Log connection pool events (for debugging)

    # Connection Settings
    DB_CONNECT_TIMEOUT: int = 10  # Seconds to wait for initial connection
    DB_COMMAND_TIMEOUT: int = 60  # Seconds to wait for query execution

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


# Global settings instance
settings = Settings()
