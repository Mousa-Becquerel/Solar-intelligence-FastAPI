# Email Automation Guide - AWS SES Integration

Complete implementation guide for automated email verification and password reset using AWS SES.

## ✅ What's Been Implemented

### 1. Email Service with AWS SES
**File**: `fastapi_app/services/email_service.py`

**Features**:
- ✅ AWS SES integration with boto3
- ✅ Fallback to logging mode if AWS not configured (for development)
- ✅ Beautiful HTML email templates
- ✅ Plain text fallback for all emails
- ✅ Comprehensive error handling

**Email Types**:
1. **Verification Email** - Sent on registration
2. **Password Reset Email** - Sent when user requests password reset
3. **Welcome Email** - Sent after successful verification
4. **Password Changed Notification** - Sent after password is reset

### 2. HTML Email Templates
All templates are professionally designed with:
- Responsive design
- Solar Intelligence branding
- Clear call-to-action buttons
- Security notices
- Expiry warnings
- Support links

## 🚀 Next Steps - Implementation Checklist

### Step 1: Update Configuration

**File**: `fastapi_app/core/config.py`

Add these settings:

```python
class Settings(BaseSettings):
    # ... existing settings ...

    # AWS Configuration
    AWS_REGION: str = "us-east-1"  # Your AWS region
    AWS_ACCESS_KEY_ID: str = ""  # From AWS IAM
    AWS_SECRET_ACCESS_KEY: str = ""  # From AWS IAM

    # AWS SES Email Configuration
    SES_SENDER_EMAIL: str = "noreply@yourdomain.com"  # Must be verified in SES
    SES_SENDER_NAME: str = "Solar Intelligence"
    SUPPORT_EMAIL: str = "support@yourdomain.com"

    # URLs (used in email links)
    FRONTEND_URL: str = "http://localhost"  # Change to https://yourdomain.com in production
```

### Step 2: Update Registration Endpoint

**File**: `fastapi_app/api/v1/endpoints/auth.py`

```python
import secrets
from datetime import datetime, timedelta
from fastapi_app.services.email_service import email_service

@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user - sends verification email
    User CANNOT login until email is verified
    """
    # Validate terms agreement
    if not user_data.terms_agreement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must agree to the terms of service and privacy policy"
        )

    # Check if user exists
    result = await db.execute(
        select(User).where(User.username == user_data.email)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )

    # Generate verification token
    verification_token = secrets.token_urlsafe(32)
    token_expiry = datetime.utcnow() + timedelta(hours=24)

    # Create new user (NOT ACTIVE until email verified)
    consent_timestamp = datetime.utcnow()
    new_user = User(
        username=user_data.email,
        full_name=f"{user_data.first_name} {user_data.last_name}",
        role='user',
        is_active=False,  # ← User CANNOT login yet

        # Email Verification
        email_verified=False,
        verification_token=verification_token,
        verification_token_expiry=token_expiry,

        # GDPR Consent Tracking
        gdpr_consent_given=True,
        gdpr_consent_date=consent_timestamp,
        terms_accepted=user_data.terms_agreement,
        terms_accepted_date=consent_timestamp,
        marketing_consent=user_data.communications,
        marketing_consent_date=consent_timestamp if user_data.communications else None,

        # Plan defaults
        plan_type='free',
        query_count=0,
        monthly_query_count=0,
    )

    # Hash password
    new_user.set_password(user_data.password)

    # Save to database
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Send verification email (async)
    success, error = await email_service.send_verification_email(
        email=user_data.email,
        token=verification_token,
        full_name=new_user.full_name
    )

    if not success:
        logger.error(f"Failed to send verification email to {user_data.email}: {error}")
        # Don't fail registration if email fails - user can request resend

    return {
        "message": "Account created! Please check your email to verify your account before logging in."
    }
```

### Step 3: Add Email Verification Endpoint

**File**: `fastapi_app/api/v1/endpoints/auth.py`

```python
@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify email address using token from email
    Activates user account after successful verification
    """
    # Find user with this token
    result = await db.execute(
        select(User).where(User.verification_token == token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    # Check token not expired
    if user.verification_token_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new one."
        )

    # Activate user
    user.email_verified = True
    user.is_active = True  # ← User can now login!
    user.verification_token = None  # Clear token (can only be used once)
    user.verification_token_expiry = None

    await db.commit()

    # Send welcome email (optional)
    await email_service.send_welcome_email(
        email=user.username,
        full_name=user.full_name
    )

    return {"message": "Email verified successfully! You can now login."}


@router.post("/resend-verification", response_model=MessageResponse)
@limiter.limit("3/hour")  # Prevent spam
async def resend_verification_email(
    request: Request,
    email: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Resend verification email if original expired or was lost
    """
    result = await db.execute(
        select(User).where(User.username == email)
    )
    user = result.scalar_one_or_none()

    # Always return success (don't reveal if email exists - security)
    if not user:
        return {"message": "If the email exists and is unverified, a new verification link has been sent"}

    # Only send if not already verified
    if user.email_verified:
        return {"message": "This email is already verified. You can login."}

    # Generate new token
    verification_token = secrets.token_urlsafe(32)
    token_expiry = datetime.utcnow() + timedelta(hours=24)

    user.verification_token = verification_token
    user.verification_token_expiry = token_expiry

    await db.commit()

    # Send email
    await email_service.send_verification_email(
        email=user.username,
        token=verification_token,
        full_name=user.full_name
    )

    return {"message": "If the email exists and is unverified, a new verification link has been sent"}
```

