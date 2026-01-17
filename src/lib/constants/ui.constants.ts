/**
 * UI constants - emojis, symbols, and display-related constants
 */

/**
 * Status symbols for display
 */
export const STATUS_SYMBOLS = {
	SUCCESS: '✓',
	WARNING: '⚠',
	ERROR: '✗',
	LOADING: '⏱️'
} as const;

/**
 * UI emojis
 */
export const EMOJIS = {
	TEST: '🧪',
	REPORT: '📊',
	OPEN_REPORT: '📊',
	WEB_UI: '🔍',
	JSON_OUTPUT: '📄',
	KEY: '🔑',
	ERROR: '❌',
	SUCCESS: '✅',
	WARNING: '⚠️',
	PREVIEW: '👁'
} as const;

/**
 * Text truncation limits
 */
export const TRUNCATION_LIMITS = {
	DESCRIPTION_PREVIEW: 50,
	PROMPT_LINE_LENGTH: 80,
	PROMPT_LINE_PREVIEW: 77,
	PROMPT_MAX_LINES: 3
} as const;

/**
 * Default values for UI display
 */
export const UI_DEFAULTS = {
	UNKNOWN_PROVIDER: 'unknown',
	REDACTED_PLACEHOLDER: '[REDACTED]'
} as const;
