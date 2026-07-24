# DorDam — GSMArena-Style Frontend: Structure & Implementation Plan

> Goal: build a GSMArena **clone in look & functionality**, in our own UI style,
> running on **dummy data now** and swappable to the **real API later** without
> rewriting components.

---

## 0. The one thing that changes everything

The plan Google gave assumes a **Vite + `react-router-dom` SPA** (`/client/src`,
`App.jsx`, `main.jsx`, `useNavigate`, `<Link to=...>`, `useSearchParams` from
react-router).

**This project is Next.js 16 App Router.** Routing is *file-based* — folders in
`app/` ARE the routes; there is no `App.jsx` router config. So we keep Google's
**concepts** (URL patterns, component hierarchy, filter-state-in-URL, compare
flow) and translate the **mechanics** to Next idioms:

| Google's SPA idea            | Our Next.js equivalent                                    |
| ---------------------------- | --------------------------------------------------------- |
| `pages/DevicePage.jsx`       | `app/phones/[slug]/page.tsx`                              |
| `App.jsx` route table        | folder structure under `app/`                             |
| `<Link to="/x">`             | `import Link from "next/link"` → `<Link href="/x">`       |
| `useNavigate()`              | `useRouter()` from `next/navigation`                      |
| `useSearchParams` (rr)       | `useSearchParams()` from `next/navigation`                |
| `services/api.js` (axios)    | `lib/api.ts` (fetch) — **already exists**                 |
| `?view=photos` tab switching | same idea, read via `searchParams` prop / hook            |

---

## 1. Current state (verified on disk — 2026-07-21)

We are **further along than the file tree doc suggested**. Existing:

```
app/
├── layout.tsx            ✅ Header + GlobalSidebar + Footer shell
├── page.tsx              ✅ Home (NewsGrid + PopularDevices + CommunityFeed)
├── news/page.tsx         ✅ shell (mock)          news/NewsFeed.tsx
├── reviews/page.tsx      ✅ shell (mock)          reviews/ReviewGrid.tsx
├── videos/page.tsx       ✅ shell (mock)          videos/VideoGrid.tsx
├── phones/page.tsx       ✅ WIRED TO API          phones/PhoneListFilters.tsx
├── phones/[slug]/        ✅ WIRED TO API          (+ page.tsx.bak — delete)
├── brands/page.tsx       ✅ WIRED TO API
├── brands/[slug]/        ✅ WIRED TO API
├── compare/              ✅ WIRED TO API          compare/CompareClient.tsx
├── finder/               ✅ WIRED TO API          finder/FinderClient.tsx
└── not-found.tsx         ✅

components/  Header, GlobalSidebar, Footer, BrandGrid, BrandSidebar,
             NewsGrid, PopularDevices, PopularComparisons, LatestDevices,
             CommunityFeed, DailyInterest, FanFavorites, InStoresNow,
             PhoneCard, SearchBox, Pagination, SpecTable, ImageGallery.bak
lib/api.ts   ✅ typed fetch client for the catalog backend
```

**Key finding — two data realities coexist:**
- **Catalog** (phones / brands / compare / finder) → already fetches the real
  backend via `lib/api.ts`.
- **Editorial** (news / reviews / videos / home feeds) → **mock data hardcoded
  inline inside each component**. No shared data layer, no article detail pages.

So "make it like GSMArena" = fill the **editorial gap** + add missing sub-routes,
while introducing a **clean dummy-data layer** so the later API swap is trivial.

---

## 2. Target directory structure

Adapts Google's `layout / common / feature` grouping to what we have. `components/`
gets **subfolders** (currently flat); a new `lib/mock/` isolates all dummy data.