### Step 4: Add Password Reset Endpoints

**File**: `fastapi_app/api/v1/endpoints/auth.py`

```python
@router.post("/request-password-reset", response_model=MessageResponse)
@limiter.limit("3/hour")  # Prevent spam
async def request_password_reset(
    request: Request,
    email: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Request password reset - sends email with reset link
    Always returns success (don't reveal if email exists - security)
    """
    result = await db.execute(
        select(User).where(User.username == email)
    )
    user = result.scalar_one_or_none()

    # Always return success (don't reveal if email exists)
    if not user:
        return {"message": "If the email exists, a password reset link has been sent"}

    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    token_expiry = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry

    user.reset_token = reset_token
    user.reset_token_expiry = token_expiry

    await db.commit()

    # Send reset email
    await email_service.send_password_reset_email(
        email=user.username,
        token=reset_token,
        full_name=user.full_name
    )

    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    token: str,
    new_password: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset password using token from email
    Token can only be used once
    """
    # Validate password strength
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    # Find user with this reset token
    result = await db.execute(
        select(User).where(User.reset_token == token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Check token not expired
    if user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one."
        )

    # Update password
    user.set_password(new_password)
    user.reset_token = None  # Clear token (can only be used once)
    user.reset_token_expiry = None

    await db.commit()

    # Send confirmation email
    await email_service.send_password_changed_notification(
        email=user.username,
        full_name=user.full_name
    )

    return {"message": "Password updated successfully! You can now login with your new password."}
```

### Step 5: Update Login to Check Email Verification

**File**: `fastapi_app/api/v1/endpoints/auth.py`

```python
@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(get_db)
):
    """
    Login endpoint - returns JWT token
    ONLY allows login if email is verified
    """
    # Authenticate user
    user, error = await AuthService.authenticate_user(
        db=db,
        username=form_data.username,
        password=form_data.password
    )

    if error or not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error or "Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. Check your inbox for the verification link."
        )

    # Create access token
    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
```

## 🔧 AWS SES Setup

### Step 1: Verify Your Email Domain

1. **Go to AWS Console** → **Amazon SES**
2. **Verify a Domain**:
   - Enter your domain (e.g., `solarintelligence.com`)
   - Copy the DNS records provided
   - Add them to your domain's DNS settings
   - Wait for verification (can take up to 72 hours)

3. **Or Verify Individual Email**:
   - In SES, click "Verify a New Email Address"
   - Enter `noreply@yourdomain.com`
   - Check your inbox and click verification link

### Step 2: Move Out of SES Sandbox

By default, SES is in "sandbox mode" (can only send to verified emails).

**To send to any email**:
1. Go to AWS SES → Account Dashboard
2. Click "Request production access"
3. Fill out the form:
   - Use case: "Transactional emails (account verification, password reset)"
   - Estimated volume: 1000 emails/month
   - Bounce rate: < 5%
4. Wait for approval (usually 24-48 hours)

### Step 3: Create IAM User for SES

1. **Go to IAM** → Users → Create user
2. **Username**: `ses-smtp-user`
3. **Permissions**: Attach policy `AmazonSESFullAccess`
4. **Create access key**:
   - Use case: "Application running outside AWS"
   - Copy Access Key ID and Secret Access Key
5. **Add to environment variables**:
   ```bash
   AWS_ACCESS_KEY_ID=your_access_key_id
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   AWS_REGION=us-east-1
   SES_SENDER_EMAIL=noreply@yourdomain.com
   ```

### Step 4: Test Email Sending

```python
# Test in Python console or create a test endpoint
from fastapi_app.services.email_service import email_service
import asyncio

async def test_email():
    success, error = await email_service.send_verification_email(
        email="your_email@gmail.com",
        token="test_token_123",
        full_name="Test User"
    )
    print(f"Success: {success}, Error: {error}")

asyncio.run(test_email())
```

## 📧 Email Flow Diagrams

