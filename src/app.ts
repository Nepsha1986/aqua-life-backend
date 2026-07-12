import express, { type Express } from 'express';
import { merchantsRouter } from './routes/merchants.routes.ts';
import { storesRouter } from './routes/stores.routes.ts';
import { docsRouter } from './openapi/docs.routes.ts';
import { errorHandler } from './middleware/error.ts';

export function createApp(): Express {
	const app = express();
	app.use(express.json());
	app.use('/merchants', merchantsRouter);
	app.use('/stores', storesRouter);
	app.use(docsRouter);
	app.use(errorHandler);
	return app;
}
