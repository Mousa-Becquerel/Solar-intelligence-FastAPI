/**
 * Protected Route Component
 *
 * Redirects to login if not authenticated
 * Optionally enforces admin role requirement
 */

import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Check auth status on mount
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    // Redirect to login, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin requirement
  if (requireAdmin && user?.role !== 'admin') {
    // Redirect non-admin users to agents page
    return <Navigate to="/agents" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
