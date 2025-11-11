# Admin Pages Migration Plan

## Overview
This document outlines the migration of the three admin pages from Flask templates to React components.

## Pages to Migrate

### 1. AdminUsersPage (`admin_users.html`)
**Features:**
- Display all users in a table format
- Columns: ID, User Info (name/username), Role, Status, Created Date, Actions
- User actions: Edit, Toggle Active/Inactive, Delete
- Edit modal for updating user details (full name, role, password)
- Link to pending users page with badge showing count
- Link to create user page
- Back to dashboard link

**API Endpoints Needed:**
- `GET /admin/users` - Get all users
- `GET /admin/users/pending` - Get pending count
- `POST /admin/users/{id}/update` - Update user
- `POST /admin/users/{id}/toggle` - Toggle user status
- `POST /admin/users/{id}/delete` - Delete user

### 2. AdminPendingUsersPage (`admin_pending_users.html`)
**Features:**
- Display pending user approvals in card format
- Show user details: full name, email, role, registration date, ID
- Actions: Approve, Reject
- Statistics card showing count of pending users
- Empty state when no pending users
- Links to all users page and dashboard

**API Endpoints Needed:**
- `GET /admin/users/pending` - Get all pending users
- `POST /admin/users/{id}/approve` - Approve user
- `POST /admin/users/{id}/delete` - Reject/delete user

### 3. AdminCreateUserPage (`admin_create_user.html`)
**Features:**
- Form to create new user
- Fields: Username, Full Name, Password, Confirm Password, Role
- Role selection with visual cards (Admin, Analyst, Researcher, Demo)
- Client-side validation (password match, length)
- Success/error messages
- Form reset after successful creation
- Back to user management link

**API Endpoints Needed:**
- `POST /admin/users/create` - Create new user

## Implementation Steps

### Step 1: Create Type Definitions
```typescript
// src/types/admin.ts
export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'analyst' | 'researcher' | 'demo';
  is_active: boolean;
  created_at: string;
}

export interface PendingUser extends User {
  // Same as User for now
}

export interface CreateUserRequest {
  username: string;
  full_name: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  role?: string;
  password?: string;
}
```

### Step 2: Add Admin API Methods to API Client
```typescript
// In src/api/client.ts

// ========================================
// Admin Endpoints
// ========================================

async getUsers(): Promise<User[]> {
  return this.request<User[]>('admin/users');
}

async getPendingUsers(): Promise<PendingUser[]> {
  return this.request<PendingUser[]>('admin/users/pending');
}

async createUser(userData: CreateUserRequest): Promise<{ message: string; user: User }> {
  return this.request('admin/users/create', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

async updateUser(userId: number, userData: UpdateUserRequest): Promise<{ message: string }> {
  return this.request(`admin/users/${userId}/update`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

async toggleUserStatus(userId: number): Promise<{ message: string }> {
  return this.request(`admin/users/${userId}/toggle`, {
    method: 'POST',
  });
}

async deleteUser(userId: number): Promise<{ message: string }> {
  return this.request(`admin/users/${userId}/delete`, {
    method: 'POST',
  });
}

async approveUser(userId: number): Promise<{ message: string }> {
  return this.request(`admin/users/${userId}/approve`, {
    method: 'POST',
  });
}
```

### Step 3: Create Components

#### AdminUsersPage.tsx
- Use `useState` for users list, edit modal state, loading, messages
- Use `useEffect` to fetch users on mount
- Implement edit modal with form
- Handle update, toggle, delete actions
- Display role and status badges
- Show pending users alert if count > 0

#### AdminPendingUsersPage.tsx
- Use `useState` for pending users, loading, messages
- Use `useEffect` to fetch pending users
- Card-based layout for each pending user
- Approve/Reject actions with confirmation
- Statistics display
- Empty state component

#### AdminCreateUserPage.tsx
- Use `useState` for form data, selected role, loading, messages
- Form validation (password match, length)
- Visual role selection cards
- Success feedback and form reset
- Auto-focus username field

### Step 4: Add Routes
```typescript
// In src/router.tsx
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPendingUsersPage from './pages/admin/AdminPendingUsersPage';
import AdminCreateUserPage from './pages/admin/AdminCreateUserPage';

// Add admin routes (protected with admin role check)
{
  path: '/admin/users',
  element: (
    <ProtectedRoute requireAdmin>
      <AdminUsersPage />
    </ProtectedRoute>
  ),
},
{
  path: '/admin/users/pending',
  element: (
    <ProtectedRoute requireAdmin>
      <AdminPendingUsersPage />
    </ProtectedRoute>
  ),
},
{
  path: '/admin/users/create',
  element: (
    <ProtectedRoute requireAdmin>
      <AdminCreateUserPage />
    </ProtectedRoute>
  ),
},
```

### Step 5: Update ProtectedRoute
May need to enhance `ProtectedRoute` component to check admin role:
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  // ... existing code ...

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/agents" replace />;
  }

  return <>{children}</>;
}
```

## Files to Create

1. ✅ `/react-frontend/src/pages/admin/Admin.module.css` - Shared admin styles (DONE)
2. `/react-frontend/src/pages/admin/AdminUsersPage.tsx`
3. `/react-frontend/src/pages/admin/AdminPendingUsersPage.tsx`
4. `/react-frontend/src/pages/admin/AdminCreateUserPage.tsx`
5. `/react-frontend/src/types/admin.ts` - Type definitions

## Files to Modify

1. `/react-frontend/src/api/client.ts` - Add admin endpoints
2. `/react-frontend/src/router.tsx` - Add admin routes
3. `/react-frontend/src/components/auth/ProtectedRoute.tsx` - Add admin role check

## Key Considerations

1. **Role-based Access Control**: Ensure only admin users can access these pages
2. **CSRF Protection**: Include CSRF token in all POST requests (already handled by API client)
3. **Error Handling**: Display user-friendly error messages
4. **Loading States**: Show loading indicators during API calls
5. **Confirmations**: Require confirmation for destructive actions (delete, reject)
6. **Responsive Design**: Ensure mobile compatibility
7. **Accessibility**: Proper ARIA labels and keyboard navigation

## Next Steps

To continue the migration:
1. Create type definitions file
2. Add admin API methods to API client
3. Create AdminUsersPage component
4. Create AdminPendingUsersPage component
5. Create AdminCreateUserPage component
6. Update ProtectedRoute for admin role check
7. Add admin routes to router
8. Test all functionality

## Dependencies

- React Hook Form (optional, for better form handling)
- React Icons or Lucide React (for icons)
- React Toastify or Sonner (for toast notifications - already using Sonner)
