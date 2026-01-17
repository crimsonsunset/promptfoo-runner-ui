/**
 * Server-only application constants
 * Paths and file system operations - only use in server code
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { appConfig } from './app.config.js';

/**
 * Get project root directory
 * Calculates from current file location to project root
 */
function getProjectRoot(): string {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	// From src/lib/constants/app.constants.server.ts -> src/lib/constants -> src/lib -> src -> project root
	return join(__dirname, '..', '..', '..');
}

/**
 * Project root directory
 */
export const PROJECT_ROOT = getProjectRoot();

/**
 * Reports directory path
 */
export const REPORTS_DIR = join(PROJECT_ROOT, appConfig.reportsDir.replace(/^\.\//, ''));

/**
 * Output JSON file path
 */
export const OUTPUT_JSON_PATH = join(PROJECT_ROOT, appConfig.outputJsonPath.replace(/^\.\//, ''));

/**
 * Evaluations directory path
 */
export const EVALS_DIR = join(PROJECT_ROOT, 'tests/llm-evals');

/**
 * Scripts directory path
 */
export const SCRIPTS_DIR = join(PROJECT_ROOT, 'scripts');

/**
 * Config file path
 */
export const PROMPTFOO_CONFIG_PATH = join(PROJECT_ROOT, 'promptfoo.config.ts');

/**
 * Environment file path
 */
export const ENV_FILE_PATH = join(PROJECT_ROOT, '.env');
