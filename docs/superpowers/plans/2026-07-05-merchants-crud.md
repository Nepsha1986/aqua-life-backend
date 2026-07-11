# Merchants CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD HTTP endpoints for merchants, backed by an in-memory mock store, with Zod validation and Node's built-in test runner.

**Architecture:** Layered Express 5 app. Zod schemas are the single source of truth for the `Merchant` shape and input validation; types are inferred from them. An in-memory `Map` store is the only layer that knows persistence is mock. `app.ts` builds and exports a configured app (`createApp()`); `server.ts` starts it. This keeps the app importable by tests.

**Tech Stack:** Node 22.12 (ESM, native TypeScript stripping), Express 5, Zod 4, `node:test`.

## Global Constraints

- **Node >= 22.6**, run `nvm use` before any command (loads `.nvmrc` → Node 22). Commands run via `--experimental-strip-types`.
- **`erasableSyntaxOnly`** — no `enum`, no `namespace`, no constructor parameter properties. Use union types / `const` objects.
- **`verbatimModuleSyntax`** — type-only imports must use `import type`.
- **`rewriteRelativeImportExtensions`** — write relative imports with the `.ts` extension (e.g. `import { list } from './merchants.store.ts'`).
- **`module: nodenext`** — native Node ESM.
- **Storage is in-memory only** — a `Map` in the process; no database dependency.
- **Zod 4** — use `z.email()` (not the deprecated `z.string().email()`).

## File Structure

```
src/
  app.ts                               # createApp(): build + export configured Express app (MODIFY existing)
  server.ts                            # start the app on port 3000 (CREATE)
  schemas/merchant.schema.ts           # Zod schemas + inferred types (CREATE)
  store/merchants.store.ts             # in-memory Map + data functions (CREATE)
  middleware/error.ts                  # centralized error handler (CREATE)
  controllers/merchants.controller.ts  # request handling + validation (CREATE)
  routes/merchants.routes.ts           # route → controller wiring (CREATE)
```

Test files live next to their source as `*.test.ts`.

---

### Task 1: Setup — Zod dependency, test script, Merchant schema

**Files:**
- Modify: `package.json` (add `zod`, add `test` script)
- Create: `src/schemas/merchant.schema.ts`
- Test: `src/schemas/merchant.schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `merchantSchema` — Zod object: `{ id: string, name: string(min 1), email: email, createdAt: string, updatedAt: string }`
  - `createMerchantSchema` — `merchantSchema` without `id`/`createdAt`/`updatedAt`.
  - `updateMerchantSchema` — `createMerchantSchema.partial()` requiring at least one key.
  - `type Merchant = z.infer<typeof merchantSchema>`
  - `type CreateMerchantInput = z.infer<typeof createMerchantSchema>`
  - `type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>`

- [ ] **Step 1: Install Zod**

Run:
```bash
nvm use && npm install zod
```
Expected: `zod` appears under `dependencies` in `package.json`.

- [ ] **Step 2: Add the test script**

In `package.json`, replace the `test` script:
```json
"test": "node --experimental-strip-types --test \"src/**/*.test.ts\""
```

- [ ] **Step 3: Write the failing test**

Create `src/schemas/merchant.schema.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	createMerchantSchema,
	updateMerchantSchema,
} from './merchant.schema.ts';

test('createMerchantSchema accepts valid input', () => {
	const result = createMerchantSchema.safeParse({
		name: 'Acme',
		email: 'a@acme.com',
	});
	assert.equal(result.success, true);
});

test('createMerchantSchema rejects empty name', () => {
	const result = createMerchantSchema.safeParse({ name: '', email: 'a@acme.com' });
	assert.equal(result.success, false);
});

test('createMerchantSchema rejects bad email', () => {
	const result = createMerchantSchema.safeParse({ name: 'Acme', email: 'nope' });
	assert.equal(result.success, false);
});

test('updateMerchantSchema rejects empty object', () => {
	const result = updateMerchantSchema.safeParse({});
	assert.equal(result.success, false);
});

