import type { ChildProcess } from 'child_process';
import { appConfig } from '../../../app.config.js';

interface ActiveEvaluation {
	id: string;
	process: ChildProcess;
	startTime: number;
	command: string;
	timeout: NodeJS.Timeout;
}

class EvaluationManager {
	private activeEvaluations = new Map<string, ActiveEvaluation>();
	private readonly maxConcurrent: number;

	constructor(maxConcurrent: number) {
		this.maxConcurrent = maxConcurrent;
		this.setupCleanupHandlers();
	}

	canStartNew(): boolean {
		return this.activeEvaluations.size < this.maxConcurrent;
	}

	getActiveCount(): number {
		return this.activeEvaluations.size;
	}

	register(id: string, process: ChildProcess, command: string, timeoutMs: number): void {
		if (!this.canStartNew()) {
			throw new Error(`Max concurrent evaluations (${this.maxConcurrent}) reached`);
		}

		const timeout = setTimeout(() => {
			this.cancel(id);
		}, timeoutMs);

		this.activeEvaluations.set(id, {
			id,
			process,
			startTime: Date.now(),
			command,
			timeout
		});

		// Auto-cleanup when process exits
		process.on('close', () => this.unregister(id));
	}

	unregister(id: string): void {
		const activeEval = this.activeEvaluations.get(id);
		if (activeEval) {
			clearTimeout(activeEval.timeout);
			this.activeEvaluations.delete(id);
		}
	}

	cancel(id: string): void {
		const activeEval = this.activeEvaluations.get(id);
		if (activeEval) {
			activeEval.process.kill('SIGTERM');
			this.unregister(id);
		}
	}

	cancelAll(): void {
		for (const id of this.activeEvaluations.keys()) {
			this.cancel(id);
		}
	}

	private setupCleanupHandlers(): void {
		const cleanup = () => {
			this.cancelAll();
			process.exit(0);
		};

		process.on('SIGTERM', cleanup);
		process.on('SIGINT', cleanup);
	}
}

// Singleton instance
export const evalManager = new EvaluationManager(appConfig.maxConcurrentEvaluations);
