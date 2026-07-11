# OpenAPI Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve an interactive, deployable Scalar API-reference UI for the merchants API, with the OpenAPI spec derived from the existing Zod schemas.

**Architecture:** Annotate the existing Zod schemas with OpenAPI metadata via `.meta()`, describe the merchant routes in a dedicated openapi module, assemble a single OpenAPI 3.1 document with `zod-openapi`'s `createDocument()`, then serve that document at `GET /openapi.json` and mount the Scalar UI at `GET /docs` from the existing Express app.

**Tech Stack:** Express 5, Zod 4, TypeScript (strict, ESM, native Node type-stripping), `zod-openapi@^6`, `@scalar/express-api-reference@^0.10`, `node:test`.

## Global Constraints

Copied verbatim from the spec and CLAUDE.md — every task must honor these:

- **Node >= 22.6**; app runs via `node --experimental-strip-types` (no build step, `tsc --noEmit` only).
- **`erasableSyntaxOnly`**: no `enum`, no `namespace` with runtime members, no constructor parameter properties. Use `const` objects / union types.
- **`verbatimModuleSyntax`**: type-only imports must use `import type`.
- **`rewriteRelativeImportExtensions`**: write relative imports with the `.ts` extension (e.g. `import './foo.ts'`).
- **`module: nodenext`**: native Node ESM.
- **Indentation is tabs** (match existing files).
- **Tests** use `node:test` + `node:assert/strict`, named `*.test.ts`, run via `npm test`.
- **OpenAPI version:** `3.1.0`.
- **Spec source is Zod** — never hand-write shapes that duplicate a Zod schema.

Error response shapes the API actually returns (must be documented exactly):
- Validation `400`: `{ "error": "Invalid merchant", "details": [ ...zod issues... ] }`
- Not found `404`: `{ "error": "Merchant not found" }`

---

### Task 1: Install dependencies and annotate schemas with OpenAPI metadata

**Files:**
- Modify: `package.json` (dependencies — via npm install)
- Modify: `src/schemas/merchant.schema.ts`
- Test: `src/schemas/merchant.schema.test.ts` (append)

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `merchantSchema`, `createMerchantSchema`, `updateMerchantSchema` — unchanged runtime validation, now each carrying OpenAPI metadata retrievable via `schema.meta()` with `id` values `'Merchant'`, `'CreateMerchant'`, `'UpdateMerchant'` respectively.

- [ ] **Step 1: Install the two runtime dependencies**

Run:
```bash
npm install zod-openapi@^6 @scalar/express-api-reference@^0.10
```
Expected: both added under `dependencies` in `package.json`; install completes with no peer-dependency errors (`zod-openapi` requires `zod@^4`, which is present).

- [ ] **Step 2: Write the failing test** (append to `src/schemas/merchant.schema.test.ts`)

```ts
test('schemas expose OpenAPI component ids', () => {
	assert.equal(merchantSchema.meta()?.id, 'Merchant');
	assert.equal(createMerchantSchema.meta()?.id, 'CreateMerchant');
	assert.equal(updateMerchantSchema.meta()?.id, 'UpdateMerchant');
});
```

Also update the existing import at the top of the file to include `merchantSchema`:

```ts
import {
	merchantSchema,
	createMerchantSchema,
	updateMerchantSchema,
} from './merchant.schema.ts';
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — the new test errors because `merchantSchema` is not exported and/or `.meta()?.id` is `undefined`.

- [ ] **Step 4: Add metadata to the schemas** — replace the full contents of `src/schemas/merchant.schema.ts` with:

```ts
import { z } from 'zod';

