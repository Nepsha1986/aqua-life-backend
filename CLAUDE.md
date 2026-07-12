# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Backend for the Aguajoy ("aqua-life") project — an Express 5 (ESM, native TypeScript) API over PostgreSQL. It currently exposes two admin-only CRUD resources (`/merchants`, `/stores`), email/password admin auth (Better Auth), and an OpenAPI 3.1 spec with a Scalar docs UI.

## Runtime & commands

Requires **Node >= 22.14** (see `engines` / `.nvmrc`) — run `nvm use` first. The app runs TypeScript directly via Node's `--experimental-strip-types` (no build step); `zod-openapi` sets the Node floor.

- `docker compose up -d` — start local PostgreSQL 17 (needed before the app or migrations). Credentials live in `docker-compose.yml`; the app reads `DATABASE_URL` from `.env` (copy `.env.example`).
- `npm run dev` — start the server on port 3000 with file watching. Loads `.env` if present.
- `npm run db:generate` — generate a Drizzle migration from `src/db/schema/*.ts` changes into `drizzle/`.
- `npm run db:migrate` — apply pending migrations. `npm run db:studio` — open Drizzle Studio.
- `npm run seed:admin` — create the single admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (idempotent). Public sign-up is disabled, so this is the only way to create a login.
- `npx tsc --noEmit` — type-check (this is the only static check; there is no lint tooling).

## TypeScript configuration (important constraints)

`tsconfig.json` is strict, ESM-first, and `noEmit` — `tsc` only type-checks; Node runs the `.ts` source directly by stripping types. Because types are stripped rather than transformed, the same constraints apply at compile and run time:

- **`erasableSyntaxOnly`** — only syntax that erases to nothing is allowed. No `enum`, no `namespace` with runtime members, no constructor parameter properties. Use `as const` arrays + union types instead of enums (see `storeKinds` in `src/schemas/store.schema.ts`).
- **`verbatimModuleSyntax`** — type-only imports must use `import type` (e.g. `import express, { type Express } from 'express'`).
- **`rewriteRelativeImportExtensions`** — write relative imports with the `.ts` extension (e.g. `import './routes/stores.routes.ts'`); Node/tsc handle the rewrite.
- **`module: nodenext`** — native Node ESM resolution.

## Architecture

**Entrypoint split.** `src/server.ts` only reads the port and calls `app.listen`. `src/app.ts` exports a `createApp()` factory that wires middleware and routers — keep composition there so the app stays constructible without binding a port.

**Middleware ordering is load-bearing** (`src/app.ts`): CORS (scoped to the admin UI at `http://localhost:3001`, `credentials: true`) → Better Auth at `app.all('/api/auth/{*any}', ...)` **before** `express.json()` (auth needs the raw body; note the Express 5 wildcard syntax `{*any}`) → `express.json()` → resource routers → `docsRouter` → `errorHandler` (must be last).

**Per-resource layered pattern.** Each resource (`merchants`, `stores`) is the same five files — copy this shape for a new resource:

1. `src/schemas/<name>.schema.ts` — **the single source of truth.** A Zod object schema with `.meta({ id, ... })`; Create/Update variants are *derived* via `.omit()`/`.extend()`/`.partial()` (Update also `.refine()`s that ≥1 field is present); domain types come from `z.infer`. The `.meta()` `id`/`example` feed OpenAPI.
2. `src/db/schema/<name>.ts` — Drizzle `pgTable`. UUID PKs (`defaultRandom()`), `timestamp({ withTimezone: true })`. Register it in `src/db/schema/index.ts`.
3. `src/store/<name>.store.ts` — data-access. Exports `list/findById/create/update/remove` over `db`. A private `toRow`→domain mapper converts nullable columns to `undefined` and `Date`→ISO string, so the DB row shape never leaks past this layer.
4. `src/controllers/<name>.controller.ts` — thin HTTP handlers. Validate the body with `schema.safeParse` (→ `400` with `error.issues` on failure); validate `:id` as a UUID *before* querying and return `404` for a non-UUID (a malformed uuid would otherwise make Postgres throw a `500`).
5. `src/routes/<name>.routes.ts` — an Express `Router`; call `router.use(requireAuth)` to gate the whole resource, then map verbs to controller fns. Mount it in `createApp()`.

**Database.** `src/db/client.ts` builds a single `pg` `Pool` + Drizzle `db` from `DATABASE_URL` (throws if unset). Migrations are committed under `drizzle/`.

**Auth (Better Auth).** `src/auth/auth.ts` exports a `createAuth({ enableSignUp })` factory backed by the Drizzle adapter and the `src/db/schema/auth.ts` tables (`user`/`session`/`account`/`verification`). The app-wide `auth` export has sign-up **disabled**; only `seed:admin` spins up an instance with it enabled. `src/middleware/require-auth.ts` (`requireAuth`) resolves the session from request headers and returns `401` when absent — this is how routers are protected (e.g. the entire `/stores` router).

**OpenAPI / docs.** Each resource has a `src/openapi/<name>.openapi.ts` exporting path objects; `src/openapi/document.ts` merges them into one `createDocument(...)`, and `src/openapi/docs.routes.ts` serves the raw spec plus the Scalar UI. Adding an endpoint means updating the resource's `.openapi.ts` too.

**Error handling.** `src/middleware/error.ts` maps JSON parse failures (`entity.parse.failed`) to `400` and everything else to a generic `500`. There is deliberately **no** mapping of Postgres constraint violations (e.g. foreign-key) to 4xx — that mapping was tried and reverted, so such failures currently surface as `500`.

## Testing

**This repository intentionally has no tests for now** — a suite will be added later as a separate effort. Until then:

- **Do not add tests** (no `*.test.ts`, no framework) unless the user explicitly asks in the task.
- `npm test` is a deliberate no-op that prints a notice and exits 0 — not a suite to run or "fix".
- Verify changes with `npx tsc --noEmit` and, when it matters, by exercising the running app manually (`npm run dev` + requests against `http://localhost:3000`, authenticating first via the seeded admin).

## Registry

`.npmrc` pins the npm registry to `https://registry.npmjs.org`.
