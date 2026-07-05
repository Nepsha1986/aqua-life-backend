import { Router } from 'express';
import {
	createMerchant,
	listMerchants,
	getMerchant,
	updateMerchant,
	deleteMerchant,
} from '../controllers/merchants.controller.ts';

export const merchantsRouter = Router();

merchantsRouter.post('/', createMerchant);
merchantsRouter.get('/', listMerchants);
merchantsRouter.get('/:id', getMerchant);
merchantsRouter.patch('/:id', updateMerchant);
merchantsRouter.delete('/:id', deleteMerchant);
