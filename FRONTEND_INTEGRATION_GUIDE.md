# Frontend Integration Guide
**FastAPI Backend Integration**

## Overview

This guide explains how to integrate the existing Flask frontend with the new FastAPI backend for testing purposes.

---

## Files Created

### 1. **fastapi-config.js** - Backend Configuration
Location: `static/js/fastapi-config.js`

**Purpose**: Toggle between Flask and FastAPI backends

```javascript
export const FASTAPI_CONFIG = {
    USE_FASTAPI: true,  // Set to false to use Flask
    FASTAPI_BASE_URL: 'http://localhost:8000',
    FASTAPI_API_PREFIX: '/api/v1',
    // ...
};
```

**Usage**:
- Toggle `USE_FASTAPI` to switch between backends
- Automatically handles URL construction
- No other code changes needed

---

### 2. **fastapi-auth.js** - JWT Authentication
Location: `static/js/fastapi-auth.js`

**Purpose**: Handle JWT token-based authentication

**Features**:
- Store/retrieve JWT access tokens in localStorage
- Add Authorization header to requests
- Handle login/logout
- Parse JWT tokens (client-side only)
- Auto-redirect on 401 Unauthorized

**Key Methods**:
```javascript
fastapiAuth.setToken(token)          // Store JWT token
fastapiAuth.getToken()                // Get JWT token
fastapiAuth.isAuthenticated()         // Check if logged in
fastapiAuth.clearAuth()               // Logout
fastapiAuth.getAuthHeader()           // Get Authorization header
fastapiAuth.handleLoginResponse(resp) // Process login response
```

---

### 3. **api-fastapi.js** - Updated API Module
Location: `static/js/modules/core/api-fastapi.js`

**Purpose**: API client that works with both Flask and FastAPI

**Changes from Original**:
1. Imports FASTAPI_CONFIG and fastapiAuth
2. Automatically adds JWT token to requests
3. Maps endpoints to FastAPI routes
4. Handles FastAPI error format (`detail` field)
5. Auto-handles 401 Unauthorized

**Endpoint Mapping**:
| Flask | FastAPI |
|-------|---------|
| `/login` | `/api/v1/auth/login` |
| `/register` | `/api/v1/auth/register` |
| `/conversations` | `/api/v1/conversations/` |
| `/chat` | `/api/v1/chat/send` |
| `/auth/current-user` | `/api/v1/auth/me` |

---

## Integration Steps

### Step 1: Replace API Module (REQUIRED)

**Option A: Backup and Replace**
```bash
# Backup original
mv static/js/modules/core/api.js static/js/modules/core/api.js.backup

# Use FastAPI version
cp static/js/modules/core/api-fastapi.js static/js/modules/core/api.js
```

**Option B: Update import in main.js**
```javascript
// Change this:
import { api } from './modules/core/api.js';

// To this:
import { api } from './modules/core/api-fastapi.js';
```

---

### Step 2: Update Login Page

The login page needs JavaScript to handle FastAPI authentication.

**Add to `templates/login.html` (before closing `</body>`)**:

```html
<script type="module">
    import { api } from '/static/js/modules/core/api-fastapi.js';

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('error-message');

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
        errorDiv.style.display = 'none';

        try {
            const formData = {
                username: document.getElementById('email').value,
                password: document.getElementById('password').value
            };

            const response = await api.login(formData.username, formData.password);

            // Success! Redirect to dashboard
            window.location.href = '/';

        } catch (error) {
            errorDiv.textContent = error.message || 'Login failed. Please try again.';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Sign In';
        }
    });
</script>
```

---

### Step 3: Update Register Page

Similar changes for registration.

**Add to `templates/register.html` (before closing `</body>`)**:

```html
<script type="module">
    import { api } from '/static/js/modules/core/api-fastapi.js';

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('error-message');

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating Account...';
        errorDiv.style.display = 'none';

        try {
            const formData = {
                username: document.getElementById('email').value,
                password: document.getElementById('password').value,
                first_name: document.getElementById('first_name').value,
                last_name: document.getElementById('last_name').value,
                full_name: `${document.getElementById('first_name').value} ${document.getElementById('last_name').value}`,
                job_title: document.getElementById('job_title').value,
                company_name: document.getElementById('company_name').value,
                country: document.getElementById('country').value,
                company_size: document.getElementById('company_size').value,
                terms_agreement: document.getElementById('terms_agreement').checked,
                communications: document.getElementById('communications').checked
            };

            const response = await api.register(formData);

            // Success! Redirect to dashboard (auto-logged in)
            window.location.href = '/';

        } catch (error) {
            errorDiv.textContent = error.message || 'Registration failed. Please try again.';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Account';
        }
    });
</script>
```

---

### Step 4: Update Main App (if needed)

The main.js should work without changes if you replaced the API module. However, if you're using imports, make sure to import from the correct path.

---

## Testing Checklist

