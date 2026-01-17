import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { evalFormSchema, type EvalFormSchema } from '$lib/schemas/eval-form';
import { spawn } from 'child_process';
import { join } from 'path';
import { config as loadEnv } from 'dotenv';
import type { Actions, PageServerLoad } from './$types';
import type { EvalResult, EvalPreview } from '$lib/types/eval';
import { appConfig } from '$lib/constants/app.config.js';
import { evalManager } from '$lib/server/eval-manager';
import { evaluationService } from '$lib/server/services/evaluation.service';
import { ErrorCodes, createEvaluationError } from '$lib/utils/error-handling';
import { PROJECT_ROOT, SCRIPTS_DIR, ENV_FILE_PATH } from '$lib/constants/app.constants.server.js';
import { EXECUTABLES } from '$lib/constants/cli.constants';

// Load .env file explicitly (SvelteKit should do this automatically, but ensure it's loaded)
loadEnv({ path: ENV_FILE_PATH });

export const load: PageServerLoad = async () => {
	// Validate environment on server load (non-blocking)
	// Only warn in dev - actual validation happens when running evaluations
	if (!process.env.OPENROUTER_API_KEY) {
		console.warn(
			'⚠️  OPENROUTER_API_KEY not found. Create a .env file with your API key to run evaluations.'
		);
	}

	const form = await superValidate(zod(evalFormSchema as any));
	return { form };
};





export const actions: Actions = {
	run: async ({ request }) => {
		const form = await superValidate(request, zod(evalFormSchema as any));

		if (!form.valid) {
			return { form };
		}

		// Validate API key exists before spawning
		if (!process.env.OPENROUTER_API_KEY) {
			const error = createEvaluationError(
				new Error('API key not configured'),
				ErrorCodes.API_KEY_MISSING
			);
			return {
				form,
				result: {
					success: false,
					error: error.message
				}
			};
		}

		// Check if we can start a new evaluation
		if (!evalManager.canStartNew()) {
			const error = createEvaluationError(
				new Error(`Maximum concurrent evaluations (${appConfig.maxConcurrentEvaluations}) reached`),
				ErrorCodes.CONCURRENT_LIMIT_ERROR
			);
			return {
				form,
				result: {
					success: false,
					error: error.message
				}
			};
		}

		const formData = form.data as EvalFormSchema;
		const commandArgs = evaluationService.buildCommandArgs(formData);
		const scriptPath = join(SCRIPTS_DIR, 'run-eval.ts');
		const runType = formData.runType;
		const timeoutMs =
			appConfig.evaluationTimeouts[runType as keyof typeof appConfig.evaluationTimeouts] ||
			appConfig.evaluationTimeouts.full;
		const evalId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

		return new Promise((resolve) => {
			const child = spawn(EXECUTABLES.TSX, [scriptPath, ...commandArgs], {
				cwd: PROJECT_ROOT,
				env: { ...process.env },
				stdio: ['ignore', 'pipe', 'pipe']
			});

			// Register with eval manager
			try {
				evalManager.register(evalId, child, commandArgs.join(' '), timeoutMs);
			} catch (error) {
				child.kill();
				const evalError = createEvaluationError(
					error instanceof Error ? error : new Error('Failed to register evaluation'),
					ErrorCodes.PROCESS_ERROR
				);
				resolve({
					form,
					result: {
						success: false,
						error: evalError.message
					}
				});
				return;
			}

			let stdout = '';
			let stderr = '';

			child.stdout?.on('data', (data) => {
				const output = data.toString();
				const sanitized = evaluationService.sanitizeOutput(output);
				stdout += sanitized;
			});

			child.stderr?.on('data', (data) => {
				const output = data.toString();
				const sanitized = evaluationService.sanitizeOutput(output);
				stderr += sanitized;
			});

			child.on('close', (code) => {
				evalManager.unregister(evalId);

				if (code !== 0) {
					const error = createEvaluationError(
						new Error(evaluationService.sanitizeOutput(stderr) || `Process exited with code ${code}`),
						ErrorCodes.PROCESS_ERROR
					);
					resolve({
						form,
						result: {
							success: false,
							error: error.message
						}
					});
					return;
				}

				try {
					const results = evaluationService.getResults();
					resolve({
						form,
						result: results
					});
				} catch (error) {
					const evalError = createEvaluationError(error, ErrorCodes.PARSE_ERROR);
					resolve({
						form,
						result: {
							success: false,
							error: evalError.message
						}
					});
				}
			});

			child.on('error', (error) => {
				evalManager.unregister(evalId);
				const evalError = createEvaluationError(error, ErrorCodes.PROCESS_ERROR);
				resolve({
					form,
					result: {
						success: false,
						error: evalError.message
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

		const preview = await evaluationService.getPreview(form.data as EvalFormSchema);

		return {
			form,
			preview
		};
	}
};
