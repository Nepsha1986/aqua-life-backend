# PostgreSQL + Drizzle + Docker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить in-memory `Map`-хранилище на настоящий PostgreSQL через Drizzle ORM, с локальным Postgres в Docker.

**Architecture:** Store-слой (`src/store/merchants.store.ts`) — единственный модуль, знающий про БД. Он переписывается на Drizzle и становится асинхронным; контроллер получает `await`. Drizzle-схема (`src/db/schema.ts`) — источник и типов, и миграций. Внешний контракт API (JSON, HTTP-коды, даты строками ISO) не меняется.

**Tech Stack:** PostgreSQL 17, Drizzle ORM (`drizzle-orm` + `pg`), drizzle-kit (миграции), Docker Compose, Node 22.14 (`--experimental-strip-types`, `--env-file`).

## Global Constraints

- **Node >= 22.14** — перед ЛЮБОЙ командой в новой оболочке выполни `nvm use` (в текущей оболочке был Node 20; `.nvmrc` = `22.14`). Все `node`/`npm`/`npx`/`drizzle-kit` команды требуют этой версии.
- **`erasableSyntaxOnly`** — никаких `enum`, `namespace` с рантайм-членами, параметров-свойств. Оператор `!` (non-null assertion) и `import type` — разрешены (стираются).
- **`verbatimModuleSyntax`** — типы импортировать через `import type`.
- **`rewriteRelativeImportExtensions`** — относительные импорты писать с `.ts` (например `import { db } from '../db/client.ts'`).
- **`module: nodenext`** — нативный ESM.
- **API-контракт неизменен** — `merchant.schema.ts` НЕ трогаем; `createdAt`/`updatedAt` наружу отдаём строками ISO.
- **Express 5** сам ловит отклонённые промисы из `async`-хендлеров → `errorHandler`. `try/catch` в контроллере НЕ добавляем.
- **Версии зависимостей (наблюдавшиеся):** `drizzle-orm@^0.45.2`, `pg@^8.22.0`, `drizzle-kit@^0.31.10`, `@types/pg@^8.20.0`.

---

## Файловая структура

**Создаются:**
- `docker-compose.yml` — сервис Postgres для локальной разработки.
- `.env` — реальный `DATABASE_URL` (в `.gitignore`, НЕ коммитится).
- `.env.example` — шаблон переменных (коммитится).
- `src/db/schema.ts` — Drizzle-описание таблицы `merchants`.
- `src/db/client.ts` — Pool + экземпляр `db`. Единственная точка подключения.
- `drizzle.config.ts` — конфиг для drizzle-kit.
- `drizzle/` — сгенерированные SQL-миграции (коммитится).

**Изменяются:**
- `package.json` — новые зависимости и npm-скрипты; флаг `--env-file-if-exists` в `dev`.
- `.gitignore` — добавить `.env`.
- `src/store/merchants.store.ts` — переписать на Drizzle (async).
- `src/controllers/merchants.controller.ts` — хендлеры становятся `async`, добавляется `await`.

**Удаляются:**
- `src/store/merchants.store.test.ts` — завязан на sync in-memory store.
- `src/app.test.ts` — гоняет HTTP против in-memory store.

---

## Task 1: Docker Compose, переменные окружения, зависимости

**Files:**
- Create: `docker-compose.yml`
- Create: `.env`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json` (dependencies + scripts)

**Interfaces:**
- Consumes: ничего (первая задача).
- Produces: запущенный Postgres на `localhost:5432`; переменную `DATABASE_URL` в `.env`; npm-скрипты `db:generate`, `db:migrate`; установленные пакеты `drizzle-orm`, `pg`, `drizzle-kit`, `@types/pg`.

- [ ] **Step 1: Переключить Node на нужную версию**

Run: `nvm use`
Expected: `Now using node v22.14.x` (читает `.nvmrc`). Если версия не установлена — `nvm install 22.14 && nvm use`.

- [ ] **Step 2: Установить зависимости**

```bash
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
```
Expected: пакеты добавлены в `package.json`, установка без ошибок.

- [ ] **Step 3: Создать `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: aqua-life-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: aqua
      POSTGRES_PASSWORD: aqua_dev_password
      POSTGRES_DB: aqua_life
    ports:
      - '5432:5432'
    volumes:
      - aqua_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U aqua -d aqua_life']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  aqua_pg_data:
```

- [ ] **Step 4: Создать `.env`**

```
DATABASE_URL=postgresql://aqua:aqua_dev_password@localhost:5432/aqua_life
```
Значения совпадают с `docker-compose.yml` (user `aqua`, password `aqua_dev_password`, db `aqua_life`).

- [ ] **Step 5: Создать `.env.example`**

```
DATABASE_URL=postgresql://aqua:aqua_dev_password@localhost:5432/aqua_life
```

- [ ] **Step 6: Добавить `.env` в `.gitignore`**

Файл `.gitignore` должен стать таким:
```
node_modules
.env
```

- [ ] **Step 7: Добавить npm-скрипты и флаг env в `package.json`**

В блоке `"scripts"` заменить `dev` и добавить два скрипта БД:
```json
"scripts": {
  "dev": "node --watch --experimental-strip-types --env-file-if-exists=.env src/server.ts",
  "test": "node --experimental-strip-types --test \"src/**/*.test.ts\"",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

- [ ] **Step 8: Поднять Postgres**

Run: `docker compose up -d`
Expected: контейнер `aqua-life-postgres` создан и запущен.

- [ ] **Step 9: Проверить, что БД принимает подключения**

Run: `docker compose exec postgres pg_isready -U aqua -d aqua_life`
Expected: `... accepting connections`.

- [ ] **Step 10: Commit**

```bash
git add docker-compose.yml .env.example .gitignore package.json package-lock.json
git commit -m "chore: add Postgres via Docker Compose and DB dependencies"
```
Примечание: `.env` НЕ добавляется в коммит (он в `.gitignore`).

---

## Task 2: Drizzle-схема, клиент подключения и конфиг миграций

> **Адаптация после Task 1 (согласовано с пользователем):** схема живёт в
> **папке** `src/db/schema/` (по файлу на таблицу), а не в одном `src/db/schema.ts`.
> Пользователь уже создал `drizzle.config.ts` с глобом `./src/db/schema/*.ts` —
> его НЕ пересоздаём, только дописываем загрузку `.env`. Клиент импортирует таблицу
> напрямую из `./schema/merchants.ts` (барыль `index.ts` пока не заводим, чтобы глоб
> `*.ts` не сканировал лишнего).

**Files:**
- Create: `src/db/schema/merchants.ts`
- Create: `src/db/client.ts`
- Modify: `drizzle.config.ts` (добавить загрузку `.env`)

**Interfaces:**
- Consumes: `DATABASE_URL` из окружения; пакеты из Task 1.
- Produces:
  - `merchants` — Drizzle pgTable (экспорт из `src/db/schema/merchants.ts`).
  - `db` — экземпляр Drizzle (`typeof drizzle(...)`), экспорт из `src/db/client.ts`.
  - `drizzle.config.ts` для drizzle-kit (glob `./src/db/schema/*.ts`, `out: ./drizzle`, `dialect: postgresql`), с загрузкой `.env`.

- [ ] **Step 1: Создать `src/db/schema/merchants.ts`**

```ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const merchants = pgTable('merchants', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
});
```

- [ ] **Step 2: Создать `src/db/client.ts`**

Импортирует таблицу напрямую из папки схемы (`./schema/merchants.ts`).

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/merchants.ts';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error(
		'DATABASE_URL is not set. Create a .env file (see .env.example) and run the dev script.',
	);
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
```

- [ ] **Step 3: Дописать загрузку `.env` в существующий `drizzle.config.ts`**

Пользователь уже создал `drizzle.config.ts`. НЕ пересоздавать — только добавить
загрузку `.env`, чтобы drizzle-kit увидел `DATABASE_URL`. `process.loadEnvFile()` —
нативная функция Node 22 (грузит `.env` из корня); обёрнута в try/catch на случай
отсутствия файла (CI). Итоговый файл:

```ts
import { defineConfig } from 'drizzle-kit';

