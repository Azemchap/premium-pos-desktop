/**
 * useAsyncAction - Reusable hook for async operations with loading and error states
 * Handles loading, error, and success states for any async action
 */
import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface UseAsyncActionOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export interface UseAsyncActionReturn<T = void> {
  execute: (...args: any[]) => Promise<T | null>;
  isLoading: boolean;
  error: Error | null;
  data: T | null;
  reset: () => void;
}

export function useAsyncAction<T = void>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncActionOptions = {}
): UseAsyncActionReturn<T> {
  const {
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncFunction(...args);
        setData(result);

        if (showSuccessToast && successMessage) {
          toast.success(successMessage);
        }

        if (onSuccess) {
          onSuccess();
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        if (showErrorToast) {
          const message = errorMessage || error.message || "An error occurred";
          toast.error(message);
        }

        if (onError) {
          onError(error);
        }

        console.error("Async action error:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFunction, successMessage, errorMessage, onSuccess, onError, showSuccessToast, showErrorToast]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    data,
    reset,
  };
}
