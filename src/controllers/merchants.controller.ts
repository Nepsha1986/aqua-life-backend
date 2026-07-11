import type { Request, Response } from 'express';
import {
	createMerchantSchema,
	updateMerchantSchema,
} from '../schemas/merchant.schema.ts';
import * as store from '../store/merchants.store.ts';

export function createMerchant(req: Request, res: Response): void {
	const result = createMerchantSchema.safeParse(req.body);
	if (!result.success) {
		res.status(400).json({ error: 'Invalid merchant', details: result.error.issues });
		return;
	}
	const merchant = store.create(result.data);
	res.status(201).json(merchant);
}

export function listMerchants(_req: Request, res: Response): void {
	res.status(200).json(store.list());
}

export function getMerchant(req: Request, res: Response): void {
	const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
	const merchant = store.findById(id);
	if (!merchant) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(200).json(merchant);
}

export function updateMerchant(req: Request, res: Response): void {
	const result = updateMerchantSchema.safeParse(req.body);
	if (!result.success) {
		res.status(400).json({ error: 'Invalid merchant', details: result.error.issues });
		return;
	}
	const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
	const merchant = store.update(id, result.data);
	if (!merchant) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(200).json(merchant);
}

export function deleteMerchant(req: Request, res: Response): void {
	const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
	const deleted = store.remove(id);
	if (!deleted) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(204).end();
}
