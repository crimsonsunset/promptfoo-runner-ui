<script lang="ts">
	import type { EvalPreview } from '$lib/types/eval';

	let { preview }: { preview: EvalPreview } = $props();

	import { PROMPT_MARKERS } from '$lib/constants/app.constants';

	function extractPromptPreview(prompt: string): { venue?: string; userSays?: string; charCount: number } {
		const lines = prompt.split('\n');
		const venueLine = lines.find((l) => l.startsWith(PROMPT_MARKERS.VENUE));
		const userLine = lines.find((l) => l.startsWith(PROMPT_MARKERS.USER_SAYS));
		
		return {
			venue: venueLine,
			userSays: userLine,
			charCount: prompt.length
		};
	}
</script>

<div class="card bg-base-200 shadow-xl h-fit max-h-[calc(100vh-8rem)] flex flex-col">
	<div class="card-body flex-1 overflow-hidden flex flex-col">
		<div class="mb-4 flex-shrink-0">
			<h2 class="card-title text-2xl">👁 Preview</h2>
		</div>

		<div class="space-y-6 overflow-y-auto flex-1">
			<!-- Description -->
			<div class="flex-shrink-0">
				<h3 class="text-lg font-semibold mb-2">Evaluation Run</h3>
				<p class="text-sm opacity-80">{preview.description}</p>
			</div>

			<!-- Key Metrics -->
			<div class="stats stats-vertical shadow w-full flex-shrink-0">
				<div class="stat">
					<div class="stat-title">Tests</div>
					<div class="stat-value text-primary">{preview.testCount}</div>
				</div>

				<div class="stat">
					<div class="stat-title">Models</div>
					<div class="stat-value text-secondary">{preview.modelCount}</div>
					<div class="stat-desc text-xs mt-1">
						{#each preview.models as model}
							<div>{model}</div>
						{/each}
					</div>
				</div>

				<div class="stat">
					<div class="stat-title">Estimated Time</div>
					<div class="stat-value text-accent">~{preview.estimatedTime}s</div>
				</div>

				<div class="stat">
					<div class="stat-title">Estimated Tokens</div>
					<div class="stat-value text-sm">~{preview.estimatedTokens.toLocaleString()}</div>
				</div>
			</div>

			<!-- Additional Info -->
			<div class="space-y-3 flex-shrink-0">
				<div class="flex items-center justify-between p-3 bg-base-100 rounded-lg">
					<span class="font-semibold">Cost</span>
					<span class="badge badge-success">{preview.estimatedCost}</span>
				</div>
				<div class="flex items-center justify-between p-3 bg-base-100 rounded-lg">
					<span class="font-semibold">Cache</span>
					<span class="badge {preview.cacheEnabled ? 'badge-info' : 'badge-warning'}">
						{preview.cacheEnabled ? 'Enabled' : 'Disabled'}
					</span>
				</div>
			</div>

			<!-- Warning for Full Suite -->
			{#if preview.testCount > 100}
				<div class="alert alert-warning flex-shrink-0">
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
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					<span class="text-sm">Large evaluation - may take significant time</span>
				</div>
			{/if}

			<!-- Test Details -->
			{#if preview.tests && preview.tests.length > 0}
				<div class="divider flex-shrink-0">Test Details</div>

				<div class="space-y-4">
					{#each preview.tests as test, idx}
						{@const promptPreview = extractPromptPreview(test.prompt)}
						<div class="card bg-base-100 shadow">
							<div class="card-body p-4">
								<h4 class="font-semibold text-sm">
									Test #{idx + 1}: {test.description}
								</h4>

								<div class="text-xs space-y-2 mt-2">
									<!-- Prompt Preview -->
									<div>
										<span class="font-semibold opacity-70">Prompt:</span>
										<div class="ml-2 space-y-1">
											{#if promptPreview.venue}
												<div class="opacity-80">{promptPreview.venue}</div>
											{/if}
											{#if promptPreview.userSays}
												<div class="opacity-80">{promptPreview.userSays}</div>
											{/if}
											<div class="opacity-60">({promptPreview.charCount} characters total)</div>
										</div>
									</div>

									<!-- Assertions -->
									<div>
										<span class="font-semibold opacity-70">Assertions ({test.assertionCount}):</span>
										<div class="ml-2">
											{test.assertionCount} assertion{test.assertionCount !== 1 ? 's' : ''} will be evaluated
										</div>
									</div>

									<!-- Models -->
									<div>
										<span class="font-semibold opacity-70">Models to test:</span>
										<div class="ml-2 opacity-80">
											{preview.models.join(', ')}
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<div class="text-center text-sm opacity-70 py-4 flex-shrink-0">
					Ready to run? Click "Run Evaluation" to execute.
				</div>
			{/if}
		</div>
	</div>
</div>
