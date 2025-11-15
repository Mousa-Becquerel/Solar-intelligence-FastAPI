# Alembic Database Migrations Guide

Complete guide for managing database schema changes with Alembic in the Solar Intelligence application.

## What is Alembic?

Alembic is a database migration tool for SQLAlchemy. It allows you to:
- Track schema changes over time
- Version control your database structure
- Apply changes incrementally
- Rollback changes if needed
- Deploy database updates safely

## Setup Status

✅ **Alembic is installed and configured**
- Package: `alembic==1.13.1`
- Configuration: `fastapi_app/alembic/`
- Async support: Enabled
- Initial migration: Created and stamped

## Directory Structure

```
fastapi_app/
├── alembic/                    # Alembic configuration
│   ├── versions/               # Migration files
│   │   └── aeff0cd58530_initial_migration_with_all_models.py
│   ├── env.py                  # Environment configuration (async)
│   ├── script.py.mako          # Template for new migrations
│   └── README                  # Alembic readme
├── alembic.ini                 # Alembic settings
└── db/
    ├── models.py               # SQLAlchemy models
    └── session.py              # Database session
```

## Common Commands

### 1. Check Current Migration Status

```bash
# In Docker
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic current"

# Expected output:
# aeff0cd58530 (head)
```

### 2. View Migration History

```bash
# In Docker
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic history"

# Shows all migrations and which one is current
```

### 3. Create a New Migration

**When you change your models**, create a migration:

```bash
# In Docker - Auto-generate migration from model changes
docker exec full_data_dh_bot-fastapi-app-1 bash -c \
  "cd /app/fastapi_app && alembic revision --autogenerate -m 'Add new column to user table'"

# Copy migration file back to local
docker cp full_data_dh_bot-fastapi-app-1:/app/fastapi_app/alembic/versions/ ./fastapi_app/alembic/
```

**Example**: Adding a new column to User model

```python
# In fastapi_app/db/models.py
class User(Base):
    __tablename__ = "fastapi_users"

    # ... existing columns ...

    # NEW COLUMN
    last_login = Column(DateTime, nullable=True)  # Add this
```

Then create migration:
```bash
docker exec full_data_dh_bot-fastapi-app-1 bash -c \
  "cd /app/fastapi_app && alembic revision --autogenerate -m 'Add last_login to user'"
```

### 4. Apply Migrations (Upgrade)

```bash
# Upgrade to latest version (head)
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic upgrade head"

# Upgrade by 1 version
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic upgrade +1"

# Upgrade to specific version
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic upgrade aeff0cd58530"
```

### 5. Rollback Migrations (Downgrade)

```bash
# Downgrade by 1 version
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic downgrade -1"

# Downgrade to specific version
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic downgrade aeff0cd58530"

# Downgrade all the way to empty database
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic downgrade base"
```

### 6. Mark Database as Current (Stamp)

**Use this when your database already has all tables** (like we did for the initial setup):

```bash
# Mark database as being at "head" without running migrations
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic stamp head"
```

## Workflow: Making Schema Changes

### Step-by-Step Process:

#### 1. **Modify Your SQLAlchemy Models**

Edit [fastapi_app/db/models.py](fastapi_app/db/models.py):

```python
class User(Base):
    # Add new column
    profile_image_url = Column(String(500), nullable=True)
```

#### 2. **Generate Migration**

```bash
# This compares models with current database and generates migration
docker exec full_data_dh_bot-fastapi-app-1 bash -c \
  "cd /app/fastapi_app && alembic revision --autogenerate -m 'Add profile image to user'"
```

#### 3. **Review Generated Migration**

```bash
# Copy migration to local to review
docker cp full_data_dh_bot-fastapi-app-1:/app/fastapi_app/alembic/versions/ ./fastapi_app/alembic/

# Open the newest file in fastapi_app/alembic/versions/
```

**Check the migration file**:
- `upgrade()` function - what happens when applying migration
- `downgrade()` function - what happens when rolling back

#### 4. **Test Migration Locally**

```bash
# Apply migration
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic upgrade head"

# Verify it worked
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic current"
```

#### 5. **Test Rollback**

```bash
# Rollback to test downgrade works
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic downgrade -1"

# Re-apply to go forward again
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic upgrade head"
```

#### 6. **Commit to Git**

```bash
git add fastapi_app/alembic/versions/*.py
git add fastapi_app/db/models.py
git commit -m "Add profile_image_url to User model"
```

#### 7. **Deploy to Production**

Migrations will run automatically via CI/CD or manually on the server.

## Production Deployment

### Option 1: Manual Deployment

```bash
# SSH into production server
ssh your-server

# Pull latest code
git pull origin main

# Run migrations
docker exec production-fastapi-app bash -c "cd /app/fastapi_app && alembic upgrade head"

# Restart service
docker-compose -f docker-compose.prod.yml restart fastapi-app
```

### Option 2: Automated CI/CD (Recommended)

Add to your deployment script or GitHub Actions:

