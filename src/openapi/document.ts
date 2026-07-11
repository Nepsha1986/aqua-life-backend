import { createDocument } from 'zod-openapi';
import { merchantPaths } from './merchants.openapi.ts';

export const openApiDocument = createDocument({
	openapi: '3.1.0',
	info: {
		title: 'Aqua Life API',
		version: '1.0.0',
		description: 'Backend API for the Aguajoy (aqua-life) project.',
	},
	servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
	tags: [{ name: 'Merchants', description: 'Merchant management' }],
	paths: merchantPaths,
});
