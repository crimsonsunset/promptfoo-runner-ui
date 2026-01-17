/**
 * Client-safe application constants
 * Files, environment variables, and parsing patterns
 * Note: Path constants are in app.constants.server.ts (server-only)
 */

// ============================================================================
// Files
// ============================================================================

/**
 * File extensions
 */
export const FILE_EXTENSIONS = {
	HTML: '.html',
	JSON: '.json',
	ENV: '.env'
} as const;

/**
 * File names
 */
export const FILE_NAMES = {
	OUTPUT_JSON: 'output.json',
	PROMPTFOO_CONFIG: 'promptfoo.config.ts',
	ENV_FILE: '.env',
	ENV_EXAMPLE: '.env.example'
} as const;

/**
 * Content types for HTTP responses
 */
export const CONTENT_TYPES = {
	HTML: 'text/html',
	JSON: 'application/json',
	TEXT: 'text/plain'
} as const;

// ============================================================================
// Environment
// ============================================================================

/**
 * Required environment variables
 */
export const REQUIRED_ENV_VARS = {
	OPENROUTER_API_KEY: 'OPENROUTER_API_KEY'
} as const;

/**
 * Array of required environment variable names
 */
export const REQUIRED_ENV_VAR_NAMES = Object.values(REQUIRED_ENV_VARS);

// ============================================================================
// Parsing
// ============================================================================

/**
 * String markers for parsing prompt structure
 */
export const PROMPT_MARKERS = {
	VENUE: 'Venue:',
	USER_SAYS: 'User says:',
	PROMPT: 'Prompt:',
	ASSERTIONS: 'Assertions'
} as const;

/**
 * Regex patterns for parsing
 */
export const PARSING_PATTERNS = {
	/**
	 * Matches test separator: "Test #1: ", "Test #2: ", etc.
	 */
	TEST_SEPARATOR: /Test #\d+: /,

	/**
	 * Matches character count: "(123 characters total)"
	 */
	CHARACTER_COUNT: /\((\d+) characters total\)/,

	/**
	 * Matches assertion count: "Assertions (3):"
	 */
	ASSERTION_COUNT: /Assertions \((\d+)\):/,

	/**
	 * Matches numbered assertion: "1. Some assertion"
	 */
	NUMBERED_ASSERTION: /^\d+\./,

	/**
	 * Matches test description in quotes: '"Test description"'
	 */
	DESCRIPTION_QUOTED: /^"(.+)"$/,

	/**
	 * Matches API key pattern (OpenRouter format)
	 */
	API_KEY: /sk-[a-zA-Z0-9]{32,}/g
} as const;
