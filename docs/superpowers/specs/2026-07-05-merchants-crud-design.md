# Merchants CRUD — Design

Date: 2026-07-05
Status: Approved

## Goal

Add the first real resource to the aqua-life backend: full CRUD endpoints for
**merchants**. This resource sets the structural pattern that later resources
will follow.

## Scope & constraints

- **Storage:** in-memory mock store only (a `Map` in the process). Data resets
  on server restart. No database dependency yet. Only the store layer knows
  data is in-memory, so a real DB can replace it later without touching routes
  or controllers.
- **Validation:** [Zod](https://zod.dev). Schemas are the single source of
  truth; the `Merchant` type is derived from them via `z.infer`, so validation
  and types cannot drift.
- **Project TypeScript constraints still apply** (from `CLAUDE.md`):
  `erasableSyntaxOnly` (no enums — use union types / `const` objects),
  `verbatimModuleSyntax` (`import type` for type-only imports),
  `rewriteRelativeImportExtensions` (write relative imports with `.ts`),
  `module: nodenext` ESM.

## Data model

A `Merchant`:

| Field       | Type              | Source                                   |
|-------------|-------------------|------------------------------------------|
| `id`        | string (UUID)     | server-generated (`crypto.randomUUID()`) |
| `name`      | string, non-empty | client                                   |
| `email`     | string, email     | client                                   |
| `createdAt` | string (ISO)      | server, set on create                    |
| `updatedAt` | string (ISO)      | server, set on create and each update    |

Input shapes (Zod):

- `createMerchantSchema` — `{ name, email }`, both required.
- `updateMerchantSchema` — `{ name?, email? }`, partial; at least one field
  required (reject an empty patch with `400`).

`Merchant`, `CreateMerchantInput`, and `UpdateMerchantInput` are all inferred
from these schemas.

## Structure

```
src/
  app.ts                               # bootstrap: create app, express.json(), mount routes, error middleware, listen
  schemas/merchant.schema.ts           # Zod schemas + inferred types
  store/merchants.store.ts             # in-memory Map + data-access functions (the mock DB)
  routes/merchants.routes.ts           # maps HTTP routes -> controller functions
  controllers/merchants.controller.ts  # request/response handling + Zod validation
  middleware/error.ts                  # centralized error handler
```

Layer responsibilities:

- **schema** — defines merchant shape and input validation; exports inferred types.
- **store** — owns the `Map<string, Merchant>`; pure data functions
  (`list`, `findById`, `create`, `update`, `remove`). No HTTP awareness.
- **controller** — parses/validates input with Zod, calls the store, shapes the
  HTTP response and status codes.
- **routes** — wires paths + methods to controller functions.
- **error middleware** — turns thrown errors into consistent JSON.

## Endpoints

| Method   | Path             | Purpose                         | Success        |
|----------|------------------|---------------------------------|----------------|
| `POST`   | `/merchants`     | Create                          | `201` + merchant |
| `GET`    | `/merchants`     | List all                        | `200` + array  |
| `GET`    | `/merchants/:id` | Get one                         | `200` + merchant |
| `PATCH`  | `/merchants/:id` | Update (partial: name / email)  | `200` + merchant |
| `DELETE` | `/merchants/:id` | Delete                          | `204` no content |

## Error handling

- Invalid body (Zod failure) → `400` with the validation issues.
- Empty PATCH body → `400`.
- Unknown `:id` on GET/PATCH/DELETE → `404`.
- All errors emitted as consistent JSON: `{ "error": <message> }` (with optional
  `details` for validation issues), produced by the single `error.ts` middleware.

## Testing

Use Node's built-in test runner (`node:test`) — no new test dependency, matches
the project's minimal-deps style. Run via `npm test`
(`node --experimental-strip-types --test`).

Coverage:

- **Store unit tests** — create/find/update/remove behavior, including
  not-found cases.
- **HTTP tests** — exercise each endpoint against the Express app, asserting
  status codes and payloads for both success and error paths (missing fields,
  bad email, unknown id, empty patch).

## Dependencies to add

- `zod` (runtime dependency).

## Out of scope (YAGNI for now)

- Real database / persistence across restarts.
- Auth / authorization.
- Pagination, filtering, sorting on the list endpoint.
- Extra merchant fields (`phone`, `address`, `status`) — add when needed.
