import { Router } from 'express';
import { apiReference } from '@scalar/express-api-reference';
import { openApiDocument } from './document.ts';

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
	res.json(openApiDocument);
});

docsRouter.use('/docs', apiReference({ url: '/openapi.json' }));
