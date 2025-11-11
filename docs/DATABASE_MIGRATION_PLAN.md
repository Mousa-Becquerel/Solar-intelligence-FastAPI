# Database Migration Plan - SAFE APPROACH

## ⚠️ IMPORTANT: Production Safety

**DO NOT run migrations during business hours or when the production app is actively being used.**

This document provides a safe, step-by-step plan for adding database indexes to your production database.

---

## Current Situation

- ✅ Code changes completed and tested locally
- ✅ Migration script created and ready
- ⏳ Production database migration pending
- ⏳ AWS deployment using same database

---

## Why Wait Until Evening?

**Good reasons to wait:**
1. ✅ Lower user traffic = lower risk
2. ✅ More time to monitor and rollback if needed
3. ✅ Won't affect users during peak hours
4. ✅ Can test thoroughly without pressure

---

## Pre-Migration Checklist

### 1. Before Starting (Do These First)

- [ ] **Backup the production database** (CRITICAL!)
  ```bash
  # For PostgreSQL
  pg_dump -h your-db-host -U your-user -d your-database > backup_$(date +%Y%m%d_%H%M%S).sql

  # For MySQL
  mysqldump -h your-db-host -u your-user -p your-database > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Verify backup integrity**
  ```bash
  # Check file size (should be substantial)
  ls -lh backup_*.sql

  # Check first few lines
  head -20 backup_*.sql
  ```

- [ ] **Take AWS RDS snapshot** (if using AWS RDS)
  - Go to AWS Console → RDS → Databases
  - Select your database
  - Actions → Take snapshot
  - Name it: `pre-index-migration-YYYYMMDD`

- [ ] **Test migration script locally first**
  ```bash
  # Use a local test database
  python scripts/add_database_indexes.py
  ```

- [ ] **Verify no active deployments in progress**

- [ ] **Notify team** (if applicable) that maintenance is happening

---

## Migration Steps (Evening Execution)

### Step 1: Prepare (15 minutes before)

1. **Stop accepting new user registrations** (optional, extra safe)
   - Temporarily disable registration endpoint
   - Or put app in "maintenance mode"

2. **Check current database connections**
   ```sql
   -- PostgreSQL
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_database';

   -- MySQL
   SHOW PROCESSLIST;
   ```

3. **Set environment variables for production database**
   ```bash
   export DATABASE_URL=your_production_database_url
   ```

---

### Step 2: Run Migration (5-10 minutes)

1. **Connect to production server** (or wherever app.py runs)
   ```bash
   ssh your-production-server
   cd /path/to/Full_data_DH_bot
   ```

2. **Activate virtual environment**
   ```bash
   source venv/bin/activate  # or your env activation command
   ```

3. **Run migration script**
   ```bash
   python scripts/add_database_indexes.py
   ```

4. **Monitor output carefully**
   - ✅ Look for "Created index" messages
   - ✅ Watch for "already exists" (means safe to re-run)
   - ❌ Look for any error messages

**Expected Output:**
```
🔧 Starting database index migration...
============================================================
✅ Created index idx_user_username on user(username)
✅ Created index idx_user_role on user(role)
...
============================================================

📊 Migration Summary:
   ✅ Indexes created: 20
   ✓  Already existed: 0
   ⚠️  Errors: 0

✨ Total indexes in place: 20/20

🎉 Database index migration completed successfully!
```

---

### Step 3: Verify (5 minutes)

1. **Check indexes were created**
   ```sql
   -- PostgreSQL
   SELECT tablename, indexname
   FROM pg_indexes
   WHERE schemaname = 'public'
   AND indexname LIKE 'idx_%'
   ORDER BY tablename, indexname;

   -- MySQL
   SHOW INDEX FROM user;
   SHOW INDEX FROM conversation;
   SHOW INDEX FROM message;
   ```

2. **Test a few queries**
   ```sql
   -- Should be fast now
   SELECT * FROM conversation WHERE user_id = 1 ORDER BY created_at DESC LIMIT 10;
   SELECT * FROM message WHERE conversation_id = 1 ORDER BY timestamp ASC;
   ```

3. **Check query execution plans** (verify indexes are being used)
   ```sql
   -- PostgreSQL
   EXPLAIN ANALYZE SELECT * FROM conversation WHERE user_id = 1;

   -- MySQL
   EXPLAIN SELECT * FROM conversation WHERE user_id = 1;
   ```

   Look for "Index Scan" or "Using index" in output.

---

### Step 4: Monitor (30 minutes after)

1. **Test the application**
   - Login
   - Create a conversation
   - Send a query
   - Check conversation history
   - Verify plots generate

2. **Monitor error logs**
   ```bash
   tail -f /var/log/your-app/error.log
   ```

3. **Monitor database performance**
   - Check query times
   - Check connection count
   - Watch for any errors

4. **Monitor AWS CloudWatch** (if using AWS)
   - CPU usage should be similar or lower
   - Query latency should decrease

---

## Rollback Plan (If Something Goes Wrong)

### Option 1: Drop the Indexes (Fast, Low Risk)

If indexes cause issues, you can drop them without affecting data:

```sql
-- PostgreSQL
DROP INDEX IF EXISTS idx_user_username;
DROP INDEX IF EXISTS idx_user_role;
-- ... drop all 20 indexes

