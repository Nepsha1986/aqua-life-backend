import { z } from 'zod';

export const merchantSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	email: z.email(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const createMerchantSchema = merchantSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const updateMerchantSchema = createMerchantSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided',
	});

export type Merchant = z.infer<typeof merchantSchema>;
export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
