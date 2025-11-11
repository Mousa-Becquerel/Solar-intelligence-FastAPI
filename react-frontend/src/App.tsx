/**
 * App Component
 *
 * Root component with router and toast provider
 */

import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
