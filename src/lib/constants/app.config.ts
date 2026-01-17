/**
 * Centralized application configuration
 * All app settings should be defined here for easy maintenance
 */

export const appConfig = {
	// Process Management
	maxConcurrentEvaluations: 5,
	evaluationTimeouts: {
		smoke: 5 * 60 * 1000, // 5 minutes
		model: 20 * 60 * 1000, // 20 minutes
		full: 60 * 60 * 1000, // 60 minutes
		pattern: 20 * 60 * 1000,
		first: 15 * 60 * 1000,
		retry: 20 * 60 * 1000
	},

	// UI/UX
	previewDebounceMs: 500,
	autoOpenHtmlReports: true,

	// Paths
	reportsDir: './tests/llm-evals/reports',
	outputJsonPath: './tests/llm-evals/output.json',

	// Estimation Defaults
	avgSecondsPerTest: 5,
	avgTokensPerTest: 1000,

	// Form Defaults
	defaultRunType: 'smoke',
	defaultCache: true,
	defaultVerbose: false,
	defaultNoHtml: false
} as const;
