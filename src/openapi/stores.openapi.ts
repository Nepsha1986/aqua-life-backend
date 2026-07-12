import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import {
	storeSchema,
	createStoreSchema,
	updateStoreSchema,
} from '../schemas/store.schema.ts';
import { errorSchema } from './merchants.openapi.ts';

const idParam = z.object({
	id: z.string().meta({ description: 'Store id', example: 'abc123' }),
});

const jsonStore = {
	'application/json': { schema: storeSchema },
};

const jsonError = {
	'application/json': { schema: errorSchema },
};

export const storePaths: ZodOpenApiPathsObject = {
	'/stores': {
		post: {
			summary: 'Create a store',
			tags: ['Stores'],
			requestBody: {
				content: { 'application/json': { schema: createStoreSchema } },
			},
			responses: {
				'201': { description: 'Store created', content: jsonStore },
				'400': { description: 'Invalid store', content: jsonError },
			},
		},
		get: {
			summary: 'List stores',
			tags: ['Stores'],
			responses: {
				'200': {
					description: 'The list of stores',
					content: {
						'application/json': { schema: z.array(storeSchema) },
					},
				},
			},
		},
	},
	'/stores/{id}': {
		get: {
			summary: 'Get a store by id',
			tags: ['Stores'],
			requestParams: { path: idParam },
			responses: {
				'200': { description: 'The store', content: jsonStore },
				'404': { description: 'Store not found', content: jsonError },
			},
		},
		patch: {
			summary: 'Update a store',
			tags: ['Stores'],
			requestParams: { path: idParam },
			requestBody: {
				content: { 'application/json': { schema: updateStoreSchema } },
			},
			responses: {
				'200': { description: 'The updated store', content: jsonStore },
				'400': { description: 'Invalid store', content: jsonError },
				'404': { description: 'Store not found', content: jsonError },
			},
		},
		delete: {
			summary: 'Delete a store',
			tags: ['Stores'],
			requestParams: { path: idParam },
			responses: {
				'204': { description: 'Store deleted' },
				'404': { description: 'Store not found', content: jsonError },
			},
		},
	},
};
