/**
 * Evaluation Service Layer
 * Handles evaluation execution, preview generation, and result parsing
 * Separates business logic from route handlers
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { readFileSync, existsSync, readdirSync } from 'fs';
import type { EvalResult, EvalPreview } from '$lib/types/eval';
import type { EvalFormSchema } from '$lib/schemas/eval-form';
import { appConfig } from '$lib/constants/app.config.js';
import { estimateRunConfiguration, getModelsForRunType } from '$lib/utils/estimations';
import { MODEL_DISPLAY_NAMES } from '$lib/constants/models.constants';
import { ErrorCodes, createEvaluationError } from '$lib/utils/error-handling';
import {
	PROJECT_ROOT,
	REPORTS_DIR,
	OUTPUT_JSON_PATH,
	SCRIPTS_DIR,
	PROMPTFOO_CONFIG_PATH
} from '$lib/constants/app.constants.server.js';
import {
	FILE_EXTENSIONS,
	PROMPT_MARKERS,
	PARSING_PATTERNS
} from '$lib/constants/app.constants.js';
import { EXECUTABLES, COMMANDS, CLI_FLAGS } from '$lib/constants/cli.constants';
import { UI_DEFAULTS } from '$lib/constants/ui.constants';

/**
 * Build command arguments from form data
 */
function buildCommandArgs(formData: EvalFormSchema): string[] {
	const args: string[] = [formData.runType];

	if (formData.runType === 'model' && formData.modelName) {
		args.push(formData.modelName);
	} else if (formData.runType === 'pattern' && formData.pattern) {
		args.push(formData.pattern);
	} else if (formData.runType === 'first' && formData.count) {
		args.push(formData.count.toString());
		if (formData.modelName) {
			args.push('model', formData.modelName);
		}
	}

	if (formData.noCache) {
		args.push(CLI_FLAGS.NO_CACHE);
	}
	if (formData.verbose) {
		args.push(CLI_FLAGS.VERBOSE);
	}
	if (formData.noHtml) {
		args.push(CLI_FLAGS.NO_HTML);
	}

	return args;
}

/**
 * Parse evaluation results from output.json
 */
function parseResults(): EvalResult | null {
	if (!existsSync(OUTPUT_JSON_PATH)) {
		return null;
	}

	try {
		const output = JSON.parse(readFileSync(OUTPUT_JSON_PATH, 'utf-8'));
		const results = output.results || [];
		const totalTests = results.length;
		const passedTests = results.filter((r: { success?: boolean }) => r.success).length;
		const failedTests = totalTests - passedTests;
		const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

		// Find the most recent HTML report
		let htmlReportPath: string | undefined;
		if (existsSync(REPORTS_DIR)) {
			const reports = readdirSync(REPORTS_DIR)
				.filter((f: string) => f.endsWith(FILE_EXTENSIONS.HTML))
				.sort()
				.reverse();
			if (reports.length > 0) {
				htmlReportPath = `/reports/${reports[0]}`;
			}
		}

		return {
			success: true,
			passRate,
			totalTests,
			passedTests,
			failedTests,
			htmlReportPath
		};
	} catch (error) {
		throw createEvaluationError(
			error instanceof Error ? error : new Error('Failed to parse results'),
			ErrorCodes.PARSE_ERROR
		);
	}
}

/**
 * Load test configuration by running dry-run
 */
