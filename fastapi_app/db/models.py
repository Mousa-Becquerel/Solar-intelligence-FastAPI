"""
Async Database Models for FastAPI
Simplified version for testing - will gradually match Flask models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float
from sqlalchemy.sql import func
from datetime import datetime
import bcrypt

from fastapi_app.db.session import Base


class User(Base):
    """User model - async version with full feature set"""
    __tablename__ = "fastapi_users"  # Different table name to avoid conflicts

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(50), default='user')
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), index=True)

    # Email Verification
    email_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(100), nullable=True)
    verification_token_expiry = Column(DateTime, nullable=True)

    # Password Reset
    reset_token = Column(String(100), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)

    # GDPR Consent Tracking
    gdpr_consent_given = Column(Boolean, default=False, nullable=False)
    gdpr_consent_date = Column(DateTime, nullable=True)
    terms_accepted = Column(Boolean, default=False, nullable=False)
    terms_accepted_date = Column(DateTime, nullable=True)
    marketing_consent = Column(Boolean, default=False, nullable=False)
    marketing_consent_date = Column(DateTime, nullable=True)
    privacy_policy_version = Column(String(10), default='1.0')
    terms_version = Column(String(10), default='1.0')

    # Plan and Usage Tracking
    plan_type = Column(String(20), default='free')  # 'free' or 'premium'
    query_count = Column(Integer, default=0)
    last_query_date = Column(DateTime, nullable=True)
    plan_start_date = Column(DateTime, nullable=True)
    plan_end_date = Column(DateTime, nullable=True)
    monthly_query_count = Column(Integer, default=0)
    last_reset_date = Column(DateTime, nullable=True)

    # Soft Delete for Account Deletion (30-day grace period)
    deleted = Column(Boolean, default=False, nullable=False)
    deletion_requested_at = Column(DateTime, nullable=True)
    deletion_reason = Column(Text, nullable=True)

    # GDPR Article 18 - Right to Restriction of Processing
    processing_restricted = Column(Boolean, default=False, nullable=False)
    restriction_requested_at = Column(DateTime, nullable=True)
    restriction_reason = Column(Text, nullable=True)
    restriction_grounds = Column(String(50), nullable=True)  # 'accuracy', 'unlawful', 'no_longer_needed', 'objection'

    def verify_password(self, password: str) -> bool:
        """Verify password - supports both Werkzeug (pbkdf2) and bcrypt formats

        This allows migrated users from Flask to login with their existing passwords
        """
        # Check if it's a Werkzeug hash (from Flask migration)
        if self.password_hash.startswith('pbkdf2:sha256:') or self.password_hash.startswith('scrypt:'):
            from werkzeug.security import check_password_hash
            return check_password_hash(self.password_hash, password)

        # Otherwise, use bcrypt (new format)
        try:
            password_bytes = password.encode('utf-8')[:72]
            return bcrypt.checkpw(password_bytes, self.password_hash.encode('utf-8'))
        except ValueError:
            # If bcrypt fails, try werkzeug as fallback
            try:
                from werkzeug.security import check_password_hash
                return check_password_hash(self.password_hash, password)
            except:
                return False

    def set_password(self, password: str):
        """Hash and set password using bcrypt"""
        # Convert password to bytes, truncate to 72 bytes for bcrypt
        password_bytes = password.encode('utf-8')[:72]
        # Generate salt and hash
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        self.password_hash = hashed.decode('utf-8')

    # Compatibility with Flask models
    check_password = verify_password

    def get_query_limit(self) -> int:
        """Get monthly query limit based on plan type

        Note: For 'free' tier, base limit is 5 queries.
        Survey bonuses are added separately in the profile endpoint.
        """
        limits = {
            'free': 5,  # Base limit: 5 queries (can be increased by surveys)
            'premium': 1000,
            'max': 10000
        }
        return limits.get(self.plan_type, 5)

    def can_make_query(self) -> bool:
        """Check if user can make another query"""
        if self.role == 'admin':
            return True
        return self.monthly_query_count < self.get_query_limit()

    def increment_query_count(self):
        """Increment query counts"""
        self.query_count = (self.query_count or 0) + 1
        self.monthly_query_count = (self.monthly_query_count or 0) + 1
        self.last_query_date = datetime.utcnow()


class Conversation(Base):
    """Conversation model - async version"""
    __tablename__ = "fastapi_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    title = Column(String(256))
    agent_type = Column(String(50), default='market')
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())


class Message(Base):
    """Message model - async version"""
    __tablename__ = "fastapi_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, nullable=False, index=True)
    sender = Column(String(16))  # 'user' or 'bot'
    content = Column(Text)
    agent_type = Column(String(50), nullable=True)  # Which agent answered (for bot messages)
    timestamp = Column(DateTime, default=datetime.utcnow, server_default=func.now())


class Waitlist(Base):
    """Waitlist model for email subscriptions"""
    __tablename__ = "fastapi_waitlist"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    interested_agents = Column(Text, nullable=True)  # JSON string of agent preferences
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    notified = Column(Boolean, default=False)
    notified_at = Column(DateTime, nullable=True)
    ip_address = Column(String(45), nullable=True)  # Support IPv6
    user_agent = Column(String(256), nullable=True)


class HiredAgent(Base):
    """Model for tracking which agents users have hired"""
    __tablename__ = "fastapi_hired_agent"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    agent_type = Column(String(50), nullable=False, index=True)
    hired_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    is_active = Column(Boolean, default=True, index=True)


class AgentAccess(Base):
    """Model for agent-level access control configuration"""
    __tablename__ = "fastapi_agent_access"

    id = Column(Integer, primary_key=True, index=True)
    agent_type = Column(String(50), unique=True, nullable=False, index=True)
    required_plan = Column(String(20), default='free')  # 'free', 'premium', 'max', 'admin'
    is_enabled = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AgentWhitelist(Base):
    """Model for whitelisting specific users for agent access"""
    __tablename__ = "fastapi_agent_whitelist"

    id = Column(Integer, primary_key=True, index=True)
    agent_type = Column(String(50), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    granted_by = Column(Integer, nullable=True)  # Admin user ID who granted access
    granted_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    reason = Column(Text, nullable=True)


class ContactRequest(Base):
    """Model for storing contact form submissions from users"""
    __tablename__ = "fastapi_contact_request"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # Null for landing page submissions
    name = Column(String(100), nullable=False)
    email = Column(String(120), nullable=False)
    company = Column(String(150), nullable=True)
    phone = Column(String(20), nullable=True)
    message = Column(Text, nullable=False)
    source = Column(String(50), nullable=False, index=True)  # 'landing_page', 'artifact_panel', 'contact_page'
    status = Column(String(20), default='pending', index=True)  # 'pending', 'contacted', 'resolved'
    selected_experts = Column(Text, nullable=True)  # JSON string of selected expert IDs
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), index=True)
    contacted_at = Column(DateTime, nullable=True)


class UserSurvey(Base):
    """Model for user profiling survey responses - Stage 1"""
    __tablename__ = "fastapi_user_survey"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    role = Column(String(50), nullable=False)
    role_other = Column(String(100), nullable=True)
    regions = Column(Text, nullable=False)  # JSON array of regions
    familiarity = Column(String(20), nullable=False)
    insights = Column(Text, nullable=False)  # JSON array of insight types
    tailored = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    bonus_queries_granted = Column(Integer, default=5)


class UserSurveyStage2(Base):
    """Model for user profiling survey responses - Stage 2 (Market Activity & Behaviour)"""
    __tablename__ = "fastapi_user_survey_stage2"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    work_focus = Column(String(100), nullable=False)
    work_focus_other = Column(String(100), nullable=True)
    pv_segments = Column(Text, nullable=False)  # JSON array
    technologies = Column(Text, nullable=False)  # JSON array
    technologies_other = Column(String(200), nullable=True)
    challenges = Column(Text, nullable=False)  # JSON array of top 3
    weekly_insight = Column(Text, nullable=True)  # Open text response
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    bonus_queries_granted = Column(Integer, default=5)


class DataProcessingLog(Base):
    """
    Log all data processing activities for GDPR Article 30 compliance
    Records when and why personal data is accessed or modified
    """
    __tablename__ = "fastapi_data_processing_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)  # User whose data was processed
    activity_type = Column(String(50), nullable=False, index=True)  # e.g., "data_access", "data_export", "data_modification", "data_deletion"
    endpoint = Column(String(255), nullable=True)  # API endpoint called
    method = Column(String(10), nullable=True)  # HTTP method (GET, POST, etc.)
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(255), nullable=True)  # Browser/client info
    purpose = Column(Text, nullable=True)  # Why data was processed
    data_categories = Column(Text, nullable=True)  # What categories of data (JSON array)
    legal_basis = Column(String(50), nullable=True)  # e.g., "consent", "contract", "legitimate_interest"
    timestamp = Column(DateTime, default=datetime.utcnow, server_default=func.now(), index=True, nullable=False)

    # Optional: Track the admin/user who performed the action
    performed_by_user_id = Column(Integer, nullable=True)  # If admin accessed user data


class DataBreachLog(Base):
    """
    Log data breaches for GDPR Article 33-34 compliance
    Records when data breaches occur and tracks notification status
    """
    __tablename__ = "fastapi_data_breach_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Breach Details
    breach_type = Column(String(50), nullable=False)  # e.g., "unauthorized_access", "data_leak", "system_compromise", "accidental_disclosure"
    severity = Column(String(20), nullable=False, index=True)  # "low", "medium", "high", "critical"
    description = Column(Text, nullable=False)  # What happened
    affected_data_categories = Column(Text, nullable=True)  # JSON array of affected data types
    estimated_affected_users = Column(Integer, nullable=True)  # Number of users affected

    # Discovery & Timeline
    discovered_at = Column(DateTime, nullable=False, server_default=func.now())
    breach_occurred_at = Column(DateTime, nullable=True)  # When the breach actually happened (if known)
    contained_at = Column(DateTime, nullable=True)  # When breach was contained
    resolved_at = Column(DateTime, nullable=True)  # When breach was fully resolved

    # Discovery Details
    discovered_by = Column(String(100), nullable=True)  # Who discovered it
    discovery_method = Column(String(100), nullable=True)  # How it was discovered (e.g., "monitoring", "user_report", "audit")

    # Impact Assessment
    risk_level = Column(String(20), nullable=False)  # "low", "moderate", "high"
    likely_consequences = Column(Text, nullable=True)  # Assessment of potential harm to users
    technical_measures = Column(Text, nullable=True)  # Technical safeguards that were in place
    organizational_measures = Column(Text, nullable=True)  # Organizational safeguards in place

    # Notification Status
    internal_team_notified = Column(Boolean, default=False)
    internal_notification_date = Column(DateTime, nullable=True)

    dpa_notified = Column(Boolean, default=False)  # Data Protection Authority
    dpa_notification_date = Column(DateTime, nullable=True)
    dpa_notification_required = Column(Boolean, default=True)  # Whether DPA notification is required

    users_notified = Column(Boolean, default=False)
    users_notification_date = Column(DateTime, nullable=True)
    users_notification_required = Column(Boolean, default=False)  # Whether user notification is required

    # Remediation
    remediation_steps = Column(Text, nullable=True)  # What steps were taken
    prevention_measures = Column(Text, nullable=True)  # What was done to prevent future breaches

    # Status
    status = Column(String(20), nullable=False, default="open", index=True)  # "open", "investigating", "contained", "resolved", "closed"

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_user_id = Column(Integer, nullable=True)  # Admin who logged the breach

    # Notes
    notes = Column(Text, nullable=True)  # Additional notes or updates
