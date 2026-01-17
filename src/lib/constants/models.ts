/**
 * Model constants - single source of truth for all model definitions
 * Consolidates model options, display names, and provider configurations
 */

export const MODEL_OPTIONS = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'] as const;

export type ModelOption = typeof MODEL_OPTIONS[number];

/**
 * Model display names for UI presentation
 */
export const MODEL_DISPLAY_NAMES: Record<ModelOption, string> = {
	xiaomi: 'xiaomi/mimo-v2-flash:free',
	gemini: 'google/gemini-2.0-flash-exp:free',
	'gpt-oss-20b': 'openai/gpt-oss-20b:free',
	'gpt-oss-120b': 'openai/gpt-oss-120b:free'
};

/**
 * Model name mappings for internal use (used in run-eval.ts)
 */
export const MODEL_MAP: Record<ModelOption, string> = {
	xiaomi: 'xiaomi',
	gemini: 'gemini',
	'gpt-oss-20b': 'gpt-oss-20b',
	'gpt-oss-120b': 'gpt-oss-120b'
};

/**
 * All models array for iteration
 */
export const ALL_MODELS: readonly ModelOption[] = MODEL_OPTIONS;

/**
 * Provider configurations for promptfoo.config.ts
 */
export const MODEL_PROVIDERS = [
	'openrouter:xiaomi/mimo-v2-flash:free',
	'openrouter:google/gemini-2.0-flash-exp:free',
	'openrouter:openai/gpt-oss-20b:free',
	'openrouter:openai/gpt-oss-120b:free'
] as const;

/**
 * Get display name for a model
 */
export function getModelDisplayName(model: ModelOption | string): string {
	return MODEL_DISPLAY_NAMES[model as ModelOption] || model;
}

/**
 * Check if a model name is valid
 */
export function isValidModel(model: string): model is ModelOption {
	return MODEL_OPTIONS.includes(model as ModelOption);
}
