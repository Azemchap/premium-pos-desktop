/**
 * Centralized Error Handling Utilities
 * Provides consistent error handling and user feedback across the app
 */
import { toast } from "sonner";

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
  isRetryable?: boolean;
}

/**
 * Parse and normalize errors from various sources
 */
export function parseError(error: unknown): AppError {
  // Handle Tauri errors
  if (typeof error === "string") {
    return {
      message: error,
      isRetryable: isRetryableError(error),
    };
  }

  // Handle Error instances
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
      details: error,
      isRetryable: isRetryableError(error.message),
    };
  }

  // Handle error objects
  if (typeof error === "object" && error !== null) {
    const err = error as any;
    return {
      message: err.message || err.error || "An unknown error occurred",
      code: err.code,
      details: error,
      isRetryable: isRetryableError(err.message),
    };
  }

  // Fallback
  return {
    message: "An unknown error occurred",
    details: error,
    isRetryable: false,
  };
}

/**
 * Determine if an error is retryable (network, timeout, etc.)
 */
export function isRetryableError(error: string | Error): boolean {
  const message = typeof error === "string" ? error : error.message;
  const retryablePatterns = [
    /network/i,
    /timeout/i,
    /connection/i,
    /unavailable/i,
    /503/i,
    /429/i, // Rate limit
    /502/i,
    /504/i,
  ];

  return retryablePatterns.some((pattern) => pattern.test(message));
}

/**
 * Handle errors with user-friendly messages and logging
 */
export function handleError(
  error: unknown,
  context: string,
  options: {
    showToast?: boolean;
    customMessage?: string;
    logError?: boolean;
  } = {}
): AppError {
  const { showToast = true, customMessage, logError = true } = options;

  const parsedError = parseError(error);

  // Log error to console (in production, this could go to an error tracking service)
  if (logError) {
    console.error(`[${context}]`, {
      message: parsedError.message,
      code: parsedError.code,
      details: parsedError.details,
      timestamp: new Date().toISOString(),
    });
  }

  // Show toast notification
  if (showToast) {
    const displayMessage = customMessage || getDisplayMessage(parsedError, context);
    toast.error(displayMessage, {
      duration: 5000,
      action: parsedError.isRetryable
        ? {
            label: "Retry",
            onClick: () => {
              // This would need to be implemented by the caller
              toast.info("Please try your action again");
            },
          }
        : undefined,
    });
  }

  return parsedError;
}

/**
 * Get user-friendly display message for errors
 */
function getDisplayMessage(error: AppError, context: string): string {
  // Map common error codes to user-friendly messages
  const errorMap: Record<string, string> = {
    NETWORK_ERROR: "Unable to connect to the server. Please check your connection.",
    TIMEOUT: "The request took too long. Please try again.",
    UNAUTHORIZED: "You don't have permission to perform this action.",
    NOT_FOUND: "The requested resource was not found.",
    VALIDATION_ERROR: "Please check your input and try again.",
    DUPLICATE: "This record already exists.",
    CONSTRAINT_VIOLATION: "This operation conflicts with existing data.",
  };

  if (error.code && errorMap[error.code]) {
    return errorMap[error.code];
  }

  // Contextual fallback messages
  const contextMessages: Record<string, string> = {
    "load data": "Failed to load data",
    "save data": "Failed to save changes",
    "delete": "Failed to delete item",
    "update": "Failed to update item",
    "create": "Failed to create item",
  };

  const contextKey = context.toLowerCase();
  for (const [key, message] of Object.entries(contextMessages)) {
    if (contextKey.includes(key)) {
      return `${message}: ${error.message}`;
    }
  }

  return error.message || "An unexpected error occurred";
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const parsedError = parseError(error);
      if (!parsedError.isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Global error boundary error handler
 */
export function logGlobalError(error: Error, errorInfo: React.ErrorInfo): void {
  console.error("Global Error Boundary:", {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    errorInfo,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  });

  // In production, send to error tracking service (Sentry, LogRocket, etc.)
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error, { contexts: { react: errorInfo } });
  // }

  toast.error("An unexpected error occurred. Please refresh the page.", {
    duration: Infinity,
    action: {
      label: "Refresh",
      onClick: () => window.location.reload(),
    },
  });
}

/**
 * Validation error formatter
 */
export function formatValidationErrors(
  errors: Record<string, string[]>
): Record<string, string> {
  const formatted: Record<string, string> = {};

  for (const [field, messages] of Object.entries(errors)) {
    formatted[field] = messages[0]; // Take first error message
  }

  return formatted;
}
