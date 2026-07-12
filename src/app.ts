import express, { type Express } from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth.ts';
import { merchantsRouter } from './routes/merchants.routes.ts';
import { storesRouter } from './routes/stores.routes.ts';
import { docsRouter } from './openapi/docs.routes.ts';
import { errorHandler } from './middleware/error.ts';

export function createApp(): Express {
	const app = express();

	// Allow the admin UI (separate origin in dev) to send credentialed requests.
	app.use(cors({ origin: 'http://localhost:3001', credentials: true }));

	// Better Auth must handle its routes on the raw body, so mount it BEFORE
	// express.json(). Express 5 wildcard syntax: '{*any}'.
	app.all('/api/auth/{*any}', toNodeHandler(auth));

	app.use(express.json());
	app.use('/merchants', merchantsRouter);
	app.use('/stores', storesRouter);
	app.use(docsRouter);
	app.use(errorHandler);
	return app;
}