```yaml
# In .github/workflows/ci-cd.yml (deploy step)
- name: Run database migrations
  run: |
    docker exec production-fastapi-app bash -c \
      "cd /app/fastapi_app && alembic upgrade head"
```

### Option 3: Startup Script

Add to [fastapi_app/main.py](fastapi_app/main.py):

```python
@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    # Run migrations automatically
    import subprocess
    try:
        subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd="/app/fastapi_app",
            check=True
        )
        logger.info("✅ Database migrations applied successfully")
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        # Decide: fail startup or continue?
```

## Best Practices

### ✅ DO:

1. **Always review auto-generated migrations** - Alembic isn't perfect
2. **Test migrations locally first** - Before deploying to production
3. **Test rollbacks** - Ensure downgrade() works correctly
4. **Commit migrations to git** - They're part of your codebase
5. **Backup database before major migrations** - Safety first
6. **Use meaningful migration messages** - "Add user profile fields" not "update models"
7. **One migration per logical change** - Easier to rollback

### ❌ DON'T:

1. **Don't edit applied migrations** - Create a new migration instead
2. **Don't skip migrations** - Apply them in order
3. **Don't manually alter database** - Use migrations for all schema changes
4. **Don't delete old migrations** - You might need to rollback
5. **Don't share migration files between branches** - Can cause conflicts

## Common Scenarios

### Scenario 1: Adding a Required (NOT NULL) Column

**Problem**: Can't add NOT NULL column to table with existing data

**Solution**: Two-step migration

```python
# Migration 1: Add column as nullable
def upgrade():
    op.add_column('fastapi_users', sa.Column('email', sa.String(120), nullable=True))

# Migration 2: Populate data, then make NOT NULL
def upgrade():
    # Update existing rows
    op.execute("UPDATE fastapi_users SET email = username || '@example.com' WHERE email IS NULL")
    # Make column NOT NULL
    op.alter_column('fastapi_users', 'email', nullable=False)
```

### Scenario 2: Renaming a Column

```python
def upgrade():
    op.alter_column('fastapi_users', 'full_name', new_column_name='display_name')

def downgrade():
    op.alter_column('fastapi_users', 'display_name', new_column_name='full_name')
```

### Scenario 3: Adding an Index

```python
def upgrade():
    op.create_index('idx_user_email', 'fastapi_users', ['email'])

def downgrade():
    op.drop_index('idx_user_email')
```

### Scenario 4: Data Migration

```python
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

def upgrade():
    # Create temporary table representation
    users_table = table('fastapi_users',
        column('id', sa.Integer),
        column('old_status', sa.String),
        column('new_status', sa.String)
    )

    # Update data
    op.execute(
        users_table.update()
        .where(users_table.c.old_status == 'active')
        .values(new_status='ACTIVE')
    )
```

## Troubleshooting

### Issue: "Target database is not up to date"

```bash
# Check current version
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic current"

# Apply pending migrations
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic upgrade head"
```

### Issue: "Can't locate revision identified by 'xyz'"

The migration file is missing or wasn't committed to git.

```bash
# Check what migrations exist
ls fastapi_app/alembic/versions/

# Pull latest from git
git pull origin main
```

### Issue: Migration conflicts after merging branches

```bash
# Check for multiple head revisions
docker exec full_data_dh_bot-fastapi-app-1 bash -c "cd /app/fastapi_app && alembic heads"

# Merge heads if needed
docker exec full_data_dh_bot-fastapi-app-1 bash -c \
  "cd /app/fastapi_app && alembic merge -m 'Merge migration heads' head_1 head_2"
```

### Issue: Need to rollback in production

```bash
# 1. Backup database first!
docker exec production-postgres pg_dump -U fastapi_user fastapi_db > backup.sql

# 2. Rollback migration
docker exec production-fastapi-app bash -c "cd /app/fastapi_app && alembic downgrade -1"

# 3. Restart application
docker-compose -f docker-compose.prod.yml restart fastapi-app
```

## Integration with Docker

### Update Dockerfile to Include Alembic

Your `fastapi_app/Dockerfile.prod` already includes Alembic via `poetry.lock`.

### Run Migrations on Container Start

Add to `docker-compose.prod.yml`:

```yaml
services:
  fastapi-app:
    # ... existing config ...
    command: >
      bash -c "
        cd /app/fastapi_app &&
        alembic upgrade head &&
        uvicorn fastapi_app.main:app --host 0.0.0.0 --port 8000 --workers 2
      "
```

## Summary

✅ **Alembic is now set up** for your Solar Intelligence application!

**Key Files**:
- Configuration: `fastapi_app/alembic.ini`
- Environment: `fastapi_app/alembic/env.py`
- Migrations: `fastapi_app/alembic/versions/*.py`
- Models: `fastapi_app/db/models.py`

**Next Steps**:
1. Make a model change
2. Create a migration
3. Test it locally
4. Commit to git
5. Deploy via CI/CD

**Remember**: Always review auto-generated migrations and test rollbacks!

---

For more information: https://alembic.sqlalchemy.org/en/latest/
