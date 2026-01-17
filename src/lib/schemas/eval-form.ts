import { z } from 'zod';
import { MODEL_OPTIONS, isValidModel } from '$lib/constants/models';

export { MODEL_OPTIONS };

/**
 * Consolidated validation schema with all validation logic in Zod
 */
export const evalFormSchema = z
	.object({
		runType: z.enum(['smoke', 'model', 'full', 'pattern', 'first', 'retry']),
		modelName: z.string().optional(),
		pattern: z.string().optional(),
		count: z.number().int().positive().optional(),
		noCache: z.boolean().default(false),
		verbose: z.boolean().default(false),
		noHtml: z.boolean().default(false)
	})
	.superRefine((data, ctx) => {
		// Model name validation for 'model' run type
		if (data.runType === 'model') {
			if (!data.modelName || data.modelName === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['modelName'],
					message: 'Model name is required for model run type'
				});
			} else if (!isValidModel(data.modelName)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['modelName'],
					message: 'Invalid model name'
				});
			}
		}

		// Pattern validation for 'pattern' run type
		if (data.runType === 'pattern') {
			if (!data.pattern || data.pattern === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['pattern'],
					message: 'Pattern is required for pattern run type'
				});
			}
		}

		// Count validation for 'first' run type
		if (data.runType === 'first') {
			if (data.count === undefined || data.count <= 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['count'],
					message: 'Count is required for first run type'
				});
			}
		}

		// Model name validation for optional model in 'first' run type
		if (data.modelName && data.modelName !== '' && !isValidModel(data.modelName)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['modelName'],
				message: 'Invalid model name'
			});
		}
	});

export type EvalFormSchema = z.infer<typeof evalFormSchema>;

/**
 * @deprecated Use Zod schema validation instead. This function is kept for backward compatibility
 * but validation should be handled by the schema's superRefine method.
 */
export function validateEvalForm(data: EvalFormSchema): Record<string, string[]> | null {
	// Validation is now handled by Zod schema superRefine
	// This function returns null to indicate no additional validation needed
	return null;
}