```
frontend/dordam/
├── app/                                  # ROUTES (file-based)
│   ├── layout.tsx                        # ✅ global shell
│   ├── page.tsx                          # ✅ Home
│   ├── globals.css                       # ✅ theme tokens (--accent, etc.)
│   ├── not-found.tsx                     # ✅
│   │
│   ├── news/
│   │   ├── page.tsx                      # ✅ feed  (→ read from lib/mock)
│   │   └── [slug]/page.tsx               # 🔲 article detail
│   ├── reviews/
│   │   ├── page.tsx                      # ✅ feed
│   │   └── [slug]/page.tsx               # 🔲 review article
│   ├── videos/
│   │   └── page.tsx                      # ✅ feed
│   │
│   ├── phones/
│   │   ├── page.tsx                      # ✅ list + filters (API)
│   │   └── [slug]/page.tsx               # ✅ device detail (API)
│   │        # tabs: ?view=specs|photos|opinions  🔲 wire photos/opinions
│   ├── brands/
│   │   ├── page.tsx                      # ✅ all brands
│   │   └── [slug]/page.tsx               # ✅ devices in brand
│   ├── compare/page.tsx + CompareClient  # ✅
│   ├── finder/page.tsx + FinderClient    # ✅
│   │
│   ├── deals/page.tsx                    # 🔲 optional (GSMArena "Deals")
│   ├── featured/page.tsx                 # 🔲 optional
│   └── (info)/                           # 🔲 grouped static: about, contact,
│       ├── about/page.tsx                #     privacy, terms — footer links
│       ├── contact/page.tsx
│       ├── privacy/page.tsx
│       └── terms/page.tsx
│
├── components/
│   ├── layout/                           # 🔲 MOVE existing here
│   │   ├── Header.tsx        # global nav + search + brand dropdown
│   │   ├── Footer.tsx
│   │   ├── GlobalSidebar.tsx # right column (GSMArena style)
│   │   └── BrandSidebar.tsx  # BrandBox — list of manufacturers
│   ├── common/                           # 🔲 reusable primitives
│   │   ├── DeviceCard.tsx    # ← rename/adapt PhoneCard
│   │   ├── NewsCard.tsx      # 🔲 extract from NewsGrid
│   │   ├── SpecRow.tsx       # 🔲 label | value row
│   │   ├── Pagination.tsx
│   │   └── SearchBox.tsx
│   ├── device/                           # device-detail pieces
│   │   ├── SpecTable.tsx
│   │   ├── HighlightBox.tsx  # 🔲 popularity / fans / key specs card
│   │   ├── PhotoGallery.tsx  # ← restore ImageGallery.bak
│   │   └── OpinionList.tsx   # 🔲 comments + ratings (dummy)
│   ├── finder/                           # 🔲
│   │   ├── FilterSidebar.tsx # checkboxes/sliders (OS, battery, camera…)
│   │   └── ResultGrid.tsx
│   ├── compare/
│   │   └── CompareTable.tsx  # ← from CompareClient
│   └── home/                             # 🔲 group home-page feeds
│       ├── NewsGrid.tsx  PopularDevices.tsx  PopularComparisons.tsx
│       ├── LatestDevices.tsx  CommunityFeed.tsx  DailyInterest.tsx
│       └── FanFavorites.tsx  InStoresNow.tsx
│
├── lib/
│   ├── api.ts                            # ✅ real catalog client (keep)
│   ├── types.ts                          # 🔲 shared TS types (News, Review,
│   │                                     #    Video, Device, Opinion…)
│   └── mock/                             # 🔲 ALL dummy data lives here
│       ├── news.ts       # NewsArticle[]  + getNews / getNewsBySlug
│       ├── reviews.ts    # Review[]
│       ├── videos.ts     # Video[]
│       ├── phones.ts     # Device[] (fallback when API is off)
│       ├── opinions.ts   # Opinion[]
│       └── index.ts      # re-exports
│
└── utils/                                # 🔲
    ├── slugify.ts        # title → url slug
    └── specFormatter.ts  # normalize spec units / labels
```

`.bak` files (`phones/[slug]/page.tsx.bak`, `ImageGallery.bak`, `Sidebar.tsx.bak`)
→ review & delete; they add noise.

---

## 3. Routing & URL map (Next.js)

