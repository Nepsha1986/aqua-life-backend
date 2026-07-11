# OpenAPI docs — Design

**Date:** 2026-07-11
**Status:** Approved, ready for implementation plan

## Goal

Provide a deployable, interactive API documentation UI for the aqua-life
backend, derived from the existing Zod schemas so docs and validation never
drift. The UI is served from the existing Express app.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Docs UI | **Scalar** (`@scalar/express-api-reference`) | Modern DX, built-in "try it out" API client, trivial to mount in Express. |
| Spec source | **Derived from Zod** | Schemas are the single source of truth; docs cannot drift from validation. |
| Zod → OpenAPI | **`zod-openapi@^6`** | Purpose-built library, targets Zod 4 (peer dep `zod@^4`), less boilerplate than hand-rolling, handles OpenAPI edge cases. |
| Hosting | **Served from the Express app** | Deploying the app deploys the docs; no separate hosting. |

## Architecture

Data flow:

```
merchant.schema.ts (Zod, + .meta())
        │
        ▼
merchants.openapi.ts  ── route definitions (paths, params, bodies, responses)
        │
        ▼
openapi/document.ts   ── createDocument() merges all resources → one OpenAPI 3.1 object
        │
        ├──►  GET /openapi.json   (serves the raw spec)
        └──►  GET /docs           (Scalar UI, reads /openapi.json)
```

## Components

| File | Change | Purpose |
|------|--------|---------|
| `src/schemas/merchant.schema.ts` | Edit | Add `.meta({ id, description, example })` to schemas so they register as reusable OpenAPI components. No change to validation behavior. |
| `src/openapi/merchants.openapi.ts` | New | Route docs for the 5 merchant endpoints: params, request bodies, responses — referencing the Zod schemas. |
| `src/openapi/document.ts` | New | Calls `createDocument()` with `info`, `servers`, and merged `paths` → the full OpenAPI 3.1 object. |
| `src/openapi/docs.routes.ts` | New | Mounts `GET /openapi.json` (raw spec) and `GET /docs` (Scalar UI). |
| `src/app.ts` | Edit | `app.use(docsRouter)` alongside the merchants router. |

### `zod-openapi` v6 usage notes

- Metadata is added with Zod's native `.meta()` — no `extendZodWithOpenApi`
  needed in v6.
- A `.meta({ id: 'Merchant' })` auto-registers the schema as a reusable
  component (`components.schemas.Merchant`), so response/body references reuse
  it rather than inlining.
- The document is built with `createDocument({ openapi: '3.1.0', info, servers, paths })`.

## Endpoints documented

All five existing merchant routes, matching `merchants.routes.ts`:

| Method | Path | Request | Success | Errors |
|--------|------|---------|---------|--------|
| POST | `/merchants` | `CreateMerchant` body | `201` `Merchant` | `400` |
| GET | `/merchants` | — | `200` `Merchant[]` | — |
| GET | `/merchants/:id` | `id` path param | `200` `Merchant` | `404` |
| PATCH | `/merchants/:id` | `id` param + `UpdateMerchant` body | `200` `Merchant` | `400`, `404` |
| DELETE | `/merchants/:id` | `id` path param | `204` | `404` |

Documented error shapes (`400`, `404`) match what the `errorHandler`
middleware actually returns.

## Error handling & correctness

- **Build-safe generation**: `createDocument()` runs once at module load
  (server startup). A malformed schema reference throws on boot, not in prod.
- **Sync guarantee**: responses/bodies reference the same Zod schemas the
  controllers validate against, so docs cannot describe a shape the API
  rejects.

## Testing

Follows the existing `*.test.ts` + `node --test` convention.

- `src/openapi/document.test.ts` — assert `createDocument()` output has
  `openapi: '3.1.0'`, a `Merchant` component, and all 5 merchant paths with
  the expected methods. Structural assertions, no snapshots (brittle).
- `src/openapi/docs.routes.test.ts` — HTTP-level (like `app.test.ts`):
  `GET /openapi.json` → `200` + JSON containing `paths`; `GET /docs` → `200` +
  HTML.

## Dependencies

- `zod-openapi@^6` (runtime) — needs Zod 4 (have `4.4.3`).
- `@scalar/express-api-reference@^0.10` (runtime) — the UI middleware.

## Out of scope (YAGNI)

- Auth/security-scheme docs.
- Resources beyond merchants (merchants is the template others copy).
- Spec versioning.
- Static `openapi.json` export script (add later if serverless docs wanted).
