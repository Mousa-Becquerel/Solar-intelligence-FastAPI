"""
Email Service using AWS SES
Handles email verification and password reset emails
"""
import boto3
from botocore.exceptions import ClientError
from typing import Optional
import logging
from datetime import datetime

from fastapi_app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """AWS SES Email Service for user authentication emails"""

    def __init__(self):
        """Initialize AWS SES client"""
        # Only initialize SES client if AWS credentials are configured and not empty
        self.ses_client = None
        self.use_ses = all([
            hasattr(settings, 'AWS_REGION') and settings.AWS_REGION,
            hasattr(settings, 'AWS_ACCESS_KEY_ID') and settings.AWS_ACCESS_KEY_ID,
            hasattr(settings, 'AWS_SECRET_ACCESS_KEY') and settings.AWS_SECRET_ACCESS_KEY,
            hasattr(settings, 'SES_SENDER_EMAIL') and settings.SES_SENDER_EMAIL
        ])

        if self.use_ses:
            try:
                self.ses_client = boto3.client(
                    'ses',
                    region_name=settings.AWS_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                )
                self.sender_email = settings.SES_SENDER_EMAIL
                self.sender_name = getattr(settings, 'SES_SENDER_NAME', "Solar Intelligence")
                logger.info(f"✅ AWS SES initialized for {self.sender_email}")
            except Exception as e:
                logger.warning(f"⚠️  AWS SES initialization failed: {e}. Falling back to logging mode.")
                self.use_ses = False
        else:
            logger.info("📧 Email service running in logging mode (AWS SES not configured)")

    async def send_verification_email(
        self,
        email: str,
        token: str,
        full_name: str
    ) -> tuple[bool, Optional[str]]:
        """
        Send email verification link to new user

        Args:
            email: User's email address
            token: Verification token
            full_name: User's full name

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

        subject = "Verify your Solar Intelligence account"

        html_body = self._get_verification_email_template(
            full_name=full_name,
            verification_url=verification_url
        )

        text_body = f"""
        Welcome to Solar Intelligence, {full_name}!

        Please verify your email address by clicking the link below:
        {verification_url}

        This link expires in 24 hours.

        If you didn't create an account, please ignore this email.

        ---
        Solar Intelligence Team
        """

        return await self._send_email(
            to_email=email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )

    async def send_password_reset_email(
        self,
        email: str,
        token: str,
        full_name: str
    ) -> tuple[bool, Optional[str]]:
        """
        Send password reset link to user

        Args:
            email: User's email address
            token: Password reset token
            full_name: User's full name

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

        subject = "Reset your Solar Intelligence password"

        html_body = self._get_password_reset_email_template(
            full_name=full_name,
            reset_url=reset_url
        )

        text_body = f"""
        Hi {full_name},

        You requested to reset your password for Solar Intelligence.

        Click the link below to reset your password:
        {reset_url}

        This link expires in 1 hour.

        If you didn't request a password reset, please ignore this email.
        Your password will remain unchanged.

        ---
        Solar Intelligence Team
        """

        return await self._send_email(
            to_email=email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )

    async def send_welcome_email(
        self,
        email: str,
        full_name: str
    ) -> tuple[bool, Optional[str]]:
        """
        Send welcome email after successful verification

        Args:
            email: User's email address
            full_name: User's full name

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        subject = "Welcome to Solar Intelligence!"

        html_body = self._get_welcome_email_template(full_name=full_name)

        text_body = f"""
        Welcome to Solar Intelligence, {full_name}!

        Your account has been verified and you're ready to start exploring solar market intelligence.

        Get started:
        - Browse available AI agents
        - Ask questions about solar markets
        - Analyze trends and forecasts

        Visit: {settings.FRONTEND_URL}

        ---
        Solar Intelligence Team
        """

        return await self._send_email(
            to_email=email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )

    async def send_password_changed_notification(
        self,
        email: str,
        full_name: str
    ) -> tuple[bool, Optional[str]]:
        """
        Notify user that password was changed

        Args:
            email: User's email address
            full_name: User's full name

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        subject = "Your Solar Intelligence password was changed"

        support_email = getattr(settings, 'SUPPORT_EMAIL', 'support@solarintelligence.com')

        html_body = self._get_password_changed_template(full_name=full_name, support_email=support_email)

        text_body = f"""
        Hi {full_name},

        This is to confirm that your Solar Intelligence password was successfully changed.

        If you didn't make this change, please contact us immediately at {support_email}.

        Changed at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}

        ---
        Solar Intelligence Team
        """

        return await self._send_email(
            to_email=email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )

    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str
    ) -> tuple[bool, Optional[str]]:
        """
        Internal method to send email via AWS SES or log in dev mode

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML email content
            text_body: Plain text email content (fallback)

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        # If SES not configured, just log the email
        if not self.use_ses:
            logger.info(f"""
            ========================================
            EMAIL (LOGGING MODE - SES NOT CONFIGURED)
            ========================================
            To: {to_email}
            Subject: {subject}

            {text_body}
            ========================================
            """)
            return True, None

        # Send via AWS SES
        try:
            response = self.ses_client.send_email(
                Source=f"{self.sender_name} <{self.sender_email}>",
                Destination={
                    'ToAddresses': [to_email]
                },
                Message={
                    'Subject': {
                        'Data': subject,
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Text': {
                            'Data': text_body,
                            'Charset': 'UTF-8'
                        },
                        'Html': {
                            'Data': html_body,
                            'Charset': 'UTF-8'
                        }
                    }
                }
            )

            message_id = response['MessageId']
            logger.info(f"✅ Email sent successfully to {to_email}. Message ID: {message_id}")
            return True, None

        except ClientError as e:
            error_message = e.response['Error']['Message']
            error_code = e.response['Error']['Code']
            logger.error(f"❌ Failed to send email to {to_email}: {error_code} - {error_message}")
            return False, error_message

        except Exception as e:
            logger.error(f"❌ Unexpected error sending email to {to_email}: {str(e)}")
            return False, str(e)

    # ==================== EMAIL TEMPLATES ====================

    def _get_verification_email_template(self, full_name: str, verification_url: str) -> str:
        """HTML template for email verification"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background-color: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin: 0;">☀️ Solar Intelligence</h1>
                </div>

                <!-- Main Content -->
                <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome, {full_name}!</h2>

                <p style="font-size: 16px; margin-bottom: 20px;">
                    Thank you for creating an account with Solar Intelligence. We're excited to have you on board!
                </p>

                <p style="font-size: 16px; margin-bottom: 30px;">
                    To get started, please verify your email address by clicking the button below:
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="{verification_url}"
                       style="background-color: #2563eb; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                        Verify Email Address
                    </a>
                </div>

                <!-- Alternative Link -->
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{verification_url}" style="color: #2563eb; word-break: break-all;">{verification_url}</a>
                </p>

                <!-- Expiry Notice -->
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                        <strong>⏱️ This link expires in 24 hours.</strong>
                    </p>
                </div>

                <!-- Security Note -->
                <p style="font-size: 13px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    If you didn't create an account with Solar Intelligence, you can safely ignore this email.
                </p>

                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                    <p style="margin: 5px 0;">Solar Intelligence</p>
                    <p style="margin: 5px 0;">AI-Powered Solar Market Intelligence</p>
                    <p style="margin: 15px 0;">
                        <a href="{settings.FRONTEND_URL}" style="color: #2563eb; text-decoration: none;">Visit Website</a> |
                        <a href="{settings.FRONTEND_URL}/support" style="color: #2563eb; text-decoration: none;">Contact Support</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_password_reset_email_template(self, full_name: str, reset_url: str) -> str:
        """HTML template for password reset"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background-color: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin: 0;">☀️ Solar Intelligence</h1>
                </div>

                <!-- Main Content -->
                <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>

                <p style="font-size: 16px; margin-bottom: 20px;">
                    Hi {full_name},
                </p>

                <p style="font-size: 16px; margin-bottom: 20px;">
                    We received a request to reset your password for your Solar Intelligence account.
                </p>

                <p style="font-size: 16px; margin-bottom: 30px;">
                    Click the button below to create a new password:
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="{reset_url}"
                       style="background-color: #dc2626; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                        Reset Password
                    </a>
                </div>

                <!-- Alternative Link -->
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{reset_url}" style="color: #2563eb; word-break: break-all;">{reset_url}</a>
                </p>

                <!-- Expiry Notice -->
                <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #991b1b;">
                        <strong>⏱️ This link expires in 1 hour for security reasons.</strong>
                    </p>
                </div>

                <!-- Security Warning -->
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                        <strong>🔒 Security tip:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                    </p>
                </div>

                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                    <p style="margin: 5px 0;">Solar Intelligence</p>
                    <p style="margin: 5px 0;">AI-Powered Solar Market Intelligence</p>
                    <p style="margin: 15px 0;">
                        <a href="{settings.FRONTEND_URL}" style="color: #2563eb; text-decoration: none;">Visit Website</a> |
                        <a href="{settings.FRONTEND_URL}/support" style="color: #2563eb; text-decoration: none;">Contact Support</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_welcome_email_template(self, full_name: str) -> str:
        """HTML template for welcome email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Solar Intelligence</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background-color: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin: 0;">☀️ Solar Intelligence</h1>
                </div>

                <!-- Success Badge -->
                <div style="text-align: center; margin: 30px 0;">
                    <div style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 10px 20px; border-radius: 20px; font-weight: bold;">
                        ✅ Account Verified
                    </div>
                </div>

                <!-- Main Content -->
                <h2 style="color: #1f2937; margin-bottom: 20px; text-align: center;">Welcome aboard, {full_name}!</h2>

                <p style="font-size: 16px; margin-bottom: 20px;">
                    Your account has been verified and you're ready to start exploring the future of solar market intelligence.
                </p>

                <!-- Features -->
                <h3 style="color: #1f2937; margin-top: 30px;">What you can do:</h3>
                <ul style="font-size: 15px; line-height: 1.8;">
                    <li>🤖 Chat with specialized AI agents for solar market insights</li>
                    <li>📊 Analyze global solar market trends and forecasts</li>
                    <li>💡 Get expert insights on technologies and policies</li>
                    <li>🌍 Explore regional market dynamics</li>
                </ul>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="{settings.FRONTEND_URL}/agents"
                       style="background-color: #2563eb; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                        Get Started
                    </a>
                </div>

                <!-- Support -->
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
                    Need help? Check out our <a href="{settings.FRONTEND_URL}/help" style="color: #2563eb;">Help Center</a> or
                    <a href="mailto:{getattr(settings, 'SUPPORT_EMAIL', 'support@solarintelligence.com')}" style="color: #2563eb;">contact support</a>.
                </p>

                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                    <p style="margin: 5px 0;">Solar Intelligence</p>
                    <p style="margin: 5px 0;">AI-Powered Solar Market Intelligence</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_password_changed_template(self, full_name: str, support_email: str) -> str:
        """HTML template for password change notification"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background-color: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin: 0;">☀️ Solar Intelligence</h1>
                </div>

                <!-- Main Content -->
                <h2 style="color: #1f2937; margin-bottom: 20px;">Password Changed Successfully</h2>

                <p style="font-size: 16px; margin-bottom: 20px;">
                    Hi {full_name},
                </p>

                <p style="font-size: 16px; margin-bottom: 20px;">
                    This is to confirm that your Solar Intelligence password was successfully changed.
                </p>

                <!-- Timestamp -->
                <div style="background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #10b981;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>Changed at:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}
                    </p>
                </div>

                <!-- Security Warning -->
                <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #991b1b;">
                        <strong>🔒 Didn't make this change?</strong><br>
                        If you didn't change your password, please contact us immediately at
                        <a href="mailto:{support_email}" style="color: #dc2626;">{support_email}</a>
                    </p>
                </div>

                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                    <p style="margin: 5px 0;">Solar Intelligence</p>
                    <p style="margin: 5px 0;">AI-Powered Solar Market Intelligence</p>
                </div>
            </div>
        </body>
        </html>
        """


# Singleton instance
email_service = EmailService()
