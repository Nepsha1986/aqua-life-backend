import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import {
	merchantSchema,
	createMerchantSchema,
	updateMerchantSchema,
} from '../schemas/merchant.schema.ts';

export const errorSchema = z
	.object({
		error: z.string(),
		details: z.array(z.unknown()).optional(),
	})
	.meta({
		id: 'Error',
		description: 'Error response',
		example: { error: 'Merchant not found' },
	});

const idParam = z.object({
	id: z.string().meta({ description: 'Merchant id', example: 'abc123' }),
});

const jsonMerchant = {
	'application/json': { schema: merchantSchema },
};

const jsonError = {
	'application/json': { schema: errorSchema },
};

export const merchantPaths: ZodOpenApiPathsObject = {
	'/merchants': {
		post: {
			summary: 'Create a merchant',
			tags: ['Merchants'],
			requestBody: {
				content: { 'application/json': { schema: createMerchantSchema } },
			},
			responses: {
				'201': { description: 'Merchant created', content: jsonMerchant },
				'400': { description: 'Invalid merchant', content: jsonError },
			},
		},
		get: {
			summary: 'List merchants',
			tags: ['Merchants'],
			responses: {
				'200': {
					description: 'The list of merchants',
					content: {
						'application/json': { schema: z.array(merchantSchema) },
					},
				},
			},
		},
	},
	'/merchants/{id}': {
		get: {
			summary: 'Get a merchant by id',
			tags: ['Merchants'],
			requestParams: { path: idParam },
			responses: {
				'200': { description: 'The merchant', content: jsonMerchant },
				'404': { description: 'Merchant not found', content: jsonError },
			},
		},
		patch: {
			summary: 'Update a merchant',
			tags: ['Merchants'],
			requestParams: { path: idParam },
			requestBody: {
				content: { 'application/json': { schema: updateMerchantSchema } },
			},
			responses: {
				'200': { description: 'The updated merchant', content: jsonMerchant },
				'400': { description: 'Invalid merchant', content: jsonError },
				'404': { description: 'Merchant not found', content: jsonError },
			},
		},
		delete: {
			summary: 'Delete a merchant',
			tags: ['Merchants'],
			requestParams: { path: idParam },
			responses: {
				'204': { description: 'Merchant deleted' },
				'404': { description: 'Merchant not found', content: jsonError },
			},
		},
	},
};
