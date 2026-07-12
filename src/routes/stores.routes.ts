import { Router } from 'express';
import {
	createStore,
	listStores,
	getStore,
	updateStore,
	deleteStore,
} from '../controllers/stores.controller.ts';

export const storesRouter = Router();

storesRouter.post('/', createStore);
storesRouter.get('/', listStores);
storesRouter.get('/:id', getStore);
storesRouter.patch('/:id', updateStore);
storesRouter.delete('/:id', deleteStore);
