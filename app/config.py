"""
Application configuration management.

This module centralizes all configuration settings for the Solar Intelligence platform.
Configuration is environment-aware and loads from environment variables.
"""

import os
from datetime import timedelta
from typing import Optional, Dict, Any


class Config:
    """Base configuration class with common settings."""

    # Flask Core Settings
    SECRET_KEY: str = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG: bool = False
    TESTING: bool = False

    # Environment Detection
    FLASK_ENV: str = os.getenv('FLASK_ENV', 'production')
    IS_PRODUCTION: bool = FLASK_ENV == 'production'

    # Security Settings
    PREFERRED_URL_SCHEME: str = 'https' if IS_PRODUCTION else 'http'  # Force HTTPS in production
    SESSION_COOKIE_SECURE: bool = IS_PRODUCTION  # HTTPS only in production
    SESSION_COOKIE_HTTPONLY: bool = True  # Prevent JavaScript access (XSS protection)
    SESSION_COOKIE_SAMESITE: str = 'Lax'  # CSRF protection
    PERMANENT_SESSION_LIFETIME: timedelta = timedelta(days=7)
    WTF_CSRF_TIME_LIMIT: Optional[int] = None  # No CSRF token expiration

    # Database Configuration
    SQLALCHEMY_DATABASE_URI: str = os.getenv('DATABASE_URL', 'sqlite:///chat_history.db')
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # PostgreSQL-specific settings
    SQLALCHEMY_ENGINE_OPTIONS: Dict[str, Any] = {}

    # Rate Limiting
    RATELIMIT_STORAGE_URI: str = 'memory://'
    RATELIMIT_DEFAULT_LIMITS: list = []  # No default limits

    # Static Files & Uploads
    STATIC_FOLDER: str = 'static'
    STATIC_URL_PATH: str = '/static'
    PLOTS_DIR: str = os.path.join('static', 'plots')
    EXPORTS_DIR: str = os.path.join('exports', 'charts')
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024  # 16MB max upload size

    # API Keys & External Services
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')
    WEAVIATE_URL: str = os.getenv('WEAVIATE_URL', '')
    WEAVIATE_API_KEY: str = os.getenv('WEAVIATE_API_KEY', '')
    LOGFIRE_TOKEN: str = os.getenv('LOGFIRE_TOKEN', '')
    GOOGLE_ANALYTICS_ID: Optional[str] = os.getenv('GOOGLE_ANALYTICS_ID', None)

    # Email Configuration (for password reset)
    MAIL_SERVER: str = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT: int = int(os.getenv('MAIL_PORT', '587'))
    MAIL_USE_TLS: bool = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME: str = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD: str = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER: str = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@solarintelligence.ai')

    # Query Limits by Subscription Tier
    FREE_TIER_MONTHLY_LIMIT: int = 300
    PRO_TIER_MONTHLY_LIMIT: int = 10000
    ULTRA_TIER_MONTHLY_LIMIT: int = 100000

    # Memory Management
    MEMORY_WARNING_THRESHOLD_MB: int = 600  # Warn when RSS exceeds this
    MEMORY_CRITICAL_THRESHOLD_MB: int = 800  # Critical alert threshold
    MEMORY_CLEANUP_THRESHOLD_MB: int = 350  # Trigger periodic cleanup

    # Logging
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'WARNING')

    @classmethod
    def init_database_config(cls):
        """
        Initialize database-specific configuration.
        Called during app initialization.
        """
        # Handle PostgreSQL URL format from hosting providers (postgres:// -> postgresql://)
        if cls.SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
            cls.SQLALCHEMY_DATABASE_URI = cls.SQLALCHEMY_DATABASE_URI.replace(
                'postgres://', 'postgresql://', 1
            )

        # Force psycopg3 for PostgreSQL connections (better Python 3.13 compatibility)
        if 'postgresql' in cls.SQLALCHEMY_DATABASE_URI:
            try:
                import psycopg
                # Update URL to explicitly use psycopg3
                if 'postgresql://' in cls.SQLALCHEMY_DATABASE_URI and '+psycopg' not in cls.SQLALCHEMY_DATABASE_URI:
                    cls.SQLALCHEMY_DATABASE_URI = cls.SQLALCHEMY_DATABASE_URI.replace(
                        'postgresql://', 'postgresql+psycopg://', 1
                    )
            except ImportError:
                # Fallback to psycopg2 if psycopg3 is not available
                pass

        # Configure PostgreSQL connection pooling
        if 'postgresql' in cls.SQLALCHEMY_DATABASE_URI:
            cls.SQLALCHEMY_ENGINE_OPTIONS = {
                'pool_pre_ping': True,  # Verify connections before using
                'pool_recycle': 300,  # Recycle connections after 5 minutes
                'pool_size': 5,  # Max persistent connections per worker
                'max_overflow': 10,  # Max temporary connections
                'pool_timeout': 30,  # Wait up to 30s for available connection
                'connect_args': {
                    'connect_timeout': 10,  # Connection timeout
                    'application_name': 'BecqSight',
                    'options': '-c statement_timeout=60000'  # 60s query timeout
                }
            }
        else:
            # SQLite configuration for local development
            cls.SQLALCHEMY_ENGINE_OPTIONS = {
                'pool_pre_ping': True,
                'pool_recycle': 300,
            }

    @classmethod
    def validate_config(cls):
        """
        Validate required configuration values.
        Raises ValueError if critical config is missing.
        """
        # Production checks
        if cls.IS_PRODUCTION:
            if cls.SECRET_KEY == 'dev-secret-key-change-in-production':
                raise ValueError("FLASK_SECRET_KEY environment variable must be set for production")

            if not cls.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY environment variable is required")

            if not cls.LOGFIRE_TOKEN:
                raise ValueError("LOGFIRE_TOKEN environment variable is required for monitoring")

        # Development warnings
        else:
            if not cls.OPENAI_API_KEY:
                print("⚠️  Warning: OPENAI_API_KEY not set - AI agents will not work")


class DevelopmentConfig(Config):
    """Development environment configuration."""
    DEBUG = True
    FLASK_ENV = 'development'
    IS_PRODUCTION = False
    SESSION_COOKIE_SECURE = False  # Allow HTTP in development


class ProductionConfig(Config):
    """Production environment configuration."""
    DEBUG = False
    FLASK_ENV = 'production'
    IS_PRODUCTION = True


class TestingConfig(Config):
    """Testing environment configuration."""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False  # Disable CSRF for testing
    IS_PRODUCTION = False  # Disable production validation checks


# Configuration dictionary
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': ProductionConfig  # Default to production for safety
}


def get_config(config_name: Optional[str] = None) -> Config:
    """
    Get configuration object based on environment.

    Args:
        config_name: Optional config name ('development', 'production', 'testing')
                    If None, uses FLASK_ENV environment variable

    Returns:
        Configuration object
    """
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'production')

    config_class = config_by_name.get(config_name, config_by_name['default'])

    # Initialize database-specific settings
    config_class.init_database_config()

    # Validate configuration
    config_class.validate_config()

    return config_class


def create_directories(config: Config):
    """
    Create required directories based on configuration.

    Args:
        config: Configuration object
    """
    os.makedirs(config.PLOTS_DIR, exist_ok=True)
    os.makedirs(config.EXPORTS_DIR, exist_ok=True)
    print(f"✅ Created directories: {config.PLOTS_DIR}, {config.EXPORTS_DIR}")
