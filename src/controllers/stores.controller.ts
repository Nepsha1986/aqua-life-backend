import type { Request, Response } from 'express';
import { z } from 'zod';
import {
	createStoreSchema,
	updateStoreSchema,
} from '../schemas/store.schema.ts';
import * as store from '../store/stores.store.ts';

// Normalize req.params.id and validate it as a UUID. A non-UUID id can never
// match a row, so treat it as not-found rather than letting Postgres reject
// the malformed uuid and surface a 500.
function parseStoreId(raw: string | string[] | undefined): string | undefined {
	const id = Array.isArray(raw) ? raw[0] : raw;
	return id !== undefined && z.uuid().safeParse(id).success ? id : undefined;
}

export async function createStore(req: Request, res: Response): Promise<void> {
	const result = createStoreSchema.safeParse(req.body);
	if (!result.success) {
		res.status(400).json({ error: 'Invalid store', details: result.error.issues });
		return;
	}
	const created = await store.create(result.data);
	res.status(201).json(created);
}

export async function listStores(_req: Request, res: Response): Promise<void> {
	res.status(200).json(await store.list());
}

export async function getStore(req: Request, res: Response): Promise<void> {
	const id = parseStoreId(req.params.id);
	if (id === undefined) {
		res.status(404).json({ error: 'Store not found' });
		return;
	}
	const found = await store.findById(id);
	if (!found) {
		res.status(404).json({ error: 'Store not found' });
		return;
	}
	res.status(200).json(found);
}

export async function updateStore(req: Request, res: Response): Promise<void> {
	const result = updateStoreSchema.safeParse(req.body);
	if (!result.success) {
		res.status(400).json({ error: 'Invalid store', details: result.error.issues });
		return;
	}
	const id = parseStoreId(req.params.id);
	if (id === undefined) {
		res.status(404).json({ error: 'Store not found' });
		return;
	}
	const updated = await store.update(id, result.data);
	if (!updated) {
		res.status(404).json({ error: 'Store not found' });
		return;
	}
	res.status(200).json(updated);
}

export async function deleteStore(req: Request, res: Response): Promise<void> {
	const id = parseStoreId(req.params.id);
	if (id === undefined) {
		res.status(404).json({ error: 'Store not found' });
		return;
	}
	const deleted = await store.remove(id);
	if (!deleted) {
		res.status(404).json({ error: 'Store not found' });
		return;
	}
	res.status(204).end();
}
