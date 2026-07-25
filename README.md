# DorDam

A phone catalog, price-comparison, and Hybrid RAG recommendation platform for the Bangladesh market. It scrapes phone specifications (GSMArena) and store prices (local BD retailers), serves a GSMArena-style browsing experience, and provides an intelligent Hybrid RAG chat assistant for phone recommendations and comparisons.

The repo is organized as follows:

```
dordam/
├── api/                Python FastAPI Hybrid RAG Chatbot & Retrieval API (Port 8000)
├── backend/            Node.js + Express API + Retailer Scrapers (Port 4000)
└── frontend/dordam/    Next.js 16 (App Router) + React 19 + Tailwind v4 (Port 3000)
```

---

## Quick Start (Running All Services)

To run the complete system locally, start each of the 3 services in separate terminal windows:

### 1. Hybrid RAG FastAPI Service (Port 8000)
```bash
# From workspace root
PYTHONPATH=.:scripts python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```
- **Endpoints**: `/chat`, `/recommend`, `/compare`, `/price`, `/search`, `/healthz`
- **Validation Suite**: `python3 scripts/validate_rag_pipeline.py`
- **Test Suite**: `pytest tests/query_tests/`

### 2. Express Backend API (Port 4000)
```bash
cd backend
npm run dev
```
- **Endpoints**: `/api/health`, `/api/phones`, `/api/brands`, `/api/search`, `/api/compare`

### 3. Next.js Frontend App (Port 3000)
```bash
cd frontend/dordam
npm run dev
```
- **Web App**: Visit `http://localhost:3000`

---

## Architecture at a Glance

```
GSMArena  ──scrape──►  output/gsmarena-catalog-latest.json  ──►  catalogService (in-memory)
                                                                        │
BD stores ──scrape──►  output/<store>-*.json                           ▼
                                                               Express API (:4000)
                                                                        │
                                                                        ▼
                                                       Next.js Frontend (:3000)
                                                                        ▲
                                                                        │
User Query ─────────────────►  FastAPI Hybrid RAG Engine (:8000) ───────┘
```

---

## Hybrid RAG Chat Engine (`api/` & `scripts/`)

Python 3.12 + FastAPI + Chroma Vector DB + SQL Hybrid Search.

- **Intent Classifier**: Identifies 11 core & extended intents (`recommendation`, `comparison`, `price_lookup`, `specification`, `review`, `buying_guide`, `lifecycle_advisory`, `resale_tradein`, `deals_financing`, `mixed`, `general`).
- **Entity Extractor**: Extracts 25+ structured fields (`brand`, `budget`, `camera`, `gaming`, `battery`, `foldable`, `AI features`, `software support`, `personas`).
- **Hybrid Router**: Routes queries to SQL filtering or Vector Semantic Search.
- **Structured Response Schema**: Returns markdown tables, advantages, disadvantages, confidence scores, and store availability.

---

## Backend (`backend/`)

Express 5 app. Entry point `src/server.js` → `src/app.js`.

### API Surface

Mounted under `/api`:

| Method | Route                     | Purpose                                        |
|--------|---------------------------|------------------------------------------------|
| GET    | `/api/health`             | Health/readiness probe (+ DB status)           |
| GET    | `/api/catalog/meta`       | Catalog metadata (source, counts, generatedAt) |
| GET    | `/api/brands`             | Brand list with phone counts                   |
| GET    | `/api/phones`             | List phones with filtering & pagination        |
| GET    | `/api/phones/:slug`       | Phone detail (full spec tables)                |
| GET    | `/api/search?q=`          | Quick typeahead search                         |
| GET    | `/api/compare?slugs=a,b,c`| Compare multiple phones                        |
| GET    | `/api/scrapers`           | List available store scrapers                  |
| POST   | `/api/scrapers/:store/run`| Run a store scraper                            |

---

## Frontend (`frontend/dordam/`)

Next.js **16.2.9** (App Router), React **19**, Tailwind CSS **v4**, TypeScript.

### Structure

- `app/` — App Router pages: `page.tsx` (landing), `phones/`, `brands/`, `compare/`, `finder/`.
- `components/` — `Header`, `Footer`, `PhoneCard`, `SpecTable`, `BrandGrid`, `SearchBox`.
- `lib/api.ts` — typed API client configured for backend communications.

---

## Development & Test Commands Summary

| Component | Command | Details |
| :--- | :--- | :--- |
| **RAG Service** | `PYTHONPATH=.:scripts python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000` | Runs RAG chatbot API on `:8000` |
| **RAG Validation** | `python3 scripts/validate_rag_pipeline.py` | Runs 162-query E2E validation report |
| **Query Tests** | `pytest tests/query_tests/` | Runs 131 functional domain query tests |
| **Backend API** | `cd backend && npm run dev` | Runs Express backend API on `:4000` |
| **Frontend App** | `cd frontend/dordam && npm run dev` | Runs Next.js frontend app on `:3000` |
