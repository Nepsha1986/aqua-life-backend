import { eq } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { merchants } from '../db/schema/merchants.ts';
import type {
	Merchant,
	CreateMerchantInput,
	UpdateMerchantInput,
} from '../schemas/merchant.schema.ts';

type MerchantRow = typeof merchants.$inferSelect;

function toMerchant(row: MerchantRow): Merchant {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export async function list(): Promise<Merchant[]> {
	const rows = await db.select().from(merchants).orderBy(merchants.createdAt);
	return rows.map(toMerchant);
}

export async function findById(id: string): Promise<Merchant | undefined> {
	const rows = await db.select().from(merchants).where(eq(merchants.id, id));
	const row = rows[0];
	return row ? toMerchant(row) : undefined;
}

export async function create(input: CreateMerchantInput): Promise<Merchant> {
	const rows = await db.insert(merchants).values(input).returning();
	return toMerchant(rows[0]!);
}

export async function update(
	id: string,
	input: UpdateMerchantInput,
): Promise<Merchant | undefined> {
	const rows = await db
		.update(merchants)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(merchants.id, id))
		.returning();
	const row = rows[0];
	return row ? toMerchant(row) : undefined;
}

export async function remove(id: string): Promise<boolean> {
	const rows = await db
		.delete(merchants)
		.where(eq(merchants.id, id))
		.returning({ id: merchants.id });
	return rows.length > 0;
}
