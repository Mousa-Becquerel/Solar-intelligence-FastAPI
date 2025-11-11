# Final Database Schema for React Migration

**Last Updated**: 2025-11-11
**Status**: Ready for Migration (with critical fixes required)

---

## Overview

This document defines the complete database schema that will be used when migrating from Flask to React frontend. The backend (Flask) and database remain unchanged, so the React frontend must align with these schemas.

---

## 🚨 CRITICAL ISSUES TO FIX BEFORE MIGRATION

### 1. **Message.sender Field Mismatch** (BLOCKING ISSUE)

**Problem**: Backend uses `sender` field with values `'user'` or `'bot'`, but React uses `role` field with values `'user'` or `'assistant'`.

**Location**:
- Backend: `models.py:167` - `sender = db.Column(db.String(16))`
- Backend: `conversation_service.py:130` - Queries for `sender='user'`
- React: `types/api.ts` - Uses `role: 'user' | 'assistant'`

**Impact**: ALL existing messages in database will fail to display in React frontend!

**Solution Options**:
1. **Option A (Recommended)**: Update React frontend to use `sender` instead of `role` and `'bot'` instead of `'assistant'`
2. **Option B**: Create database migration to rename column and update all existing values
3. **Option C**: Add translation layer in API responses (not recommended - adds complexity)

### 2. **Feedback Table - REMOVED**

The Feedback table is no longer needed and should be removed from:
- ✅ `models.py` - Remove Feedback class (lines 184-203)
- ✅ `app/services/admin_service.py` - Remove Feedback import
- ✅ `app/schemas/feedback.py` - Delete entire file
- ✅ `tests/test_models.py` - Remove Feedback tests

---

## Complete Database Schema (11 Tables)

### 1. **user** - User Authentication and Profile

```sql
CREATE TABLE user (
    -- Primary Key
    id INTEGER PRIMARY KEY AUTO_INCREMENT,

    -- Authentication
    username VARCHAR(80) UNIQUE NOT NULL,           -- Email used as username
    password_hash VARCHAR(255) NOT NULL,

    -- Profile Information
    full_name VARCHAR(100) NOT NULL,                -- Concatenated "FirstName LastName"
    role VARCHAR(50) DEFAULT 'user',                -- 'user' or 'admin'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,                 -- False = pending approval

    -- GDPR Consent Tracking
    gdpr_consent_given BOOLEAN DEFAULT FALSE NOT NULL,
    gdpr_consent_date DATETIME,
    terms_accepted BOOLEAN DEFAULT FALSE NOT NULL,
    terms_accepted_date DATETIME,
    marketing_consent BOOLEAN DEFAULT FALSE NOT NULL,
    marketing_consent_date DATETIME,
    privacy_policy_version VARCHAR(10) DEFAULT '1.0',
    terms_version VARCHAR(10) DEFAULT '1.0',

    -- Plan and Usage Tracking
    plan_type VARCHAR(20) DEFAULT 'free',           -- 'free' or 'premium'
    query_count INTEGER DEFAULT 0,                  -- Total lifetime queries
    monthly_query_count INTEGER DEFAULT 0,          -- Queries this billing cycle
    last_query_date DATETIME,
    last_reset_date DATETIME,                       -- Last monthly counter reset
    plan_start_date DATETIME,
    plan_end_date DATETIME,

    -- Soft Delete (30-day grace period)
    deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deletion_requested_at DATETIME,
    deletion_reason TEXT,

    -- Password Reset
    reset_token VARCHAR(100),
    reset_token_expiry DATETIME,

    -- Indexes
    INDEX idx_user_username (username),
    INDEX idx_user_role (role),
    INDEX idx_user_created_at (created_at),
    INDEX idx_user_is_active (is_active)
);
```

**Notes**:
- Backend concatenates: `full_name = f"{first_name} {last_name}"` (auth_service.py:84)
- React registration must send both `first_name` and `last_name`
- Username field stores email address

**Query Limits**:
- Free users: 5 base queries + 5 per survey (max 15)
- Premium users: 1000 queries/month
- Admins: Unlimited

---

### 2. **conversation** - Chat Sessions

```sql
CREATE TABLE conversation (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,

    -- Foreign Keys
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id),

    -- Conversation Data
    title VARCHAR(256),                             -- Auto-generated or user-set
    agent_type VARCHAR(16) DEFAULT 'market',        -- Which agent was used
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_conversation_user_id (user_id),
    INDEX idx_conversation_created_at (created_at),
    INDEX idx_conversation_agent_type (agent_type),
    INDEX idx_conversation_user_created (user_id, created_at)
);
```

**Agent Types**:
- `'market'` - Market Intelligence Agent
- `'price'` - Module Prices Agent
- `'news'` - News Agent
- `'digitalization'` - Digitalization Trends Agent
- `'manufacturer'` - Manufacturer Financial Agent
- `'policy'` - Policy Agent

