/**
 * File-related constants
 * File extensions, filenames, and file patterns
 */

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
