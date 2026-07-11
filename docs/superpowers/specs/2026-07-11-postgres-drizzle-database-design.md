# Подключение PostgreSQL через Drizzle + Docker

**Дата:** 2026-07-11
**Статус:** согласовано, готово к плану реализации
**Ветка:** `feature/data-base`

## Цель

Заменить временное in-memory хранилище (`Map`) на настоящую базу данных PostgreSQL.
Проект учебно-продакшн: выбранные инструменты (Postgres + Drizzle + Docker) не
придётся выбрасывать при переходе в прод. Внешний контракт API (JSON-формат ответов,
HTTP-коды) остаётся **без изменений**.

## Контекст

Сейчас `merchants` — единственный реальный ресурс, построенный по слоёному шаблону
(schema → store → controller → routes → error middleware). Store-слой
(`src/store/merchants.store.ts`) намеренно написан «под БД» и является единственным
модулем, знающим про хранилище. Это тот момент, ради которого так закладывалось:
меняем в основном store, всё остальное почти не трогаем.

### Ограничения TypeScript (из CLAUDE.md — соблюдать)

- `erasableSyntaxOnly` — никаких `enum`, `namespace` с рантайм-членами,
  параметров-свойств в конструкторе. Drizzle это не требует.
- `verbatimModuleSyntax` — типы импортировать через `import type`.
- `rewriteRelativeImportExtensions` — относительные импорты писать с расширением `.ts`.
- `module: nodenext` — нативный ESM.
- Рантайм — Node `--experimental-strip-types` (Node >= 22.14). Драйвер `pg` (CommonJS)
  импортируется через ESM-interop; `drizzle-orm` поставляется как ESM.

## Выбранный стек

| Решение | Выбор | Почему |
| --- | --- | --- |
| СУБД | **PostgreSQL** (`postgres:17-alpine`) | Индустриальный стандарт, данные реляционные, знания переносимы в прод |
| Слой доступа | **Drizzle ORM** | TS-first, близко к SQL, мало «магии», хорошо ложится на strict ESM |
| Локальный запуск | **Docker Compose** | Настоящий Postgres одной командой, ничего не ставится в ОС |
| Миграции | **drizzle-kit** | Структура БД под контролем и повторяема |
| Тесты | **отложены** | Пользователь вернётся позже; DB-зависимые тесты удаляются (см. ниже) |

Отклонённые альтернативы: SQLite (пришлось бы менять при переходе в прод),
MongoDB (документная, для реляционных данных избыточна), Prisma (больше «магии» и
codegen/бинарный движок — лишнее трение со strict/ESM-сетапом), чистый `pg` + SQL
(больше ручной работы, нет автотипов из схемы).

## Архитектура и компоненты

### 1. Docker — локальный Postgres

Новый `docker-compose.yml` в корне, один сервис `postgres`:

- образ `postgres:17-alpine`;
- переменные: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`;
- порт `5432:5432`;
- именованный volume для данных (переживает `down`/перезапуск);
- (опционально) healthcheck `pg_isready`.

Команды: `docker compose up -d` / `docker compose down`.

### 2. Конфигурация через переменные окружения

- `.env` — реальные значения, включая `DATABASE_URL`
  (`postgresql://<user>:<pass>@localhost:5432/<db>`). Добавляется в `.gitignore`.
- `.env.example` — шаблон без секретов, коммитится.
- Node читает `.env` через флаг `--env-file` в npm-скриптах (`--env-file-if-exists`,
  чтобы отсутствие файла не роняло запуск).
- Значения переменных из `.env` и `docker-compose.yml` должны совпадать
  (один и тот же пользователь/пароль/база).

### 3. Слой БД — `src/db/`

- **`src/db/schema.ts`** — таблица `merchants` на Drizzle:
  - `id` — `uuid`, PK, `defaultRandom()`;
  - `name` — `text`, not null;
  - `email` — `text`, not null, `unique`;
  - `createdAt` — `timestamp` (with time zone), `defaultNow()`, not null;
  - `updatedAt` — `timestamp` (with time zone), `defaultNow()`, not null.
