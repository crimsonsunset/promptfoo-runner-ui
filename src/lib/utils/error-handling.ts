/**
 * Error handling utilities and custom error classes
 * Provides structured error handling throughout the application
 */

/**
 * Custom error class for evaluation-related errors
 */
export class EvaluationError extends Error {
	constructor(
		message: string,
		public code: string,
		public details?: unknown
	) {
		super(message);
		this.name = 'EvaluationError';
		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, EvaluationError);
		}
	}
}

/**
 * Error codes for different error types
 */
export const ErrorCodes = {
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	API_KEY_MISSING: 'API_KEY_MISSING',
	PROCESS_ERROR: 'PROCESS_ERROR',
	TIMEOUT_ERROR: 'TIMEOUT_ERROR',
	PARSE_ERROR: 'PARSE_ERROR',
	CONFIG_ERROR: 'CONFIG_ERROR',
	ENVIRONMENT_ERROR: 'ENVIRONMENT_ERROR',
	CONCURRENT_LIMIT_ERROR: 'CONCURRENT_LIMIT_ERROR',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Form error type for validation errors
 */
export type FormErrors = Record<string, string[]>;

/**
 * Create a user-friendly error message from an error
 */
export function getUserFriendlyError(error: unknown): string {
	if (error instanceof EvaluationError) {
		return error.message;
	}

	if (error instanceof Error) {
		// Sanitize error messages that might contain sensitive info
		return sanitizeErrorMessage(error.message);
	}

	return 'An unexpected error occurred';
}

/**
 * Sanitize error messages to prevent leaking sensitive information
 */
function sanitizeErrorMessage(message: string): string {
	// Filter out potential API keys
	return message.replace(/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED]');
}

/**
 * Create an EvaluationError from various error types
 */
export function createEvaluationError(
	error: unknown,
	code: ErrorCode = ErrorCodes.UNKNOWN_ERROR
): EvaluationError {
	if (error instanceof EvaluationError) {
		return error;
	}

	if (error instanceof Error) {
		return new EvaluationError(sanitizeErrorMessage(error.message), code, error);
	}

	return new EvaluationError(String(error), code, error);
}
