# GDPR Features Testing Guide

## Prerequisites

1. **Ensure services are running:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

---

## Test 1: Right to Restriction of Processing

### Option A: Test via Frontend (Recommended)

1. **Login** to your account at http://localhost:3000

2. **Go to Profile** (click on your profile icon/settings)

3. **Request Restriction:**
   - Scroll to "Data & Privacy" section
   - Click **"Restrict Processing"** button
   - Enter reason: `"Testing data accuracy restriction"`
   - Select grounds: `accuracy`
   - Click OK

4. **Verify Restriction is Active:**
   - You should see a yellow warning banner:
     > ⚠️ Processing Restricted
     > Grounds: accuracy
   - The button should now say "Cancel Restriction"

5. **Test Enforcement (Chat Blocked):**
   - Go to Chat page
   - Try to send any message
   - **Expected Result:** Error message saying processing is restricted

6. **Cancel Restriction:**
   - Go back to Profile
   - Click **"Cancel Restriction"**
   - Confirm the action
   - Warning banner should disappear
   - Chat should work again

### Option B: Test via API

```bash
# Step 1: Login and get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' \
  | jq -r '.access_token'

# Save the token as TOKEN variable
TOKEN="paste_your_token_here"

# Step 2: Check current restriction status
curl -X GET "http://localhost:8000/api/v1/profile/restriction-status" \
  -H "Authorization: Bearer $TOKEN" | jq

# Step 3: Request restriction
curl -X POST "http://localhost:8000/api/v1/profile/request-restriction" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Testing restriction feature",
    "grounds": "accuracy"
  }' | jq

# Step 4: Try to send a chat message (should fail)
curl -X POST "http://localhost:8000/api/v1/chat/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test",
    "conversation_id": 1,
    "agent_type": "market"
  }' | jq

# Expected: 403 Forbidden with restriction message

# Step 5: Cancel restriction
curl -X POST "http://localhost:8000/api/v1/profile/cancel-restriction" \
  -H "Authorization: Bearer $TOKEN" | jq

# Step 6: Check status again (should be not restricted)
curl -X GET "http://localhost:8000/api/v1/profile/restriction-status" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Test 2: Data Breach Notification System

**⚠️ Admin Only - Requires admin account**

### Step 1: Create/Check Admin Account

If you don't have an admin account, create one manually:

```bash
# Option 1: Via database (if you have direct access)
docker-compose exec postgres psql -U postgres -d postgres -c \
  "UPDATE fastapi_users SET role='admin' WHERE username='YOUR_EMAIL';"

# Option 2: Via API registration then manual database update
# 1. Register a new account at http://localhost:3000/register
# 2. Run the database command above to make it admin
```

### Step 2: Login as Admin

```bash
# Get admin token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"ADMIN_EMAIL","password":"ADMIN_PASSWORD"}' \
  | jq -r '.access_token'

# Save as ADMIN_TOKEN
ADMIN_TOKEN="paste_admin_token_here"
```

### Step 3: Test Breach Creation

```bash
# Create a test breach (HIGH severity - requires all notifications)
curl -X POST "http://localhost:8000/api/v1/admin/breach/create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "breach_type": "unauthorized_access",
    "severity": "high",
    "description": "Test breach: Unauthorized access detected in user database. This is a test for GDPR compliance.",
    "risk_level": "high",
    "affected_data_categories": ["email", "profile", "conversations"],
    "estimated_affected_users": 10,
    "discovered_by": "Security Team",
    "discovery_method": "automated_monitoring"
  }' | jq

# Save the breach_id from response
BREACH_ID=1  # Replace with actual ID from response
```

**✅ What happens automatically:**
- Internal team gets email notification immediately
- Breach is logged with status "open"

### Step 4: Get Active Breaches

```bash
# List all active breaches
curl -X GET "http://localhost:8000/api/v1/admin/breach/active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Get breaches requiring DPA notification
curl -X GET "http://localhost:8000/api/v1/admin/breach/pending-dpa-notification" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

### Step 5: Notify DPA (within 72 hours)

```bash
# Send DPA notification
curl -X POST "http://localhost:8000/api/v1/admin/breach/notify-dpa" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "breach_id": 1,
    "likely_consequences": "Potential unauthorized access to user emails and profile information. Risk of identity theft or phishing attacks.",
    "technical_measures": "Encrypted database at rest, HTTPS for all connections, access logs enabled, rate limiting in place.",
    "organizational_measures": "Security team monitoring 24/7, incident response plan active, staff trained on data protection.",
    "remediation_steps": "1. Blocked unauthorized access immediately. 2. Reset affected user passwords. 3. Enhanced monitoring deployed. 4. Security audit scheduled."
  }' | jq
```

**✅ What happens:**
- DPA receives email notification
- `dpa_notified` flag set to true
- `dpa_notification_date` recorded

