<script lang="ts">
	import { superForm, type SuperValidated } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import {
		evalFormSchema,
		type EvalFormSchema,
		MODEL_OPTIONS,
		validateEvalForm
	} from '$lib/schemas/eval-form';
	import type { PageData } from './$types';
	import type { EvalPreview, EvalResult } from '$lib/types/eval';
	import EvalPreviewComponent from '$lib/components/EvalPreview.svelte';
	import { debounce } from '$lib/utils/debounce';
	import { appConfig } from '../../app.config.js';

	let { data = $bindable() }: { data: PageData } = $props();

	const {
		form,
		errors,
		enhance: superEnhance,
		submitting,
		reset,
		delayed
	} = superForm<EvalFormSchema>(data.form as SuperValidated<EvalFormSchema>, {
		validators: zodClient(evalFormSchema as any),
		resetForm: false,
		onUpdate: ({ form }) => {
			if (form.valid) {
				const validationErrors = validateEvalForm(form.data);
				if (validationErrors) {
					Object.entries(validationErrors).forEach(([field, msgs]) => {
						(form.errors as any)[field] = msgs;
					});
					form.valid = false;
				}
			}
		},
		onResult: ({ result }) => {
			if (result.type === 'success') {
				if (result.data?.result) {
					evalResult = result.data.result as EvalResult;
					evalPreview = null;
				} else if (result.data?.preview) {
					evalPreview = result.data.preview as EvalPreview;
					evalResult = null;
				}
			} else if (result.type === 'failure') {
				evalResult = {
					success: false,
					error: 'Failed to execute evaluation. Please try again.'
				};
			}
		},
		onError: ({ result }) => {
			evalResult = {
				success: false,
				error: result.error?.message || 'An error occurred'
			};
		}
	});

	let evalResult = $state<EvalResult | null>(null);
	let evalPreview = $state<EvalPreview | null>(null);
	let isRunning = $derived($submitting);
	let isLoadingPreview = $state(false);

	async function updatePreview() {
		isLoadingPreview = true;
		try {
			const formData = new FormData();
			formData.append('runType', $form.runType || appConfig.defaultRunType);
			if ($form.modelName) formData.append('modelName', $form.modelName);
			if ($form.pattern) formData.append('pattern', $form.pattern);
			if ($form.count) formData.append('count', $form.count.toString());
			formData.append('noCache', String($form.noCache));
			formData.append('verbose', String($form.verbose));
			formData.append('noHtml', String($form.noHtml));

			const response = await fetch('?/preview', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();
			if (result.type === 'success' && result.data?.preview) {
				evalPreview = result.data.preview as EvalPreview;
			}
		} catch (error) {
			// Silently fail - preview is optional
		} finally {
			isLoadingPreview = false;
		}
	}

	// Debounced preview updater
	const debouncedUpdatePreview = debounce(updatePreview, appConfig.previewDebounceMs);

	// Auto-update preview when form changes (debounced)
	$effect(() => {
		// Watch form changes
		const _ = $form.runType + $form.modelName + $form.pattern + String($form.count);

		if (!isRunning && !evalResult) {
			debouncedUpdatePreview();
		}
	});

	function resetForm(force = false) {
		if (force) {
			// Hard reset - reload page to clear any stuck state
			window.location.href = window.location.href.split('?')[0];
			return;
		}

		// Normal reset
		evalResult = null;
		evalPreview = null;
		reset();

		// Reset to defaults from config
		$form.runType = appConfig.defaultRunType;
		$form.modelName = undefined;
		$form.pattern = undefined;
		$form.count = undefined;
		$form.noCache = !appConfig.defaultCache;
		$form.verbose = appConfig.defaultVerbose;
		$form.noHtml = appConfig.defaultNoHtml;
	}

	function getModelDisplayName(model: string): string {
		const displayNames: Record<string, string> = {
			xiaomi: 'xiaomi/mimo-v2-flash:free',
			gemini: 'google/gemini-2.0-flash-exp:free',
			'gpt-oss-20b': 'openai/gpt-oss-20b:free',
			'gpt-oss-120b': 'openai/gpt-oss-120b:free'
		};
		return displayNames[model] || model;
	}
</script>

<svelte:head>
	<title>LLM Evaluation Runner</title>
</svelte:head>

<div class="min-h-screen w-full flex items-center justify-center p-6">
	<div class="w-full max-w-7xl">
		<div class="grid grid-cols-2 gap-6">
			<!-- Main Form Card -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h1 class="card-title text-3xl mb-6">🧪 LLM Evaluation Runner</h1>

					{#if evalResult}
						<div class="alert alert-success mb-6">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="stroke-current shrink-0 h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<div class="flex-1">
								<h3 class="font-bold">Evaluation Complete</h3>
								{#if evalResult.success && evalResult.passRate !== undefined}
									<div class="text-sm">
										<p>
											<strong>Pass Rate:</strong>
											{evalResult.passRate.toFixed(1)}% ({evalResult.passedTests}/{evalResult.totalTests}
											passed)
										</p>
										{#if evalResult.htmlReportPath}
											<p class="mt-2">
												<a href={evalResult.htmlReportPath} target="_blank" class="link link-primary">
													📊 Open HTML Report
												</a>
											</p>
										{/if}
									</div>
								{:else if evalResult.error}
									<div class="text-sm text-error">{evalResult.error}</div>
								{/if}
							</div>
							<button class="btn btn-sm btn-ghost" onclick={() => resetForm()}>Run Another</button>
						</div>
					{:else if isRunning}
						<div class="alert alert-info mb-6">
							<span class="loading loading-spinner loading-sm"></span>
							<div class="flex-1">
								<h3 class="font-bold">Running Evaluation...</h3>
								<p class="text-sm">This may take several minutes. Please wait...</p>
								<p class="text-xs opacity-70 mt-1">If stuck, click Cancel to reset</p>
							</div>
							<button class="btn btn-sm btn-ghost" onclick={() => resetForm(true)}>Cancel</button>
						</div>
					{/if}

					<form method="POST" use:superEnhance>
						<div class="space-y-6">
							<!-- Run Type Selector -->
							<div class="form-control w-full">
								<label class="label" for="runType">
									<span class="label-text font-semibold">Run Type</span>
								</label>
								<select
									id="runType"
									class="select select-bordered w-full"
									bind:value={$form.runType}
									disabled={isRunning}
								>
									<option value="smoke">Smoke Test - Quick test (5 tests, fastest model)</option>
									<option value="model">Model - All tests against one model</option>
									<option value="full">Full Suite - All tests, all models</option>
									<option value="pattern">Pattern - Filter tests by description</option>
									<option value="first">First - Run first N tests</option>
									<option value="retry">Retry - Retry failures from last run</option>
								</select>
								{#if $errors.runType}
									<div class="label">
										<span class="label-text-alt text-error">{$errors.runType}</span>
									</div>
								{/if}
							</div>

							<!-- Dynamic Fields Based on Run Type -->
							{#if $form.runType === 'model'}
								<div class="form-control w-full">
									<label class="label">
										<span class="label-text font-semibold">Model</span>
									</label>
									<select
										class="select select-bordered w-full"
										bind:value={$form.modelName}
										disabled={isRunning}
									>
										<option value="">Select a model</option>
										{#each MODEL_OPTIONS as model}
											<option value={model}>{getModelDisplayName(model)}</option>
										{/each}
									</select>
									{#if $errors.modelName}
										<label class="label">
											<span class="label-text-alt text-error">{$errors.modelName}</span>
										</label>
									{/if}
								</div>
							{:else if $form.runType === 'pattern'}
								<div class="form-control w-full">
									<label class="label">
										<span class="label-text font-semibold">Pattern (Regex)</span>
									</label>
									<input
										type="text"
										class="input input-bordered w-full"
										bind:value={$form.pattern}
										placeholder="e.g., incomplete"
										disabled={isRunning}
									/>
									{#if $errors.pattern}
										<label class="label">
											<span class="label-text-alt text-error">{$errors.pattern}</span>
										</label>
									{/if}
								</div>
							{:else if $form.runType === 'first'}
								<div class="form-control w-full">
									<label class="label">
										<span class="label-text font-semibold">Count</span>
									</label>
									<input
										type="number"
										class="input input-bordered w-full"
										bind:value={$form.count}
										min="1"
										placeholder="Number of tests to run"
										disabled={isRunning}
									/>
									{#if $errors.count}
										<label class="label">
											<span class="label-text-alt text-error">{$errors.count}</span>
										</label>
									{/if}
								</div>
								<div class="form-control w-full">
									<label class="label">
										<span class="label-text font-semibold">Model (Optional)</span>
									</label>
									<select
										class="select select-bordered w-full"
										bind:value={$form.modelName}
										disabled={isRunning}
									>
										<option value="">All models</option>
										{#each MODEL_OPTIONS as model}
											<option value={model}>{getModelDisplayName(model)}</option>
										{/each}
									</select>
								</div>
							{/if}

							<!-- Options Checkboxes -->
							<div class="form-control space-y-2">
								<label class="label">
									<span class="label-text font-semibold">Options</span>
								</label>
								<label class="label cursor-pointer">
									<span class="label-text">Force fresh API calls (--no-cache)</span>
									<input
										type="checkbox"
										class="checkbox checkbox-primary"
										bind:checked={$form.noCache}
										disabled={isRunning}
									/>
								</label>
								<label class="label cursor-pointer">
									<span class="label-text">Extra logging (--verbose)</span>
									<input
										type="checkbox"
										class="checkbox checkbox-primary"
										bind:checked={$form.verbose}
										disabled={isRunning}
									/>
								</label>
								<label class="label cursor-pointer">
									<span class="label-text">Skip HTML report (--no-html)</span>
									<input
										type="checkbox"
										class="checkbox checkbox-primary"
										bind:checked={$form.noHtml}
										disabled={isRunning}
									/>
								</label>
							</div>

							<!-- Submit Button -->
							<div class="form-control mt-6">
								<button
									type="submit"
									formaction="?/run"
									class="btn btn-primary btn-lg w-full"
									disabled={isRunning}
								>
									{#if isRunning}
										<span class="loading loading-spinner loading-sm"></span>
										Running Evaluation...
									{:else}
										▶ Run Evaluation
									{/if}
								</button>
							</div>
						</div>
					</form>
				</div>
			</div>

			<!-- Preview Sidebar (Always Visible) -->
			{#if evalPreview}
				<EvalPreviewComponent preview={evalPreview} />
			{:else}
				<div class="card bg-base-200 shadow-xl h-fit">
					<div class="card-body">
						<h2 class="card-title text-2xl">👁 Preview</h2>
						<div class="flex items-center justify-center py-12">
							{#if isLoadingPreview}
								<span class="loading loading-spinner loading-lg"></span>
							{:else}
								<p class="text-sm opacity-70">Select options to see preview</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
