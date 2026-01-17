import { z } from 'zod';

export const MODEL_OPTIONS = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'] as const;

export const evalFormSchema = z.object({
	runType: z.enum(['smoke', 'model', 'full', 'pattern', 'first', 'retry']),
	modelName: z.string().optional(),
	pattern: z.string().optional(),
	count: z.number().int().positive().optional(),
	noCache: z.boolean().default(false),
	verbose: z.boolean().default(false),
	noHtml: z.boolean().default(false)
});

export type EvalFormSchema = z.infer<typeof evalFormSchema>;

/**
 * Validates form data and returns validation errors if any
 */
export function validateEvalForm(data: EvalFormSchema): Record<string, string[]> | null {
	const errors: Record<string, string[]> = {};
	
	if (data.runType === 'model') {
		if (!data.modelName || data.modelName === '') {
			errors.modelName = ['Model name is required for model run type'];
		}
	}
	
	if (data.runType === 'pattern') {
		if (!data.pattern || data.pattern === '') {
			errors.pattern = ['Pattern is required for pattern run type'];
		}
	}
	
	if (data.runType === 'first') {
		if (data.count === undefined || data.count <= 0) {
			errors.count = ['Count is required for first run type'];
		}
	}
	
	if (data.modelName && !MODEL_OPTIONS.includes(data.modelName as any)) {
		errors.modelName = ['Invalid model name'];
	}
	
	return Object.keys(errors).length > 0 ? errors : null;
}
