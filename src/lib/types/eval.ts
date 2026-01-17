export type RunType = 'smoke' | 'model' | 'full' | 'pattern' | 'first' | 'retry';

export interface EvalResult {
	success: boolean;
	passRate?: number;
	totalTests?: number;
	passedTests?: number;
	failedTests?: number;
	htmlReportPath?: string;
	error?: string;
}

export interface EvalProgress {
	running: boolean;
	output: string[];
	elapsedSeconds: number;
}

export interface EvalPreview {
	success: boolean;
	description: string;
	testCount: number;
	modelCount: number;
	models: string[];
	estimatedTime: number;
	estimatedCost: string;
	estimatedTokens: number;
	cacheEnabled: boolean;
	tests?: Array<{
		description: string;
		prompt: string;
		assertionCount: number;
	}>;
	error?: string;
}
