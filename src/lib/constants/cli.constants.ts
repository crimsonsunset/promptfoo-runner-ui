/**
 * CLI command constants
 * All command names, flags, and arguments used in CLI operations
 */

/**
 * Command names for running evaluations
 */
export const COMMANDS = {
	SMOKE: 'smoke',
	MODEL: 'model',
	FULL: 'full',
	PATTERN: 'pattern',
	FIRST: 'first',
	RETRY: 'retry',
	DRY_RUN: 'dry-run',
	REPORT: 'report',
	REPORTS: 'reports'
} as const;

/**
 * CLI flags/options
 */
export const CLI_FLAGS = {
	NO_CACHE: '--no-cache',
	VERBOSE: '--verbose',
	VERBOSE_SHORT: '-v',
	NO_HTML: '--no-html',
	FILTER_FIRST_N: '--filter-first-n',
	FILTER_PROVIDERS: '--filter-providers',
	FILTER_PATTERN: '--filter-pattern',
	RETRY_ERRORS: '--retry-errors',
	OUTPUT: '--output'
} as const;

/**
 * Executable commands
 */
export const EXECUTABLES = {
	TSX: 'tsx',
	NPX: 'npx',
	PROMPTFOO: 'promptfoo'
} as const;

/**
 * Promptfoo command arguments
 */
export const PROMPTFOO_ARGS = {
	EVAL: 'eval',
	CONFIG: '-c',
	CONFIG_FILE: 'promptfoo.config.ts'
} as const;
