"""
Async Authentication Service for FastAPI

This service handles all authentication-related operations using async/await patterns.
Converted from Flask's sync AuthService to FastAPI's async architecture.
"""

from typing import Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
import logging

from fastapi_app.db.models import User

logger = logging.getLogger(__name__)


class AuthService:
    """Async service for authentication and authorization operations."""

    @staticmethod
    async def register_user(
        db: AsyncSession,
        first_name: str,
        last_name: str,
        email: str,
        password: str,
        job_title: str,
        company_name: str,
        country: str,
        company_size: str,
        terms_agreement: bool,
        communications: bool = False
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Register a new user account.

        Args:
            db: Async database session
            first_name: User's first name
            last_name: User's last name
            email: User's email (used as username)
            password: User's password (will be hashed)
            job_title: User's job title
            company_name: User's company name
            country: User's country
            company_size: Company size category
            terms_agreement: Agreement to terms (required)
            communications: Opt-in for marketing communications (optional)

        Returns:
            Tuple of (User object, error message)
            - (User, None) on success
            - (None, error_message) on failure
        """
        try:
            # Validate required fields
            if not all([first_name, last_name, email, password, job_title,
                       company_name, country, company_size]):
                return None, "All fields are required"

            # Validate terms agreement
            if not terms_agreement:
                return None, "You must agree to the terms of service and privacy policy"

            # Check if user already exists
            result = await db.execute(
                select(User).where(User.username == email)
            )
            existing_user = result.scalar_one_or_none()

            if existing_user:
                return None, "An account with this email already exists"

            # Create new user
            consent_timestamp = datetime.utcnow()
            new_user = User(
                username=email,  # Use email as username
                full_name=f"{first_name} {last_name}",
                role='user',
                is_active=True,  # Auto-activate for now (can add waitlist logic later)

                # GDPR Consent Tracking
                gdpr_consent_given=True,  # Required for account creation
                terms_accepted=True,  # Required for account creation
            )
            new_user.set_password(password)

            # Add to database
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)

            logger.info(f"User registered successfully: {email}")
            return new_user, None

        except Exception as e:
            logger.error(f"Registration error: {e}")
            await db.rollback()
            return None, "Registration failed. Please try again."

    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        username: str,
        password: str
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Authenticate a user with username and password.

        Args:
            db: Async database session
            username: User's username (email)
            password: User's password

        Returns:
            Tuple of (User object, error message)
            - (User, None) on success
            - (None, error_message) on failure
        """
        try:
            # Validate inputs
            if not username or not password:
                return None, "Please fill in all fields"

            # Find user
            result = await db.execute(
                select(User).where(User.username == username)
            )
            user = result.scalar_one_or_none()

            if not user:
                return None, "Invalid username or password"

            # Verify user has a password hash
            if not user.password_hash:
                logger.error(f"User {username} has no password hash set")
                return None, "Invalid username or password"

            # Check password
            if not user.verify_password(password):
                return None, "Invalid username or password"

            # Check if account is active
            if not user.is_active:
                return None, "Your account is pending administrator approval. Please wait for an admin to activate your account."

            logger.info(f"User authenticated successfully: {username}")
            return user, None

        except Exception as e:
            logger.error(f"Authentication error: {e}", exc_info=True)
            return None, "An error occurred during authentication. Please try again."

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """
        Get user by ID.

        Args:
            db: Async database session
            user_id: User's ID

        Returns:
            User object or None
        """
        try:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user {user_id}: {e}")
            return None

    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """
        Get user by username.

        Args:
            db: Async database session
            username: User's username

        Returns:
            User object or None
        """
        try:
            result = await db.execute(
                select(User).where(User.username == username)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user by username {username}: {e}")
            return None

    @staticmethod
    async def update_user_password(
        db: AsyncSession,
        user: User,
        new_password: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Update user's password.

        Args:
            db: Async database session
            user: User object
            new_password: New password (will be hashed)

        Returns:
            Tuple of (success, error_message)
        """
        try:
            if not new_password or len(new_password) < 8:
                return False, "Password must be at least 8 characters"

            user.set_password(new_password)
            await db.commit()

            logger.info(f"Password updated for user {user.id}")
            return True, None

        except Exception as e:
            logger.error(f"Error updating password for user {user.id}: {e}")
            await db.rollback()
            return False, "Failed to update password"

    @staticmethod
    async def update_gdpr_consent(
        db: AsyncSession,
        user: User,
        gdpr_consent: bool,
        terms_accepted: bool,
        marketing_consent: bool = False
    ) -> Tuple[bool, Optional[str]]:
        """
        Update user's GDPR consent settings.

        Args:
            db: Async database session
            user: User object
            gdpr_consent: GDPR consent status
            terms_accepted: Terms acceptance status
            marketing_consent: Marketing communications consent

        Returns:
            Tuple of (success, error_message)
        """
        try:
            timestamp = datetime.utcnow()

            user.gdpr_consent_given = gdpr_consent
            user.terms_accepted = terms_accepted

            await db.commit()

            logger.info(f"GDPR consent updated for user {user.id}")
            return True, None

        except Exception as e:
            logger.error(f"Error updating GDPR consent for user {user.id}: {e}")
            await db.rollback()
            return False, "Failed to update consent settings"

    @staticmethod
    async def activate_user(db: AsyncSession, user: User) -> Tuple[bool, Optional[str]]:
        """
        Activate a user account (admin function).

        Args:
            db: Async database session
            user: User object to activate

        Returns:
            Tuple of (success, error_message)
        """
        try:
            user.is_active = True
            await db.commit()

            logger.info(f"User {user.id} activated")
            return True, None

        except Exception as e:
            logger.error(f"Error activating user {user.id}: {e}")
            await db.rollback()
            return False, "Failed to activate user"

    @staticmethod
    async def deactivate_user(db: AsyncSession, user: User) -> Tuple[bool, Optional[str]]:
        """
        Deactivate a user account (admin function).

        Args:
            db: Async database session
            user: User object to deactivate

        Returns:
            Tuple of (success, error_message)
        """
        try:
            user.is_active = False
            await db.commit()

            logger.info(f"User {user.id} deactivated")
            return True, None

        except Exception as e:
            logger.error(f"Error deactivating user {user.id}: {e}")
            await db.rollback()
            return False, "Failed to deactivate user"

    @staticmethod
    async def upgrade_to_premium(
        db: AsyncSession,
        user: User,
        duration_days: int = 30
    ) -> Tuple[bool, Optional[str]]:
        """
        Upgrade user to premium plan.

        Args:
            db: Async database session
            user: User object
            duration_days: Duration of premium subscription in days

        Returns:
            Tuple of (success, error_message)
        """
        try:
            user.plan_type = 'premium'

            await db.commit()

            logger.info(f"User {user.id} upgraded to premium for {duration_days} days")
            return True, None

        except Exception as e:
            logger.error(f"Error upgrading user {user.id} to premium: {e}")
            await db.rollback()
            return False, "Failed to upgrade to premium"

    @staticmethod
    async def check_and_reset_monthly_queries(
        db: AsyncSession,
        user: User
    ) -> bool:
        """
        Check if monthly query reset is needed and perform reset.

        Args:
            db: Async database session
            user: User object

        Returns:
            True if reset was performed, False otherwise

        Note:
            This method updates the user object and commits the transaction.
        """
        try:
            # For now, just return False - can implement proper date tracking later
            # when we add the necessary columns to the User model
            return False

        except Exception as e:
            logger.error(f"Error checking/resetting queries for user {user.id}: {e}")
            return False

    # ==================== PASSWORD RESET ====================

    @staticmethod
    async def request_password_reset(
        db: AsyncSession,
        email: str,
        reset_url: str = "http://localhost:8000/reset-password"
    ) -> Tuple[bool, Optional[str]]:
        """
        Request a password reset for a user.

        Args:
            db: Async database session
            email: User's email address
            reset_url: Base URL for password reset page

        Returns:
            Tuple of (success, error_message)
        """
        try:
            from fastapi_app.services.email_service import EmailService, generate_token

            # Find user
            result = await db.execute(
                select(User).where(User.username == email)
            )
            user = result.scalar_one_or_none()

            if not user:
                # Don't reveal if email exists or not (security)
                logger.info(f"Password reset requested for non-existent email: {email}")
                return True, None  # Return success anyway

            # Generate reset token
            reset_token = generate_token()
            user.reset_token = reset_token
            user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)

            await db.commit()

            # Send email
            email_sent = await EmailService.send_password_reset_email(
                email=email,
                reset_token=reset_token,
                reset_url=reset_url
            )

            if email_sent:
                logger.info(f"Password reset email sent to {email}")
                return True, None
            else:
                logger.error(f"Failed to send password reset email to {email}")
                return False, "Failed to send reset email"

        except Exception as e:
            logger.error(f"Error requesting password reset for {email}: {e}")
            await db.rollback()
            return False, "Failed to process password reset request"

    @staticmethod
    async def reset_password_with_token(
        db: AsyncSession,
        token: str,
        new_password: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Reset password using a reset token.

        Args:
            db: Async database session
            token: Password reset token
            new_password: New password

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Find user with this token
            result = await db.execute(
                select(User).where(User.reset_token == token)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, "Invalid or expired reset token"

            # Check if token expired
            if user.reset_token_expiry and user.reset_token_expiry < datetime.utcnow():
                return False, "Reset token has expired"

            # Validate new password
            if not new_password or len(new_password) < 8:
                return False, "Password must be at least 8 characters"

            # Update password
            user.set_password(new_password)
            user.reset_token = None
            user.reset_token_expiry = None

            await db.commit()

            logger.info(f"Password reset successful for user {user.id}")
            return True, None

        except Exception as e:
            logger.error(f"Error resetting password with token: {e}")
            await db.rollback()
            return False, "Failed to reset password"

    # ==================== EMAIL VERIFICATION ====================

    @staticmethod
    async def send_verification_email(
        db: AsyncSession,
        user: User,
        verification_url: str = "http://localhost:8000/verify-email"
    ) -> Tuple[bool, Optional[str]]:
        """
        Send email verification email to user.

        Args:
            db: Async database session
            user: User object
            verification_url: Base URL for email verification page

        Returns:
            Tuple of (success, error_message)
        """
        try:
            from fastapi_app.services.email_service import EmailService, generate_token

            # Generate verification token
            verification_token = generate_token()
            user.verification_token = verification_token
            user.verification_token_expiry = datetime.utcnow() + timedelta(hours=24)

            await db.commit()

            # Send email
            email_sent = await EmailService.send_verification_email(
                email=user.username,
                verification_token=verification_token,
                verification_url=verification_url
            )

            if email_sent:
                logger.info(f"Verification email sent to {user.username}")
                return True, None
            else:
                return False, "Failed to send verification email"

        except Exception as e:
            logger.error(f"Error sending verification email to user {user.id}: {e}")
            await db.rollback()
            return False, "Failed to send verification email"

    @staticmethod
    async def verify_email_with_token(
        db: AsyncSession,
        token: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify email using verification token.

        Args:
            db: Async database session
            token: Email verification token

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Find user with this token
            result = await db.execute(
                select(User).where(User.verification_token == token)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, "Invalid or expired verification token"

            # Check if token expired
            if user.verification_token_expiry and user.verification_token_expiry < datetime.utcnow():
                return False, "Verification token has expired"

            # Verify email
            user.email_verified = True
            user.verification_token = None
            user.verification_token_expiry = None

            await db.commit()

            logger.info(f"Email verified for user {user.id}")
            return True, None

        except Exception as e:
            logger.error(f"Error verifying email with token: {e}")
            await db.rollback()
            return False, "Failed to verify email"

    # ==================== ACCOUNT DELETION ====================

    @staticmethod
    async def request_account_deletion(
        db: AsyncSession,
        user: User,
        reason: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Request account deletion (30-day grace period).

        Args:
            db: Async database session
            user: User object
            reason: Optional reason for deletion

        Returns:
            Tuple of (success, error_message)
        """
        try:
            from fastapi_app.services.email_service import EmailService

            user.deleted = True
            user.deletion_requested_at = datetime.utcnow()
            user.deletion_reason = reason

            # Calculate deletion date (30 days from now)
            deletion_date = datetime.utcnow() + timedelta(days=30)

            await db.commit()

            # Send confirmation email
            await EmailService.send_account_deletion_confirmation(
                email=user.username,
                username=user.full_name,
                deletion_date=deletion_date
            )

            logger.info(f"Deletion requested for user {user.id}")
            return True, None

        except Exception as e:
            logger.error(f"Error requesting deletion for user {user.id}: {e}")
            await db.rollback()
            return False, "Failed to request account deletion"

    @staticmethod
    async def cancel_account_deletion(
        db: AsyncSession,
        user: User
    ) -> Tuple[bool, Optional[str]]:
        """
        Cancel account deletion request.

        Args:
            db: Async database session
            user: User object

        Returns:
            Tuple of (success, error_message)
        """
        try:
            from fastapi_app.services.email_service import EmailService

            # Check if account is actually marked for deletion
            if not user.deleted:
                return False, "Account is not marked for deletion"

            user.deleted = False
            user.deletion_requested_at = None
            user.deletion_reason = None

            await db.commit()

            # Send confirmation email
            await EmailService.send_account_deletion_cancelled(
                email=user.username,
                username=user.full_name
            )

            logger.info(f"Deletion cancelled for user {user.id}")
            return True, None

        except Exception as e:
            logger.error(f"Error cancelling deletion for user {user.id}: {e}")
            await db.rollback()
            return False, "Failed to cancel account deletion"

    # ==================== WAITLIST INTEGRATION ====================

    @staticmethod
    async def check_waitlist_status(
        db: AsyncSession,
        email: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if email is in waitlist.

        Args:
            db: Async database session
            email: Email to check

        Returns:
            Tuple of (is_in_waitlist, error_message)
        """
        try:
            from fastapi_app.db.models import Waitlist

            result = await db.execute(
                select(Waitlist).where(Waitlist.email == email)
            )
            waitlist_entry = result.scalar_one_or_none()

            return waitlist_entry is not None, None

        except Exception as e:
            logger.error(f"Error checking waitlist for {email}: {e}")
            return False, "Failed to check waitlist status"

    @staticmethod
    async def add_to_waitlist(
        db: AsyncSession,
        email: str,
        interested_agents: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Add email to waitlist.

        Args:
            db: Async database session
            email: Email address
            interested_agents: JSON string of agent preferences
            ip_address: User's IP address
            user_agent: User's browser user agent

        Returns:
            Tuple of (success, error_message)
        """
        try:
            from fastapi_app.db.models import Waitlist

            # Check if already in waitlist
            result = await db.execute(
                select(Waitlist).where(Waitlist.email == email)
            )
            existing = result.scalar_one_or_none()

            if existing:
                return False, "Email already in waitlist"

            # Add to waitlist
            waitlist_entry = Waitlist(
                email=email,
                interested_agents=interested_agents,
                ip_address=ip_address,
                user_agent=user_agent
            )

            db.add(waitlist_entry)
            await db.commit()

            logger.info(f"Added {email} to waitlist")
            return True, None

        except Exception as e:
            logger.error(f"Error adding {email} to waitlist: {e}")
            await db.rollback()
            return False, "Failed to add to waitlist"
