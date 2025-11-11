# Agent Access Configuration Fix

## Problem Summary

The 403 Forbidden error when chatting with Finn (manufacturer_financial) agent was caused by incorrect agent access configuration in the database. The backend's `AgentAccess` table did not match the frontend agent metadata.

### Root Cause

- **Frontend** ([react-frontend/src/constants/agentMetadata.ts](react-frontend/src/constants/agentMetadata.ts)): Only Nina (`nzia_market_impact`) is marked as premium
- **Backend Database**: The `AgentAccess` table was either missing or had incorrect `required_plan` values
- **Result**: Finn agent was incorrectly treated as premium, causing 403 errors for free-tier users

## Solution

### Correct Agent Access Configuration

According to frontend metadata, here's the correct configuration:

| Agent Type | Agent Name | Required Plan | Notes |
|------------|------------|---------------|-------|
| `market` | Market Intelligence | `free` | ✅ Default agent |
| `price` | Price Analysis | `free` | ✅ Free access |
| `news` | News | `free` | ✅ Free access |
| `digitalization` | Digital Trends | `free` | ✅ Free access |
| `nzia_policy` | NZIA Policy | `free` | ✅ Free access |
| `manufacturer_financial` | **Finn** | `free` | ✅ **FREE** (was incorrectly premium) |
| `leo_om` | O&M | `free` | ✅ Free access |
| `nzia_market_impact` | **Nina** | `premium` | 💎 ONLY premium agent |
| `weaviate` | Database Query | `premium` | 💎 Premium only |

## Implementation

### For Current Development (FastAPI Isolated DB)

Run the Python seed script in the FastAPI container:

```bash
# Option 1: Run in Docker container
docker exec full_data_dh_bot-fastapi-app-1 python -m fastapi_app.db.seed_agents

# Option 2: Run locally (if FastAPI env is set up)
cd fastapi_app
python -m db.seed_agents
```

**File**: [fastapi_app/db/seed_agents.py](fastapi_app/db/seed_agents.py)

### For AWS Production Database

When migrating to AWS, run the SQL script directly on the PostgreSQL database:

```bash
# Connect to AWS RDS PostgreSQL
psql -h your-aws-rds-endpoint.amazonaws.com -U your_username -d your_database

# Run the SQL script
\i scripts/seed_agent_access_aws.sql
```

**File**: [scripts/seed_agent_access_aws.sql](scripts/seed_agent_access_aws.sql)

## Database Schema Compatibility

### Current State (Development)

- **Flask**: Uses tables `user`, `hired_agent`, `agent_access`, `agent_whitelist`
- **FastAPI**: Uses tables `fastapi_users`, `fastapi_hired_agent`, `fastapi_agent_access`, `fastapi_agent_whitelist`

### Future State (AWS Production)

⚠️ **IMPORTANT**: When migrating FastAPI to AWS, it must use the **SAME** tables as Flask:

```python
# fastapi_app/db/models.py - MUST BE CHANGED FOR AWS

class User(Base):
    __tablename__ = "user"  # NOT "fastapi_users"

class HiredAgent(Base):
    __tablename__ = "hired_agent"  # NOT "fastapi_hired_agent"

class AgentAccess(Base):
    __tablename__ = "agent_access"  # NOT "fastapi_agent_access"

class AgentWhitelist(Base):
    __tablename__ = "agent_whitelist"  # NOT "fastapi_agent_whitelist"
```

## Verification

After running the seed script, verify the configuration:

### SQL Verification

```sql
-- Check all agent configurations
SELECT
    agent_type,
    required_plan,
    is_enabled,
    CASE
        WHEN required_plan = 'premium' THEN '💎 PREMIUM'
        ELSE '🆓 FREE'
    END as access_level
FROM agent_access
ORDER BY required_plan DESC, agent_type;
```

### Expected Output

```
agent_type              | required_plan | is_enabled | access_level
------------------------+---------------+------------+--------------
nzia_market_impact      | premium       | t          | 💎 PREMIUM
weaviate                | premium       | t          | 💎 PREMIUM
digitalization          | free          | t          | 🆓 FREE
leo_om                  | free          | t          | 🆓 FREE
manufacturer_financial  | free          | t          | 🆓 FREE  ← Finn is FREE
market                  | free          | t          | 🆓 FREE
news                    | free          | t          | 🆓 FREE
nzia_policy             | free          | t          | 🆓 FREE
price                   | free          | t          | 🆓 FREE
```

### Python Verification

The seed script includes automatic verification:

```python
python -m fastapi_app.db.seed_agents
```

Look for these lines in the output:
```
✅ VERIFIED: manufacturer_financial (Finn) is FREE (correct)
✅ VERIFIED: nzia_market_impact (Nina) is PREMIUM (correct)
```

## Testing

After fixing the database:

1. **Login as a free-tier user**
2. **Hire Finn agent** (manufacturer_financial)
3. **Start a conversation** with Finn
4. **Send a message** - should get a response, not 403 error
5. **Try Nina agent** (nzia_market_impact) - should still get 403 if user is free-tier

## Files Modified

### Created Files
- [fastapi_app/db/seed_agents.py](fastapi_app/db/seed_agents.py) - Python seed script for dev
- [scripts/seed_agent_access_aws.sql](scripts/seed_agent_access_aws.sql) - SQL script for AWS
- [AGENT_ACCESS_FIX.md](AGENT_ACCESS_FIX.md) - This documentation

### Backend Files Analyzed
- [fastapi_app/services/agent_access_service.py](fastapi_app/services/agent_access_service.py#L28-L128) - Agent access control logic
- [fastapi_app/api/v1/endpoints/chat.py](fastapi_app/api/v1/endpoints/chat.py#L102-L109) - Chat endpoint access check
- [fastapi_app/db/models.py](fastapi_app/db/models.py#L145-L169) - AgentAccess model

### Frontend Files (No Changes Needed)
- [react-frontend/src/constants/agentMetadata.ts](react-frontend/src/constants/agentMetadata.ts) - Agent metadata (source of truth)
- [react-frontend/src/services/agentService.ts](react-frontend/src/services/agentService.ts) - Agent hiring API

## Migration Checklist for AWS

When migrating FastAPI to use the AWS production database:

- [ ] Update FastAPI models to use **same table names** as Flask
- [ ] Run `scripts/seed_agent_access_aws.sql` on AWS RDS
- [ ] Verify agent access with SQL query
- [ ] Test all agents with free-tier user
- [ ] Test premium agents with premium user
- [ ] Ensure both Flask and FastAPI work with same database

## References

- **Agent Access Service**: [fastapi_app/services/agent_access_service.py:28-128](fastapi_app/services/agent_access_service.py#L28-L128)
- **Chat Endpoint Access Check**: [fastapi_app/api/v1/endpoints/chat.py:102-109](fastapi_app/api/v1/endpoints/chat.py#L102-L109)
- **Frontend Agent Metadata**: [react-frontend/src/constants/agentMetadata.ts:72-80](react-frontend/src/constants/agentMetadata.ts#L72-L80) (Nina/premium), [react-frontend/src/constants/agentMetadata.ts:99-107](react-frontend/src/constants/agentMetadata.ts#L99-L107) (Finn/free)
