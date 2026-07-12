# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Backend for the Aguajoy ("aqua-life") project. Currently an early-stage scaffold: a single Express 5 server (`src/app.ts`) that listens on port 3000 and serves a placeholder route.

## TypeScript configuration (important constraints)

`tsconfig.json` is strict and ESM-first. These settings change how you must write code:

- **`erasableSyntaxOnly`** — only type syntax that erases to nothing is allowed. Do **not** use `enum`, `namespace` with runtime members, or constructor parameter properties. Use `const` objects / union types instead of enums.
- **`verbatimModuleSyntax`** — type-only imports must use `import type` (e.g. `import express, { type Request } from 'express'`).
- **`rewriteRelativeImportExtensions`** — write relative imports with the `.ts` extension in source (e.g. `import './routes/foo.ts'`); the compiler/runtime rewrites them.
- **`module: nodenext`** — native Node ESM resolution. This is an ES module project.
- **`noEmit`** — `tsc` type-checks only; it does not produce JS. The app runs directly via Node's native TypeScript stripping (`--experimental-strip-types`), which matches `erasableSyntaxOnly` — Node strips types but does not transform runtime constructs like enums, so the same code constraints apply at runtime.

## Runtime & commands

Requires **Node >= 22.14** (see `engines` / `.nvmrc`) — run `nvm use` before working. The `zod-openapi` dependency sets this floor; Node strips types behind the `--experimental-strip-types` flag used in the dev script.

- `npm run dev` — start the server on port 3000 with file watching (`node --watch --experimental-strip-types src/app.ts`).
- `npx tsc --noEmit` — type-check.

No lint tooling is configured yet; wire new tooling into `package.json` scripts.

## Testing

**This repository intentionally has no tests for now.** A test suite and tooling
will be added later, as a deliberate, separate effort. Until then:

- **Do not write or add tests** (no `*.test.ts`, no test framework) unless the
  user explicitly asks for them in a given task.
- `npm test` is a deliberate no-op placeholder (it prints a notice and exits 0),
  not a suite to run or "fix".
- Verify changes with `npx tsc --noEmit` and, when it matters, by exercising the
  running app manually (`npm run dev` + requests against `http://localhost:3000`).

## Registry

`.npmrc` pins the npm registry to `https://registry.npmjs.org`.