export const merchantSchema = z
	.object({
		id: z.string(),
		name: z.string().min(1),
		email: z.email(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.meta({
		id: 'Merchant',
		description: 'A merchant registered in the system',
		example: {
			id: '9b1f2c3d-0000-4000-8000-000000000000',
			name: 'Acme',
			email: 'a@acme.com',
			createdAt: '2026-07-11T00:00:00.000Z',
			updatedAt: '2026-07-11T00:00:00.000Z',
		},
	});

export const createMerchantSchema = merchantSchema
	.omit({ id: true, createdAt: true, updatedAt: true })
	.meta({
		id: 'CreateMerchant',
		description: 'Payload to create a merchant',
		example: { name: 'Acme', email: 'a@acme.com' },
	});

export const updateMerchantSchema = merchantSchema
	.omit({ id: true, createdAt: true, updatedAt: true })
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided',
	})
	.meta({
		id: 'UpdateMerchant',
		description: 'Payload to update a merchant (at least one field required)',
		example: { name: 'Acme 2' },
	});

export type Merchant = z.infer<typeof merchantSchema>;
export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
```

Note: `updateMerchantSchema` now derives from `merchantSchema.omit(...)` directly (instead of from `createMerchantSchema`). This is behaviorally identical for validation but avoids inheriting the `CreateMerchant` component id.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — the new metadata test passes and all five pre-existing `merchant.schema.test.ts` cases still pass (validation behavior unchanged).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/schemas/merchant.schema.ts src/schemas/merchant.schema.test.ts
git commit -m "feat: add OpenAPI metadata to merchant schemas"
```

---

### Task 2: Build the OpenAPI document

**Files:**
- Create: `src/openapi/merchants.openapi.ts`
- Create: `src/openapi/document.ts`
- Test: `src/openapi/document.test.ts`

**Interfaces:**
- Consumes: `merchantSchema`, `createMerchantSchema`, `updateMerchantSchema` from `../schemas/merchant.schema.ts` (each with `.meta({ id })`).
- Produces:
  - `src/openapi/merchants.openapi.ts` → `export const merchantPaths: ZodOpenApiPathsObject` (keys `'/merchants'` and `'/merchants/{id}'`) and `export const errorSchema` (a Zod schema with `.meta({ id: 'Error' })`).
  - `src/openapi/document.ts` → `export const openApiDocument` (the object returned by `createDocument`).

- [ ] **Step 1: Write the failing test** — create `src/openapi/document.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openApiDocument } from './document.ts';

test('document declares OpenAPI 3.1.0', () => {
	assert.equal(openApiDocument.openapi, '3.1.0');
});

test('document registers the Merchant component schema', () => {
	assert.ok(openApiDocument.components?.schemas?.Merchant);
});

test('document exposes all merchant paths and methods', () => {
	const paths = openApiDocument.paths ?? {};
	assert.ok(paths['/merchants']?.post, 'POST /merchants');
	assert.ok(paths['/merchants']?.get, 'GET /merchants');
	assert.ok(paths['/merchants/{id}']?.get, 'GET /merchants/{id}');
	assert.ok(paths['/merchants/{id}']?.patch, 'PATCH /merchants/{id}');
	assert.ok(paths['/merchants/{id}']?.delete, 'DELETE /merchants/{id}');
});

test('POST /merchants documents 201 and 400', () => {
	const post = openApiDocument.paths?.['/merchants']?.post;
	assert.ok(post?.responses?.['201']);
	assert.ok(post?.responses?.['400']);
});

test('GET /merchants/{id} documents 404', () => {
	const get = openApiDocument.paths?.['/merchants/{id}']?.get;
	assert.ok(get?.responses?.['404']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./document.ts` does not exist (module not found).

- [ ] **Step 3: Create the merchant path definitions** — create `src/openapi/merchants.openapi.ts`:

```ts
import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import {
	merchantSchema,
	createMerchantSchema,
	updateMerchantSchema,
} from '../schemas/merchant.schema.ts';

export const errorSchema = z
	.object({
		error: z.string(),
		details: z.array(z.unknown()).optional(),
	})
	.meta({
		id: 'Error',
		description: 'Error response',
		example: { error: 'Merchant not found' },
	});

const idParam = z.object({
	id: z.string().meta({ description: 'Merchant id', example: 'abc123' }),
});

const jsonMerchant = {
	'application/json': { schema: merchantSchema },
};

const jsonError = {
	'application/json': { schema: errorSchema },
};

export const merchantPaths: ZodOpenApiPathsObject = {
	'/merchants': {
		post: {
			summary: 'Create a merchant',
			tags: ['Merchants'],
			requestBody: {
				content: { 'application/json': { schema: createMerchantSchema } },
			},
			responses: {
				'201': { description: 'Merchant created', content: jsonMerchant },
				'400': { description: 'Invalid merchant', content: jsonError },
			},
		},
		get: {
			summary: 'List merchants',
			tags: ['Merchants'],
			responses: {
				'200': {
					description: 'The list of merchants',
					content: {
						'application/json': { schema: z.array(merchantSchema) },
					},
				},
			},
		},
	},
	'/merchants/{id}': {
		get: {
			summary: 'Get a merchant by id',
			tags: ['Merchants'],
			requestParams: { path: idParam },
			responses: {
				'200': { description: 'The merchant', content: jsonMerchant },
				'404': { description: 'Merchant not found', content: jsonError },
			},
		},
		patch: {
			summary: 'Update a merchant',
			tags: ['Merchants'],
			requestParams: { path: idParam },
			requestBody: {
				content: { 'application/json': { schema: updateMerchantSchema } },
			},
			responses: {
				'200': { description: 'The updated merchant', content: jsonMerchant },
				'400': { description: 'Invalid merchant', content: jsonError },
				'404': { description: 'Merchant not found', content: jsonError },
			},
		},
		delete: {
			summary: 'Delete a merchant',
			tags: ['Merchants'],
			requestParams: { path: idParam },
			responses: {
				'204': { description: 'Merchant deleted' },
				'404': { description: 'Merchant not found', content: jsonError },
			},
		},
	},
};
```

- [ ] **Step 4: Create the document assembler** — create `src/openapi/document.ts`:

```ts
import { createDocument } from 'zod-openapi';
import { merchantPaths } from './merchants.openapi.ts';

export const openApiDocument = createDocument({
	openapi: '3.1.0',
	info: {
		title: 'Aqua Life API',
		version: '1.0.0',
		description: 'Backend API for the Aguajoy (aqua-life) project.',
	},
	servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
	tags: [{ name: 'Merchants', description: 'Merchant management' }],
	paths: merchantPaths,
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all five `document.test.ts` cases pass. (If `createDocument` throws at import time, the error names the offending schema/path — fix and re-run.)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/openapi/merchants.openapi.ts src/openapi/document.ts src/openapi/document.test.ts
git commit -m "feat: assemble OpenAPI document from merchant schemas"
```

---

### Task 3: Serve the spec and the Scalar UI

**Files:**
- Create: `src/openapi/docs.routes.ts`
- Modify: `src/app.ts`
- Test: `src/openapi/docs.routes.test.ts`

**Interfaces:**
- Consumes: `openApiDocument` from `./document.ts`; `apiReference` from `@scalar/express-api-reference`; `createApp` from `../app.ts`.
- Produces:
  - `src/openapi/docs.routes.ts` → `export const docsRouter: Router` mounting `GET /openapi.json` (returns `openApiDocument` as JSON) and `GET /docs` (Scalar HTML pointing at `/openapi.json`).
  - `src/app.ts` → `createApp()` now also does `app.use(docsRouter)`.

- [ ] **Step 1: Write the failing test** — create `src/openapi/docs.routes.test.ts`:

```ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.ts';

const app = createApp();
const server = app.listen(0);
const { port } = server.address() as { port: number };
const base = `http://localhost:${port}`;

after(() => server.close());

test('GET /openapi.json returns the spec as JSON', async () => {
	const res = await fetch(`${base}/openapi.json`);
	assert.equal(res.status, 200);
	assert.match(res.headers.get('content-type') ?? '', /application\/json/);
	const body = await res.json();
	assert.equal(body.openapi, '3.1.0');
	assert.ok(body.paths['/merchants']);
});

test('GET /docs returns the Scalar UI as HTML', async () => {
	const res = await fetch(`${base}/docs`);
	assert.equal(res.status, 200);
	assert.match(res.headers.get('content-type') ?? '', /text\/html/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `/openapi.json` and `/docs` return 404 (routes not mounted yet).

- [ ] **Step 3: Create the docs router** — create `src/openapi/docs.routes.ts`:

```ts
import { Router } from 'express';
import { apiReference } from '@scalar/express-api-reference';
import { openApiDocument } from './document.ts';

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
	res.json(openApiDocument);
});

docsRouter.use('/docs', apiReference({ url: '/openapi.json' }));
```

Note: if the installed `@scalar/express-api-reference` version rejects the `url` option, check its exported types and use the equivalent option that points the UI at a spec URL (e.g. `content: openApiDocument` to inline the spec instead). Confirm against `node_modules/@scalar/express-api-reference` types before changing.

- [ ] **Step 4: Wire the router into the app** — replace the contents of `src/app.ts` with:

```ts
import express, { type Express } from 'express';
import { merchantsRouter } from './routes/merchants.routes.ts';
import { docsRouter } from './openapi/docs.routes.ts';
import { errorHandler } from './middleware/error.ts';

export function createApp(): Express {
	const app = express();
	app.use(express.json());
	app.use('/merchants', merchantsRouter);
	app.use(docsRouter);
	app.use(errorHandler);
	return app;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — both `docs.routes.test.ts` cases pass, and the entire suite (schemas, store, app, document, docs) stays green.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manually verify the UI** (optional but recommended)

Run: `npm run dev`, then open `http://localhost:3000/docs` in a browser.
Expected: the Scalar API reference renders the Merchants endpoints; `http://localhost:3000/openapi.json` returns the raw spec. Stop the server (`Ctrl+C`) when done.

- [ ] **Step 8: Commit**

```bash
git add src/openapi/docs.routes.ts src/app.ts src/openapi/docs.routes.test.ts
git commit -m "feat: serve OpenAPI spec and Scalar docs UI"
```

---

## Self-Review

**1. Spec coverage:**
- Scalar UI served from Express → Task 3. ✓
- Spec derived from Zod via `zod-openapi` → Tasks 1–2. ✓
- All 5 merchant endpoints with documented request/response/error shapes → Task 2 (`merchants.openapi.ts`) matches the spec's endpoint table and the real `errorHandler`/controller shapes. ✓
- `GET /openapi.json` + `GET /docs` → Task 3. ✓
- `servers` field for "try it out" host → Task 2 (`document.ts`). ✓
- Tests: `document.test.ts` (structural) + `docs.routes.test.ts` (HTTP) → Tasks 2–3. ✓
- Dependencies `zod-openapi@^6`, `@scalar/express-api-reference@^0.10` → Task 1. ✓
- Out of scope (auth, extra resources, versioning, static export) → correctly omitted. ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows full code; every command shows expected output. ✓

**3. Type consistency:** `openApiDocument` (Task 2 → Task 3), `merchantPaths` (Task 2 internal), `docsRouter` (Task 3 → `app.ts`), `errorSchema`, and the `.meta({ id })` values (`Merchant`/`CreateMerchant`/`UpdateMerchant`/`Error`) are used consistently across tasks. Path keys use OpenAPI style `/merchants/{id}` (not the Express `:id`) everywhere. ✓