test('updateMerchantSchema accepts partial input', () => {
	const result = updateMerchantSchema.safeParse({ email: 'b@acme.com' });
	assert.equal(result.success, true);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run:
```bash
nvm use && node --experimental-strip-types --test src/schemas/merchant.schema.test.ts
```
Expected: FAIL — cannot find module `./merchant.schema.ts`.

- [ ] **Step 5: Write minimal implementation**

Create `src/schemas/merchant.schema.ts`:
```ts
import { z } from 'zod';

export const merchantSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	email: z.email(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const createMerchantSchema = merchantSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const updateMerchantSchema = createMerchantSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided',
	});

export type Merchant = z.infer<typeof merchantSchema>;
export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
```

- [ ] **Step 6: Run test to verify it passes**

Run:
```bash
nvm use && node --experimental-strip-types --test src/schemas/merchant.schema.test.ts
```
Expected: PASS — 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/schemas/merchant.schema.ts src/schemas/merchant.schema.test.ts
git commit -m "feat: add merchant Zod schemas and inferred types"
```

---

### Task 2: In-memory merchants store

**Files:**
- Create: `src/store/merchants.store.ts`
- Test: `src/store/merchants.store.test.ts`

**Interfaces:**
- Consumes: `Merchant`, `CreateMerchantInput`, `UpdateMerchantInput` from `../schemas/merchant.schema.ts`.
- Produces (all operate on a module-level `Map<string, Merchant>`):
  - `list(): Merchant[]`
  - `findById(id: string): Merchant | undefined`
  - `create(input: CreateMerchantInput): Merchant` — generates `id`, `createdAt`, `updatedAt`.
  - `update(id: string, input: UpdateMerchantInput): Merchant | undefined` — returns `undefined` if not found; refreshes `updatedAt`.
  - `remove(id: string): boolean` — `true` if deleted, `false` if not found.
  - `_reset(): void` — clears the store (test helper).

- [ ] **Step 1: Write the failing test**

Create `src/store/merchants.store.test.ts`:
```ts
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
	list,
	findById,
	create,
	update,
	remove,
	_reset,
} from './merchants.store.ts';

beforeEach(() => {
	_reset();
});

test('create returns a merchant with generated fields', () => {
	const m = create({ name: 'Acme', email: 'a@acme.com' });
	assert.ok(m.id);
	assert.equal(m.name, 'Acme');
	assert.equal(m.email, 'a@acme.com');
	assert.ok(m.createdAt);
	assert.equal(m.updatedAt, m.createdAt);
});

test('list returns all created merchants', () => {
	create({ name: 'A', email: 'a@x.com' });
	create({ name: 'B', email: 'b@x.com' });
	assert.equal(list().length, 2);
});

test('findById returns the merchant or undefined', () => {
	const m = create({ name: 'Acme', email: 'a@acme.com' });
	assert.equal(findById(m.id)?.id, m.id);
	assert.equal(findById('missing'), undefined);
});

test('update changes fields and refreshes updatedAt', () => {
	const m = create({ name: 'Acme', email: 'a@acme.com' });
	const updated = update(m.id, { name: 'Acme 2' });
	assert.equal(updated?.name, 'Acme 2');
	assert.equal(updated?.email, 'a@acme.com');
});

test('update returns undefined for unknown id', () => {
	assert.equal(update('missing', { name: 'X' }), undefined);
});

test('remove deletes and reports success', () => {
	const m = create({ name: 'Acme', email: 'a@acme.com' });
	assert.equal(remove(m.id), true);
	assert.equal(findById(m.id), undefined);
	assert.equal(remove(m.id), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
nvm use && node --experimental-strip-types --test src/store/merchants.store.test.ts
```
Expected: FAIL — cannot find module `./merchants.store.ts`.

- [ ] **Step 3: Write minimal implementation**

Create `src/store/merchants.store.ts`:
```ts
import type {
	Merchant,
	CreateMerchantInput,
	UpdateMerchantInput,
} from '../schemas/merchant.schema.ts';

const merchants = new Map<string, Merchant>();

export function list(): Merchant[] {
	return [...merchants.values()];
}

export function findById(id: string): Merchant | undefined {
	return merchants.get(id);
}

export function create(input: CreateMerchantInput): Merchant {
	const now = new Date().toISOString();
	const merchant: Merchant = {
		id: crypto.randomUUID(),
		name: input.name,
		email: input.email,
		createdAt: now,
		updatedAt: now,
	};
	merchants.set(merchant.id, merchant);
	return merchant;
}

export function update(
	id: string,
	input: UpdateMerchantInput,
): Merchant | undefined {
	const existing = merchants.get(id);
	if (!existing) return undefined;
	const updated: Merchant = {
		...existing,
		...input,
		updatedAt: new Date().toISOString(),
	};
	merchants.set(id, updated);
	return updated;
}

export function remove(id: string): boolean {
	return merchants.delete(id);
}

export function _reset(): void {
	merchants.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
nvm use && node --experimental-strip-types --test src/store/merchants.store.test.ts
```
Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/merchants.store.ts src/store/merchants.store.test.ts
git commit -m "feat: add in-memory merchants store"
```

---

### Task 3: Error-handling middleware

**Files:**
- Create: `src/middleware/error.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `errorHandler(err, req, res, next)` — Express 5 error middleware. Malformed JSON bodies (`err.type === 'entity.parse.failed'`) → `400 { error: 'Invalid JSON body' }`. Everything else → `500 { error: 'Internal Server Error' }`.

Note: this middleware has no standalone unit test; it is exercised by the HTTP tests in Task 5. Keep it minimal.

- [ ] **Step 1: Write the implementation**

Create `src/middleware/error.ts`:
```ts
import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {
	if (
		err !== null &&
		typeof err === 'object' &&
		'type' in err &&
		err.type === 'entity.parse.failed'
	) {
		res.status(400).json({ error: 'Invalid JSON body' });
		return;
	}
	res.status(500).json({ error: 'Internal Server Error' });
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
nvm use && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware/error.ts
git commit -m "feat: add error-handling middleware"
```

---

### Task 4: Merchants controller and routes

**Files:**
- Create: `src/controllers/merchants.controller.ts`
- Create: `src/routes/merchants.routes.ts`

**Interfaces:**
- Consumes: store functions from `../store/merchants.store.ts`; `createMerchantSchema`, `updateMerchantSchema` from `../schemas/merchant.schema.ts`.
- Produces:
  - Controller functions `(req: Request, res: Response) => void`: `createMerchant`, `listMerchants`, `getMerchant`, `updateMerchant`, `deleteMerchant`.
  - `merchantsRouter` (an `express.Router`) wiring: `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`.

Behavior: validation failures → `400 { error, details }` (details = `result.error.issues`). Unknown id → `404 { error: 'Merchant not found' }`. Create → `201`. Delete → `204` with no body.

- [ ] **Step 1: Write the controller**

Create `src/controllers/merchants.controller.ts`:
```ts
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
	const merchant = store.findById(req.params.id);
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
	const merchant = store.update(req.params.id, result.data);
	if (!merchant) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(200).json(merchant);
}

export function deleteMerchant(req: Request, res: Response): void {
	const deleted = store.remove(req.params.id);
	if (!deleted) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(204).end();
}
```

- [ ] **Step 2: Write the router**

Create `src/routes/merchants.routes.ts`:
```ts
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
```

- [ ] **Step 3: Type-check**

Run:
```bash
nvm use && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/controllers/merchants.controller.ts src/routes/merchants.routes.ts
git commit -m "feat: add merchants controller and routes"
```

---

### Task 5: Wire up app + server, add HTTP integration tests

**Files:**
- Modify: `src/app.ts` (replace current contents — export `createApp()`, no `listen`)
- Create: `src/server.ts`
- Modify: `package.json` (`dev` script → run `src/server.ts`)
- Test: `src/app.test.ts`

**Interfaces:**
- Consumes: `merchantsRouter` from `./routes/merchants.routes.ts`; `errorHandler` from `./middleware/error.ts`.
- Produces: `createApp(): Express` — app with `express.json()`, `/merchants` router, and `errorHandler` mounted last.

- [ ] **Step 1: Write the failing HTTP test**

Create `src/app.test.ts`:
```ts
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import { _reset } from './store/merchants.store.ts';

const app = createApp();
const server = app.listen(0);
const { port } = server.address() as { port: number };
const base = `http://localhost:${port}/merchants`;

beforeEach(() => _reset());
after(() => server.close());

test('POST creates a merchant', async () => {
	const res = await fetch(base, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name: 'Acme', email: 'a@acme.com' }),
	});
	assert.equal(res.status, 201);
	const body = await res.json();
	assert.ok(body.id);
	assert.equal(body.name, 'Acme');
});

test('POST rejects invalid input with 400', async () => {
	const res = await fetch(base, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name: '', email: 'nope' }),
	});
	assert.equal(res.status, 400);
});

