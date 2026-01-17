import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { REPORTS_DIR } from '$lib/constants/app.constants.server.js';
import { FILE_EXTENSIONS, CONTENT_TYPES } from '$lib/constants/app.constants.js';

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.filename;
	if (!filename || !filename.endsWith(FILE_EXTENSIONS.HTML)) {
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
				'Content-Type': CONTENT_TYPES.HTML
			}
		});
	} catch (err) {
		throw error(500, 'Failed to read report file');
	}
};
