import { useEffect, useRef } from 'react';

/**
 * Hook to manage AbortController for cancelling requests on unmount
 *
 * Usage:
 * ```tsx
 * const signal = useAbortController();
 *
 * useEffect(() => {
 *   fetchData(signal);
 * }, []);
 * ```
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Create a new AbortController on mount
    abortControllerRef.current = new AbortController();

    // Cleanup: abort any pending requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return abortControllerRef.current?.signal;
}

/**
 * Hook to create a new AbortController that can be manually reset
 *
 * Usage:
 * ```tsx
 * const { signal, abort, reset } = useAbortControllerManual();
 *
 * const handleFetch = async () => {
 *   reset(); // Create new controller
 *   await fetchData(signal);
 * };
 *
 * const handleCancel = () => {
 *   abort(); // Cancel current request
 * };
 * ```
 */
export function useAbortControllerManual() {
  const abortControllerRef = useRef<AbortController>(new AbortController());

  const abort = () => {
    abortControllerRef.current.abort();
  };

  const reset = () => {
    abortControllerRef.current = new AbortController();
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current.abort();
    };
  }, []);

  return {
    signal: abortControllerRef.current.signal,
    abort,
    reset,
  };
}
