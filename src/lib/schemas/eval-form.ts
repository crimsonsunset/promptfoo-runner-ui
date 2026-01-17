import { z } from 'zod';

export const MODEL_OPTIONS = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'] as const;

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
		if (data.runType === 'model') {
			if (!data.modelName || data.modelName === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Model name is required for model run type',
					path: ['modelName']
				});
			}
		}
		
		if (data.runType === 'pattern') {
			if (!data.pattern || data.pattern === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Pattern is required for pattern run type',
					path: ['pattern']
				});
			}
		}
		
		if (data.runType === 'first') {
			if (data.count === undefined || data.count <= 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Count is required for first run type',
					path: ['count']
				});
			}
		}
		
		if (data.modelName && !MODEL_OPTIONS.includes(data.modelName as any)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid model name',
				path: ['modelName']
			});
		}
	});

export type EvalFormSchema = z.infer<typeof evalFormSchema>;
