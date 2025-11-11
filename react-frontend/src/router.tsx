/**
 * Router Configuration
 *
 * React Router v6 setup with protected routes
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages (will create these)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import MainLayout from './components/layout/MainLayout';
import ChatPage from './pages/ChatPage';
import AgentsPage from './pages/AgentsPage';
import { LandingPage } from './pages/landing/LandingPage';
import { TermsOfServicePage } from './pages/legal/TermsOfServicePage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import WaitlistPage from './pages/WaitlistPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPendingUsersPage from './pages/admin/AdminPendingUsersPage';
import AdminCreateUserPage from './pages/admin/AdminCreateUserPage';
import RequestDeletionPage from './pages/RequestDeletionPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/agents',
    element: (
      <ProtectedRoute>
        <AgentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/chat',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ChatPage />,
      },
    ],
  },
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/terms',
    element: <TermsOfServicePage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPolicyPage />,
  },
  {
    path: '/waitlist',
    element: <WaitlistPage />,
  },
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
  {
    path: '/request-deletion',
    element: (
      <ProtectedRoute>
        <RequestDeletionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ChatPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
