import type { Request, Response } from 'express';
import { z } from 'zod';
import {
	createMerchantSchema,
	updateMerchantSchema,
} from '../schemas/merchant.schema.ts';
import * as store from '../store/merchants.store.ts';

// Normalize req.params.id (typed string | string[]) and validate it as a UUID.
// A non-UUID id can never match a row, so treat it as not-found (undefined)
// rather than letting Postgres reject the malformed uuid and surface a 500.
function parseMerchantId(raw: string | string[] | undefined): string | undefined {
	const id = Array.isArray(raw) ? raw[0] : raw;
	return id !== undefined && z.uuid().safeParse(id).success ? id : undefined;
}

export async function createMerchant(
	req: Request,
	res: Response,
): Promise<void> {
	const result = createMerchantSchema.safeParse(req.body);
	if (!result.success) {
		res.status(400).json({ error: 'Invalid merchant', details: result.error.issues });
		return;
	}
	const merchant = await store.create(result.data);
	res.status(201).json(merchant);
}

export async function listMerchants(
	_req: Request,
	res: Response,
): Promise<void> {
	res.status(200).json(await store.list());
}

export async function getMerchant(req: Request, res: Response): Promise<void> {
	const id = parseMerchantId(req.params.id);
	if (id === undefined) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	const merchant = await store.findById(id);
	if (!merchant) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(200).json(merchant);
}

export async function updateMerchant(
	req: Request,
	res: Response,
): Promise<void> {
	const result = updateMerchantSchema.safeParse(req.body);
	if (!result.success) {
		res.status(400).json({ error: 'Invalid merchant', details: result.error.issues });
		return;
	}
	const id = parseMerchantId(req.params.id);
	if (id === undefined) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	const merchant = await store.update(id, result.data);
	if (!merchant) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(200).json(merchant);
}

export async function deleteMerchant(
	req: Request,
	res: Response,
): Promise<void> {
	const id = parseMerchantId(req.params.id);
	if (id === undefined) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	const deleted = await store.remove(id);
	if (!deleted) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(204).end();
}