### Step 6: Notify Affected Users

```bash
# Send user notifications
curl -X POST "http://localhost:8000/api/v1/admin/breach/notify-users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "breach_id": 1,
    "user_actions": "1. Change your password immediately\n2. Enable two-factor authentication\n3. Review your account activity\n4. Be cautious of phishing emails\n5. Monitor your accounts for suspicious activity"
  }' | jq
```

**✅ What happens:**
- All active users receive email notification
- Response shows number of users notified
- `users_notified` flag set to true

### Step 7: Update Breach Status

```bash
# Update to "investigating"
curl -X PATCH "http://localhost:8000/api/v1/admin/breach/1/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "investigating",
    "notes": "Security team investigating the breach. Root cause analysis in progress."
  }' | jq

# Update to "contained"
curl -X PATCH "http://localhost:8000/api/v1/admin/breach/1/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "contained",
    "contained_at": "2025-11-20T17:00:00Z",
    "notes": "Breach contained. Unauthorized access blocked. Enhanced monitoring in place."
  }' | jq

# Update to "resolved"
curl -X PATCH "http://localhost:8000/api/v1/admin/breach/1/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "resolved_at": "2025-11-20T18:00:00Z",
    "notes": "All affected users notified. Security patches applied. No further action required."
  }' | jq

# Finally, close the breach
curl -X PATCH "http://localhost:8000/api/v1/admin/breach/1/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed",
    "notes": "Breach fully resolved. Post-incident report completed."
  }' | jq
```

### Step 8: Get Breach Details

```bash
# Get specific breach
curl -X GET "http://localhost:8000/api/v1/admin/breach/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

---

## Test 3: GDPR Data Export

### Test via Frontend

1. **Login** to your account
2. **Go to Profile**
3. **Click "Export My Data"** button
4. **Wait** for the download to start
5. **Open the JSON file** - you should see all your data including:
   - Profile information
   - GDPR consents
   - All conversations and messages
   - Survey responses
   - Hired agents
   - Contact requests
   - Last 100 data processing logs

### Test via API

```bash
# Export all data
curl -X GET "http://localhost:8000/api/v1/profile/export-data" \
  -H "Authorization: Bearer $TOKEN" \
  -o my_data_export.json

# View the exported data
cat my_data_export.json | jq
```

---

## Test 4: Data Processing Logs

```bash
# View your processing logs (transparency)
curl -X GET "http://localhost:8000/api/v1/profile/processing-logs?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Expected Results Summary

### Restriction of Processing:
- ✅ Users can request restriction with 4 different grounds
- ✅ Chat is blocked when restriction is active
- ✅ Users can view restriction status
- ✅ Users can cancel restriction anytime
- ✅ All actions are logged in GDPR logs

### Data Breach Notification:
- ✅ Admins can create breach logs
- ✅ Internal team notified automatically
- ✅ DPA notification within 72 hours
- ✅ User notification for high-risk breaches
- ✅ Complete breach lifecycle tracking
- ✅ All notifications logged with timestamps

### Data Export:
- ✅ Complete data export in JSON format
- ✅ Includes all personal data
- ✅ Machine-readable format
- ✅ Export action logged

### Processing Logs:
- ✅ Users can view their own logs
- ✅ Transparent tracking of all data access
- ✅ Pagination support

---

## Troubleshooting

### Issue: "No admin account"
**Solution:** Make your account admin:
```bash
docker-compose exec postgres psql -U postgres -d postgres -c \
  "UPDATE fastapi_users SET role='admin' WHERE username='YOUR_EMAIL';"
```

### Issue: "Restriction not enforcing"
**Solution:** Restart FastAPI container to reload models:
```bash
docker-compose restart fastapi-app
```

### Issue: "Email not sending"
**Solution:** Check email service configuration in `.env`:
```
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
SENDER_EMAIL=your-verified-ses-email
```

### Issue: "401 Unauthorized"
**Solution:** Get a fresh token - tokens may expire:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
```

---

## Quick Test Script

Save this as `test_gdpr.sh` and run it:

```bash
#!/bin/bash

# Configuration
EMAIL="your-email@example.com"
PASSWORD="your-password"
BASE_URL="http://localhost:8000/api/v1"

echo "🧪 Testing GDPR Features..."

# Login
echo "1. Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.access_token')

echo "✅ Token: ${TOKEN:0:20}..."

# Test restriction
echo "2. Requesting restriction..."
curl -s -X POST "$BASE_URL/profile/request-restriction" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Test","grounds":"accuracy"}' | jq

echo "3. Checking status..."
curl -s -X GET "$BASE_URL/profile/restriction-status" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "4. Canceling restriction..."
curl -s -X POST "$BASE_URL/profile/cancel-restriction" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "✅ GDPR restriction tests complete!"
```

Run with:
```bash
chmod +x test_gdpr.sh
./test_gdpr.sh
```
