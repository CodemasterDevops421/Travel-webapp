'use client';

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-white">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="max-w-md space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600">
                We encountered an unexpected error. This might be a temporary issue.
              </p>
              {error.message && (
                <p className="text-sm text-gray-500">
                  {error.message}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => reset()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Try again
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="ghost"
              >
                Go to homepage
              </Button>
            </div>
            
            <p className="text-xs text-gray-400">
              Error reference: {error.digest || 'unknown'}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
