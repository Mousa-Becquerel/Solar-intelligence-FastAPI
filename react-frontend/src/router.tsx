/**
 * Router Configuration
 *
 * React Router v6 setup with selective lazy loading for optimal performance
 * Frequently accessed pages use direct imports for seamless navigation
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoadingFallback } from './components/common';

// Direct imports for frequently accessed pages (no loading flash)
import { LandingPage } from './pages/landing/LandingPage';
import { TermsOfServicePage } from './pages/legal/TermsOfServicePage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { CookiePolicyPage } from './pages/legal/CookiePolicyPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Helper to wrap lazy components with Suspense
const lazyLoad = (Component: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<LoadingFallback />}>
    <Component />
  </Suspense>
);

// Lazy load less frequently accessed components for code splitting
const ProtectedRoute = lazy(() => import('./components/auth/ProtectedRoute').then(m => ({ default: m.ProtectedRoute })));
const MainLayout = lazy(() => import('./components/layout/MainLayout'));

// Auth pages (lazy loaded)
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));

// Main app pages (lazy loaded)
const ChatPage = lazy(() => import('./pages/ChatPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Other pages (lazy loaded)
const WaitlistPage = lazy(() => import('./pages/WaitlistPage'));
const RequestDeletionPage = lazy(() => import('./pages/RequestDeletionPage'));

// Admin pages (lazy loaded)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminPendingUsersPage = lazy(() => import('./pages/admin/AdminPendingUsersPage'));
const AdminCreateUserPage = lazy(() => import('./pages/admin/AdminCreateUserPage'));
const AdminBreachesPage = lazy(() => import('./pages/admin/AdminBreachesPage'));

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
    path: '/verify-email',
    element: lazyLoad(VerifyEmailPage),
  },
  {
    path: '/agents',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedRoute>
          <AgentsPage />
        </ProtectedRoute>
      </Suspense>
    ),
  },
  {
    path: '/profile',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Suspense>
    ),
  },
  {
    path: '/chat',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ChatPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/waitlist" replace />,
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
    path: '/cookie-policy',
    element: <CookiePolicyPage />,
  },
  {
    path: '/waitlist',
    element: lazyLoad(WaitlistPage),
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedRoute requireAdmin>
          <AdminDashboard />
        </ProtectedRoute>
      </Suspense>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedRoute requireAdmin>
          <AdminUsersPage />
        </ProtectedRoute>
      </Suspense>
    ),
  },
  {
    path: '/admin/users/pending',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedRoute requireAdmin>
          <AdminPendingUsersPage />
        </ProtectedRoute>
      </Suspense>
    ),
  },
  {
    path: '/admin/users/create',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedRoute requireAdmin>
          <AdminCreateUserPage />
        </ProtectedRoute>
      </Suspense>
    ),
  },
  {
    path: '/admin/breaches',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedRoute requireAdmin>
          <AdminBreachesPage />
        </ProtectedRoute>
      </Suspense>
    ),
  },
  {
    path: '/request-deletion',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedRoute>
          <RequestDeletionPage />
        </ProtectedRoute>
      </Suspense>
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
