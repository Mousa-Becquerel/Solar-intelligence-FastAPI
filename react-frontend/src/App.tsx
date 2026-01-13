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
import { BIPVProvider } from './contexts/BIPVContext';

function App() {
  return (
    <ErrorBoundary>
      <BIPVProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
        <CookieConsent />
        {import.meta.env.DEV && <ErrorTester />}
      </BIPVProvider>
    </ErrorBoundary>
  );
}

export default App;
