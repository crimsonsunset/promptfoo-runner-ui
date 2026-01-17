/**
 * Environment variable constants
 * All environment variable names should be defined here
 */

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
