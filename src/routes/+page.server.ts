import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { evalFormSchema, MODEL_OPTIONS } from '$lib/schemas/eval-form';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, readdirSync } from 'fs';
import type { Actions, PageServerLoad } from './$types';
import type { EvalResult } from '$lib/types/eval';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const EVALS_DIR = join(PROJECT_ROOT, 'tests/llm-evals');
const REPORTS_DIR = join(EVALS_DIR, 'reports');
const OUTPUT_JSON = join(EVALS_DIR, 'output.json');

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(evalFormSchema));
	return { form };
};

function buildCommandArgs(formData: {
	runType: string;
	modelName?: string;
	pattern?: string;
	count?: number;
	noCache: boolean;
	verbose: boolean;
	noHtml: boolean;
}): string[] {
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

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(evalFormSchema));

		if (!form.valid) {
			return { form };
		}

		const commandArgs = buildCommandArgs(form.data);
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
	}
};
