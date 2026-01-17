import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..', '..', '..');
const REPORTS_DIR = join(PROJECT_ROOT, 'tests/llm-evals/reports');

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.filename;
	if (!filename || !filename.endsWith('.html')) {
		throw error(400, 'Invalid filename');
	}

	const filePath = join(REPORTS_DIR, filename);
	if (!existsSync(filePath)) {
		throw error(404, 'Report not found');
	}

	try {
		const content = readFileSync(filePath, 'utf-8');
		return new Response(content, {
			headers: {
				'Content-Type': 'text/html'
			}
		});
	} catch (err) {
		throw error(500, 'Failed to read report file');
	}
};
