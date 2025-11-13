/**
 * Error Tester Component
 *
 * Test component to verify ErrorBoundary functionality
 * This should ONLY be used in development mode for testing
 */
import { useState } from 'react';

export function ErrorTester() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Test error thrown by ErrorTester component - This is expected behavior for testing ErrorBoundary');
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShouldThrow(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-lg"
      >
        Test Error Boundary
      </button>
    </div>
  );
}

export default ErrorTester;