Mirrors GSMArena URL semantics; filter/tab state lives in the **URL query** so
links are shareable (Google's point C & D — kept, translated to Next).

| Route (folder)            | URL                                   | State in URL                     | Data source (now → later)      |
| ------------------------- | ------------------------------------- | -------------------------------- | ------------------------------ |
| `app/page.tsx`            | `/`                                   | —                                | mock feeds → API mix           |
| `app/news/page.tsx`       | `/news`                               | `?page=`                         | `lib/mock/news` → API          |
| `app/news/[slug]`         | `/news/best-phones-2026`              | —                                | mock → API                     |
| `app/reviews/[slug]`      | `/reviews/galaxy-a27`                 | —                                | mock → API                     |
| `app/videos/page.tsx`     | `/videos`                             | `?page=`                         | mock → API                     |
| `app/phones/page.tsx`     | `/phones`                             | `?brand=&year=&sort=&page=`      | **API today**                  |
| `app/phones/[slug]`       | `/phones/apple-iphone-15-pro`         | `?view=specs\|photos\|opinions`  | **API** + mock opinions        |
| `app/brands/page.tsx`     | `/brands`                             | —                                | **API today**                  |
| `app/brands/[slug]`       | `/brands/samsung`                     | `?page=`                         | **API today**                  |
| `app/finder/page.tsx`     | `/finder`                             | `?os=&battery_min=&camera_min=…` | **API today**                  |
| `app/compare/page.tsx`    | `/compare?slugs=a,b,c`                | `?slugs=`                        | **API today**                  |

**Next patterns to use (not react-router):**
- Read query in a **Server Component** page: `export default async function Page({ searchParams }) {}`.
- Read query in a **Client Component**: `const sp = useSearchParams()` from `next/navigation`.
- Update query on filter change: `const router = useRouter(); router.push(`/finder?${params}`)` (`next/navigation`).
- Device tabs (`?view=photos`) → conditionally render `PhotoGallery` / `OpinionList` / `SpecTable` from the `view` param — no reload.

---

## 4. Dummy-data layer — the swap-later contract

The whole point of "dummy now, API later" is that **components never know which
one they got**. Rule:

1. Every data type gets a definition in `lib/types.ts`.
2. Every screen calls an **async accessor** (`getNews()`, `getReviewBySlug()`),
   never an inline array. Mock accessors return `Promise` so signatures already
   match the future `fetch`.
3. `lib/mock/*` holds the arrays + accessors today. Later, each accessor's body
   is replaced with a `fetch` to `lib/api.ts` — **zero component changes**.

```ts
// lib/mock/news.ts  (today)
export async function getNews(): Promise<NewsArticle[]> { return NEWS; }
export async function getNewsBySlug(slug: string) {
  return NEWS.find(n => n.slug === slug) ?? null;
}
// later: swap body for  return apiGet(`/news`)  — callers untouched.
```

This also removes today's anti-pattern (arrays hardcoded *inside* `NewsGrid.tsx`).

---

## 5. Component linking map (data flow)

```
Header ─ SearchBox ─▶ /phones/[slug]         (device)
       └ nav links ─▶ /news /reviews /finder …
Home   ─ NewsGrid ───▶ /news/[slug]
       ├ PopularDevices ─▶ /phones/[slug]
       └ BrandGrid ─────▶ /brands/[slug]
Brand  ─ DeviceCard ─▶ /phones/[slug]   ; Pagination ─▶ ?page=2
Phones ─ FilterSidebar ─▶ updates ?query ─▶ list refetch
Device ─ HighlightBox (key specs)
       ├ tab switch ─▶ ?view= ─ SpecTable ⇄ PhotoGallery ⇄ OpinionList
       └ RelatedPhones ─▶ /phones/[slug]
Finder ─ FilterSidebar ─▶ ?os=&battery_min= ─ ResultGrid ─▶ /phones/[slug]
Compare─ "Add to compare" ─▶ localStorage/Context ─▶ /compare?slugs=
```

---

## 6. Implementation phases (we do these next, in order)

Each phase is independently shippable and keeps the app runnable.

**Phase 0 — Cleanup & scaffolding (no visual change)**
- Delete `.bak` files; create `lib/types.ts`, `lib/mock/`, `utils/`.
- Reorganize `components/` into `layout/ common/ device/ finder/ compare/ home/`
  (update imports). *(Optional — can defer if risky.)*

**Phase 1 — Dummy-data layer**
- Move all inline arrays (NewsGrid, ReviewGrid, VideoGrid, home feeds) into
  `lib/mock/*` behind async accessors. Screens import accessors.

**Phase 2 — Editorial detail pages (biggest gap)**
- `news/[slug]`, `reviews/[slug]` article pages (ArticlePage pattern).
- Wire NewsCard/ReviewGrid links to them.

**Phase 3 — Device detail depth**
- `HighlightBox`, restore `PhotoGallery`, add `OpinionList` (dummy comments).
- Implement `?view=specs|photos|opinions` tab switching.
- `RelatedPhones` strip.

**Phase 4 — Finder & Compare polish**
- Extract `FilterSidebar` + `ResultGrid`; ensure all filters serialize to URL.
- Compare selection via Context/localStorage → `?slugs=`.

**Phase 5 — Static/info pages & nav completeness**
- `(info)/about|contact|privacy|terms`; optional `deals`, `featured`.
- Point Footer links at real routes (currently `#`).

**Phase 6 — Consistency pass**
- Shared `DeviceCard`, `Pagination`, `SpecRow`; unify card styling; responsive
  + empty/loading states.

---

## 7. Open decisions (confirm before Phase 0)

1. **Component reorg (Phase 0)** — do the folder move now, or leave `components/`
   flat and only add new subfolders? (Move = cleaner, but touches many imports.)
2. **Scope of "editorial"** — news + reviews + videos all with detail pages, or
   news only for the first pass?
3. **Optional sections** — include `deals` / `featured`, or skip until real data?
4. **UI style** — keep the current dark GSMArena-like theme in `globals.css`, or
   are we redesigning the visual style as part of this?
```
