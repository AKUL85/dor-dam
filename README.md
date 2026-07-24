# DorDam

A phone catalog and price-comparison platform for the Bangladesh market. It scrapes
phone specifications (GSMArena) and store prices (local BD retailers), then serves a
GSMArena-style browsing experience: brands, phone specs, search, filters, and compare.

The repo is a monorepo with two independent apps:

```
dor-dam-main/
├── backend/            Node.js + Express API + scrapers (Prisma/Postgres optional)
└── frontend/dordam/    Next.js 16 (App Router) + React 19 + Tailwind v4
```

---

## Architecture at a glance

```
GSMArena  ──scrape──►  output/gsmarena-catalog-latest.json  ──►  catalogService (in-memory)
                                                                        │
BD stores ──scrape──►  output/<store>-*.json                           ▼
                                                              Express API (/api/...)
                                                                        │
                                                                        ▼
                                                       Next.js frontend (lib/api.ts)
```

Key design point: **the catalog API reads from a JSON file, not the database.**
`catalogService` loads `output/gsmarena-catalog-latest.json` into memory and hot-reloads
it when the file changes. Prisma/Postgres is wired up in the schema but the catalog
browsing path does not require a database — persistence only activates when
`DATABASE_URL` is set.

---

## Backend (`backend/`)

Express 5 app. Entry point `src/server.js` → `src/app.js` (app factory, exported
separately so it can be imported in tests without binding a port).

### API surface

Mounted under `/api` (see [backend/src/routes/index.js](backend/src/routes/index.js)):

| Method | Route                     | Purpose                                        |
|--------|---------------------------|------------------------------------------------|
| GET    | `/api/health`             | Health/readiness probe (+ DB status)           |
| GET    | `/api/catalog/meta`       | Catalog metadata (source, counts, generatedAt) |
| GET    | `/api/brands`             | Brand list with phone counts                   |
| GET    | `/api/phones`             | List phones — `search,brand,year,minYear,sort,page,pageSize` |
| GET    | `/api/phones/:slug`       | Phone detail (full spec tables)                |
| GET    | `/api/search?q=`          | Quick typeahead search                         |
| GET    | `/api/compare?slugs=a,b,c`| Compare multiple phones                        |
| GET    | `/api/scrapers`           | List available store scrapers                  |
| POST   | `/api/scrapers/:store/run`| Run a store scraper                            |

### Layers

- `src/routes/` → `src/controllers/` (thin HTTP) → `src/services/` (logic)
- `catalogService.js` — the read model powering the browsing API (loads the JSON catalog).
- `scraperService.js` / `persistenceService.js` — run scrapers, optionally persist to Postgres.
- `src/scraper/core/` — base classes: `BaseScraper`, `AbstractScraper`, `ApiScraper`,
  `CheerioScraper`, `Browser` (Playwright).
- `src/scraper/gsmarena/` — `GsmArenaScraper.js` + `parse.js` (builds the spec catalog).
- `src/scraper/stores/` — one scraper per BD retailer (StarTech, Gadget & Gear,
  Diamu, Apple Gadgets, Rio, Kry, Mobile Buzz, etc.), registered in `registry.js`.
- `src/config/env.js` — single immutable config object from `.env`.
- `src/middleware/` — request logger, async handler, 404, central error handler.

### Data model (`prisma/schema.prisma`)

Postgres, two tiers:
- **Tier A (slow-changing specs):** `PhoneModel` → `Phone` variants.
- **Tier B (market data, ~6h refresh):** `Store`, `StoreRating`, `Listing` (price/stock per store).

### Run it

```bash
cd backend
cp .env.example .env          # configure PORT, CORS_ORIGIN, DATABASE_URL (optional), SCRAPER_* knobs
npm install
npx playwright install chromium

# 1. Build the phone catalog (writes output/gsmarena-catalog-latest.json)
node src/gsmarena-cli.js                      # full catalog
node src/gsmarena-cli.js --brands=apple,samsung --max-models=5   # scoped run
#   flags: --brands= --max-brands= --max-models= --max-pages= --delay-ms= --no-cache --include-all

# 2. Start the API (defaults to :4000)
npm run dev                   # nodemon
npm start                     # plain node

# Other:
npm run scrape                # store scrapers (src/cli.js)
npm run prisma:generate
npm run prisma:migrate
npm run lint
```

Note: there is no test runner yet (`npm test` is a placeholder that exits 1).

---

## Frontend (`frontend/dordam/`)

Next.js **16.2.9** (App Router), React **19**, Tailwind CSS **v4**, TypeScript.

> ⚠️ **This is not the Next.js you may know.** Per
> [AGENTS.md](frontend/dordam/AGENTS.md), this version has breaking changes vs. older
> releases. Read the relevant guide in `node_modules/next/dist/docs/` before writing
> frontend code.

### Structure

- `app/` — App Router pages: `page.tsx` (landing), `phones/` (list + `[slug]` detail),
  `brands/`, `compare/`, `finder/`. List/detail are Server Components; interactive
  pieces (`CompareClient`, `FinderClient`, `PhoneListFilters`) are Client Components.
- `components/` — `Header`, `Footer`, `PhoneCard`, `SpecTable`, `BrandGrid`,
  `SearchBox`, `Pagination`.
- `lib/api.ts` — typed API client. Talks to the backend via
  `NEXT_PUBLIC_API_BASE` (default `http://localhost:4000/api`).

### Run it

```bash
cd frontend/dordam
npm install
npm run dev                   # http://localhost:3000
# build/start/lint also available
```

Set `NEXT_PUBLIC_API_BASE` if the backend isn't on `localhost:4000`.

---

## Typical local dev flow

1. `cd backend && node src/gsmarena-cli.js --brands=apple --max-models=5` — seed a small catalog.
2. `cd backend && npm run dev` — API on :4000.
3. `cd frontend/dordam && npm run dev` — UI on :3000.

---

## Repo hygiene notes (for agents)

The working tree currently contains scratch/experiment files that are **not** part of
the app: `backend/scratch*.js`, `backend/test_*.js`, `backend/find_dataset.js`,
`backend/import_csv.js`, `backend/seed-mock.js`, `backend/dataset.csv`,
`output/solution.cpp`, and dated `output/*.json` scrape dumps. Treat these as
throwaway; the durable code lives under `backend/src/` and `frontend/dordam/`.
Prefer editing `output/gsmarena-catalog-latest.json` consumers via `catalogService`
rather than reading the raw dumps.
