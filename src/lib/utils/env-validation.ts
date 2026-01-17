/**
 * Validates required environment variables are present
 * @throws Error if required vars are missing
 */
export function validateEnvironment(): void {
	const required = ['OPENROUTER_API_KEY'];
	const missing = required.filter((key) => !process.env[key]);

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
	const key = process.env.OPENROUTER_API_KEY;
	if (!key) {
		throw new Error('OPENROUTER_API_KEY not configured. Check your .env file.');
	}
	return key;
}
