import { eq } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { stores } from '../db/schema/stores.ts';
import type {
	Store,
	CreateStoreInput,
	UpdateStoreInput,
} from '../schemas/store.schema.ts';

type StoreRow = typeof stores.$inferSelect;

function toStore(row: StoreRow): Store {
	return {
		id: row.id,
		merchantId: row.merchantId,
		name: row.name,
		kind: row.kind as Store['kind'],
		description: row.description ?? undefined,
		website: row.website ?? undefined,
		email: row.email ?? undefined,
		phone: row.phone ?? undefined,
		country: row.country ?? undefined,
		city: row.city ?? undefined,
		address: row.address ?? undefined,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export async function list(): Promise<Store[]> {
	const rows = await db.select().from(stores).orderBy(stores.createdAt);
	return rows.map(toStore);
}

export async function findById(id: string): Promise<Store | undefined> {
	const rows = await db.select().from(stores).where(eq(stores.id, id));
	const row = rows[0];
	return row ? toStore(row) : undefined;
}

export async function create(input: CreateStoreInput): Promise<Store> {
	const rows = await db.insert(stores).values(input).returning();
	return toStore(rows[0]!);
}

export async function update(
	id: string,
	input: UpdateStoreInput,
): Promise<Store | undefined> {
	const rows = await db
		.update(stores)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(stores.id, id))
		.returning();
	const row = rows[0];
	return row ? toStore(row) : undefined;
}

export async function remove(id: string): Promise<boolean> {
	const rows = await db
		.delete(stores)
		.where(eq(stores.id, id))
		.returning({ id: stores.id });
	return rows.length > 0;
}