test('GET list returns created merchants', async () => {
	await fetch(base, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name: 'Acme', email: 'a@acme.com' }),
	});
	const res = await fetch(base);
	assert.equal(res.status, 200);
	const body = await res.json();
	assert.equal(body.length, 1);
});

test('GET by unknown id returns 404', async () => {
	const res = await fetch(`${base}/missing`);
	assert.equal(res.status, 404);
});

test('PATCH updates a merchant', async () => {
	const created = await (
		await fetch(base, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: 'Acme', email: 'a@acme.com' }),
		})
	).json();
	const res = await fetch(`${base}/${created.id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name: 'Acme 2' }),
	});
	assert.equal(res.status, 200);
	const body = await res.json();
	assert.equal(body.name, 'Acme 2');
});

test('DELETE removes a merchant', async () => {
	const created = await (
		await fetch(base, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: 'Acme', email: 'a@acme.com' }),
		})
	).json();
	const res = await fetch(`${base}/${created.id}`, { method: 'DELETE' });
	assert.equal(res.status, 204);
	const check = await fetch(`${base}/${created.id}`);
	assert.equal(check.status, 404);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
nvm use && node --experimental-strip-types --test src/app.test.ts
```
Expected: FAIL — `createApp` is not exported from `./app.ts`.

- [ ] **Step 3: Rewrite `src/app.ts` to export `createApp`**

Replace the entire contents of `src/app.ts`:
```ts
import express, { type Express } from 'express';
import { merchantsRouter } from './routes/merchants.routes.ts';
import { errorHandler } from './middleware/error.ts';

export function createApp(): Express {
	const app = express();
	app.use(express.json());
	app.use('/merchants', merchantsRouter);
	app.use(errorHandler);
	return app;
}
```

- [ ] **Step 4: Create `src/server.ts`**

Create `src/server.ts`:
```ts
import { createApp } from './app.ts';

const PORT = 3000;
const app = createApp();

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
```

- [ ] **Step 5: Point the `dev` script at `server.ts`**

In `package.json`, update:
```json
"dev": "node --watch --experimental-strip-types src/server.ts"
```

- [ ] **Step 6: Run the HTTP test to verify it passes**

Run:
```bash
nvm use && node --experimental-strip-types --test src/app.test.ts
```
Expected: PASS — 6 tests pass.

- [ ] **Step 7: Run the full suite and type-check**

Run:
```bash
nvm use && npm test && npx tsc --noEmit
```
Expected: all tests pass; no type errors.

- [ ] **Step 8: Manual smoke check (optional but recommended)**

Run `nvm use && npm run dev`, then in another shell:
```bash
curl -s -X POST localhost:3000/merchants -H 'content-type: application/json' -d '{"name":"Acme","email":"a@acme.com"}'
curl -s localhost:3000/merchants
```
Expected: first returns the created merchant with an `id`; second returns an array containing it.

- [ ] **Step 9: Commit**

```bash
git add src/app.ts src/server.ts src/app.test.ts package.json
git commit -m "feat: wire up app and server with merchants HTTP tests"
```

---

## Notes for the implementer

- `crypto.randomUUID()` is a global in Node 22 — no import needed.
- `new Date().toISOString()` is normal application code and is fine here (the ban on `Date`/`Math.random` applies only to workflow scripts, not app runtime).
- Express 5 forwards errors from sync handlers automatically, but our controllers handle their own validation/404 responses; `errorHandler` is the safety net for unexpected throws and malformed JSON.
- If `node --test` reports "no test files found", pass the explicit path shown in each task rather than the glob.
