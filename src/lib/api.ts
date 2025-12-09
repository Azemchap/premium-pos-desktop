/**
 * Enhanced API utility with retry logic, timeout handling, and proper error parsing
 * Fixes all frontend API invocation issues identified in the risk analysis
 */

import { invoke } from "@tauri-apps/api/core";

// Typed error from backend
export interface AppError {
    code: string;
    message: string;
    details?: string;
}

// API configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Retryable error codes
const RETRYABLE_ERROR_CODES = [
    "DB_001", // Database error
    "DB_002", // Connection failed
    "DB_003", // Query timeout
    "TXN_003", // Concurrent modification
    "SYS_002", // Operation timeout
];

/**
 * Parse error from backend
 */
function parseError(error: unknown): AppError {
    if (typeof error === "string") {
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(error);
            if (parsed.code && parsed.message) {
                return parsed as AppError;
            }
        } catch {
            // If not JSON, treat as plain message
        }

        // Plain string error
        return {
            code: "UNKNOWN",
            message: error,
        };
    }

    if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
        return error as AppError;
    }

    return {
        code: "UNKNOWN",
        message: String(error),
    };
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: AppError): boolean {
    return RETRYABLE_ERROR_CODES.includes(error.code);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff delay
 */
function getBackoffDelay(attempt: number, baseDelay: number = RETRY_DELAY_MS): number {
    return baseDelay * Math.pow(2, attempt - 1);
}

/**
 * Execute API call with timeout
 */
async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(() => {
            reject(new Error("Operation timed out"));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
}

/**
 * Enhanced invoke with retry logic and timeout
 */
export async function apiInvoke<T>(
    command: string,
    args?: Record<string, any>,
    options?: {
        timeout?: number;
        maxRetries?: number;
        onRetry?: (attempt: number, error: AppError) => void;
    }
): Promise<T> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    let lastError: AppError | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await withTimeout(
                invoke<T>(command, args),
                timeout
            );
            return result;
        } catch (error) {
            lastError = parseError(error);

            // Don't retry if not retryable or if last attempt
            if (!isRetryableError(lastError) || attempt >= maxRetries) {
                throw lastError;
            }

            // Call retry callback if provided
            if (options?.onRetry) {
                options.onRetry(attempt, lastError);
            }

            // Wait before retrying with exponential backoff
            const delay = getBackoffDelay(attempt);
            await sleep(delay);
        }
    }

    throw lastError || new Error("Operation failed");
}

/**
 * Batch invoke multiple commands in parallel
 */
export async function apiBatch<T>(
    commands: Array<{ command: string; args?: Record<string, any> }>
): Promise<Array<T | AppError>> {
    const promises = commands.map(({ command, args }) =>
        apiInvoke<T>(command, args).catch(error => parseError(error))
    );

    return Promise.all(promises);
}

/**
 * Check if result is an error
 */
export function isError(result: unknown): result is AppError {
    return result !== null && typeof result === "object" && "code" in result && "message" in result;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: AppError): string {
    // Map error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
        AUTH_001: "Invalid username or password",
        AUTH_002: "Your session has expired. Please log in again",
        AUTH_003: "Invalid session. Please log in again",
        AUTH_004: "Too many login attempts. Please wait before trying again",
        AUTH_005: "Password must be at least 8 characters with uppercase, lowercase, and number",
        AUTH_006: "Your account has been deactivated. Please contact support",
        VAL_001: "Please check your input and try again",
        VAL_002: "This entry already exists",
        VAL_003: "The requested item was not found",
        VAL_004: "Invalid format provided",
        VAL_005: "Value cannot be negative",
        INV_001: "Not enough stock available",
        INV_002: "This product is currently inactive",
        INV_003: "Inventory record not found",
        TXN_001: "Transaction failed. Please try again",
        TXN_002: "Failed to undo changes",
        TXN_003: "This record was modified by another user. Please refresh and try again",
        SALE_001: "This sale has already been voided",
        SALE_002: "Sale not found",
        SALE_003: "Invalid payment amount",
        SHIFT_001: "You already have an open shift",
        SHIFT_002: "Shift not found or already closed",
        SHIFT_003: "Cash drawer has a discrepancy",
        REF_001: "Cannot delete because it's being used elsewhere",
        DB_001: "Database error occurred. Please try again",
        DB_002: "Could not connect to database",
        DB_003: "Operation took too long. Please try again",
        SYS_001: "An unexpected error occurred. Please try again",
        SYS_002: "Operation timed out. Please try again",
        SYS_003: "You don't have permission to perform this action",
    };

    return errorMessages[error.code] || error.message;
}

/**
 * Check if user is online (for offline detection)
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Wait for online status
 */
export async function waitForOnline(maxWaitMs: number = 30000): Promise<void> {
    if (isOnline()) return;

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            window.removeEventListener("online", onlineHandler);
            reject(new Error("Network timeout"));
        }, maxWaitMs);

        const onlineHandler = () => {
            clearTimeout(timeout);
            window.removeEventListener("online", onlineHandler);
            resolve();
        };

        window.addEventListener("online", onlineHandler);
    });
}

/**
 * Execute API call with offline detection
 */
export async function apiInvokeWithOfflineCheck<T>(
    command: string,
    args?: Record<string, any>,
    options?: Parameters<typeof apiInvoke>[2]
): Promise<T> {
    if (!isOnline()) {
        throw {
            code: "OFFLINE",
            message: "No internet connection. Please check your connection and try again",
        } as AppError;
    }

    return apiInvoke<T>(command, args, options);
}

/**
 * Session validation helper
 */
export async function validateSession(token: string): Promise<boolean> {
    try {
        await apiInvoke("verify_session", { token }, { maxRetries: 1 });
        return true;
    } catch (error) {
        const appError = parseError(error);
        if (appError.code === "AUTH_002" || appError.code === "AUTH_003") {
            return false;
        }
        throw appError;
    }
}

// Export for use in components
export { parseError };
