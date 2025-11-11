"""
Email Service for FastAPI

Handles sending emails for password reset, email verification, etc.
Uses environment variables for SMTP configuration.

For production, you should use a service like:
- SendGrid
- AWS SES
- Mailgun
- Postmark

For now, this is a mock implementation that logs instead of sending.
"""

import logging
from typing import Optional
from datetime import datetime
import secrets

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails"""

    @staticmethod
    async def send_password_reset_email(
        email: str,
        reset_token: str,
        reset_url: str
    ) -> bool:
        """
        Send password reset email to user.

        Args:
            email: User's email address
            reset_token: Password reset token
            reset_url: Base URL for reset (e.g., https://app.example.com/reset-password)

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            full_reset_url = f"{reset_url}?token={reset_token}"

            # TODO: Replace with actual email sending
            # For now, just log (in production, use SendGrid/SES/etc.)
            logger.info(f"""
            ========================================
            PASSWORD RESET EMAIL
            ========================================
            To: {email}
            Subject: Reset Your Password

            Hi there,

            You requested to reset your password. Click the link below to reset it:

            {full_reset_url}

            This link will expire in 1 hour.

            If you didn't request this, please ignore this email.

            Best regards,
            Solar Intelligence Team
            ========================================
            """)

            return True

        except Exception as e:
            logger.error(f"Failed to send password reset email to {email}: {e}")
            return False

    @staticmethod
    async def send_verification_email(
        email: str,
        verification_token: str,
        verification_url: str
    ) -> bool:
        """
        Send email verification email to user.

        Args:
            email: User's email address
            verification_token: Email verification token
            verification_url: Base URL for verification

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            full_verification_url = f"{verification_url}?token={verification_token}"

            # TODO: Replace with actual email sending
            logger.info(f"""
            ========================================
            EMAIL VERIFICATION
            ========================================
            To: {email}
            Subject: Verify Your Email Address

            Welcome to Solar Intelligence!

            Please verify your email address by clicking the link below:

            {full_verification_url}

            This link will expire in 24 hours.

            Best regards,
            Solar Intelligence Team
            ========================================
            """)

            return True

        except Exception as e:
            logger.error(f"Failed to send verification email to {email}: {e}")
            return False

    @staticmethod
    async def send_account_deletion_confirmation(
        email: str,
        username: str,
        deletion_date: datetime
    ) -> bool:
        """
        Send account deletion confirmation email.

        Args:
            email: User's email address
            username: User's username
            deletion_date: When account will be permanently deleted

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # TODO: Replace with actual email sending
            logger.info(f"""
            ========================================
            ACCOUNT DELETION CONFIRMATION
            ========================================
            To: {email}
            Subject: Your Account Deletion Request

            Hi {username},

            We've received your request to delete your account.

            Your account will be permanently deleted on: {deletion_date.strftime('%B %d, %Y')}

            You have a 30-day grace period. If you change your mind, you can:
            1. Log in to your account
            2. Cancel the deletion request

            If you take no action, your account and all data will be permanently deleted.

            Best regards,
            Solar Intelligence Team
            ========================================
            """)

            return True

        except Exception as e:
            logger.error(f"Failed to send deletion confirmation to {email}: {e}")
            return False

    @staticmethod
    async def send_account_deletion_cancelled(
        email: str,
        username: str
    ) -> bool:
        """
        Send email confirming account deletion was cancelled.

        Args:
            email: User's email address
            username: User's username

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # TODO: Replace with actual email sending
            logger.info(f"""
            ========================================
            ACCOUNT DELETION CANCELLED
            ========================================
            To: {email}
            Subject: Your Account Deletion Was Cancelled

            Hi {username},

            Good news! Your account deletion request has been cancelled.

            Your account and all data are safe and you can continue using Solar Intelligence.

            Best regards,
            Solar Intelligence Team
            ========================================
            """)

            return True

        except Exception as e:
            logger.error(f"Failed to send cancellation email to {email}: {e}")
            return False

    @staticmethod
    async def send_waitlist_approval(
        email: str
    ) -> bool:
        """
        Send email notifying user they've been approved from waitlist.

        Args:
            email: User's email address

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # TODO: Replace with actual email sending
            logger.info(f"""
            ========================================
            WAITLIST APPROVAL
            ========================================
            To: {email}
            Subject: You're Approved! Welcome to Solar Intelligence

            Great news!

            You've been approved from the waitlist and can now access Solar Intelligence!

            Click here to create your account: https://app.solarintelligence.com/register

            Best regards,
            Solar Intelligence Team
            ========================================
            """)

            return True

        except Exception as e:
            logger.error(f"Failed to send waitlist approval to {email}: {e}")
            return False


def generate_token() -> str:
    """Generate a secure random token for password reset or email verification"""
    return secrets.token_urlsafe(32)
