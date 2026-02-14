'use client';

import { useEffect, useState, ReactNode } from 'react';

interface SafeWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface SafeWrapperState {
  hasError: boolean;
  error: Error | null;
}

export function SafeWrapper({ children, fallback, onError }: SafeWrapperProps) {
  const [state, setState] = useState<SafeWrapperState>({ hasError: false, error: null });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (state.hasError) {
      const handleError = () => {
        setState({ hasError: false, error: null });
      };
      
      const handleGlobalError = (event: ErrorEvent) => {
        console.error('Global error:', event.error);
        if (onError) {
          onError(event.error || new Error('Unknown error'));
        }
      };

      window.addEventListener('error', handleGlobalError);
      return () => window.removeEventListener('error', handleGlobalError);
    }
  }, [state.hasError, onError]);

  if (!isMounted) {
    return null;
  }

  if (state.hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center dark:border-yellow-800 dark:bg-yellow-950/50">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          {state.error?.message || 'Something went wrong'}
        </p>
        <button
          onClick={() => setState({ hasError: false, error: null })}
          className="mt-2 text-sm text-yellow-600 underline dark:text-yellow-400"
        >
          Try again
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export function useSafeState<T>(initialValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initialValue);
  const [error, setError] = useState<Error | null>(null);

  const handleSetState = (value: T) => {
    try {
      setError(null);
      setState(value);
    } catch (e) {
      const err = e instanceof Error ? e : new Error('State update failed');
      setError(err);
      console.error('useSafeState error:', err);
    }
  };

  return [error ? initialValue : state, handleSetState];
}

export function useSafeEffect(effect: () => void | (() => void), deps?: React.DependencyList) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    try {
      const cleanup = effect();
      return cleanup;
    } catch (e) {
      console.error('useSafeEffect error:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);
}