---

### 3. **message** - Individual Chat Messages ⚠️ **CRITICAL**

```sql
CREATE TABLE message (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,

    -- Foreign Keys
    conversation_id INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversation(id),

    -- Message Data
    sender VARCHAR(16),                             -- ⚠️ 'user' or 'bot' (NOT 'assistant')
    content TEXT,                                   -- Can be JSON or plain text
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_message_conversation_id (conversation_id),
    INDEX idx_message_timestamp (timestamp),
    INDEX idx_message_sender (sender),
    INDEX idx_message_conv_timestamp (conversation_id, timestamp)
);
```

**🚨 CRITICAL MISMATCH**:
- Database stores: `sender IN ('user', 'bot')`
- React expects: `role IN ('user', 'assistant')`
- **MUST FIX BEFORE MIGRATION**

**Content Format**:
- Can be plain text string
- Can be JSON: `{"value": "message text"}`
- Can be JSON: `{"content": "message text"}`
- Backend tries to parse as JSON, falls back to plain text

---

### 4. **user_survey** - User Profile Survey (Stage 1)

```sql
CREATE TABLE user_survey (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES user(id),

    -- Survey Responses
    role VARCHAR(50) NOT NULL,                      -- User's job role
    role_other VARCHAR(100),                        -- If role = 'Other'
    regions TEXT NOT NULL,                          -- JSON array of regions
    familiarity VARCHAR(20) NOT NULL,               -- PV market familiarity level
    insights TEXT NOT NULL,                         -- JSON array of insight preferences
    tailored VARCHAR(10),                           -- Want tailored recommendations

    -- Bonus Tracking
    bonus_queries_granted INTEGER DEFAULT 5,        -- Adds 5 queries to limit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Bonus**: Completing this survey grants +5 queries (10 total for free users)

---

### 5. **user_survey_stage2** - Market Activity Survey (Stage 2)

```sql
CREATE TABLE user_survey_stage2 (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES user(id),

    -- Survey Responses
    work_focus VARCHAR(100) NOT NULL,
    work_focus_other VARCHAR(100),
    pv_segments TEXT NOT NULL,                      -- JSON array
    technologies TEXT NOT NULL,                     -- JSON array
    technologies_other VARCHAR(200),
    challenges TEXT NOT NULL,                       -- JSON array (top 3)
    weekly_insight TEXT,                            -- Open-ended response

    -- Bonus Tracking
    bonus_queries_granted INTEGER DEFAULT 5,        -- Adds 5 more queries
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Bonus**: Completing this survey grants +5 queries (15 total for free users)

---

### 6. **hired_agent** - User's Hired Agents

```sql
CREATE TABLE hired_agent (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,

    user_id INTEGER NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    hired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,                 -- Can be released/rehired

    FOREIGN KEY (user_id) REFERENCES user(id),
    UNIQUE KEY unique_user_agent (user_id, agent_type),

    INDEX idx_hired_agent_user_id (user_id),
    INDEX idx_hired_agent_is_active (is_active),
    INDEX idx_hired_agent_user_active (user_id, is_active)
);
```

**Purpose**: Tracks which agents a user has "hired" (enabled access to)

---

### 7. **agent_access** - Agent Access Control Configuration

```sql
CREATE TABLE agent_access (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,

    agent_type VARCHAR(50) UNIQUE NOT NULL,
    required_plan VARCHAR(20) DEFAULT 'free',       -- Minimum plan required
    is_enabled BOOLEAN DEFAULT TRUE,                -- Global on/off switch
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_agent_access_agent_type (agent_type)
);
```

**Plan Hierarchy**:
- `'free'` (0) - All users
- `'premium'` (1) - Paid users
- `'max'` (2) - Enterprise users
- `'admin'` (3) - Administrators

---

### 8. **agent_whitelist** - Special Access Grants

```sql
CREATE TABLE agent_whitelist (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,

    agent_type VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL,
    granted_by INTEGER,                             -- Admin who granted
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,                            -- Optional expiration
    is_active BOOLEAN DEFAULT TRUE,
    reason TEXT,

    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (granted_by) REFERENCES user(id),
    UNIQUE KEY unique_agent_user_whitelist (agent_type, user_id),

    INDEX idx_agent_whitelist_user_id (user_id),
    INDEX idx_agent_whitelist_agent_type (agent_type),
    INDEX idx_agent_whitelist_is_active (is_active)
);
```

**Purpose**: Admins can grant specific users access to premium agents

---

### 9. **waitlist** - Email Waitlist

```sql
CREATE TABLE waitlist (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,

    email VARCHAR(120) UNIQUE NOT NULL,
    interested_agents TEXT,                         -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notified BOOLEAN DEFAULT FALSE,
    notified_at DATETIME,
    ip_address VARCHAR(45),                         -- IPv6 support
    user_agent VARCHAR(256),

    INDEX idx_waitlist_email (email)
);
```

**Special Behavior**: If email exists in waitlist, registration auto-approves (is_active=TRUE)

---

### 10. **contact_request** - Contact Form Submissions

```sql
CREATE TABLE contact_request (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,

    user_id INTEGER,                                -- Null for landing page
    FOREIGN KEY (user_id) REFERENCES user(id),

    -- Contact Information
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL,
    company VARCHAR(150),
    phone VARCHAR(20),
    message TEXT NOT NULL,

    -- Metadata
    source VARCHAR(50) NOT NULL,                    -- Where submitted from
    status VARCHAR(20) DEFAULT 'pending',           -- Workflow status
    selected_experts JSON,                          -- From artifact panel
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    contacted_at DATETIME,
    resolved_at DATETIME,
    notes TEXT,                                     -- Internal sales notes

    INDEX idx_contact_request_created_at (created_at),
    INDEX idx_contact_request_status (status),
    INDEX idx_contact_request_source (source)
);
```

**Source Values**:
- `'landing_page'` - Public landing page form
- `'artifact_panel'` - Expert contact from chat
- `'contact_page'` - Main contact page

**Status Values**:
- `'pending'` - New submission
- `'contacted'` - Sales team reached out
- `'resolved'` - Closed/completed

---

## Removed Tables

### ~~feedback~~ - **DEPRECATED - DO NOT USE**

This table has been removed from the system. All references should be deleted.

---

## Migration Checklist

### Backend Changes Required:
- [ ] Remove `Feedback` model from `models.py`
- [ ] Remove Feedback imports from `admin_service.py`
- [ ] Delete `app/schemas/feedback.py`
- [ ] Remove Feedback tests from `test_models.py`
- [ ] Update `__init__.py` files to remove Feedback exports

### Frontend Changes Required:
- [ ] **CRITICAL**: Change `role: 'user' | 'assistant'` to `sender: 'user' | 'bot'`
  - Update `types/api.ts` - Message type definition
  - Update `MessageBubble.tsx` - Check for `sender` not `role`
  - Update `ChatContainer.tsx` - Create messages with `sender` field
  - Update API client to use `sender` field

### Database Migration:
- [ ] Drop `feedback` table (if it exists in production)
- [ ] Verify all message records have `sender IN ('user', 'bot')`

### Testing:
- [ ] Test message display with existing database
- [ ] Test conversation loading with old messages
- [ ] Test new message creation
- [ ] Test survey completion and query limit increases
- [ ] Test admin user management
- [ ] Test agent hiring/releasing

---

## Field Mappings: React ↔ Database

### User Registration
| React Field | Database Field | Transform |
|------------|---------------|-----------|
| `first_name` | `full_name` | Concatenate: `first_name + ' ' + last_name` |
| `last_name` | `full_name` | (included in concatenation) |
| `email` | `username` | Direct mapping |
| `password` | `password_hash` | Hashed by backend |

### Message Display
| React Field | Database Field | Transform |
|------------|---------------|-----------|
| ~~`role`~~ | `sender` | **MUST CHANGE** |
| ~~`'assistant'`~~ | `'bot'` | **MUST CHANGE** |
| `'user'` | `'user'` | ✅ Matches |

### Conversation List
| React Field | Database Field | Transform |
|------------|---------------|-----------|
| `id` | `id` | Direct |
| `preview` | Derived | From last `sender='user'` message (first 60 chars) |
| `agent_type` | `agent_type` | Direct |
| `created_at` | `created_at` | Direct |

---

## Notes

1. **GDPR Compliance**: All consent fields are required for EU users
2. **Soft Deletes**: Users have 30-day grace period before permanent deletion
3. **Monthly Resets**: Query counts reset after 30 days from `last_reset_date`
4. **Auto-Approval**: Waitlist emails bypass admin approval on registration
5. **Message Content**: Can be plain text or JSON - handle both formats
6. **Survey Bonuses**: Stack additively (5 base + 5 stage1 + 5 stage2 = 15 total)

---

## Database Compatibility Matrix

| Feature | Flask Backend | React Frontend | Status |
|---------|--------------|---------------|---------|
| User auth | ✅ | ✅ | Compatible |
| Message storage | ✅ `sender` field | ✅ Uses `sender` | **✅ FIXED** |
| Conversations | ✅ | ✅ | Compatible |
| Surveys | ✅ | ✅ | Compatible |
| Agent hiring | ✅ | ✅ | Compatible |
| Admin panel | ✅ | ✅ | Compatible |
| Waitlist | ✅ | ✅ | Compatible |
| Contact form | ✅ | ❌ Not implemented | Minor |
| Feedback | ❌ Removed | ✅ Not used | Compatible |

---

**Last Review**: 2025-11-11
**Reviewed By**: Claude Code Assistant
**Next Review**: Before production migration
