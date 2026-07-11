import { z } from 'zod';

export const merchantSchema = z
	.object({
		id: z.string(),
		name: z.string().min(1),
		email: z.email(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.meta({
		id: 'Merchant',
		description: 'A merchant registered in the system',
		example: {
			id: '9b1f2c3d-0000-4000-8000-000000000000',
			name: 'Acme',
			email: 'a@acme.com',
			createdAt: '2026-07-11T00:00:00.000Z',
			updatedAt: '2026-07-11T00:00:00.000Z',
		},
	});

export const createMerchantSchema = merchantSchema
	.omit({ id: true, createdAt: true, updatedAt: true })
	.meta({
		id: 'CreateMerchant',
		description: 'Payload to create a merchant',
		example: { name: 'Acme', email: 'a@acme.com' },
	});

export const updateMerchantSchema = merchantSchema
	.omit({ id: true, createdAt: true, updatedAt: true })
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided',
	})
	.meta({
		id: 'UpdateMerchant',
		description: 'Payload to update a merchant (at least one field required)',
		example: { name: 'Acme 2' },
	});

export type Merchant = z.infer<typeof merchantSchema>;
export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
