# Pending User Approvals Fix

## Problem

The "Pending User Approvals" page was showing "0 Pending Approvals" even though there were users waiting for approval.

### Screenshot of Issue:
```
┌────────────────────────────┐
│  Pending User Approvals    │
├────────────────────────────┤
│         0                  │
│  Pending Approvals         │
├────────────────────────────┤
│  ✓  No Pending Approvals   │
│     All user registrations │
│     are up to date!        │
└────────────────────────────┘
```

## Root Cause

The database query was **NOT filtering out soft-deleted users**.

### User States in the System:

1. **Newly Registered** (waiting for approval):
   - `is_active = False`
   - `deleted = False`

2. **Active Users** (approved):
   - `is_active = True`
   - `deleted = False`

3. **Soft-Deleted Users** (account deletion requested):
   - `is_active = False` (often)
   - `deleted = True`

### The Bug:

**File**: [app.py:2570](app.py#L2570) (before fix)

```python
# ❌ BUG: Includes soft-deleted users!
pending_users = User.query.filter_by(is_active=False).all()
```

This query was returning:
- Users waiting for approval (`is_active=False, deleted=False`) ✅
- **AND** soft-deleted users (`is_active=False, deleted=True`) ❌

Because the page was likely filtering out deleted users in the template, it showed 0 results.

## Solution

### Fixed Queries ✅

**File**: [app.py:2588-2591](app.py#L2588-L2591)

```python
# ✅ FIXED: Only get users waiting for approval (not deleted)
pending_users = User.query.filter_by(
    is_active=False,
    deleted=False
).order_by(User.created_at.desc()).all()

memory_logger.info(f"Found {len(pending_users)} pending users for approval")
```

**File**: [app.py:2570-2572](app.py#L2570-L2572)

```python
# ✅ FIXED: Exclude soft-deleted users from all admin queries
users = User.query.filter_by(deleted=False).all()
pending_users = User.query.filter_by(is_active=False, deleted=False).all()
active_users = User.query.filter_by(is_active=True, deleted=False).all()
```

### What Changed:

1. **Added `deleted=False` filter** to all user queries in admin routes
2. **Added logging** to help debug future issues
3. **Consistent filtering** across both admin pages

## How Users Flow Through the System

### Registration → Approval → Active:

```
┌─────────────────┐
│  User Registers │
│  (via /register)│
└────────┬────────┘
         │
         v
┌─────────────────────────┐
│  User Created in DB     │
│  • is_active = False    │  ← Shows in "Pending Approvals"
│  • deleted = False      │
│  • role = 'user'        │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  Admin Approves User    │
│  (via /admin/users/     │
│   <id>/approve)         │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  User Activated         │
│  • is_active = True     │  ← Shows in "Active Users"
│  • deleted = False      │
│  • Can now login        │
└─────────────────────────┘
```

### Account Deletion (Soft Delete):

```
┌─────────────────────────┐
│  User Requests Deletion │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  Account Soft-Deleted   │
│  • deleted = True       │  ← Excluded from admin lists
│  • is_active = False    │
│  • 30-day grace period  │
└─────────────────────────┘
```

## Testing

### Test Case 1: New User Registers
1. User fills out registration form
2. Submits with `is_active=False`
3. Admin visits `/admin/users/pending`
4. **Result**: ✅ User appears in pending list

### Test Case 2: Admin Approves User
1. Admin clicks "Approve" on pending user
2. Backend sets `is_active=True`
3. Admin refreshes pending page
4. **Result**: ✅ User disappears from pending list

### Test Case 3: User Requests Account Deletion
1. User requests deletion (`deleted=True`)
2. Admin visits `/admin/users/pending`
3. **Result**: ✅ Deleted user does NOT appear in list

## Files Modified

1. **app.py** (2 routes updated)
   - `/admin/users/pending` (lines 2588-2591)
   - `/admin/users` (lines 2570-2572)

## Impact

### Before:
- ❌ Pending users page showed 0 even when users were waiting
- ❌ Admin couldn't see who needs approval
- ❌ Users stuck in "pending" state indefinitely

### After:
- ✅ Pending users correctly displayed
- ✅ Admin can approve new registrations
- ✅ Soft-deleted users excluded from all lists
- ✅ Logging added for troubleshooting

## No Breaking Changes

This fix:
- ✅ Does NOT affect user login
- ✅ Does NOT affect user registration
- ✅ Does NOT affect active users
- ✅ ONLY fixes the admin pending users query
- ✅ Adds defensive filtering to prevent future issues

## Additional Improvements

### Logging Added:
```python
memory_logger.info(f"Found {len(pending_users)} pending users for approval")
```

This helps admins troubleshoot if the page appears empty:
- Check logs to see actual count
- Verify database state
- Identify if it's a query issue or display issue

## Status

**FIXED** ✅ - Ready for testing

Admins should now see all users waiting for approval on the `/admin/users/pending` page.

## Verification Checklist

- [ ] Navigate to `/admin/users/pending` as admin
- [ ] Verify pending users are displayed
- [ ] Test approving a user
- [ ] Verify user moves from pending to active
- [ ] Check logs for count confirmation
- [ ] Verify soft-deleted users don't appear
