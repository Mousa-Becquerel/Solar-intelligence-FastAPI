# Phase 1 Refactoring Plan: Clean Architecture for Migration

## Executive Summary

This document outlines the step-by-step plan to refactor the current monolithic Flask application into a clean, modular architecture that is ready for eventual migration to FastAPI and React.

**Timeline**: 4-6 weeks (incremental, can test at each step)
**Risk Level**: Medium (we'll maintain backward compatibility throughout)
**Goal**: Transform codebase from monolithic to modular while maintaining 100% functionality

---

## Current State Analysis

### Backend Issues
- **app.py**: 3,369 lines, 57 routes, 76 functions
- **Structure**: Monolithic - routes, business logic, DB queries all mixed
- **Agents**: 6 separate agent files (good separation, but inconsistent patterns)
- **Models**: 8 database models in models.py (well-defined, good foundation)
- **No service layer**: Database logic directly in route handlers
- **Inconsistent async**: Mix of sync and async patterns

### Frontend Issues
- **main.js**: 5,988 lines, 66+ global functions
- **No modules**: All code in global scope
- **No state management**: State scattered in global variables
- **DOM coupling**: Business logic mixed with DOM manipulation
- **Repetitive patterns**: Similar code duplicated throughout

---

## Refactoring Strategy: 7 Steps

We'll refactor in small, testable increments. Each step maintains functionality while improving structure.

### Step 1: Create New Directory Structure ✅ (1-2 days)

**Goal**: Establish proper project organization without moving code yet.

```
Full_data_DH_bot/
├── app/
│   ├── __init__.py           # Flask app factory
│   ├── config.py             # Configuration management
│   ├── extensions.py         # Flask extensions (db, login_manager, etc.)
│   │
│   ├── models/               # Database models
│   │   ├── __init__.py
│   │   ├── user.py          # User, Waitlist models
│   │   ├── conversation.py  # Conversation, Message models
│   │   ├── feedback.py      # Feedback, Survey models
│   │   └── agent.py         # HiredAgent model
│   │
│   ├── schemas/              # Pydantic schemas (validation + API)
│   │   ├── __init__.py
│   │   ├── user.py          # UserSchema, UserCreateSchema, etc.
│   │   ├── conversation.py  # ConversationSchema, MessageSchema
│   │   ├── agent.py         # AgentSchema, AgentRequestSchema
│   │   └── plot.py          # PlotDataSchema, PlotResultSchema
│   │
│   ├── services/             # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py  # Authentication, registration
│   │   ├── conversation_service.py  # Conversation management
│   │   ├── agent_service.py # Agent coordination
│   │   ├── admin_service.py # Admin operations
│   │   └── export_service.py # Export functionality
│   │
│   ├── routes/              # Route handlers (thin layer)
│   │   ├── __init__.py
│   │   ├── auth.py          # Login, register, logout
│   │   ├── chat.py          # Chat interface, query handling
│   │   ├── conversation.py  # Conversation CRUD
│   │   ├── admin.py         # Admin panel
│   │   ├── api.py           # API endpoints
│   │   └── static_pages.py  # Landing, waitlist, etc.
│   │
│   ├── agents/              # AI agent implementations
│   │   ├── __init__.py
│   │   ├── base.py          # Base agent class
│   │   ├── module_prices.py # ModulePricesAgent
│   │   ├── news.py          # NewsAgent
│   │   ├── leo_om.py        # LeoOMAgent
│   │   ├── digitalization.py # DigitalizationAgent
│   │   ├── market_intelligence.py # MarketIntelligenceAgent
│   │   └── weaviate.py      # WeaviateAgent
│   │
│   ├── utils/               # Utility functions
│   │   ├── __init__.py
│   │   ├── memory.py        # Memory monitoring
│   │   ├── validators.py   # Input validation
│   │   └── helpers.py       # General helpers
│   │
│   └── static/              # Frontend assets
│       ├── js/
│       │   ├── modules/     # NEW: Modular JS
│       │   │   ├── api.js          # API client
│       │   │   ├── auth.js         # Authentication
│       │   │   ├── chat.js         # Chat interface
│       │   │   ├── conversations.js # Conversation management
│       │   │   ├── plots.js        # Plot rendering
│       │   │   ├── export.js       # Export functionality
│       │   │   └── utils.js        # Utilities
│       │   ├── main.js      # Entry point (orchestrates modules)
│       │   └── legacy/
│       │       └── main.js  # Original (temporary)
│       ├── css/
│       └── images/
│
├── tests/                   # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/                 # Utility scripts
├── docs/                    # Documentation
├── migrations/              # Database migrations (Alembic)
└── app.py                   # Entry point (imports from app/)
```

**Action Items**:
1. Create directory structure
2. Create empty `__init__.py` files
3. No code movement yet - just structure

---

### Step 2: Extract Configuration & Extensions ✅ (1 day)

**Goal**: Centralize configuration and extensions for reusability.

**Files to Create**:

#### `app/config.py`
```python
"""Application configuration management."""
import os
from datetime import timedelta
from typing import Optional

class Config:
    """Base configuration."""

    # Flask
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

    # Database
    SQLALCHEMY_DATABASE_URI: str = os.getenv('DATABASE_URL', '').replace('postgres://', 'postgresql://')
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 20
    }

    # Security
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = 'Lax'
    PERMANENT_SESSION_LIFETIME: timedelta = timedelta(days=7)
    WTF_CSRF_TIME_LIMIT: Optional[int] = None

    # Rate Limiting
    RATELIMIT_STORAGE_URI: str = 'memory://'
    RATELIMIT_DEFAULT: str = '200 per day, 50 per hour'

    # Agents
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')
    WEAVIATE_URL: str = os.getenv('WEAVIATE_URL', '')
    WEAVIATE_API_KEY: str = os.getenv('WEAVIATE_API_KEY', '')

    # Monitoring
    LOGFIRE_TOKEN: str = os.getenv('LOGFIRE_TOKEN', '')

    # File Upload
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER: str = 'uploads'

    # Query Limits
    FREE_TIER_MONTHLY_LIMIT: int = 300
    PRO_TIER_MONTHLY_LIMIT: int = 10000
    ULTRA_TIER_MONTHLY_LIMIT: int = 100000

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG: bool = True
    SESSION_COOKIE_SECURE: bool = False

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG: bool = False

class TestingConfig(Config):
    """Testing configuration."""
    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = 'sqlite:///:memory:'

# Config dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config() -> Config:
    """Get configuration based on environment."""
    env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])
```

#### `app/extensions.py`
```python
"""Flask extensions initialization.

Extensions are initialized here and imported by routes/services.
This prevents circular imports.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize extensions (without app)
db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

def init_extensions(app):
    """Initialize Flask extensions with app instance."""
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)

    # Configure login manager
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'

    return app
```

**Action Items**:
1. Create `app/config.py` with configuration classes
2. Create `app/extensions.py` with extension initialization
3. Update `app.py` to import from these files (maintain backward compatibility)

---

### Step 3: Create Pydantic Schemas ✅ (2-3 days)

**Goal**: Add validation layer that works with both Flask and FastAPI.

**Why This Matters**: Pydantic schemas provide:
- Input validation
- Output serialization
- API documentation (for future FastAPI)
- Type safety
- Clear contracts between layers

**Files to Create**:

#### `app/schemas/user.py`
```python
"""User-related Pydantic schemas."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    """Base user schema with common fields."""
    username: str = Field(..., min_length=3, max_length=80)
    email: EmailStr

class UserCreateSchema(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=8, max_length=200)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "john_doe",
                "email": "john@example.com",
                "password": "SecurePass123!"
            }
        }
    )

class UserUpdateSchema(BaseModel):
    """Schema for user updates."""
    username: Optional[str] = Field(None, min_length=3, max_length=80)
    email: Optional[EmailStr] = None
    subscription_tier: Optional[str] = Field(None, pattern="^(free|pro|ultra)$")

class UserSchema(UserBase):
    """Schema for user response."""
    id: int
    subscription_tier: str
    monthly_query_count: int
    created_at: datetime
    is_admin: bool = False
    is_approved: bool = True

    model_config = ConfigDict(from_attributes=True)

class LoginSchema(BaseModel):
    """Schema for login request."""
    username: str
    password: str
    remember: bool = False
```

#### `app/schemas/conversation.py`
```python
"""Conversation and message schemas."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class MessageContentSchema(BaseModel):
    """Schema for message content."""
    type: str = Field(..., pattern="^(string|plot|data|multi)$")
    value: Any
    comment: Optional[str] = None

class MessageCreateSchema(BaseModel):
    """Schema for creating a message."""
    conversation_id: int
    sender: str = Field(..., pattern="^(user|bot)$")
    content: MessageContentSchema

class MessageSchema(BaseModel):
    """Schema for message response."""
    id: int
    conversation_id: int
    sender: str
    content: dict
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class ConversationCreateSchema(BaseModel):
    """Schema for creating a conversation."""
    title: Optional[str] = Field(None, max_length=200)

class ConversationSchema(BaseModel):
    """Schema for conversation response."""
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class ConversationWithMessagesSchema(ConversationSchema):
    """Schema for conversation with messages."""
    messages: List[MessageSchema] = []
```

#### `app/schemas/agent.py`
```python
"""Agent-related schemas."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class AgentQuerySchema(BaseModel):
    """Schema for agent query request."""
    query: str = Field(..., min_length=1, max_length=5000)
    conversation_id: int
    agent_type: Optional[str] = Field(None, pattern="^(market_intelligence|news|module_prices|leo_om|digitalization|weaviate)$")

class PlotDataSchema(BaseModel):
    """Schema for plot data."""
    image_base64: str
    description: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class AgentResponseSchema(BaseModel):
    """Schema for agent response."""
    type: str = Field(..., pattern="^(string|plot|data|multi)$")
    value: Any
    comment: Optional[str] = None
    agent_type: str
    processing_time: Optional[float] = None

class HiredAgentSchema(BaseModel):
    """Schema for hired agent."""
    id: int
    user_id: int
    agent_name: str
    hired_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

**Action Items**:
1. Create all schema files
2. Add validation logic
3. Test schemas with existing data structures

---

### Step 4: Extract Business Logic to Services ✅ (1-2 weeks)

**Goal**: Separate business logic from route handlers.

**Pattern**: Each service handles one domain area and is framework-agnostic (works with Flask or FastAPI).

**Files to Create**:

#### `app/services/auth_service.py`
```python
"""Authentication and authorization business logic."""
from typing import Optional, Tuple
from werkzeug.security import check_password_hash, generate_password_hash
from app.models.user import User
from app.schemas.user import UserCreateSchema, UserSchema, LoginSchema
from app.extensions import db
from sqlalchemy.exc import IntegrityError
import logging

logger = logging.getLogger(__name__)

class AuthService:
    """Service for authentication operations."""

    @staticmethod
    def register_user(data: UserCreateSchema) -> Tuple[Optional[User], Optional[str]]:
        """
        Register a new user.

        Args:
            data: Validated user registration data

        Returns:
            Tuple of (User object, error message)
        """
        try:
            # Check if username exists
            if User.query.filter_by(username=data.username).first():
                return None, "Username already exists"

            # Check if email exists
            if User.query.filter_by(email=data.email).first():
                return None, "Email already exists"

            # Create user
            user = User(
                username=data.username,
                email=data.email,
                password_hash=generate_password_hash(data.password)
            )

            db.session.add(user)
            db.session.commit()

            logger.info(f"User registered: {user.username}")
            return user, None

        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Database integrity error during registration: {e}")
            return None, "Registration failed due to database constraint"
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error during user registration: {e}")
            return None, "Registration failed. Please try again."

    @staticmethod
    def authenticate_user(data: LoginSchema) -> Tuple[Optional[User], Optional[str]]:
        """
        Authenticate a user.

        Args:
            data: Validated login data

        Returns:
            Tuple of (User object, error message)
        """
        try:
            user = User.query.filter_by(username=data.username).first()

            if not user:
                return None, "Invalid username or password"

            if not user.is_approved:
                return None, "Your account is pending approval"

            if not check_password_hash(user.password_hash, data.password):
                return None, "Invalid username or password"

            logger.info(f"User authenticated: {user.username}")
            return user, None

        except Exception as e:
            logger.error(f"Error during authentication: {e}")
            return None, "Authentication failed. Please try again."

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[User]:
        """Get user by ID."""
        try:
            return User.query.get(user_id)
        except Exception as e:
            logger.error(f"Error fetching user {user_id}: {e}")
            return None
```

#### `app/services/conversation_service.py`
```python
"""Conversation management business logic."""
from typing import Optional, List, Tuple
from app.models.conversation import Conversation, Message
from app.schemas.conversation import (
    ConversationCreateSchema,
    ConversationSchema,
    MessageCreateSchema,
    MessageSchema
)
from app.extensions import db
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class ConversationService:
    """Service for conversation operations."""

    @staticmethod
    def create_conversation(user_id: int, data: ConversationCreateSchema) -> Tuple[Optional[Conversation], Optional[str]]:
        """
        Create a new conversation.

        Args:
            user_id: ID of the user creating the conversation
            data: Validated conversation data

        Returns:
            Tuple of (Conversation object, error message)
        """
        try:
            conversation = Conversation(
                user_id=user_id,
                title=data.title or f"New Conversation"
            )

            db.session.add(conversation)
            db.session.commit()

            logger.info(f"Conversation created: {conversation.id} for user {user_id}")
            return conversation, None

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating conversation: {e}")
            return None, "Failed to create conversation"

    @staticmethod
    def get_user_conversations(user_id: int, limit: int = 50) -> List[Conversation]:
        """Get all conversations for a user."""
        try:
            return Conversation.query.filter_by(user_id=user_id)\
                .order_by(Conversation.updated_at.desc())\
                .limit(limit)\
                .all()
        except Exception as e:
            logger.error(f"Error fetching conversations for user {user_id}: {e}")
            return []

    @staticmethod
    def get_conversation_with_messages(conversation_id: int, user_id: int) -> Tuple[Optional[Conversation], Optional[str]]:
        """
        Get conversation with messages.

        Args:
            conversation_id: ID of the conversation
            user_id: ID of the user (for authorization)

        Returns:
            Tuple of (Conversation with messages, error message)
        """
        try:
            conversation = Conversation.query.filter_by(
                id=conversation_id,
                user_id=user_id
            ).first()

            if not conversation:
                return None, "Conversation not found"

            return conversation, None

        except Exception as e:
            logger.error(f"Error fetching conversation {conversation_id}: {e}")
            return None, "Failed to load conversation"

    @staticmethod
    def add_message(data: MessageCreateSchema, user_id: int) -> Tuple[Optional[Message], Optional[str]]:
        """
        Add a message to a conversation.

        Args:
            data: Validated message data
            user_id: ID of the user (for authorization)

        Returns:
            Tuple of (Message object, error message)
        """
        try:
            # Verify conversation ownership
            conversation = Conversation.query.filter_by(
                id=data.conversation_id,
                user_id=user_id
            ).first()

            if not conversation:
                return None, "Conversation not found"

            # Create message
            message = Message(
                conversation_id=data.conversation_id,
                sender=data.sender,
                content=json.dumps(data.content.model_dump())
            )

            db.session.add(message)

            # Update conversation timestamp
            conversation.updated_at = datetime.utcnow()

            db.session.commit()

            logger.info(f"Message added to conversation {data.conversation_id}")
            return message, None

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error adding message: {e}")
            return None, "Failed to add message"

    @staticmethod
    def delete_conversation(conversation_id: int, user_id: int) -> Tuple[bool, Optional[str]]:
        """
        Delete a conversation and all its messages.

        Args:
            conversation_id: ID of the conversation
            user_id: ID of the user (for authorization)

        Returns:
            Tuple of (success boolean, error message)
        """
        try:
            conversation = Conversation.query.filter_by(
                id=conversation_id,
                user_id=user_id
            ).first()

            if not conversation:
                return False, "Conversation not found"

            # Delete messages
            Message.query.filter_by(conversation_id=conversation_id).delete()

            # Delete conversation
            db.session.delete(conversation)
            db.session.commit()

            logger.info(f"Conversation {conversation_id} deleted by user {user_id}")
            return True, None

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting conversation {conversation_id}: {e}")
            return False, "Failed to delete conversation"
```

#### `app/services/agent_service.py`
```python
"""Agent coordination and management business logic."""
from typing import Optional, AsyncGenerator, Tuple
from app.schemas.agent import AgentQuerySchema, AgentResponseSchema
from app.models.user import User
from app.models.conversation import Conversation
import logging

logger = logging.getLogger(__name__)

class AgentService:
    """Service for coordinating AI agents."""

    def __init__(self):
        """Initialize agent service."""
        self._agents = {}

    async def process_query(
        self,
        query: AgentQuerySchema,
        user: User
    ) -> AsyncGenerator[str, None]:
        """
        Process a user query with appropriate agent.

        Args:
            query: Validated query data
            user: User making the query

        Yields:
            Server-sent event chunks
        """
        try:
            # Verify conversation ownership
            conversation = Conversation.query.filter_by(
                id=query.conversation_id,
                user_id=user.id
            ).first()

            if not conversation:
                yield f"data: {json.dumps({'error': 'Conversation not found'})}\n\n"
                return

            # Check query limit
            if not user.can_query():
                yield f"data: {json.dumps({'error': 'Monthly query limit reached'})}\n\n"
                return

            # Increment query count BEFORE processing
            user.increment_query_count()
            db.session.commit()

            # Route to appropriate agent
            agent_type = self._determine_agent_type(query.query)

            # Stream response from agent
            async for chunk in self._stream_agent_response(agent_type, query.query):
                yield chunk

        except Exception as e:
            logger.error(f"Error processing query: {e}")
            yield f"data: {json.dumps({'error': 'Failed to process query'})}\n\n"

    def _determine_agent_type(self, query: str) -> str:
        """Determine which agent should handle the query."""
        # Agent routing logic
        query_lower = query.lower()

        if any(word in query_lower for word in ['module', 'price', 'cost', 'wafer', 'polysilicon']):
            return 'module_prices'
        elif any(word in query_lower for word in ['news', 'article', 'report', 'update']):
            return 'news'
        elif any(word in query_lower for word in ['digitalization', 'digital', 'automation']):
            return 'digitalization'
        elif any(word in query_lower for word in ['leo', 'om', 'operation', 'maintenance']):
            return 'leo_om'
        else:
            return 'market_intelligence'

    async def _stream_agent_response(self, agent_type: str, query: str) -> AsyncGenerator[str, None]:
        """Stream response from specific agent."""
        # Implementation will call appropriate agent
        # This is where we integrate existing agents
        pass
```

**Action Items**:
1. Create service files for each domain
2. Extract business logic from app.py routes
3. Add comprehensive error handling
4. Add logging throughout
5. Maintain existing functionality

---

### Step 5: Refactor Routes into Blueprints ✅ (1 week)

**Goal**: Organize routes by feature area using Flask Blueprints.

**Pattern**: Thin route handlers that call services for business logic.

#### `app/routes/auth.py`
```python
"""Authentication routes."""
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from app.services.auth_service import AuthService
from app.schemas.user import UserCreateSchema, LoginSchema
from pydantic import ValidationError
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login route."""
    if request.method == 'GET':
        return render_template('login.html')

    try:
        # Validate input
        data = LoginSchema(**request.form.to_dict())

        # Authenticate via service
        user, error = AuthService.authenticate_user(data)

        if error:
            flash(error, 'error')
            return render_template('login.html'), 401

        # Login user
        login_user(user, remember=data.remember)

        next_page = request.args.get('next')
        return redirect(next_page or url_for('chat.index'))

    except ValidationError as e:
        logger.warning(f"Login validation error: {e}")
        flash("Invalid input", 'error')
        return render_template('login.html'), 400
    except Exception as e:
        logger.error(f"Login error: {e}")
        flash("Login failed. Please try again.", 'error')
        return render_template('login.html'), 500

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Registration route."""
    if request.method == 'GET':
        return render_template('register.html')

    try:
        # Validate input
        data = UserCreateSchema(**request.form.to_dict())

        # Register via service
        user, error = AuthService.register_user(data)

        if error:
            flash(error, 'error')
            return render_template('register.html'), 400

        flash("Registration successful! Please log in.", 'success')
        return redirect(url_for('auth.login'))

    except ValidationError as e:
        logger.warning(f"Registration validation error: {e}")
        flash("Invalid input. Please check your information.", 'error')
        return render_template('register.html'), 400
    except Exception as e:
        logger.error(f"Registration error: {e}")
        flash("Registration failed. Please try again.", 'error')
        return render_template('register.html'), 500

@auth_bp.route('/logout')
@login_required
def logout():
    """Logout route."""
    logout_user()
    return redirect(url_for('auth.login'))
```

#### `app/routes/chat.py`
```python
"""Chat interface routes."""
from flask import Blueprint, render_template, Response, request, jsonify
from flask_login import login_required, current_user
from app.services.agent_service import AgentService
from app.services.conversation_service import ConversationService
from app.schemas.agent import AgentQuerySchema
from pydantic import ValidationError
import asyncio
import logging

logger = logging.getLogger(__name__)

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/')
@login_required
def index():
    """Chat interface."""
    return render_template('index.html')

@chat_bp.route('/query', methods=['POST'])
@login_required
def query():
    """
    Handle user query (SSE streaming).

    This endpoint streams agent responses using Server-Sent Events.
    """
    try:
        # Validate input
        data = AgentQuerySchema(**request.get_json())

        # Create agent service
        agent_service = AgentService()

        # Define async generator wrapper
        async def stream_response():
            async for chunk in agent_service.process_query(data, current_user):
                yield chunk

        # Stream response with proper event loop cleanup
        def generate():
            loop = asyncio.new_event_loop()
            try:
                asyncio.set_event_loop(loop)
                async_gen = stream_response()

                while True:
                    try:
                        chunk = loop.run_until_complete(async_gen.__anext__())
                        yield chunk
                    except StopAsyncIteration:
                        break
            finally:
                asyncio.set_event_loop(None)
                try:
                    loop.close()
                except Exception as e:
                    logger.error(f"Error closing event loop: {e}")

        return Response(generate(), mimetype='text/event-stream')

    except ValidationError as e:
        logger.warning(f"Query validation error: {e}")
        return jsonify({'error': 'Invalid query format'}), 400
    except Exception as e:
        logger.error(f"Query processing error: {e}")
        return jsonify({'error': 'Failed to process query'}), 500
```

**Action Items**:
1. Create blueprint files for each route group
2. Move route handlers from app.py to blueprints
3. Update route handlers to use services
4. Register blueprints in app factory
5. Test each route after migration

---

### Step 6: Modularize Frontend JavaScript ✅ (1-2 weeks)

**Goal**: Break main.js into organized, reusable modules.

**Pattern**: ES6 modules with clear responsibilities.

#### `static/js/modules/api.js`
```javascript
/**
 * API client for backend communication.
 */

export class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
    }

    /**
     * Make a POST request.
     */
    async post(endpoint, data) {
        const response = await fetch(this.baseURL + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Make a GET request.
     */
    async get(endpoint) {
        const response = await fetch(this.baseURL + endpoint);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Stream SSE endpoint.
     */
    streamSSE(endpoint, data, onMessage, onError, onComplete) {
        return fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        }).then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const read = () => {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        onComplete && onComplete();
                        return;
                    }

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                onMessage(data);
                            } catch (e) {
                                console.error('Error parsing SSE data:', e);
                            }
                        }
                    });

                    read();
                }).catch(onError);
            };

            read();
        }).catch(onError);
    }
}

