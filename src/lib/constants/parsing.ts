/**
 * Parsing constants - string patterns and regex for parsing output
 * Used for parsing test output, prompts, and assertions
 */

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
