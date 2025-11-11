# Quick Start: Frontend Integration 🚀
**Get the Flask frontend talking to FastAPI backend in 10 minutes**

---

## Prerequisites

✅ FastAPI backend running on http://localhost:8000
✅ Flask frontend running on http://localhost:5000
✅ Database initialized

---

## Step 1: Replace API Module (2 minutes)

```bash
cd static/js/modules/core

# Backup original
copy api.js api.js.backup

# Use FastAPI version
copy ..\..\..\..\static\js\modules\core\api-fastapi.js api.js
```

**Or manually**: Replace the import in `main.js`:
```javascript
// Change this line:
import { api } from './modules/core/api.js';

// To this:
import { api } from './modules/core/api-fastapi.js';
```

---

## Step 2: Configure FastAPI Backend (1 minute)

Edit `static/js/fastapi-config.js`:

```javascript
export const FASTAPI_CONFIG = {
    USE_FASTAPI: true,  // ← Make sure this is true
    FASTAPI_BASE_URL: 'http://localhost:8000',
    FASTAPI_API_PREFIX: '/api/v1',
};
```

---

## Step 3: Test Basic Authentication (2 minutes)

### Option A: Quick Test (No HTML Changes)
Open browser console and run:

```javascript
// Import the API
import { api } from '/static/js/modules/core/api-fastapi.js';

// Test registration
const testUser = {
    username: 'test@example.com',
    password: 'testpassword123',
    first_name: 'Test',
    last_name: 'User',
    full_name: 'Test User',
    job_title: 'Developer',
    company_name: 'Test Co',
    country: 'USA',
    company_size: '1-10',
    terms_agreement: true,
    communications: false
};

const response = await api.register(testUser);
console.log('Registration response:', response);

// Check localStorage for JWT token
console.log('JWT Token:', localStorage.getItem('fastapi_access_token'));
```

### Option B: Update Login/Register Forms
See [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md) for complete form updates.

---

## Step 4: Verify It Works (5 minutes)

### 1. Check Configuration
Open http://localhost:5000 and check browser console:

You should see:
```
🔧 API Configuration: { backend: 'FastAPI', baseUrl: 'http://localhost:8000/api/v1' }
✅ API Module loaded: { backend: 'FastAPI', ... }
```

### 2. Test API Call
In browser console:
```javascript
// Test getting current user (requires auth)
import { api } from '/static/js/modules/core/api-fastapi.js';

try {
    const user = await api.getCurrentUser();
    console.log('Current user:', user);
} catch (error) {
    console.log('Expected - not logged in yet:', error.message);
}
```

### 3. Test Login Flow
1. Go to http://localhost:5000/login
2. Open browser console
3. Try to login (if you have an account)
4. Check Network tab for API calls to `http://localhost:8000/api/v1/auth/login`
5. Check localStorage for `fastapi_access_token`

---

## Troubleshooting

### Issue: "Failed to fetch" or Network Error

**Check**:
1. Is FastAPI running? Visit http://localhost:8000/docs
2. CORS enabled in FastAPI? Check `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: 404 on endpoints

**Check**:
1. `USE_FASTAPI = true` in fastapi-config.js
2. FastAPI is running on port 8000
3. Endpoint exists in FastAPI (check http://localhost:8000/docs)

### Issue: 401 Unauthorized

**Check**:
1. JWT token exists: `localStorage.getItem('fastapi_access_token')`
2. Token is valid (not expired)
3. Login endpoint returns `access_token` in response

### Issue: CORS error in console

**Solution**: Update FastAPI CORS settings to include your frontend URL

---

## What's Next?

Once basic testing works:

1. **Update Login/Register Forms**: Add JavaScript handlers (see guide)
2. **Test Chat**: Send messages and verify SSE streaming
3. **Test Admin Panel**: If you have admin access
4. **Production Deployment**: Update config for production URLs

---

## Commands Cheat Sheet

```bash
# Start FastAPI backend
docker-compose -f docker-compose.fastapi.yml up

# Start Flask frontend (if using Flask dev server)
python app.py

# Check FastAPI is running
curl http://localhost:8000/docs

# Check if backend is accessible
curl http://localhost:8000/api/v1/health/ping
```

---

## Browser Console Quick Tests

```javascript
// Import modules
import { FASTAPI_CONFIG } from '/static/js/fastapi-config.js';
import { fastapiAuth } from '/static/js/fastapi-auth.js';
import { api } from '/static/js/modules/core/api-fastapi.js';

// Check configuration
console.log('Config:', FASTAPI_CONFIG);
console.log('Using FastAPI:', FASTAPI_CONFIG.isUsingFastAPI);
console.log('Authenticated:', fastapiAuth.isAuthenticated());

// Check token
console.log('Token:', fastapiAuth.getToken());
console.log('User:', fastapiAuth.getUser());

// Test endpoint URL building
console.log('Login URL:', FASTAPI_CONFIG.getEndpointUrl('auth/login'));
console.log('Chat URL:', FASTAPI_CONFIG.getEndpointUrl('chat/send'));

// Test API call
const result = await api.get('health/ping');
console.log('Health check:', result);
```

---

## Success Indicators ✅

You'll know it's working when:

1. **Console shows FastAPI backend**:
   ```
   🔧 API Configuration: { backend: 'FastAPI', ... }
   ```

2. **Network tab shows calls to port 8000**:
   ```
   Request URL: http://localhost:8000/api/v1/auth/login
   ```

3. **JWT token in localStorage**:
   ```javascript
   localStorage.getItem('fastapi_access_token')
   // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

4. **Authorization header in requests**:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   ```

---

## Need Help?

- **Detailed Guide**: See [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md)
- **Backend Audit**: See [BACKEND_AUDIT_COMPLETE.md](./BACKEND_AUDIT_COMPLETE.md)
- **Check FastAPI Docs**: http://localhost:8000/docs
- **Check Logs**: `docker logs <fastapi_container_id>`

---

**Time to Complete**: ~10 minutes
**Difficulty**: Easy
**Status**: Ready to Go! 🚀