export default new APIClient();
```

#### `static/js/modules/chat.js`
```javascript
/**
 * Chat interface management.
 */

import api from './api.js';
import { renderPlot } from './plots.js';
import { showNotification } from './utils.js';

export class ChatManager {
    constructor() {
        this.currentConversationId = null;
        this.isStreaming = false;
        this.messageContainer = null;
    }

    init() {
        this.messageContainer = document.getElementById('messages');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('send-btn');
        const queryInput = document.getElementById('user-query');

        sendBtn.addEventListener('click', () => this.sendMessage());
        queryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async sendMessage() {
        if (this.isStreaming) {
            showNotification('Please wait for the current response to complete', 'warning');
            return;
        }

        const queryInput = document.getElementById('user-query');
        const query = queryInput.value.trim();

        if (!query) return;

        // Add user message to UI
        this.addMessage('user', query);
        queryInput.value = '';

        // Show loading indicator
        const loadingId = this.showLoading();

        this.isStreaming = true;

        try {
            let botResponse = '';

            api.streamSSE(
                '/query',
                {
                    query: query,
                    conversation_id: this.currentConversationId
                },
                (data) => {
                    if (data.type === 'content') {
                        botResponse += data.value;
                        this.updateBotMessage(loadingId, botResponse);
                    } else if (data.type === 'plot') {
                        this.addPlotMessage(data);
                    } else if (data.error) {
                        this.showError(data.error);
                    }
                },
                (error) => {
                    console.error('Streaming error:', error);
                    this.showError('Failed to get response. Please try again.');
                    this.isStreaming = false;
                },
                () => {
                    this.removeLoading(loadingId);
                    this.isStreaming = false;
                }
            );

        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
            this.removeLoading(loadingId);
            this.isStreaming = false;
        }
    }

    addMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${sender}`;
        messageDiv.textContent = content;
        this.messageContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addPlotMessage(plotData) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-bot plot';
        renderPlot(messageDiv, plotData);
        this.messageContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    updateBotMessage(messageId, content) {
        const message = document.getElementById(messageId);
        if (message) {
            message.textContent = content;
        }
    }

    showLoading() {
        const loadingDiv = document.createElement('div');
        const loadingId = 'loading-' + Date.now();
        loadingDiv.id = loadingId;
        loadingDiv.className = 'message message-bot loading';
        loadingDiv.innerHTML = '<span class="loading-dots">...</span>';
        this.messageContainer.appendChild(loadingDiv);
        this.scrollToBottom();
        return loadingId;
    }

    removeLoading(loadingId) {
        const loading = document.getElementById(loadingId);
        if (loading) {
            loading.remove();
        }
    }

    showError(message) {
        showNotification(message, 'error');
    }

    scrollToBottom() {
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }
}

export default new ChatManager();
```

#### `static/js/main.js` (New entry point)
```javascript
/**
 * Main application entry point.
 *
 * This orchestrates all modules and initializes the application.
 */

import chatManager from './modules/chat.js';
import conversationManager from './modules/conversations.js';
import authManager from './modules/auth.js';

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Solar Intelligence application...');

    // Initialize modules
    authManager.init();
    conversationManager.init();
    chatManager.init();

    console.log('Application initialized successfully');
});
```

**Action Items**:
1. Create module files with clear responsibilities
2. Extract functions from main.js into appropriate modules
3. Add ES6 import/export
4. Update index.html to use module script
5. Test each module independently
6. Keep legacy main.js as backup during transition

---

### Step 7: Add Type Hints & Documentation ✅ (1 week)

**Goal**: Add comprehensive type hints and docstrings throughout.

**Pattern**: Use Python type hints and comprehensive docstrings.

**Example**:
```python
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime

def process_user_query(
    user_id: int,
    query: str,
    conversation_id: Optional[int] = None,
    agent_type: Optional[str] = None
) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Process a user query through the appropriate agent.

    Args:
        user_id: ID of the user making the query
        query: The user's question or request
        conversation_id: Optional ID of existing conversation
        agent_type: Optional specific agent to use (auto-detected if None)

    Returns:
        Tuple of (response dictionary, error message)
        Response dictionary contains:
            - type: Response type ('string', 'plot', 'data', 'multi')
            - value: Response value
            - comment: Optional comment about the response
            - metadata: Additional metadata

    Raises:
        ValueError: If user_id or query is invalid
        RuntimeError: If agent processing fails

    Example:
        >>> response, error = process_user_query(
        ...     user_id=123,
        ...     query="What are module prices in China?",
        ...     agent_type="module_prices"
        ... )
        >>> if error:
        ...     print(f"Error: {error}")
        ... else:
        ...     print(f"Response: {response['value']}")
    """
    pass
```

**Action Items**:
1. Add type hints to all functions
2. Add comprehensive docstrings
3. Add JSDoc comments to JavaScript
4. Generate API documentation
5. Update README with new structure

---

## Testing Strategy

After each step, we'll test:

1. **Unit Tests**: Test services independently
2. **Integration Tests**: Test route → service → database flow
3. **End-to-End Tests**: Test full user workflows
4. **Manual Testing**: Test UI in browser

**Test Coverage Goal**: 80%

---

## Migration Timeline

| Step | Duration | Dependencies | Risk |
|------|----------|--------------|------|
| 1. Directory Structure | 1-2 days | None | Low |
| 2. Config & Extensions | 1 day | Step 1 | Low |
| 3. Pydantic Schemas | 2-3 days | Step 2 | Low |
| 4. Service Layer | 1-2 weeks | Step 3 | Medium |
| 5. Blueprint Routes | 1 week | Step 4 | Medium |
| 6. JS Modules | 1-2 weeks | None (parallel) | Medium |
| 7. Type Hints | 1 week | Steps 4-5 | Low |

**Total Estimated Time**: 4-6 weeks

---

## Success Criteria

After Phase 1, the codebase should have:

✅ **Modular Structure**: Clear separation of concerns
✅ **Service Layer**: Business logic independent of framework
✅ **Pydantic Schemas**: Validation ready for FastAPI
✅ **Type Safety**: Comprehensive type hints
✅ **Clean Routes**: Thin route handlers using blueprints
✅ **Modular Frontend**: Organized JS modules
✅ **Test Coverage**: 80% code coverage
✅ **Documentation**: Comprehensive docs and docstrings
✅ **Same Functionality**: 100% feature parity with current version

---

## Next Steps After Phase 1

Once Phase 1 is complete, we'll be ready for:

1. **Phase 2**: Create parallel FastAPI backend
2. **Phase 3**: Create React frontend
3. **Phase 4**: Gradual migration of users
4. **Phase 5**: Deprecate Flask/vanilla JS

---

## Questions Before Starting?

Before we begin Step 1, do you have any:

1. Questions about the approach?
2. Concerns about the timeline?
3. Preferences for how to organize specific features?
4. Constraints we should be aware of?

Let me know and we'll proceed with Step 1: Creating the directory structure!
