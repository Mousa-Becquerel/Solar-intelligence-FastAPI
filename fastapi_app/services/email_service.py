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
        """HTML template for email verification - Material Design styled"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
        </head>
        <body style="font-family: 'Roboto', 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #212121; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
            <!-- Outer container with Material Design elevation -->
            <div style="background-color: #ffffff; margin: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.08); overflow: hidden;">

                <!-- Header with brand colors -->
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 48px 24px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 400; letter-spacing: 0.5px;">Solar Intelligence</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 12px 0 0; font-size: 15px; font-weight: 300;">AI-Powered Solar Market Intelligence</p>
                </div>

                <!-- Main Content -->
                <div style="padding: 32px 24px;">
                    <h2 style="color: #1e3a8a; margin: 0 0 16px; font-size: 20px; font-weight: 500;">Welcome, {full_name}!</h2>

                    <p style="font-size: 16px; color: #424242; margin: 0 0 16px; line-height: 1.6;">
                        Thank you for creating an account with Solar Intelligence. We're excited to have you on board!
                    </p>

                    <p style="font-size: 16px; color: #424242; margin: 0 0 24px; line-height: 1.6;">
                        To get started, please verify your email address by clicking the button below:
                    </p>

                    <!-- Material Design Button -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{verification_url}"
                           style="background-color: #1e3a8a; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(30, 58, 138, 0.3), 0 4px 8px rgba(30, 58, 138, 0.2); transition: all 0.3s;">
                            Verify Email Address
                        </a>
                    </div>

                    <!-- Alternative Link -->
                    <p style="font-size: 13px; color: #757575; margin: 24px 0; padding: 16px; background-color: #f5f5f5; border-radius: 4px;">
                        Or copy and paste this link into your browser:<br>
                        <a href="{verification_url}" style="color: #1e3a8a; word-break: break-all; text-decoration: underline;">{verification_url}</a>
                    </p>

                    <!-- Expiry Notice - Material Card Style -->
                    <div style="background-color: #FFF8E1; border-left: 4px solid #FFB74D; padding: 16px; margin: 24px 0; border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px; color: #F57C00;">
                            <strong>⏱ This link expires in 24 hours.</strong>
                        </p>
                    </div>

                    <!-- Security Note -->
                    <p style="font-size: 13px; color: #757575; margin: 24px 0 0; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                        If you didn't create an account with Solar Intelligence, you can safely ignore this email.
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f5f5f5; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 8px; color: #757575; font-size: 12px;">© 2025 Solar Intelligence</p>
                    <p style="margin: 0 0 12px; color: #9e9e9e; font-size: 11px;">AI-Powered Solar Market Intelligence</p>
                    <p style="margin: 0;">
                        <a href="{settings.FRONTEND_URL}" style="color: #1e3a8a; text-decoration: none; font-size: 12px; margin: 0 8px;">Visit Website</a>
                        <span style="color: #bdbdbd;">|</span>
                        <a href="{settings.FRONTEND_URL}/support" style="color: #1e3a8a; text-decoration: none; font-size: 12px; margin: 0 8px;">Contact Support</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_password_reset_email_template(self, full_name: str, reset_url: str) -> str:
        """HTML template for password reset - Material Design styled"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
        </head>
        <body style="font-family: 'Roboto', 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #212121; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
            <!-- Outer container with Material Design elevation -->
            <div style="background-color: #ffffff; margin: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.08); overflow: hidden;">

                <!-- Header with brand colors -->
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 48px 24px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 400; letter-spacing: 0.5px;">Solar Intelligence</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 12px 0 0; font-size: 15px; font-weight: 300;">AI-Powered Solar Market Intelligence</p>
                </div>

                <!-- Main Content -->
                <div style="padding: 32px 24px;">
                    <h2 style="color: #1e3a8a; margin: 0 0 16px; font-size: 20px; font-weight: 500;">Password Reset Request</h2>

                    <p style="font-size: 16px; color: #424242; margin: 0 0 16px; line-height: 1.6;">
                        Hi {full_name},
                    </p>

                    <p style="font-size: 16px; color: #424242; margin: 0 0 16px; line-height: 1.6;">
                        We received a request to reset your password for your Solar Intelligence account.
                    </p>

                    <p style="font-size: 16px; color: #424242; margin: 0 0 24px; line-height: 1.6;">
                        Click the button below to create a new password:
                    </p>

                    <!-- Material Design Button -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{reset_url}"
                           style="background-color: #d32f2f; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(211, 47, 47, 0.3), 0 4px 8px rgba(211, 47, 47, 0.2); transition: all 0.3s;">
                            Reset Password
                        </a>
                    </div>

                    <!-- Alternative Link -->
                    <p style="font-size: 13px; color: #757575; margin: 24px 0; padding: 16px; background-color: #f5f5f5; border-radius: 4px;">
                        Or copy and paste this link into your browser:<br>
                        <a href="{reset_url}" style="color: #1e3a8a; word-break: break-all; text-decoration: underline;">{reset_url}</a>
                    </p>

                    <!-- Expiry Notice - Material Card Style -->
                    <div style="background-color: #FFEBEE; border-left: 4px solid #d32f2f; padding: 16px; margin: 24px 0; border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px; color: #c62828;">
                            <strong>⏱ This link expires in 1 hour for security reasons.</strong>
                        </p>
                    </div>

                    <!-- Security Warning -->
                    <div style="background-color: #FFF8E1; border-left: 4px solid #FFB74D; padding: 16px; margin: 24px 0; border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px; color: #F57C00;">
                            <strong>🔒 Security tip:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f5f5f5; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 8px; color: #757575; font-size: 12px;">© 2025 Solar Intelligence</p>
                    <p style="margin: 0 0 12px; color: #9e9e9e; font-size: 11px;">AI-Powered Solar Market Intelligence</p>
                    <p style="margin: 0;">
                        <a href="{settings.FRONTEND_URL}" style="color: #1e3a8a; text-decoration: none; font-size: 12px; margin: 0 8px;">Visit Website</a>
                        <span style="color: #bdbdbd;">|</span>
                        <a href="{settings.FRONTEND_URL}/support" style="color: #1e3a8a; text-decoration: none; font-size: 12px; margin: 0 8px;">Contact Support</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_welcome_email_template(self, full_name: str) -> str:
        """HTML template for welcome email - Material Design styled"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Solar Intelligence</title>
        </head>
        <body style="font-family: 'Roboto', 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #212121; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
            <!-- Outer container with Material Design elevation -->
            <div style="background-color: #ffffff; margin: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.08); overflow: hidden;">

                <!-- Header with brand colors -->
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 48px 24px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 400; letter-spacing: 0.5px;">Solar Intelligence</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 12px 0 0; font-size: 15px; font-weight: 300;">AI-Powered Solar Market Intelligence</p>
                </div>

                <!-- Success Badge -->
                <div style="text-align: center; margin: 32px 0 24px;">
                    <div style="display: inline-block; background-color: #C8E6C9; color: #2E7D32; padding: 12px 24px; border-radius: 24px; font-weight: 500; font-size: 14px; box-shadow: 0 2px 4px rgba(46, 125, 50, 0.2);">
                        ✓ Account Verified
                    </div>
                </div>

                <!-- Main Content -->
                <div style="padding: 0 24px 32px;">
                    <h2 style="color: #1e3a8a; margin: 0 0 16px; text-align: center; font-size: 20px; font-weight: 500;">Welcome aboard, {full_name}!</h2>

                    <p style="font-size: 16px; color: #424242; margin: 0 0 24px; line-height: 1.6; text-align: center;">
                        Your account has been verified and you're ready to start exploring the future of solar market intelligence.
                    </p>

                    <!-- Features Cards -->
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 24px 0;">
                        <h3 style="color: #1e3a8a; margin: 0 0 16px; font-size: 16px; font-weight: 500;">What you can do:</h3>
                        <div style="margin: 0;">
                            <div style="background-color: #ffffff; padding: 12px 16px; margin-bottom: 8px; border-radius: 4px; border-left: 3px solid #FFB74D;">
                                <p style="margin: 0; font-size: 14px; color: #424242;"><strong>🤖 AI Agents</strong> — Chat with specialized agents for solar market insights</p>
                            </div>
                            <div style="background-color: #ffffff; padding: 12px 16px; margin-bottom: 8px; border-radius: 4px; border-left: 3px solid #FFB74D;">
                                <p style="margin: 0; font-size: 14px; color: #424242;"><strong>📊 Market Analysis</strong> — Analyze global solar market trends and forecasts</p>
                            </div>
                            <div style="background-color: #ffffff; padding: 12px 16px; margin-bottom: 8px; border-radius: 4px; border-left: 3px solid #FFB74D;">
                                <p style="margin: 0; font-size: 14px; color: #424242;"><strong>💡 Expert Insights</strong> — Get expert insights on technologies and policies</p>
                            </div>
                            <div style="background-color: #ffffff; padding: 12px 16px; border-radius: 4px; border-left: 3px solid #FFB74D;">
                                <p style="margin: 0; font-size: 14px; color: #424242;"><strong>🌍 Regional Dynamics</strong> — Explore regional market dynamics</p>
                            </div>
                        </div>
                    </div>

                    <!-- Material Design Button -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{settings.FRONTEND_URL}/agents"
                           style="background-color: #1e3a8a; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(30, 58, 138, 0.3), 0 4px 8px rgba(30, 58, 138, 0.2);">
                            Get Started
                        </a>
                    </div>

                    <!-- Support -->
                    <p style="font-size: 13px; color: #757575; margin: 24px 0 0; text-align: center; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                        Need help? Check out our <a href="{settings.FRONTEND_URL}/help" style="color: #1e3a8a; text-decoration: underline;">Help Center</a> or
                        <a href="mailto:{getattr(settings, 'SUPPORT_EMAIL', 'support@solarintelligence.com')}" style="color: #1e3a8a; text-decoration: underline;">contact support</a>.
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f5f5f5; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 8px; color: #757575; font-size: 12px;">© 2025 Solar Intelligence</p>
                    <p style="margin: 0 0 12px; color: #9e9e9e; font-size: 11px;">AI-Powered Solar Market Intelligence</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_password_changed_template(self, full_name: str, support_email: str) -> str:
        """HTML template for password change notification - Material Design styled"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed</title>
        </head>
        <body style="font-family: 'Roboto', 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #212121; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
            <!-- Outer container with Material Design elevation -->
            <div style="background-color: #ffffff; margin: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.08); overflow: hidden;">

                <!-- Header with brand colors -->
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 48px 24px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 400; letter-spacing: 0.5px;">Solar Intelligence</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 12px 0 0; font-size: 15px; font-weight: 300;">AI-Powered Solar Market Intelligence</p>
                </div>

                <!-- Main Content -->
                <div style="padding: 32px 24px;">
                    <h2 style="color: #1e3a8a; margin: 0 0 16px; font-size: 20px; font-weight: 500;">Password Changed Successfully</h2>

                    <p style="font-size: 16px; color: #424242; margin: 0 0 16px; line-height: 1.6;">
                        Hi {full_name},
                    </p>

                    <p style="font-size: 16px; color: #424242; margin: 0 0 24px; line-height: 1.6;">
                        This is to confirm that your Solar Intelligence password was successfully changed.
                    </p>

                    <!-- Timestamp Card -->
                    <div style="background-color: #E8F5E9; padding: 16px; margin: 24px 0; border-radius: 4px; border-left: 4px solid #4CAF50;">
                        <p style="margin: 0; font-size: 14px; color: #2E7D32;">
                            <strong>✓ Changed at:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}
                        </p>
                    </div>

                    <!-- Security Warning -->
                    <div style="background-color: #FFEBEE; border-left: 4px solid #d32f2f; padding: 16px; margin: 24px 0; border-radius: 4px;">
                        <p style="margin: 0 0 8px; font-size: 14px; color: #c62828;">
                            <strong>🔒 Didn't make this change?</strong>
                        </p>
                        <p style="margin: 0; font-size: 14px; color: #c62828;">
                            If you didn't change your password, please contact us immediately at
                            <a href="mailto:{support_email}" style="color: #d32f2f; text-decoration: underline; font-weight: 500;">{support_email}</a>
                        </p>
                    </div>

                    <!-- Additional Security Tips -->
                    <div style="background-color: #f5f5f5; padding: 16px; margin: 24px 0; border-radius: 4px;">
                        <p style="margin: 0 0 8px; font-size: 13px; color: #757575;">
                            <strong>Security Tips:</strong>
                        </p>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #757575; line-height: 1.6;">
                            <li>Use a strong, unique password for your account</li>
                            <li>Never share your password with anyone</li>
                            <li>Enable two-factor authentication if available</li>
                        </ul>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f5f5f5; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 8px; color: #757575; font-size: 12px;">© 2025 Solar Intelligence</p>
                    <p style="margin: 0 0 12px; color: #9e9e9e; font-size: 11px;">AI-Powered Solar Market Intelligence</p>
                </div>
            </div>
        </body>
        </html>
        """


# Singleton instance
email_service = EmailService()
