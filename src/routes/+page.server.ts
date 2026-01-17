import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { evalFormSchema, validateEvalForm, MODEL_OPTIONS, type EvalFormSchema } from '$lib/schemas/eval-form';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, readdirSync } from 'fs';
import type { Actions, PageServerLoad } from './$types';
import type { EvalResult, EvalPreview } from '$lib/types/eval';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const EVALS_DIR = join(PROJECT_ROOT, 'tests/llm-evals');
const REPORTS_DIR = join(EVALS_DIR, 'reports');
const OUTPUT_JSON = join(EVALS_DIR, 'output.json');

const MODEL_DISPLAY_NAMES: Record<string, string> = {
	xiaomi: 'xiaomi/mimo-v2-flash:free',
	gemini: 'google/gemini-2.0-flash-exp:free',
	'gpt-oss-20b': 'openai/gpt-oss-20b:free',
	'gpt-oss-120b': 'openai/gpt-oss-120b:free'
};

export const load: PageServerLoad = async () => {
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

function getPreviewInfo(formData: EvalFormSchema): EvalPreview {
	const runType = formData.runType;
	let testCount = 0;
	let modelCount = 1;
	let timeEstimate = 0;
	let models: string[] = [];
	let description = '';

	switch (runType) {
		case 'smoke':
			testCount = 5;
			modelCount = 1;
			models = ['xiaomi'];
			timeEstimate = 25;
			description = 'Quick smoke test - 5 tests, fastest model';
			break;
		case 'model':
			testCount = 236;
			modelCount = 1;
			models = formData.modelName ? [formData.modelName] : [];
			timeEstimate = testCount * 5;
			description = `All tests against ${formData.modelName}`;
			break;
		case 'full':
			testCount = 236;
			modelCount = 4;
			models = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'];
			timeEstimate = testCount * modelCount * 5;
			description = 'Full suite - all tests, all models';
			break;
		case 'pattern':
			testCount = 10; // Estimate
			modelCount = 4;
			models = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'];
			timeEstimate = testCount * modelCount * 5;
			description = `Tests matching pattern '${formData.pattern}'`;
			break;
		case 'first':
			testCount = formData.count ?? 10;
			modelCount = formData.modelName ? 1 : 4;
			models = formData.modelName ? [formData.modelName] : ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'];
			timeEstimate = testCount * modelCount * 5;
			description = `First ${testCount} tests`;
			if (formData.modelName) {
				description += `, ${formData.modelName} model`;
			}
			break;
		case 'retry':
			testCount = 10; // Estimate
			modelCount = 4;
			models = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'];
			timeEstimate = testCount * modelCount * 5;
			description = 'Retrying failures from last run';
			break;
	}

	const estimatedTokens = testCount * modelCount * 1000;

	return {
		success: true,
		description,
		testCount,
		modelCount,
		models: models.map((m) => MODEL_DISPLAY_NAMES[m] || m),
		estimatedTime: timeEstimate,
		estimatedCost: '$0.00 (free tier)',
		estimatedTokens,
		cacheEnabled: !formData.noCache
	};
}

export const actions: Actions = {
	default: async ({ request }) => {
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

		const commandArgs = buildCommandArgs(form.data as EvalFormSchema);
		const scriptPath = join(PROJECT_ROOT, 'scripts', 'run-eval.ts');

		return new Promise((resolve) => {
			const child = spawn('tsx', [scriptPath, ...commandArgs], {
				cwd: PROJECT_ROOT,
				env: { ...process.env },
				stdio: ['ignore', 'pipe', 'pipe']
			});

			let stdout = '';
			let stderr = '';

			// Set a timeout (30 minutes max for full suite)
			const timeout = setTimeout(() => {
				child.kill();
				resolve({
					form,
					result: {
						success: false,
						error: 'Evaluation timed out after 30 minutes'
					}
				});
			}, 30 * 60 * 1000);

			child.stdout?.on('data', (data) => {
				stdout += data.toString();
			});

			child.stderr?.on('data', (data) => {
				stderr += data.toString();
			});

			child.on('close', (code) => {
				clearTimeout(timeout);
				const results = parseResults();

				if (code !== 0) {
					resolve({
						form,
						result: {
							success: false,
							error: stderr || `Process exited with code ${code}`
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
				clearTimeout(timeout);
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

		const preview = getPreviewInfo(form.data as EvalFormSchema);
		
		return {
			form,
			preview
		};
	}
};