- **`src/db/client.ts`** — создаёт `pg` Pool из `DATABASE_URL` и экспортирует
  `db` (экземпляр `drizzle(pool, { schema })`). Единственная точка подключения.
- **`drizzle.config.ts`** (корень) — для drizzle-kit: путь к `schema.ts`, каталог
  вывода миграций (`./drizzle`), `dialect: 'postgresql'`, `DATABASE_URL`.

### 4. Миграции

- Каталог `drizzle/` (сгенерированный SQL), коммитится.
- npm-скрипты:
  - `db:generate` — `drizzle-kit generate` (SQL из `schema.ts`);
  - `db:migrate` — `drizzle-kit migrate` (применить к БД).
- Первая миграция создаёт таблицу `merchants`. Порядок первого запуска:
  `docker compose up -d` → `npm run db:generate` → `npm run db:migrate` → `npm run dev`.

### 5. Переписать store — `src/store/merchants.store.ts`

Единственный слой, меняющийся по сути. Сигнатуры сохраняются, но функции становятся
**асинхронными** (возвращают `Promise`):

- `list(): Promise<Merchant[]>`
- `findById(id): Promise<Merchant | undefined>`
- `create(input): Promise<Merchant>`
- `update(id, input): Promise<Merchant | undefined>`
- `remove(id): Promise<boolean>`

Семантика «не найдено» та же: `undefined` / `false`.

**Маппинг типов.** В БД `createdAt/updatedAt` — `timestamp` (Drizzle отдаёт `Date`),
а API-схема (`merchant.schema.ts`) описывает их как строки ISO. Store конвертирует
`Date → date.toISOString()` перед возвратом, чтобы контракт API не менялся.
`merchant.schema.ts` **не меняем**.

`_reset` — убрать (нужен был только тестам, которые удаляются).

### 6. Асинхронная «протечка» в контроллер — `src/controllers/merchants.controller.ts`

- Хендлеры становятся `async` с типом возврата `Promise<void>`.
- Перед каждым вызовом store добавляется `await`.
- Логика валидации, коды ответов, форма JSON, нормализация `id` — без изменений.
- Роуты (`merchants.routes.ts`) и схемы — без изменений.

### 7. Зависимости

- `dependencies`: `drizzle-orm`, `pg`.
- `devDependencies`: `drizzle-kit`, `@types/pg`.

## Тесты (отложено)

Новые тесты в этой работе не пишем. DB-зависимые тесты **удаляются**, т.к. контракт
store меняется (sync → async) и им понадобилась бы поднятая БД:

- удалить `src/app.test.ts`;
- удалить `src/store/merchants.store.test.ts`.

Не зависят от БД и **сохраняются**: `src/schemas/merchant.schema.test.ts`,
`src/openapi/document.test.ts`, `src/openapi/docs.routes.test.ts`. Скрипт `test`
в `package.json` остаётся. К стратегии тестирования против БД пользователь вернётся
позже.

## Обработка ошибок

- Ошибки БД (недоступна, нарушение уникальности email и т.п.) всплывают из store как
  отклонённые промисы; их ловит уже существующий `errorHandler`
  (`src/middleware/error.ts`) — в этой итерации отдаёт 500. Тонкую обработку
  (например, 409 на дубликат email) выносим за скоп, добавим позже при необходимости.
- Отсутствие `DATABASE_URL` при старте — падение с понятной ошибкой (fail-fast).

## Вне скоупа (YAGNI)

- Отдельная тестовая БД и тесты против неё (пользователь вернётся позже).
- Автозапуск миграций при старте приложения (пока запускаем вручную).
- Пулы/тюнинг соединений, репликация, seed-данные.
- Специальные HTTP-коды для ошибок БД (дубликаты и т.п.).
- Миграция других ресурсов (пока только `merchants`).

## Критерии готовности

1. `docker compose up -d` поднимает Postgres.
2. `npm run db:generate` + `npm run db:migrate` создают таблицу `merchants`.
3. `npm run dev` стартует; CRUD `/merchants` работает против Postgres, данные
   переживают перезапуск сервера.
4. Форма ответов API идентична прежней (даты — строки ISO).
5. `npx tsc --noEmit` проходит без ошибок.
6. Оставшиеся (не-DB) тесты проходят: `npm test`.
