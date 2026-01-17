import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { evalFormSchema, validateEvalForm, MODEL_OPTIONS, type EvalFormSchema } from '$lib/schemas/eval-form';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, readdirSync } from 'fs';
import type { Actions, PageServerLoad } from './$types';
import type { EvalResult, EvalPreview } from '$lib/types/eval';
import { appConfig } from '../../app.config.js';
import { validateEnvironment, getOpenRouterApiKey } from '$lib/utils/env-validation';
import { evalManager } from '$lib/server/eval-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const EVALS_DIR = PROJECT_ROOT; // Config is at root
const REPORTS_DIR = join(PROJECT_ROOT, appConfig.reportsDir.replace(/^\.\//, ''));
const OUTPUT_JSON = join(PROJECT_ROOT, appConfig.outputJsonPath.replace(/^\.\//, ''));

const MODEL_DISPLAY_NAMES: Record<string, string> = {
	xiaomi: 'xiaomi/mimo-v2-flash:free',
	gemini: 'google/gemini-2.0-flash-exp:free',
	'gpt-oss-20b': 'openai/gpt-oss-20b:free',
	'gpt-oss-120b': 'openai/gpt-oss-120b:free'
};

export const load: PageServerLoad = async () => {
	// Validate environment on server load
	try {
		validateEnvironment();
	} catch (error) {
		console.error('Environment validation failed:', error);
		// Don't throw - let the app load but show error in UI if needed
	}

	const form = await superValidate(zod(evalFormSchema as any));
	return { form };
};

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
		args.push('--no-cache');
	}
	if (formData.verbose) {
		args.push('--verbose');
	}
	if (formData.noHtml) {
		args.push('--no-html');
	}

	return args;
}

function parseResults(): EvalResult | null {
	if (!existsSync(OUTPUT_JSON)) {
		return null;
	}

	try {
		const output = JSON.parse(readFileSync(OUTPUT_JSON, 'utf-8'));
		const results = output.results || [];
		const totalTests = results.length;
		const passedTests = results.filter((r: any) => r.success).length;
		const failedTests = totalTests - passedTests;
		const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

		// Find the most recent HTML report
		let htmlReportPath: string | undefined;
		if (existsSync(REPORTS_DIR)) {
			const reports = readdirSync(REPORTS_DIR)
				.filter((f: string) => f.endsWith('.html'))
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
		return {
			success: false,
			error: `Failed to parse results: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

async function loadTestConfig(args: string[]): Promise<{
	tests: Array<{
		description: string;
		prompt: string;
		assertions: Array<{ description: string }>;
	}>;
	totalTests: number;
}> {
	const scriptPath = join(PROJECT_ROOT, 'scripts', 'run-eval.ts');
	
	return new Promise((resolve) => {
		const child = spawn('tsx', [scriptPath, 'dry-run', ...args], {
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
				console.error('Failed to load test config:', stderr);
				resolve({ tests: [], totalTests: 0 });
				return;
			}

			try {
				// Parse the dry-run output
				const tests = parseDryRunOutput(stdout);
				resolve({ tests, totalTests: tests.length });
			} catch (error) {
				console.error('Failed to parse dry-run output:', error);
				resolve({ tests: [], totalTests: 0 });
			}
		});

		child.on('error', (error) => {
			console.error('Error spawning tsx:', error);
			resolve({ tests: [], totalTests: 0 });
		});
	});
}

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
	const testBlocks = output.split(/Test #\d+: /);
	
	for (const block of testBlocks.slice(1)) { // Skip first empty split
		const lines = block.split('\n');
		const descriptionMatch = lines[0]?.match(/^"(.+)"$/);
		if (!descriptionMatch) continue;

		const description = descriptionMatch[1];
		
		// Find prompt info - handle both structured (Venue:/User says:) and generic formats
		const promptMatch = block.match(/\((\d+) characters total\)/);
		const venueLine = lines.find(l => l.trim().startsWith('Venue:'));
		const userLine = lines.find(l => l.trim().startsWith('User says:'));
		
		const promptLines = [];
		if (venueLine || userLine) {
			// Structured format
			if (venueLine) promptLines.push(venueLine.trim());
			if (userLine) promptLines.push(userLine.trim());
		} else {
			// Generic format - extract lines between "Prompt:" and character count
			const promptStart = block.indexOf('Prompt:');
			const charCountLine = block.indexOf('(', promptStart);
			if (promptStart !== -1 && charCountLine !== -1) {
				const promptSection = block.substring(promptStart, charCountLine);
				const extractedLines = promptSection
					.split('\n')
					.slice(1) // Skip "Prompt:" line
					.map(l => l.trim())
					.filter(l => l.length > 0);
				promptLines.push(...extractedLines);
			}
		}
		
		if (promptMatch) promptLines.push(`(${promptMatch[1]} characters total)`);
		
		const prompt = promptLines.join('\n');
		
		// Find assertion count
		const assertMatch = block.match(/Assertions \((\d+)\):/);
		const assertionCount = assertMatch ? parseInt(assertMatch[1]) : 0;
		
		// Build assertions array
		const assertions: Array<{ description: string }> = [];
		if (assertionCount > 0) {
			// Extract assertion descriptions from the block
			const assertionSection = block.substring(block.indexOf('Assertions'));
			const assertionLines = assertionSection.split('\n').slice(1); // Skip "Assertions (N):" line
			
			for (let i = 0; i < assertionCount && i < assertionLines.length; i++) {
				const line = assertionLines[i].trim();
				if (line.match(/^\d+\./)) {
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

async function getPreviewInfo(formData: EvalFormSchema): Promise<EvalPreview> {
	const runType = formData.runType;
	let testCount = 0;
	let modelCount = 1;
	let timeEstimate = 0;
	let models: string[] = [];
	let description = '';

	// Build command args for dry-run
	const commandArgs = buildCommandArgs(formData);
	
	// Load actual test config by running dry-run
	const testConfig = await loadTestConfig(commandArgs);
	const allTests = testConfig.tests;

	switch (runType) {
		case 'smoke':
			testCount = 5;
			modelCount = 1;
			models = ['xiaomi'];
			timeEstimate = testCount * appConfig.avgSecondsPerTest;
			description = 'Quick smoke test - 5 tests, fastest model';
			break;
		case 'model':
			testCount = allTests.length || 236;
			modelCount = 1;
			models = formData.modelName ? [formData.modelName] : [];
			timeEstimate = testCount * appConfig.avgSecondsPerTest;
			description = `All tests against ${formData.modelName}`;
			break;
		case 'full':
			testCount = allTests.length || 236;
			modelCount = 4;
			models = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'];
			timeEstimate = testCount * modelCount * appConfig.avgSecondsPerTest;
			description = 'Full suite - all tests, all models';
			break;
		case 'pattern':
			testCount = 10; // Estimate - we'd need to actually filter to know
			modelCount = 4;
			models = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'];
			timeEstimate = testCount * modelCount * appConfig.avgSecondsPerTest;
			description = `Tests matching pattern '${formData.pattern}'`;
			break;
		case 'first':
			testCount = formData.count ?? 10;
			modelCount = formData.modelName ? 1 : 4;
			models = formData.modelName
				? [formData.modelName]
				: ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'];
			timeEstimate = testCount * modelCount * appConfig.avgSecondsPerTest;
			description = `First ${testCount} tests`;
			if (formData.modelName) {
				description += `, ${formData.modelName} model`;
			}
			break;
		case 'retry':
			testCount = 10; // Estimate
			modelCount = 4;
			models = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'];
			timeEstimate = testCount * modelCount * appConfig.avgSecondsPerTest;
			description = 'Retrying failures from last run';
			break;
	}

	const estimatedTokens = testCount * modelCount * appConfig.avgTokensPerTest;

	// Filter tests based on run type
	let filteredTests = allTests;
	if (runType === 'smoke' || runType === 'first') {
		filteredTests = allTests.slice(0, testCount);
	}
	// For pattern, we'd need to actually filter by regex, but that's complex
	// For now just show all and note it's an estimate

	return {
		success: true,
		description,
		testCount: filteredTests.length,
		modelCount,
		models: models.map((m) => MODEL_DISPLAY_NAMES[m] || m),
		estimatedTime: timeEstimate,
		estimatedCost: '$0.00 (free tier)',
		estimatedTokens,
		cacheEnabled: !formData.noCache,
		tests: filteredTests.map((test) => ({
			description: test.description,
			prompt: test.prompt,
			assertionCount: test.assertions.length
		}))
	};
}

/**
 * Sanitizes output to prevent API key leakage
 */
function sanitizeOutput(output: string): string {
	// Filter out potential API keys (OpenRouter format: sk-...)
	return output.replace(/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED]');
}

export const actions: Actions = {
	run: async ({ request }) => {
		const form = await superValidate(request, zod(evalFormSchema as any));

		if (!form.valid) {
			return { form };
		}

		// Additional custom validation
		const validationErrors = validateEvalForm(form.data as EvalFormSchema);
		if (validationErrors) {
			Object.entries(validationErrors).forEach(([field, msgs]) => {
				(form.errors as any)[field] = msgs;
			});
			form.valid = false;
			return { form };
		}

		// Validate API key exists before spawning
		if (!process.env.OPENROUTER_API_KEY) {
			return {
				form,
				result: {
					success: false,
					error: 'API key not configured. Please check server environment variables.'
				}
			};
		}

		// Check if we can start a new evaluation
		if (!evalManager.canStartNew()) {
			return {
				form,
				result: {
					success: false,
					error: `Maximum concurrent evaluations (${appConfig.maxConcurrentEvaluations}) reached. Please wait for current evaluations to complete.`
				}
			};
		}

		const formData = form.data as EvalFormSchema;
		const commandArgs = buildCommandArgs(formData);
		const scriptPath = join(PROJECT_ROOT, 'scripts', 'run-eval.ts');
		const runType = formData.runType;
		const timeoutMs =
			appConfig.evaluationTimeouts[runType as keyof typeof appConfig.evaluationTimeouts] ||
			appConfig.evaluationTimeouts.full;
		const evalId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

		return new Promise((resolve) => {
			const child = spawn('tsx', [scriptPath, ...commandArgs], {
				cwd: PROJECT_ROOT,
				env: { ...process.env },
				stdio: ['ignore', 'pipe', 'pipe']
			});

			// Register with eval manager
			try {
				evalManager.register(evalId, child, commandArgs.join(' '), timeoutMs);
			} catch (error) {
				child.kill();
				resolve({
					form,
					result: {
						success: false,
						error: error instanceof Error ? error.message : 'Failed to register evaluation'
					}
				});
				return;
			}

			let stdout = '';
			let stderr = '';

			child.stdout?.on('data', (data) => {
				const output = data.toString();
				const sanitized = sanitizeOutput(output);
				stdout += sanitized;
			});

			child.stderr?.on('data', (data) => {
				const output = data.toString();
				const sanitized = sanitizeOutput(output);
				stderr += sanitized;
			});

			child.on('close', (code) => {
				evalManager.unregister(evalId);
				const results = parseResults();

				if (code !== 0) {
					resolve({
						form,
						result: {
							success: false,
							error: sanitizeOutput(stderr) || `Process exited with code ${code}`
						}
					});
					return;
				}

				resolve({
					form,
					result: results || {
						success: false,
						error: 'No results found'
					}
				});
			});

			child.on('error', (error) => {
				evalManager.unregister(evalId);
				resolve({
					form,
					result: {
						success: false,
						error: `Failed to start evaluation: ${error.message}`
					}
				});
			});
		});
	},
	
	preview: async ({ request }) => {
		const form = await superValidate(request, zod(evalFormSchema as any));

		if (!form.valid) {
			return { form };
		}

		// Additional custom validation
		const validationErrors = validateEvalForm(form.data as EvalFormSchema);
		if (validationErrors) {
			Object.entries(validationErrors).forEach(([field, msgs]) => {
				(form.errors as any)[field] = msgs;
			});
			form.valid = false;
			return { form };
		}

		const preview = await getPreviewInfo(form.data as EvalFormSchema);

		return {
			form,
			preview
		};
	}
};
