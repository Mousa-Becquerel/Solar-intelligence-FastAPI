# Production Features TODO

## Overview

This document tracks production-ready features that need to be implemented before deploying the authentication system to production. All core functionality is complete and tested, but these enhancements will improve security, reliability, and user experience.

---

## 1. Email Service Integration

### Current State
- **Mock Implementation**: [fastapi_app/services/email_service.py](fastapi_app/services/email_service.py)
- Logs emails instead of sending them
- All email templates and logic are ready

### What Needs to Be Done

#### Option A: SendGrid Integration
```python
# Install package
pip install sendgrid

# Update email_service.py
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os

async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    try:
        message = Mail(
            from_email='noreply@solarintelligence.com',
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )

        sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
        response = sg.send(message)
        return response.status_code in [200, 202]
    except Exception as e:
        logger.error(f"SendGrid error: {e}")
        return False
```

#### Option B: AWS SES Integration
```python
# Install package
pip install boto3

# Update email_service.py
import boto3
from botocore.exceptions import ClientError

async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    try:
        client = boto3.client(
            'ses',
            region_name=os.environ.get('AWS_REGION'),
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
        )

        response = client.send_email(
            Source='noreply@solarintelligence.com',
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject},
                'Body': {'Html': {'Data': html_content}}
            }
        )
        return True
    except ClientError as e:
        logger.error(f"SES error: {e}")
        return False
```

#### Option C: Mailgun Integration
```python
# Install package
pip install requests

# Update email_service.py
import requests

async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    try:
        response = requests.post(
            f"https://api.mailgun.net/v3/{os.environ.get('MAILGUN_DOMAIN')}/messages",
            auth=("api", os.environ.get('MAILGUN_API_KEY')),
            data={
                "from": "Solar Intelligence <noreply@solarintelligence.com>",
                "to": [to_email],
                "subject": subject,
                "html": html_content
            }
        )
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Mailgun error: {e}")
        return False
```

### Environment Variables Needed
```bash
# .env file
# For SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# For AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# For Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.com
```

### HTML Email Templates
Create professional HTML templates:
- Password reset email
- Email verification email
- Account deletion confirmation
- Account deletion cancelled
- Waitlist approval

**Example template structure:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Professional styling with branding */
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="logo_url" alt="Solar Intelligence">
        </div>
        <div class="content">
            <!-- Email content here -->
        </div>
        <div class="footer">
            <p>Unsubscribe link for marketing emails</p>
        </div>
    </div>
</body>
</html>
```

### Files to Modify
- [fastapi_app/services/email_service.py](fastapi_app/services/email_service.py) - Replace mock with real service
- [fastapi_app/core/config.py](fastapi_app/core/config.py) - Add email service config
- `.env` - Add API keys

### Estimated Time
- 2-3 hours for integration
- 4-6 hours for HTML templates and testing

---

## 2. Rate Limiting

### Current State
- **No rate limiting implemented**
- Vulnerable to abuse (spam, brute force, etc.)

### What Needs to Be Done

#### Install slowapi
```bash
pip install slowapi
```

#### Add to main.py
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

#### Apply to Endpoints

**Password Reset** (prevent abuse):
```python
@router.post("/request-password-reset", response_model=MessageResponse)
@limiter.limit("3/hour")  # 3 requests per hour per IP
async def request_password_reset(
    request: Request,
    request_data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    # ... existing code
```

**Email Verification** (prevent spam):
```python
@router.post("/send-verification", response_model=MessageResponse)
@limiter.limit("5/day")  # 5 requests per day per user
async def send_verification_email(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # ... existing code
```

**Waitlist Signup** (prevent spam):
```python
@router.post("/waitlist/join", response_model=MessageResponse)
@limiter.limit("1/hour")  # 1 signup per hour per IP
async def join_waitlist(
    request: Request,
    waitlist_data: WaitlistJoin,
    db: AsyncSession = Depends(get_db)
):
    # ... existing code
```

**Login** (prevent brute force):
```python
@router.post("/login", response_model=Token)
@limiter.limit("5/minute")  # 5 login attempts per minute
async def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(get_db)
):
    # ... existing code
```

### Recommended Rate Limits

| Endpoint | Rate Limit | Reason |
|----------|-----------|---------|
| **Login** | 5/minute per IP | Prevent brute force attacks |
| **Register** | 3/hour per IP | Prevent bot signups |
| **Password Reset Request** | 3/hour per IP | Prevent email spam |
| **Password Reset Complete** | 10/hour per IP | Allow multiple attempts |
| **Send Verification** | 5/day per user | Prevent email spam |
| **Verify Email** | 10/hour per IP | Allow retries |
| **Request Deletion** | 3/day per user | Prevent abuse |
| **Cancel Deletion** | 10/day per user | Allow flexibility |
| **Join Waitlist** | 1/hour per IP | Prevent spam signups |

### Advanced: Redis-based Rate Limiting
For production with multiple servers:
```python
from slowapi.extension import SlowAPIMiddleware
from redis import Redis

# Use Redis for distributed rate limiting
redis_client = Redis(host='localhost', port=6379, db=0)
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379"
)
```

### Files to Modify
- [fastapi_app/main.py](fastapi_app/main.py) - Add rate limiter setup
- [fastapi_app/api/v1/endpoints/auth.py](fastapi_app/api/v1/endpoints/auth.py) - Add limits to endpoints
- `requirements.txt` - Add `slowapi`

### Estimated Time
- 1-2 hours for basic implementation
- 3-4 hours for Redis-based distributed limiting

---

## 3. Scheduled Jobs (Account Cleanup)

### Current State
- Accounts marked for deletion stay in database forever
- No automatic cleanup after 30-day grace period

### What Needs to Be Done

#### Option A: APScheduler
```python
# Install package
pip install apscheduler