### Prerequisites
1. ✅ FastAPI backend running on http://localhost:8000
2. ✅ Flask frontend running on http://localhost:5000 (or serve static files)
3. ✅ Database initialized

### Test Authentication
- [ ] Register new user
  - Open http://localhost:5000/register
  - Fill form and submit
  - Check browser console for JWT token
  - Should redirect to dashboard

- [ ] Login existing user
  - Open http://localhost:5000/login
  - Enter credentials
  - Check localStorage for `fastapi_access_token`
  - Should redirect to dashboard

- [ ] Logout
  - Click logout button
  - localStorage should be cleared
  - Should redirect to login

### Test Chat Functionality
- [ ] Create conversation
  - Should call `/api/v1/conversations/fresh`
  - Conversation should appear in sidebar

- [ ] Send message
  - Type message and send
  - Should call `/api/v1/chat/send`
  - Response should stream back

- [ ] Load conversation history
  - Refresh page
  - Conversations should load from FastAPI
  - Messages should display

### Test Error Handling
- [ ] Test without auth
  - Clear localStorage
  - Try to access dashboard
  - Should redirect to login

- [ ] Test expired token
  - Set old token in localStorage
  - Try to make API call
  - Should handle 401 and redirect

- [ ] Test network errors
  - Stop FastAPI backend
  - Try to make API call
  - Should show error message

---

## Troubleshooting

### Issue: CORS Errors
**Symptom**: `Access-Control-Allow-Origin` error in console

**Solution**: Update FastAPI CORS settings in `fastapi_app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: 401 Unauthorized
**Symptom**: All requests return 401

**Solution**: Check JWT token:
```javascript
// In browser console
console.log(localStorage.getItem('fastapi_access_token'));

// Test token decode
import { fastapiAuth } from '/static/js/fastapi-auth.js';
console.log(fastapiAuth.parseToken());
```

### Issue: Endpoints Not Found (404)
**Symptom**: API calls return 404

**Solution**: Check endpoint mapping:
- Flask: `/conversations`
- FastAPI: `/api/v1/conversations/`

Make sure `FASTAPI_CONFIG.USE_FASTAPI = true`

### Issue: Token Not Saved
**Symptom**: Login succeeds but token not stored

**Solution**: Check login response format:
```javascript
// FastAPI should return:
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { ... }
}
```

---

## Configuration Options

### Switch to Flask Backend
```javascript
// In fastapi-config.js
USE_FASTAPI: false  // Use Flask
```

### Change FastAPI URL
```javascript
// In fastapi-config.js
FASTAPI_BASE_URL: 'https://api.yourdomain.com'
```

### Disable Auto-Redirect on 401
```javascript
// In fastapi-auth.js
handle401() {
    console.warn('🔒 Unauthorized');
    this.clearAuth();
    // Don't redirect - just clear auth
}
```

---

## Next Steps

After successful integration testing:

1. **Update All Forms** - Add JavaScript handlers for:
   - Password reset
   - Profile updates
   - Admin forms

2. **Add Error Boundaries** - Wrap UI in error handlers

3. **Add Loading States** - Show spinners during API calls

4. **Update SSE Streaming** - Ensure EventSource works with FastAPI

5. **Production Deployment**:
   - Update FASTAPI_BASE_URL to production URL
   - Enable HTTPS
   - Add rate limiting
   - Monitor logs

---

## API Endpoint Reference

### Authentication
| Method | Flask | FastAPI | Purpose |
|--------|-------|---------|---------|
| POST | `/login` | `/api/v1/auth/login` | Login user |
| POST | `/register` | `/api/v1/auth/register` | Register user |
| GET | `/auth/current-user` | `/api/v1/auth/me` | Get current user |
| POST | `/auth/logout` | (local only) | Logout user |

### Conversations
| Method | Flask | FastAPI | Purpose |
|--------|-------|---------|---------|
| GET | `/conversations` | `/api/v1/conversations/` | List conversations |
| GET | `/conversations/{id}` | `/api/v1/conversations/{id}` | Get conversation |
| POST | `/conversations/fresh` | `/api/v1/conversations/fresh` | Create conversation |
| DELETE | `/conversations/{id}` | `/api/v1/conversations/{id}` | Delete conversation |

### Chat
| Method | Flask | FastAPI | Purpose |
|--------|-------|---------|---------|
| POST | `/chat` | `/api/v1/chat/send` | Send message |
| GET | - | `/api/v1/chat/agents` | List agents |

### Admin (Future)
| Method | Flask | FastAPI | Purpose |
|--------|-------|---------|---------|
| GET | `/admin/users` | `/api/v1/admin/users` | List users |
| POST | `/admin/users/{id}/approve` | `/api/v1/admin/users/{id}/approve` | Approve user |

---

## Support

For issues or questions:
1. Check browser console for errors
2. Check FastAPI logs: `docker logs <container>`
3. Verify JWT token in localStorage
4. Test endpoints with curl/Postman first

---

**Status**: Ready for Testing
**Last Updated**: 2025-01-06
