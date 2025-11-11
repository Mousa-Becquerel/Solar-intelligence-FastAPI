# AWS Database Setup for Solar Intelligence Platform

## Overview
Comprehensive guide for setting up and configuring the database for AWS deployment of the Solar Intelligence platform.

## Current Database Analysis

### Database Models
- **User**: Authentication and user management
- **Conversation**: Chat conversation tracking
- **Message**: Individual chat messages with plot data

### Current Features
- ✅ SQLite (development) / PostgreSQL (production) support
- ✅ Database migration system
- ✅ Predefined user creation
- ✅ Health check endpoints
- ✅ Plot data storage in messages
- ✅ User registration system

## AWS Database Options

### Option 1: Amazon RDS PostgreSQL (Recommended)
**Pros:**
- Fully managed service
- Automated backups
- High availability options
- Security groups integration
- Easy scaling

**Cons:**
- Higher cost than self-managed
- Limited customization

### Option 2: Amazon RDS Aurora PostgreSQL
**Pros:**
- Better performance
- Global database capabilities
- Serverless options

**Cons:**
- Higher cost
- May be overkill for current needs

### Option 3: EC2 with PostgreSQL
**Pros:**
- Full control
- Lower cost

**Cons:**
- Manual management
- No automated backups
- Security responsibility

## Recommended Setup: RDS PostgreSQL

### 1. RDS Instance Configuration
```
Engine: PostgreSQL 15.x
Instance Class: db.t3.micro (free tier) or db.t3.small
Storage: 20 GB GP2 (expandable)
Multi-AZ: No (for cost optimization, Yes for production HA)
Backup: 7 days retention
Maintenance Window: Off-peak hours
```

### 2. Security Groups
```
Inbound Rules:
- Type: PostgreSQL
- Protocol: TCP
- Port: 5432
- Source: Security Group of EC2/ECS instances
```

### 3. Database Parameters
```
Database Name: solar_intelligence_prod
Master Username: solar_admin
Master Password: [Strong generated password]
```

## Environment Variables for AWS

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://solar_admin:password@rds-endpoint:5432/solar_intelligence_prod

# Security
FLASK_SECRET_KEY=[Strong random key - 64 characters]

# AI Services
OPENAI_API_KEY=[Your OpenAI API key]
WEAVIATE_URL=[Your Weaviate instance URL]
WEAVIATE_API_KEY=[Your Weaviate API key]

# Deployment
PORT=80
FLASK_ENV=production
```

## Pre-Deployment Checklist

### 1. Security Improvements
- [ ] Change all predefined user passwords
- [ ] Generate strong FLASK_SECRET_KEY
- [ ] Remove debug information from production
- [ ] Secure database credentials

### 2. Database Preparation
- [ ] Create RDS instance
- [ ] Configure security groups
- [ ] Test connectivity
- [ ] Run database initialization

### 3. Application Updates
- [ ] Update requirements.txt for PostgreSQL
- [ ] Add database backup scripts
- [ ] Configure logging for production
- [ ] Test migration scripts

## Critical Security Issues to Address

### 1. Hardcoded Credentials in Code
**CRITICAL:** There are hardcoded passwords in the application:

```python
# Lines 381-447 in app.py - MUST BE CHANGED!
PREDEFINED_USERS = [
    {
        'username': 'admin',
        'password': 'BecqSight2024!',  # ⚠️ CHANGE THIS!
        'full_name': 'Administrator',
        'role': 'admin'
    },
    # ... more users with hardcoded passwords
]
```

**Action Required:**
1. Change all passwords immediately
2. Use environment variables for admin credentials
3. Force password change on first login

### 2. API Keys in Test Files
**WARNING:** API keys are hardcoded in test files:
- `scripts/tests/test_custom_agents_logfire.py`
- `scripts/tests/test_standard_agent.py`

**Action Required:**
1. Remove or revoke exposed API keys
2. Use environment variables in tests
3. Add .env files to .gitignore

## Database Migration Strategy

### 1. Development to Production
```sql
-- Export current data (if any)
pg_dump development_db > backup.sql

-- Import to production
psql -h rds-endpoint -U solar_admin -d solar_intelligence_prod < backup.sql
```

### 2. Zero-Downtime Migration
1. Set up RDS instance
2. Run database initialization
3. Create predefined users with new passwords
4. Update application environment variables
5. Deploy application
6. Verify functionality

## Monitoring and Maintenance

### 1. Database Health Monitoring
- Use existing `/health` and `/database-health` endpoints
- Set up CloudWatch alarms
- Monitor storage usage

### 2. Backup Strategy
- RDS automated backups (7 days)
- Manual snapshots before major updates
- Test restore procedures

### 3. Performance Monitoring
- Track query performance
- Monitor connection pools
- Set up alerts for slow queries

## Cost Optimization

### 1. RDS Optimization
- Use appropriate instance size
- Enable storage autoscaling
- Schedule automated backups during off-peak
- Consider Reserved Instances for production

### 2. Connection Pooling
Current configuration includes:
```python
# Enhanced PostgreSQL configuration for Render
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_recycle': 120,
    'pool_pre_ping': True,
    'max_overflow': 20
}
```

## Deployment Timeline

### Phase 1: Setup (Day 1)
1. Create RDS instance
2. Configure security groups
3. Update application secrets

### Phase 2: Migration (Day 2)
1. Test database connectivity
2. Run initialization scripts
3. Update predefined users

### Phase 3: Deployment (Day 3)
1. Deploy application to AWS
2. Verify all functionality
3. Monitor performance

### Phase 4: Optimization (Ongoing)
1. Monitor performance
2. Optimize queries if needed
3. Implement backup verification

## Emergency Procedures

### 1. Database Connection Issues
- Check security groups
- Verify credentials
- Check RDS instance status

### 2. Performance Issues
- Monitor CloudWatch metrics
- Check connection pool usage
- Review slow query logs

### 3. Data Recovery
- Use RDS snapshots
- Point-in-time recovery if needed
- Test restoration procedures

## Next Steps

1. **Immediate**: Change all hardcoded passwords
2. **Before deployment**: Create RDS instance and test connectivity
3. **During deployment**: Monitor all health endpoints
4. **After deployment**: Set up monitoring and backup verification