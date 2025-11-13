/**
 * App Component
 *
 * Root component with router and toast provider
 */

import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { ErrorTester } from './components/error/ErrorTester';
import { CookieConsent } from './components/common/CookieConsent';

function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
      <CookieConsent />
      {import.meta.env.DEV && <ErrorTester />}
    </ErrorBoundary>
  );
}

export default App;
