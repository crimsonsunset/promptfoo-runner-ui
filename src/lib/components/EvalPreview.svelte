<script lang="ts">
	import type { EvalPreview } from '$lib/types/eval';

	let { preview, onClose }: { preview: EvalPreview; onClose: () => void } = $props();
</script>

<div class="card bg-base-200 shadow-xl h-fit">
	<div class="card-body">
		<div class="flex items-start justify-between mb-4">
			<h2 class="card-title text-2xl">👁 Preview</h2>
			<button class="btn btn-sm btn-circle btn-ghost" onclick={onClose}>✕</button>
		</div>

		<div class="space-y-6">
			<!-- Description -->
			<div>
				<h3 class="text-lg font-semibold mb-2">Evaluation Run</h3>
				<p class="text-sm opacity-80">{preview.description}</p>
			</div>

			<!-- Key Metrics -->
			<div class="stats stats-vertical shadow w-full">
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
			<div class="space-y-3">
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
				<div class="alert alert-warning">
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
		</div>
	</div>
</div>
