import { Router } from 'express';
import {
	createStore,
	listStores,
	getStore,
	updateStore,
	deleteStore,
} from '../controllers/stores.controller.ts';
import { requireAuth } from '../middleware/require-auth.ts';

export const storesRouter = Router();

// Every stores route requires a logged-in admin.
storesRouter.use(requireAuth);

storesRouter.post('/', createStore);
storesRouter.get('/', listStores);
storesRouter.get('/:id', getStore);
storesRouter.patch('/:id', updateStore);
storesRouter.delete('/:id', deleteStore);
