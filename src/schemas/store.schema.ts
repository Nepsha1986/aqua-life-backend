import { z } from 'zod';

export const storeKinds = ['physical', 'online', 'hybrid'] as const;

export const storeSchema = z
	.object({
		id: z.string(),
		merchantId: z.uuid().nullable(),
		name: z.string().min(1),
		kind: z.enum(storeKinds),
		description: z.string().optional(),
		website: z.url().optional(),
		email: z.email().optional(),
		phone: z.string().optional(),
		country: z.string().optional(),
		city: z.string().optional(),
		address: z.string().optional(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.meta({
		id: 'Store',
		description: 'An aquarium shop in the directory',
		example: {
			id: '3f9a1b2c-0000-4000-8000-000000000000',
			merchantId: null,
			name: 'Reef Center',
			kind: 'physical',
			city: 'Austin',
			createdAt: '2026-07-12T00:00:00.000Z',
			updatedAt: '2026-07-12T00:00:00.000Z',
		},
	});

export const createStoreSchema = storeSchema
	.omit({ id: true, createdAt: true, updatedAt: true })
	.extend({ merchantId: z.uuid().nullish() })
	.meta({
		id: 'CreateStore',
		description: 'Payload to create a store',
		example: { name: 'Reef Center', kind: 'physical' },
	});

export const updateStoreSchema = createStoreSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided',
	})
	.meta({
		id: 'UpdateStore',
		description: 'Payload to update a store (at least one field required)',
		example: { city: 'Dallas' },
	});

export type Store = z.infer<typeof storeSchema>;
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
