/**
 * Estimation utilities for test counts, time, and costs
 * Calculates estimates dynamically from actual configuration
 */

import type { EvalFormSchema } from '$lib/schemas/eval-form';
import { appConfig } from '../../../app.config.js';
import { ALL_MODELS, type ModelOption } from '$lib/constants/models.constants';

export interface EstimationResult {
	testCount: number;
	modelCount: number;
	estimatedTime: number;
	estimatedTokens: number;
	estimatedCost: string;
}

/**
 * Estimate test count based on run type and configuration
 */
export function estimateTestCount(
	runType: EvalFormSchema['runType'],
	formData: Partial<EvalFormSchema>,
	actualTestCount: number
): number {
	switch (runType) {
		case 'smoke':
			return 5;
		case 'model':
		case 'full':
			return actualTestCount;
		case 'pattern':
			// Estimate - would need actual filtering to know exact count
			return Math.min(actualTestCount, 10);
		case 'first':
			return formData.count ?? 10;
		case 'retry':
			// Estimate - would need to check previous run failures
			return Math.min(actualTestCount, 10);
		default:
			return actualTestCount;
	}
}

/**
 * Estimate model count based on run type and form data
 */
export function estimateModelCount(
	runType: EvalFormSchema['runType'],
	formData: Partial<EvalFormSchema>
): number {
	switch (runType) {
		case 'smoke':
		case 'model':
			return 1;
		case 'full':
		case 'pattern':
		case 'retry':
			return ALL_MODELS.length;
		case 'first':
			return formData.modelName ? 1 : ALL_MODELS.length;
		default:
			return 1;
	}
}

/**
 * Get models to use based on run type and form data
 */
export function getModelsForRunType(
	runType: EvalFormSchema['runType'],
	formData: Partial<EvalFormSchema>
): ModelOption[] {
	switch (runType) {
		case 'smoke':
			return ['xiaomi'];
		case 'model':
			return formData.modelName && isValidModel(formData.modelName)
				? [formData.modelName]
				: [];
		case 'full':
		case 'pattern':
		case 'retry':
			return [...ALL_MODELS];
		case 'first':
			return formData.modelName && isValidModel(formData.modelName)
				? [formData.modelName]
				: [...ALL_MODELS];
		default:
			return [];
	}
}

/**
 * Calculate time estimate in seconds
 */
export function calculateTimeEstimate(testCount: number, modelCount: number): number {
	return testCount * modelCount * appConfig.avgSecondsPerTest;
}

/**
 * Calculate token estimate
 */
export function calculateTokenEstimate(testCount: number, modelCount: number): number {
	return testCount * modelCount * appConfig.avgTokensPerTest;
}

/**
 * Calculate cost estimate (currently free tier)
 */
export function calculateCostEstimate(): string {
	return '$0.00 (free tier)';
}

/**
 * Get comprehensive estimation for a run configuration
 */
export function estimateRunConfiguration(
	runType: EvalFormSchema['runType'],
	formData: Partial<EvalFormSchema>,
	actualTestCount: number
): EstimationResult {
	const testCount = estimateTestCount(runType, formData, actualTestCount);
	const modelCount = estimateModelCount(runType, formData);
	const estimatedTime = calculateTimeEstimate(testCount, modelCount);
	const estimatedTokens = calculateTokenEstimate(testCount, modelCount);
	const estimatedCost = calculateCostEstimate();

	return {
		testCount,
		modelCount,
		estimatedTime,
		estimatedTokens,
		estimatedCost
	};
}

/**
 * Type guard for model validation
 */
function isValidModel(model: string): model is ModelOption {
	return (ALL_MODELS as readonly string[]).includes(model);
}
