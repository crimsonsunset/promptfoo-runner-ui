import { REQUIRED_ENV_VAR_NAMES, REQUIRED_ENV_VARS } from '$lib/constants/environment.js';

/**
 * Validates required environment variables are present
 * @throws Error if required vars are missing
 */
export function validateEnvironment(): void {
	const missing = REQUIRED_ENV_VAR_NAMES.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}\n` +
				'Please create a .env file based on .env.example'
		);
	}
}

/**
 * Gets OpenRouter API key with fallback error
 */
export function getOpenRouterApiKey(): string {
	const key = process.env[REQUIRED_ENV_VARS.OPENROUTER_API_KEY];
	if (!key) {
		throw new Error('OPENROUTER_API_KEY not configured. Check your .env file.');
	}
	return key;
}