### Registration Flow:
```
User fills form → Submit
    ↓
Backend creates account (is_active=FALSE)
    ↓
Generate verification token (24h expiry)
    ↓
Send email via AWS SES
    ↓
User clicks link in email
    ↓
Backend verifies token
    ↓
Set is_active=TRUE, email_verified=TRUE
    ↓
Send welcome email
    ↓
User can now login
```

### Password Reset Flow:
```
User clicks "Forgot Password"
    ↓
Enter email → Submit
    ↓
Backend generates reset token (1h expiry)
    ↓
Send reset email via AWS SES
    ↓
User clicks link in email
    ↓
Enter new password → Submit
    ↓
Backend validates token
    ↓
Update password, clear token
    ↓
Send confirmation email
    ↓
User can login with new password
```

## 🎨 Frontend Integration (React)

### 1. Email Verification Page

**File**: `react-frontend/src/pages/VerifyEmailPage.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await api.post('/api/v1/auth/verify-email', null, {
        params: { token }
      });
      setStatus('success');
      setMessage(response.data.message);

      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Verification failed');
    }
  };

  return (
    <div className="verify-email-page">
      {status === 'loading' && <p>Verifying your email...</p>}
      {status === 'success' && (
        <div className="success">
          <h2>✅ Email Verified!</h2>
          <p>{message}</p>
          <p>Redirecting to login...</p>
        </div>
      )}
      {status === 'error' && (
        <div className="error">
          <h2>❌ Verification Failed</h2>
          <p>{message}</p>
          <button onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      )}
    </div>
  );
}
```

### 2. Password Reset Request Page

```typescript
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/api/v1/auth/request-password-reset', null, {
        params: { email }
      });
      setSubmitted(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="success">
        <h2>📧 Check Your Email</h2>
        <p>If an account exists with {email}, you'll receive a password reset link shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Reset Password</h2>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
    </form>
  );
}
```

### 3. Password Reset Completion Page

```typescript
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      alert('Invalid reset link');
      return;
    }

    setStatus('loading');

    try {
      await api.post('/api/v1/auth/reset-password', null, {
        params: { token, new_password: password }
      });
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      setStatus('error');
      alert(error.response?.data?.detail || 'Reset failed');
    }
  };

  if (status === 'success') {
    return (
      <div className="success">
        <h2>✅ Password Reset Successfully!</h2>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create New Password</h2>
      <input
        type="password"
        placeholder="New Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        minLength={8}
        required
      />
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
}
```

## 🔒 Security Best Practices

1. **Token Security**:
   - Tokens are 32 bytes URL-safe (very hard to guess)
   - Tokens expire (24h for verification, 1h for password reset)
   - Tokens are single-use (cleared after use)
   - Tokens are hashed in database (optional enhancement)

2. **Email Security**:
   - Don't reveal if email exists (always return success)
   - Rate limit all email-sending endpoints
   - Log all password reset attempts

3. **Password Security**:
   - Minimum 8 characters
   - Hashed with bcrypt
   - Notify user on password change

## 💰 Cost Estimation

**AWS SES Pricing**:
- First 62,000 emails/month: **FREE** (if sent from EC2)
- After that: $0.10 per 1,000 emails

**For 10,000 users/month**:
- Registration emails: 10,000
- Password resets: ~500 (5% of users)
- Welcome emails: 10,000
- **Total**: ~20,500 emails
- **Cost**: **$0** (within free tier)

Even at 100,000 users/month: **~$5/month**

## 📊 Monitoring

### CloudWatch Metrics to Track:
- Email send success rate
- Email bounce rate
- Email complaint rate
- Token expiry rate
- Password reset frequency

### SES Dashboard:
- Monitor bounce rate (keep < 5%)
- Monitor complaint rate (keep < 0.1%)
- Track daily sending quota

## 🐛 Troubleshooting

### Email not sending:
1. Check SES is out of sandbox mode
2. Check sender email is verified
3. Check AWS credentials are correct
4. Check CloudWatch logs for errors

### Email goes to spam:
1. Set up SPF record for your domain
2. Set up DKIM signing in SES
3. Set up DMARC policy
4. Warm up your sending reputation gradually

### Token expired errors:
- User took too long - provide "resend" option
- Check server time is synchronized

## ✅ Final Checklist

- [ ] AWS SES configured and out of sandbox
- [ ] Domain/email verified in SES
- [ ] IAM user created with SES permissions
- [ ] Environment variables added
- [ ] Registration endpoint updated
- [ ] Email verification endpoint added
- [ ] Password reset endpoints added
- [ ] Login endpoint checks email verification
- [ ] Frontend pages created
- [ ] Routes added to React Router
- [ ] Tested end-to-end flow
- [ ] SPF/DKIM/DMARC configured
- [ ] Monitoring set up

---

**Status**: Ready for implementation!

Follow the steps above in order, and you'll have a complete automated email verification and password reset system.