# Create scheduled_jobs.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from sqlalchemy import select

scheduler = AsyncIOScheduler()

async def cleanup_deleted_accounts():
    """Delete accounts after 30-day grace period"""
    from fastapi_app.db.session import AsyncSessionLocal
    from fastapi_app.db.models import User

    async with AsyncSessionLocal() as db:
        cutoff_date = datetime.utcnow() - timedelta(days=30)

        result = await db.execute(
            select(User).where(
                User.deleted == True,
                User.deletion_requested_at < cutoff_date
            )
        )

        users_to_delete = result.scalars().all()

        for user in users_to_delete:
            logger.info(f"Permanently deleting user {user.id}")
            await db.delete(user)

        await db.commit()
        logger.info(f"Deleted {len(users_to_delete)} accounts")

# Schedule to run daily at 2 AM
scheduler.add_job(cleanup_deleted_accounts, 'cron', hour=2, minute=0)
scheduler.start()
```

#### Option B: Celery (for larger scale)
```python
# Install packages
pip install celery redis

# Create celery_tasks.py
from celery import Celery
from datetime import datetime, timedelta

celery_app = Celery('tasks', broker='redis://localhost:6379/0')

@celery_app.task
def cleanup_deleted_accounts():
    # Same logic as above
    pass

# Schedule in celery beat
celery_app.conf.beat_schedule = {
    'cleanup-deleted-accounts': {
        'task': 'celery_tasks.cleanup_deleted_accounts',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}
```

#### Add to main.py
```python
from fastapi_app.scheduled_jobs import scheduler

@app.on_event("startup")
async def startup_event():
    scheduler.start()
    logger.info("Scheduled jobs started")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    logger.info("Scheduled jobs stopped")
```

### Other Scheduled Jobs to Consider
- Token expiry cleanup (remove expired reset/verification tokens)
- Inactive user cleanup
- Usage quota resets (monthly)
- Database backups
- Analytics reports

### Files to Create/Modify
- `fastapi_app/scheduled_jobs.py` - New file for scheduled tasks
- [fastapi_app/main.py](fastapi_app/main.py) - Add startup/shutdown events
- `requirements.txt` - Add `apscheduler` or `celery`

### Estimated Time
- 2-3 hours for APScheduler implementation
- 6-8 hours for Celery setup with Redis

---

## 4. Additional Security Enhancements

### CAPTCHA Integration
Prevent bot attacks on public endpoints:
```python
# Install package
pip install httpx

# Add to waitlist/join endpoint
@router.post("/waitlist/join")
async def join_waitlist(
    waitlist_data: WaitlistJoin,
    captcha_token: str,
    db: AsyncSession = Depends(get_db)
):
    # Verify CAPTCHA
    if not await verify_recaptcha(captcha_token):
        raise HTTPException(400, "Invalid CAPTCHA")

    # ... existing code
```

### Two-Factor Authentication (2FA)
For premium users:
```python
# Install package
pip install pyotp qrcode

# Add to User model
totp_secret = Column(String(32), nullable=True)
two_factor_enabled = Column(Boolean, default=False)

# Add 2FA endpoints
@router.post("/enable-2fa")
@router.post("/verify-2fa")
@router.post("/disable-2fa")
```

### Audit Logging
Track all authentication events:
```python
# Create audit_log table
class AuditLog(Base):
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    action = Column(String(50))  # login, password_reset, etc.
    ip_address = Column(String(45))
    user_agent = Column(String(256))
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Estimated Time
- 2-3 hours for CAPTCHA
- 8-10 hours for 2FA
- 4-6 hours for audit logging

---

## 5. Monitoring & Alerting

### Email Deliverability Monitoring
```python
# Track email send success/failure rates
# Alert if delivery rate drops below threshold

class EmailMetrics:
    total_sent = 0
    total_failed = 0

    @property
    def success_rate(self):
        if self.total_sent == 0:
            return 100
        return (self.total_sent - self.total_failed) / self.total_sent * 100
```

### Error Tracking
```python
# Install Sentry
pip install sentry-sdk

# Add to main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    integrations=[FastApiIntegration()],
    traces_sample_rate=1.0,
)
```

### Health Checks
```python
@router.get("/health/email")
async def email_health_check():
    """Check if email service is working"""
    # Try sending test email
    # Return status
    pass
```

### Estimated Time
- 1-2 hours for monitoring setup
- 2-3 hours for error tracking
- 1 hour for health checks

---

## Implementation Priority

### Phase 1: Critical (Before Production)
1. ✅ **Email Service Integration** - Users need real emails
2. ✅ **Rate Limiting** - Prevent abuse and attacks
3. ✅ **Scheduled Jobs** - Clean up deleted accounts

**Estimated Total Time**: 8-12 hours

### Phase 2: Important (Soon After Launch)
4. **CAPTCHA** - Reduce bot signups
5. **Audit Logging** - Track security events
6. **Monitoring** - Know when things break

**Estimated Total Time**: 6-10 hours

### Phase 3: Nice to Have (Future)
7. **2FA** - Enhanced security for premium users
8. **HTML Email Templates** - Professional branding
9. **Advanced Analytics** - User behavior insights

**Estimated Total Time**: 12-16 hours

---

## Quick Start Guide

### When Ready to Implement

1. **Email Service** (Start Here)
   ```bash
   # Choose your provider and sign up
   # Add API key to .env
   # Modify email_service.py
   # Test with test accounts
   ```

2. **Rate Limiting**
   ```bash
   pip install slowapi
   # Add to main.py
   # Add decorators to endpoints
   # Test with curl/Postman
   ```

3. **Scheduled Jobs**
   ```bash
   pip install apscheduler
   # Create scheduled_jobs.py
   # Add to main.py startup
   # Test manual run first
   ```

---

## Testing Checklist

Before deploying to production:

- [ ] Email service sends to real addresses
- [ ] All email templates render correctly
- [ ] Rate limits block after threshold
- [ ] Rate limits reset after time period
- [ ] Scheduled job runs successfully
- [ ] Deleted accounts actually get removed
- [ ] No errors in logs
- [ ] Health checks pass
- [ ] Monitoring alerts work

---

## Cost Estimates (Monthly)

### Email Services
- **SendGrid**: $15-20/month (40K emails)
- **AWS SES**: $1-5/month (typical usage)
- **Mailgun**: $35/month (50K emails)

### Infrastructure
- **Redis** (for rate limiting): $10-30/month
- **Celery workers**: $10-50/month
- **Monitoring (Sentry)**: Free tier or $26/month

**Estimated Total**: $25-100/month depending on scale

---

## Documentation References

- [AUTH_ENDPOINTS_COMPLETE.md](AUTH_ENDPOINTS_COMPLETE.md) - Current implementation
- [AUTH_FEATURES_COMPLETE.md](AUTH_FEATURES_COMPLETE.md) - Service layer details
- [PHASE1_AUTHSERVICE_COMPLETE.md](PHASE1_AUTHSERVICE_COMPLETE.md) - Initial migration

---

## Status

📋 **Documented**: All production features identified and planned
⏳ **Pending**: Awaiting implementation when ready
🎯 **Priority**: Email service → Rate limiting → Scheduled jobs

**Last Updated**: 2025-11-06