try {
	process.loadEnvFile();
} catch {
	// .env отсутствует — полагаемся на уже заданные переменные окружения
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set — check your .env file');
}

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/db/schema/*.ts',
	out: './drizzle',
	dbCredentials: {
		url: databaseUrl,
	},
});
```

- [ ] **Step 4: Проверить типизацию**

Run: `npx tsc --noEmit`
Expected: без ошибок. (Store пока ещё sync и на новые файлы не ссылается — это нормально.)

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/client.ts drizzle.config.ts
git commit -m "feat: add Drizzle schema, client and migration config"
```

---

## Task 3: Сгенерировать и применить первую миграцию

**Files:**
- Create: `drizzle/` (сгенерированные файлы миграции)

**Interfaces:**
- Consumes: `merchants` из `src/db/schema.ts`; запущенный Postgres из Task 1; скрипты `db:generate`/`db:migrate` из Task 1.
- Produces: таблицу `merchants` в базе `aqua_life`; закоммиченный каталог `drizzle/`.

- [ ] **Step 1: Убедиться, что Postgres запущен**

Run: `docker compose up -d`
Expected: контейнер работает (idempotent, если уже поднят).

- [ ] **Step 2: Сгенерировать миграцию из схемы**

Run: `npm run db:generate`
Expected: создан каталог `drizzle/` c `.sql`-файлом (например `0000_*.sql`) и папкой `meta/`.

- [ ] **Step 3: Просмотреть сгенерированный SQL**

Открой созданный файл `drizzle/0000_*.sql`.
Expected: `CREATE TABLE "merchants"` с колонками `id` (uuid, PK), `name`, `email` (unique), `created_at`, `updated_at`.

- [ ] **Step 4: Применить миграцию к базе**

Run: `npm run db:migrate`
Expected: `[✓] migrations applied` (или аналог), без ошибок.

- [ ] **Step 5: Проверить, что таблица создана**

Run: `docker compose exec postgres psql -U aqua -d aqua_life -c "\d merchants"`
Expected: описание таблицы `merchants` с пятью колонками и индексом уникальности по `email`.

- [ ] **Step 6: Commit**

```bash
git add drizzle
git commit -m "feat: add initial migration for merchants table"
```

---

## Task 4: Переписать store и контроллер на async; удалить DB-тесты; проверить CRUD end-to-end

**Files:**
- Modify: `src/store/merchants.store.ts` (полная перезапись)
- Modify: `src/controllers/merchants.controller.ts` (хендлеры → `async`/`await`)
- Delete: `src/store/merchants.store.test.ts`
- Delete: `src/app.test.ts`

**Interfaces:**
- Consumes: `db` из `src/db/client.ts`; `merchants` из `src/db/schema.ts`; типы `Merchant`/`CreateMerchantInput`/`UpdateMerchantInput` из `src/schemas/merchant.schema.ts`.
- Produces: асинхронный store —
  - `list(): Promise<Merchant[]>`
  - `findById(id: string): Promise<Merchant | undefined>`
  - `create(input: CreateMerchantInput): Promise<Merchant>`
  - `update(id: string, input: UpdateMerchantInput): Promise<Merchant | undefined>`
  - `remove(id: string): Promise<boolean>`

- [ ] **Step 1: Переписать `src/store/merchants.store.ts`**

`toMerchant` конвертирует строку БД (даты — `Date`) в `Merchant` API-формы (даты — строки ISO). `_reset` удалён (нужен был только тестам).

```ts
import { eq } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { merchants } from '../db/schema.ts';
import type {
	Merchant,
	CreateMerchantInput,
	UpdateMerchantInput,
} from '../schemas/merchant.schema.ts';

type MerchantRow = typeof merchants.$inferSelect;

function toMerchant(row: MerchantRow): Merchant {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export async function list(): Promise<Merchant[]> {
	const rows = await db.select().from(merchants);
	return rows.map(toMerchant);
}

export async function findById(id: string): Promise<Merchant | undefined> {
	const rows = await db.select().from(merchants).where(eq(merchants.id, id));
	const row = rows[0];
	return row ? toMerchant(row) : undefined;
}

export async function create(input: CreateMerchantInput): Promise<Merchant> {
	const rows = await db.insert(merchants).values(input).returning();
	return toMerchant(rows[0]!);
}

export async function update(
	id: string,
	input: UpdateMerchantInput,
): Promise<Merchant | undefined> {
	const rows = await db
		.update(merchants)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(merchants.id, id))
		.returning();
	const row = rows[0];
	return row ? toMerchant(row) : undefined;
}

export async function remove(id: string): Promise<boolean> {
	const rows = await db
		.delete(merchants)
		.where(eq(merchants.id, id))
		.returning({ id: merchants.id });
	return rows.length > 0;
}
```

- [ ] **Step 2: Обновить `src/controllers/merchants.controller.ts` на async/await**

Каждый хендлер становится `async ... : Promise<void>`; перед вызовами store добавляется `await`. Остальное (валидация, коды, JSON, нормализация `id`) без изменений.

```ts
import type { Request, Response } from 'express';
import {
	createMerchantSchema,
	updateMerchantSchema,
} from '../schemas/merchant.schema.ts';
import * as store from '../store/merchants.store.ts';

export async function createMerchant(
	req: Request,
	res: Response,
): Promise<void> {
	const result = createMerchantSchema.safeParse(req.body);
	if (!result.success) {
		res.status(400).json({ error: 'Invalid merchant', details: result.error.issues });
		return;
	}
	const merchant = await store.create(result.data);
	res.status(201).json(merchant);
}

export async function listMerchants(
	_req: Request,
	res: Response,
): Promise<void> {
	res.status(200).json(await store.list());
}

export async function getMerchant(req: Request, res: Response): Promise<void> {
	const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
	const merchant = await store.findById(id);
	if (!merchant) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(200).json(merchant);
}

export async function updateMerchant(
	req: Request,
	res: Response,
): Promise<void> {
	const result = updateMerchantSchema.safeParse(req.body);
	if (!result.success) {
		res.status(400).json({ error: 'Invalid merchant', details: result.error.issues });
		return;
	}
	const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
	const merchant = await store.update(id, result.data);
	if (!merchant) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(200).json(merchant);
}

export async function deleteMerchant(
	req: Request,
	res: Response,
): Promise<void> {
	const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
	const deleted = await store.remove(id);
	if (!deleted) {
		res.status(404).json({ error: 'Merchant not found' });
		return;
	}
	res.status(204).end();
}
```

- [ ] **Step 3: Удалить DB-зависимые тесты**

```bash
git rm src/store/merchants.store.test.ts src/app.test.ts
```
Expected: оба файла удалены. (Причина: контракт store стал async и им нужна поднятая БД — пользователь вернётся к тестам позже.)

- [ ] **Step 4: Проверить типизацию**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 5: Прогнать оставшиеся (не-DB) тесты**

Run: `npm test`
Expected: проходят тесты `merchant.schema.test.ts`, `document.test.ts`, `docs.routes.test.ts`; удалённых файлов в выводе нет.

- [ ] **Step 6: Запустить сервер и проверить CRUD против Postgres**

В отдельном терминале (после `nvm use`): `npm run dev` (ждём `Server is running on http://localhost:3000`). Затем:

```bash
# CREATE → ожидаем 201 и JSON с id/createdAt/updatedAt (даты — строки ISO)
curl -s -X POST http://localhost:3000/merchants \
  -H 'Content-Type: application/json' \
  -d '{"name":"Acme","email":"a@acme.com"}'

# LIST → ожидаем массив с одним merchant
curl -s http://localhost:3000/merchants

# GET по id (подставь id из ответа CREATE) → 200
curl -s http://localhost:3000/merchants/<id>

# UPDATE → 200, name изменён, updatedAt новее createdAt
curl -s -X PATCH http://localhost:3000/merchants/<id> \
  -H 'Content-Type: application/json' \
  -d '{"name":"Acme 2"}'

# DELETE → 204 (пустое тело)
curl -s -i -X DELETE http://localhost:3000/merchants/<id>
```
Expected: коды и форма ответов как выше; `createdAt`/`updatedAt` — строки ISO.

- [ ] **Step 7: Проверить, что данные переживают перезапуск сервера**

Создай merchant (`curl POST`), останови `npm run dev` (Ctrl+C), запусти снова, затем `curl -s http://localhost:3000/merchants`.
Expected: созданный merchant по-прежнему в списке (данные лежат в Postgres/volume, а не в памяти).

- [ ] **Step 8: Commit**

```bash
git add src/store/merchants.store.ts src/controllers/merchants.controller.ts
git commit -m "feat: back merchants store with Postgres via Drizzle"
```

---

## Self-Review

**Покрытие спецификации:**
- Docker (§1 спеки) → Task 1 (Steps 3, 8–9).
- Env-конфиг (§2) → Task 1 (Steps 4–7).
- Слой БД `src/db/` (§3) → Task 2.
- Миграции (§4) → Task 1 (скрипты) + Task 3.
- Переписать store (§5) → Task 4 (Step 1), маппинг дат через `toMerchant`.
- Async в контроллере (§6) → Task 4 (Step 2).
- Зависимости (§7) → Task 1 (Step 2).
- Удаление DB-тестов → Task 4 (Step 3).
- Критерии готовности §1–6 → Task 1 (Step 9), Task 3 (Steps 4–5), Task 4 (Steps 4–7).

**Плейсхолдеры:** отсутствуют — весь код и команды приведены полностью. (`<id>` в curl — реальный runtime-параметр, не плейсхолдер плана.)

**Согласованность типов:** сигнатуры store в блоке Interfaces Task 4 совпадают с кодом Step 1; контроллер (Step 2) вызывает ровно эти функции с `await`; `Merchant`/`CreateMerchantInput`/`UpdateMerchantInput` берутся из существующего `merchant.schema.ts` (не меняется).