async function loadTestConfig(args: string[]): Promise<{
	tests: Array<{
		description: string;
		prompt: string;
		assertions: Array<{ description: string }>;
	}>;
	totalTests: number;
}> {
	const scriptPath = join(SCRIPTS_DIR, 'run-eval.ts');

	return new Promise((resolve, reject) => {
		const child = spawn(EXECUTABLES.TSX, [scriptPath, COMMANDS.DRY_RUN, ...args], {
			cwd: PROJECT_ROOT,
			env: { ...process.env },
			stdio: ['ignore', 'pipe', 'pipe']
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (data) => {
			stdout += data.toString();
		});

		child.stderr?.on('data', (data) => {
			stderr += data.toString();
		});

		child.on('close', (code) => {
			if (code !== 0) {
				reject(
					createEvaluationError(
						new Error(`Failed to load test config: ${stderr}`),
						ErrorCodes.CONFIG_ERROR
					)
				);
				return;
			}

			try {
				const tests = parseDryRunOutput(stdout);
				resolve({ tests, totalTests: tests.length });
			} catch (error) {
				reject(
					createEvaluationError(
						error instanceof Error ? error : new Error('Failed to parse dry-run output'),
						ErrorCodes.PARSE_ERROR
					)
				);
			}
		});

		child.on('error', (error) => {
			reject(createEvaluationError(error, ErrorCodes.PROCESS_ERROR));
		});
	});
}

/**
 * Parse dry-run output into structured test data
 */
function parseDryRunOutput(output: string): Array<{
	description: string;
	prompt: string;
	assertions: Array<{ description: string }>;
}> {
	const tests: Array<{
		description: string;
		prompt: string;
		assertions: Array<{ description: string }>;
	}> = [];

	// Split by test separator
	const testBlocks = output.split(PARSING_PATTERNS.TEST_SEPARATOR);

	for (const block of testBlocks.slice(1)) {
		// Skip first empty split
		const lines = block.split('\n');
		const descriptionMatch = lines[0]?.match(PARSING_PATTERNS.DESCRIPTION_QUOTED);
		if (!descriptionMatch) continue;

		const description = descriptionMatch[1];

		// Find prompt info - handle both structured (Venue:/User says:) and generic formats
		const promptMatch = block.match(PARSING_PATTERNS.CHARACTER_COUNT);
		const venueLine = lines.find((l) => l.trim().startsWith(PROMPT_MARKERS.VENUE));
		const userLine = lines.find((l) => l.trim().startsWith(PROMPT_MARKERS.USER_SAYS));

		const promptLines = [];
		if (venueLine || userLine) {
			// Structured format
			if (venueLine) promptLines.push(venueLine.trim());
			if (userLine) promptLines.push(userLine.trim());
		} else {
			// Generic format - extract lines between "Prompt:" and character count
			const promptStart = block.indexOf(PROMPT_MARKERS.PROMPT);
			const charCountLine = block.indexOf('(', promptStart);
			if (promptStart !== -1 && charCountLine !== -1) {
				const promptSection = block.substring(promptStart, charCountLine);
				const extractedLines = promptSection
					.split('\n')
					.slice(1) // Skip "Prompt:" line
					.map((l) => l.trim())
					.filter((l) => l.length > 0);
				promptLines.push(...extractedLines);
			}
		}

		if (promptMatch) promptLines.push(`(${promptMatch[1]} characters total)`);

		const prompt = promptLines.join('\n');

		// Find assertion count
		const assertMatch = block.match(PARSING_PATTERNS.ASSERTION_COUNT);
		const assertionCount = assertMatch ? parseInt(assertMatch[1]) : 0;

		// Build assertions array
		const assertions: Array<{ description: string }> = [];
		if (assertionCount > 0) {
			// Extract assertion descriptions from the block
			const assertionSection = block.substring(block.indexOf(PROMPT_MARKERS.ASSERTIONS));
			const assertionLines = assertionSection.split('\n').slice(1); // Skip "Assertions (N):" line

			for (let i = 0; i < assertionCount && i < assertionLines.length; i++) {
				const line = assertionLines[i].trim();
				if (PARSING_PATTERNS.NUMBERED_ASSERTION.test(line)) {
					assertions.push({
						description: line.replace(/^\d+\.\s*/, '')
					});
				}
			}
		}

		tests.push({
			description,
			prompt,
			assertions
		});
	}

	return tests;
}

/**
 * Sanitize output to prevent API key leakage
 */
function sanitizeOutput(output: string): string {
	return output.replace(PARSING_PATTERNS.API_KEY, UI_DEFAULTS.REDACTED_PLACEHOLDER);
}

/**
 * Evaluation Service Class
 */
export class EvaluationService {
	/**
	 * Get preview information for a run configuration
	 */
	async getPreview(formData: EvalFormSchema): Promise<EvalPreview> {
		const runType = formData.runType;

		// Build command args for dry-run
		const commandArgs = buildCommandArgs(formData);

		// Load actual test config by running dry-run
		const testConfig = await loadTestConfig(commandArgs);
		const allTests = testConfig.tests;
		const actualTestCount = allTests.length;

		// Use estimation utilities
		const estimation = estimateRunConfiguration(runType, formData, actualTestCount);
		const models = getModelsForRunType(runType, formData);

		// Build description
		let description = '';
		switch (runType) {
			case 'smoke':
				description = 'Quick smoke test - 5 tests, fastest model';
				break;
			case 'model':
				description = `All tests against ${formData.modelName || 'selected model'}`;
				break;
			case 'full':
				description = 'Full suite - all tests, all models';
				break;
			case 'pattern':
				description = `Tests matching pattern '${formData.pattern || ''}'`;
				break;
			case 'first':
				description = `First ${estimation.testCount} tests`;
				if (formData.modelName) {
					description += `, ${formData.modelName} model`;
				}
				break;
			case 'retry':
				description = 'Retrying failures from last run';
				break;
		}

		// Filter tests based on run type
		let filteredTests = allTests;
		if (runType === 'smoke' || runType === 'first') {
			filteredTests = allTests.slice(0, estimation.testCount);
		}
		// For pattern, we'd need to actually filter by regex, but that's complex
		// For now just show all and note it's an estimate

		return {
			success: true,
			description,
			testCount: filteredTests.length,
			modelCount: estimation.modelCount,
			models: models.map((m) => MODEL_DISPLAY_NAMES[m]),
			estimatedTime: estimation.estimatedTime,
			estimatedCost: estimation.estimatedCost,
			estimatedTokens: estimation.estimatedTokens,
			cacheEnabled: !formData.noCache,
			tests: filteredTests.map((test) => ({
				description: test.description,
				prompt: test.prompt,
				assertionCount: test.assertions.length
			}))
		};
	}

	/**
	 * Parse evaluation results from output.json
	 */
	getResults(): EvalResult {
		const results = parseResults();
		if (!results) {
			throw createEvaluationError(
				new Error('No results found'),
				ErrorCodes.PARSE_ERROR
			);
		}
		return results;
	}

	/**
	 * Build command arguments from form data
	 */
	buildCommandArgs(formData: EvalFormSchema): string[] {
		return buildCommandArgs(formData);
	}

	/**
	 * Sanitize output to prevent API key leakage
	 */
	sanitizeOutput(output: string): string {
		return sanitizeOutput(output);
	}
}

// Export singleton instance
export const evaluationService = new EvaluationService();
