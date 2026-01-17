<script lang="ts">
	import type { EvaluationError, ErrorCode } from '$lib/utils/error-handling';
	import { ErrorCodes } from '$lib/utils/error-handling';

	interface Props {
		error: EvaluationError | Error | string;
		title?: string;
	}

	let { error, title = 'Error' }: Props = $props();

	function getErrorCode(error: unknown): ErrorCode {
		if (error instanceof Error && 'code' in error) {
			const code = (error as EvaluationError).code;
			// Validate that code is a valid ErrorCode
			if (code && Object.values(ErrorCodes).includes(code as ErrorCode)) {
				return code as ErrorCode;
			}
		}
		return ErrorCodes.UNKNOWN_ERROR;
	}

	function getErrorMessage(error: unknown): string {
		if (typeof error === 'string') {
			return error;
		}
		if (error instanceof Error) {
			return error.message;
		}
		return 'An unexpected error occurred';
	}

	function getErrorIcon(code: ErrorCode): string {
		switch (code) {
			case ErrorCodes.VALIDATION_ERROR:
				return '⚠️';
			case ErrorCodes.API_KEY_MISSING:
			case ErrorCodes.ENVIRONMENT_ERROR:
				return '🔑';
			case ErrorCodes.TIMEOUT_ERROR:
				return '⏱️';
			case ErrorCodes.CONCURRENT_LIMIT_ERROR:
				return '🚫';
			case ErrorCodes.PROCESS_ERROR:
			case ErrorCodes.PARSE_ERROR:
				return '❌';
			default:
				return '⚠️';
		}
	}

	const errorCode = $derived(getErrorCode(error));
	const errorMessage = $derived(getErrorMessage(error));
	const errorIcon = $derived(getErrorIcon(errorCode));
</script>

<div class="alert alert-error">
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
			d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
		/>
	</svg>
	<div class="flex-1">
		<h3 class="font-bold">{title}</h3>
		<div class="text-sm">{errorMessage}</div>
	</div>
</div>