-- MySQL
DROP INDEX idx_user_username ON user;
DROP INDEX idx_user_role ON user;
-- ... drop all 20 indexes
```

**Note**: Dropping indexes does NOT delete any data. It just removes the performance optimization.

### Option 2: Restore from Backup (If Needed)

If something went seriously wrong:

```bash
# PostgreSQL
psql -h your-db-host -U your-user -d your-database < backup_YYYYMMDD_HHMMSS.sql

# MySQL
mysql -h your-db-host -u your-user -p your-database < backup_YYYYMMDD_HHMMSS.sql
```

### Option 3: Restore from AWS RDS Snapshot

1. Go to AWS Console → RDS → Snapshots
2. Select your pre-migration snapshot
3. Actions → Restore snapshot
4. Update app DATABASE_URL to point to restored instance

---

## Expected Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Backup | 5-15 min | Depends on database size |
| Preparation | 5 min | Environment setup |
| Migration | 5-10 min | Creating indexes |
| Verification | 5 min | Testing queries |
| Monitoring | 30 min | Watch for issues |
| **Total** | **50-65 min** | Plan for 1-2 hours to be safe |

---

## Risk Assessment

### Low Risk ✅

- **Creating indexes** is a **NON-DESTRUCTIVE** operation
- Does NOT modify existing data
- Does NOT delete anything
- Does NOT change table structure
- Can be rolled back easily by dropping indexes

### Potential Issues & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Index creation takes long | Low | Users wait | Do during low-traffic hours |
| Temporary table lock | Low | Brief query delay | < 1 second per index |
| Disk space increase | Very Low | ~5-10% more storage | Monitor disk usage |
| Application error | Very Low | App crash | Test locally first, have backup |

---

## What Won't Be Affected

- ✅ Existing data (100% safe)
- ✅ User accounts
- ✅ Conversations
- ✅ Messages
- ✅ Application functionality
- ✅ API endpoints
- ✅ Authentication

## What Will Improve

- ✅ Query speed (10-100x faster)
- ✅ Database CPU usage (lower)
- ✅ Response times
- ✅ Scalability

---

## Post-Migration Checklist

After migration completes successfully:

- [ ] Indexes created: 20/20
- [ ] Application works normally
- [ ] No errors in logs
- [ ] Query performance improved
- [ ] Users can login and query
- [ ] Database backup kept safe for 7 days
- [ ] Document completion time and any issues
- [ ] Update team that migration is complete

---

## Communication Template

### Before Migration
```
📢 Scheduled Maintenance Notice

We will be performing database optimization tonight at [TIME].

Expected duration: 1 hour
Expected impact: None (non-destructive changes)
Service availability: Fully available

What we're doing: Adding database indexes for faster queries
```

### After Migration
```
✅ Maintenance Complete

Database optimization completed successfully at [TIME].

Changes: 20 performance indexes added
Impact: Queries now 10-100x faster
Issues: None

Thank you for your patience!
```

---

## Emergency Contacts

**If something goes wrong:**

1. **Don't panic** - indexes are non-destructive
2. **Check error logs** - identify the issue
3. **Drop problematic index** if identified
4. **Restore from backup** if needed (last resort)

---

## Additional Safety Measures (Optional)

### 1. Create indexes one at a time

Instead of running the full script, create indexes individually:

```python
# Modified script to create one index at a time with pauses
import time

for table, index, columns in indexes:
    create_index_if_not_exists(engine, table, index, columns)
    time.sleep(5)  # 5 second pause between indexes
    print("Continuing...")
```

### 2. Test on staging database first

If you have a staging database with similar data size:

```bash
export DATABASE_URL=your_staging_database_url
python scripts/add_database_indexes.py
# Test thoroughly before production
```

### 3. Monitor database metrics before/after

Take screenshots of:
- Query response times
- CPU usage
- Connection count
- Disk I/O

Compare before and after migration.

---

## FAQ

### Q: Will the app go down during migration?
**A:** No, the app stays up. Indexes are created in the background.

### Q: Will users experience any issues?
**A:** Minimal. There might be brief micro-delays (< 1 second) when each index is created.

### Q: Can I run this during business hours?
**A:** Technically yes, but evening is safer for peace of mind.

### Q: What if the script fails halfway?
**A:** It's idempotent - just run it again. It will skip already-created indexes.

### Q: Will this increase my database costs?
**A:** Negligibly. Indexes add ~5-10% storage, but dramatically reduce compute costs.

### Q: Can I undo this?
**A:** Yes, easily. Just drop the indexes. No data loss.

### Q: Do I need to restart the app?
**A:** No, indexes are used automatically by the database.

---

## Summary

**Safe approach:**
1. ⏰ Wait until evening (low traffic)
2. 💾 Backup database first (CRITICAL)
3. ✅ Test locally
4. 🚀 Run migration
5. 👀 Monitor for 30 minutes
6. 📝 Document results

**This is a LOW-RISK operation** that will significantly improve performance. The key is:
- Good backup
- Off-peak timing
- Monitoring after

You're making the right call to wait until evening!

---

**Good luck with the migration! 🚀**

*If you have any questions or issues during migration, refer to the rollback plan above.*
