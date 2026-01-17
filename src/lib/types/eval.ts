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
