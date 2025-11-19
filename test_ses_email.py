"""
Test AWS SES Email Sending
Quick script to test if AWS SES is properly configured and can send emails
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi_app.services.email_service import EmailService


async def test_email_sending():
    """Test sending a verification email"""

    # Initialize email service
    email_service = EmailService()

    print("\n" + "="*60)
    print("AWS SES Email Test")
    print("="*60)

    # Check if SES is configured
    if not email_service.use_ses:
        print("❌ AWS SES is NOT configured!")
        print("   Email service is running in logging mode")
        return False

    print(f"✅ AWS SES is configured")
    print(f"   Sender: {email_service.sender_email}")
    print(f"   Region: {email_service.ses_client._client_config.region_name}")

    # Get test email address
    test_email = input("\n📧 Enter test email address to send verification email to: ").strip()

    if not test_email:
        print("❌ No email address provided")
        return False

    test_name = input("👤 Enter test user name: ").strip() or "Test User"
    test_token = "test_verification_token_12345"

    print(f"\n📤 Sending verification email to {test_email}...")

    # Send test email
    success, error = await email_service.send_verification_email(
        email=test_email,
        token=test_token,
        full_name=test_name
    )

    if success:
        print(f"\n✅ Email sent successfully!")
        print(f"   Check inbox for {test_email}")
        print(f"   Verification link: http://localhost/verify-email?token={test_token}")
        return True
    else:
        print(f"\n❌ Email sending failed!")
        print(f"   Error: {error}")
        return False


if __name__ == "__main__":
    result = asyncio.run(test_email_sending())
    sys.exit(0 if result else 1)
