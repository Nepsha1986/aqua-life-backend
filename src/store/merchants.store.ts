import type {
	Merchant,
	CreateMerchantInput,
	UpdateMerchantInput,
} from '../schemas/merchant.schema.ts';

const merchants = new Map<string, Merchant>();

export function list(): Merchant[] {
	return [...merchants.values()];
}

export function findById(id: string): Merchant | undefined {
	return merchants.get(id);
}

export function create(input: CreateMerchantInput): Merchant {
	const now = new Date().toISOString();
	const merchant: Merchant = {
		id: crypto.randomUUID(),
		name: input.name,
		email: input.email,
		createdAt: now,
		updatedAt: now,
	};
	merchants.set(merchant.id, merchant);
	return merchant;
}

export function update(
	id: string,
	input: UpdateMerchantInput,
): Merchant | undefined {
	const existing = merchants.get(id);
	if (!existing) return undefined;
	const updated: Merchant = {
		...existing,
		...input,
		updatedAt: new Date().toISOString(),
	};
	merchants.set(id, updated);
	return updated;
}

export function remove(id: string): boolean {
	return merchants.delete(id);
}

export function _reset(): void {
	merchants.clear();
}
