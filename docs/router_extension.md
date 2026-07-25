# Extended Hybrid RAG Router Specification
**Target System:** DorDam Mobile Phone Hybrid RAG Chatbot  
**Document Purpose:** Extended Hybrid Router Specifications & Category Routing Rules  
**Output Location:** `docs/router_extension.md`  

---

## 1. Overview & Architecture

The **Hybrid Router** is the orchestration engine of the DorDam RAG system. It receives the NLU intent classifier output (`intent`, `extracted_entities`, `budget`, `brands`, `models`, `priority`) and produces a deterministic **Execution Plan** specifying:
1. Which retrieval engine(s) to dispatch in sequence.
2. Engine-specific argument overrides and filters.
3. Reranking parameters (`top_k`, `rerank_candidates`, `alpha`).
4. Context merging strategies (`ranked`, `table`, `spec_then_pricing`, `concat`, `advisory_merge`, `resale_merge`, `deals_merge`).

The router extends existing core functionality without breaking or replacing baseline routing logic.

---

## 2. Retrieval Engines (10 Engine Types)

The router dispatches execution across **10 retrieval engine types**:

| Engine Identifier | Engine Name | Purpose | Output Format | Primary Target Data |
| :--- | :--- | :--- | :--- | :--- |
| **`recommend`** | Recommendation | Rank catalog phones by budget, priority & specs | `List[RecommendationResult]` | SQL Catalog DB (`phones`, `variants`) |
| **`compare`** | Comparison | Side-by-side spec comparison table of 2+ phones | `ComparisonResult` | SQL Specs + Variant Matrix |
| **`pricing`** | Price | Multi-store prices, stock status & official vs unofficial price spread | `PricingResult` | SQL Store Offers & Price Ranges |
| **`specs`** | Specification | Hardware/software scalar & text spec lookup | `SpecResult` | SQL Technical Specifications |
| **`review`** | Review | Expert/user reviews, ratings, pros & cons, verdict | `SearchResult` | Vector Store (`review_snippets`) |
| **`buying_guide`** | Buying Guide | Persona-based guided recommendation matrix | `GuideResult` | Structured Persona-Weighting Rules |
| **`future_phones`** | Future Phones | Launch roadmaps, 2026 upcoming phones, release timing | `RoadmapResult` | Lifecycle & Roadmap Registry |
| **`deals`** | Deals & Financing | 0% EMI plans, bank offers, sales & warranty policies | `DealsResult` | Retailer Deals & Financing Matrix |
| **`resale`** | Resale & Trade-in | Second-hand valuation, trade-in exchange & refurb grades | `ValuationResult` | Resale Valuation Engine |
| **`hybrid`** | Hybrid Recall | Combined BM25 + Vector semantic search over full catalog | `SearchResult` | ChromaDB Hybrid Search (`vector_context`) |

---

## 3. Decision Rubric Matrix

The following master decision rubric maps query intents to engine pipelines and merge strategies:

| Intent Type | Primary Engines (In Order) | Secondary / Fallback Engine | Merge Strategy |
| :--- | :--- | :--- | :--- |
| **`recommendation`** | `recommend`, `buying_guide` | `hybrid` (vector fallback) | `ranked` |
| **`comparison`** | `specs`, `compare` | `pricing` (if store pricing requested) | `table` |
| **`price_lookup`** | `pricing` | `hybrid` | `concat` |
| **`availability`** | `pricing` | `hybrid` | `concat` |
| **`specification`** | `specs` | `hybrid` (if spec missing in SQL) | `spec_then_pricing` |
| **`review`** | `review` | `hybrid` | `concat` |
| **`lifecycle_advisory`** | `future_phones` | `hybrid` | `advisory_merge` |
| **`resale_tradein`** | `resale` | `pricing` | `resale_merge` |
| **`deals_financing`** | `deals` | `pricing` | `deals_merge` |
| **`general`** | `hybrid` | None | `concat` |
| **`mixed`** | Union of primary intent engines | `hybrid` (last step) | `concat` |

---

## 4. Category-Level Routing Rules (17 Categories)

### Category 1: Budget / Price-Tier Queries (Q1 – Q15)
- **Intent:** `recommendation`
- **Routing Engine Pipeline:** `[recommend, pricing]`
- **Merge Strategy:** `ranked`
- **Rule Rationale:** Query contains hard upper bound budget in BDT (`budget_max`). Dispatch `recommend` SQL engine filtered by `price_bdt <= budget_max`, followed by `pricing` to append live market store offers.
- **Example Query:** `"Best phone under 20000 taka"` -> Dispatch `recommend(budget=20000)` -> Merge `ranked`.

### Category 2: Camera-Focused Queries (Q16 – Q27)
- **Intent:** `recommendation`
- **Routing Engine Pipeline:** `[recommend, hybrid]`
- **Merge Strategy:** `ranked`
- **Rule Rationale:** Camera queries prioritize hardware sensor specs (MP, OIS, Telephoto). Dispatch `recommend` with `priority="camera"`, backed by `hybrid` semantic recall for subjective camera performance (night mode, selfie quality).
- **Example Query:** `"Best camera phone under 30k"` -> Dispatch `recommend(priority="camera", budget=30000)`, `hybrid` -> Merge `ranked`.

### Category 3: Gaming-Focused Queries (Q28 – Q37)
- **Intent:** `recommendation`
- **Routing Engine Pipeline:** `[specs, recommend, hybrid]`
- **Merge Strategy:** `ranked`
- **Rule Rationale:** Gaming requires SoC/GPU specs, high refresh rate, and cooling hardware. Dispatch `specs` to filter SoC/RAM, `recommend` with `priority="gaming"`, and `hybrid` for thermal stability evidence.
- **Example Query:** `"Best gaming phone for PUBG under 30k"` -> Dispatch `specs`, `recommend(priority="gaming")`, `hybrid`.

### Category 4: Battery & Charging Queries (Q38 – Q45)
- **Intent:** `recommendation`
- **Routing Engine Pipeline:** `[recommend, specs]`
- **Merge Strategy:** `ranked`
- **Rule Rationale:** Filter by `battery_mah >= 5000` or `charging_watt >= 65W`. Dispatch `recommend(priority="battery")` with `specs` lookup for fast charging protocol verification.
- **Example Query:** `"Fastest charging phone under 25k"` -> Dispatch `recommend(priority="battery", budget=25000)`, `specs`.

### Category 5: Brand & Model Comparison Queries (Q46 – Q60)
- **Intent:** `comparison`
- **Routing Engine Pipeline:** `[specs, compare]`
- **Merge Strategy:** `table`
- **Rule Rationale:** Multiple models or brands identified (`len(models) >= 2` or `len(brands) >= 2`). Resolve specifications for each entity using `specs`, then render head-to-head comparison via `compare`.
- **Example Query:** `"iPhone 17 vs Samsung S25 Ultra"` -> Dispatch `specs(models=["iPhone 17", "Samsung Galaxy S25 Ultra"])`, `compare` -> Merge `table`.

### Category 6: Use-Case / Persona Queries (Q61 – Q72)
- **Intent:** `recommendation`
- **Routing Engine Pipeline:** `[buying_guide, recommend]`
- **Merge Strategy:** `ranked`
- **Rule Rationale:** Persona-specific requirements (students, seniors, business, kids, drivers). Dispatch `buying_guide` engine with persona profile weights, combined with `recommend` candidate filtering.
- **Example Query:** `"Best phone for students under 20k"` -> Dispatch `buying_guide(persona="student")`, `recommend(budget=20000)`.

### Category 7: Feature-Specific Queries (Q73 – Q87)
- **Intent:** `recommendation` / `specification`
- **Routing Engine Pipeline:** `[specs, recommend, hybrid]`
- **Merge Strategy:** `spec_then_pricing`
- **Rule Rationale:** Specific hardware features (AMOLED, 5G, IP68, NFC, expandable storage). Filter SQL catalog using `where_expr` attributes, backing up with `hybrid` vector search for feature presence.
- **Example Query:** `"IP68 waterproof phone under 30k"` -> Dispatch `specs`, `recommend(budget=30000)`, `hybrid`.

### Category 8: Purchase-Intent / Transactional Queries (Q88 – Q95)
- **Intent:** `price_lookup` / `deals_financing`
- **Routing Engine Pipeline:** `[pricing, deals]`
- **Merge Strategy:** `concat`
- **Rule Rationale:** Direct store price inquiries, official vs unofficial price differences, EMI options, and warranty service. Dispatch `pricing` for live store stock and `deals` for payment plan matrix.
- **Example Query:** `"Official vs unofficial price difference BD"` -> Dispatch `pricing`, `deals` -> Merge `concat`.

### Category 9: General Decision-Support Queries (Q96 – Q100)
- **Intent:** `recommendation` / `lifecycle_advisory`
- **Routing Engine Pipeline:** `[buying_guide, future_phones]`
- **Merge Strategy:** `advisory_merge`
- **Rule Rationale:** Broad decision queries ("Which phone to buy in 2026", "Wait vs buy now"). Dispatch `buying_guide` for current top picks and `future_phones` for release roadmap advice.
- **Example Query:** `"Is it better to wait for next flagship or buy now"` -> Dispatch `future_phones`, `buying_guide` -> Merge `advisory_merge`.

### Category 10: AI & Software Feature Queries (Q101 – Q108)
- **Intent:** `recommendation`
- **Routing Engine Pipeline:** `[specs, hybrid]`
- **Merge Strategy:** `ranked`
- **Rule Rationale:** AI software capabilities (Galaxy AI, Gemini, Apple Intelligence, Magic Eraser, translation). Dispatch `specs` for NPU/OS support, combined with `hybrid` vector search over AI feature snippets.
- **Example Query:** `"Best phone with Galaxy AI"` -> Dispatch `specs`, `hybrid(query="Galaxy AI features")`.

### Category 11: Foldable & Form-Factor Queries (Q109 – Q118)
- **Intent:** `recommendation` / `comparison`
- **Routing Engine Pipeline:** `[buying_guide, compare, specs]`
- **Merge Strategy:** `table`
- **Rule Rationale:** Form factor queries (Foldables, flips, compact flagships, thinnest/lightest). Dispatch `buying_guide` for form factor pros/cons and `compare` / `specs` for physical dimensions (thickness, weight, screen size).
- **Example Query:** `"Samsung Galaxy Z Fold vs Z Flip"` -> Dispatch `specs`, `compare` -> Merge `table`.

### Category 12: Connectivity & Technical Spec Queries (Q119 – Q126)
- **Intent:** `specification`
- **Routing Engine Pipeline:** `[specs, hybrid]`
- **Merge Strategy:** `spec_then_pricing`
- **Rule Rationale:** Advanced connectivity protocols (eSIM, iSIM, Wi-Fi 7, Satellite SOS, UWB). Filter via `specs` metadata attributes and `hybrid` vector search for carrier compatibility.
- **Example Query:** `"Best phone with eSIM support"` -> Dispatch `specs(spec_fields=["esim"])`, `hybrid`.

### Category 13: Battery Tech & Sustainability Queries (Q127 – Q132)
- **Intent:** `recommendation` / `specification`
- **Routing Engine Pipeline:** `[specs, hybrid]`
- **Merge Strategy:** `ranked`
- **Rule Rationale:** Silicon-carbon batteries, eco-friendly materials, user-replaceable batteries, and 2-day battery health. Dispatch `specs` for battery chemistry and `hybrid` for eco ratings.
- **Example Query:** `"Best phone with silicon-carbon battery"` -> Dispatch `specs`, `hybrid`.

### Category 14: Audio, Build & Design Queries (Q133 – Q140)
- **Intent:** `recommendation` / `review`
- **Routing Engine Pipeline:** `[specs, review, hybrid]`
- **Merge Strategy:** `concat`
- **Rule Rationale:** Audio quality (Dolby Atmos, stereo speakers, 3.5mm jack) and build aesthetics (matte glass, titanium, drop resistance). Dispatch `specs` for physical materials and `review` / `hybrid` for audio impressions.
- **Example Query:** `"Best phone with stereo speakers for music"` -> Dispatch `specs`, `review`, `hybrid`.

### Category 15: Resale, Refurbished, Deals & Value Queries (Q141 – Q148)
- **Intent:** `resale_tradein` / `deals_financing`
- **Routing Engine Pipeline:** `[resale, deals, pricing]`
- **Merge Strategy:** `resale_merge` / `deals_merge`
- **Rule Rationale:** Secondary market valuation, refurbished grading, trade-in exchange, Eid sales, and Daraz Black Friday deals. Dispatch `resale` for depreciation valuation, `deals` for promo offers, and `pricing` for store baselines.
- **Example Query:** `"Trade-in old phone for new phone in Bangladesh"` -> Dispatch `resale`, `pricing` -> Merge `resale_merge`.

### Category 16: Ecosystem & Accessories Queries (Q149 – Q154)
- **Intent:** `recommendation`
- **Routing Engine Pipeline:** `[buying_guide, hybrid]`
- **Merge Strategy:** `ranked`
- **Rule Rationale:** Apple ecosystem integration, smartwatch pairing, MagSafe, and smart home support. Dispatch `buying_guide` for ecosystem synergy scores and `hybrid` for accessory compatibility.
- **Example Query:** `"Best phone for Apple ecosystem users"` -> Dispatch `buying_guide(ecosystem="apple")`, `hybrid`.

### Category 17: Professional & Niche Use-Case Queries (Q155 – Q162)
- **Intent:** `recommendation` / `review`
- **Routing Engine Pipeline:** `[buying_guide, specs, review]`
- **Merge Strategy:** `ranked`
- **Rule Rationale:** Niche professional workflows (ProRes video, stock trading, musicians, ride-share drivers, e-commerce sellers). Dispatch `buying_guide` with professional persona profiles, backed by `specs` and `review`.
- **Example Query:** `"Best phone for professional photographers (RAW/ProRes video)"` -> Dispatch `buying_guide(persona="photographer")`, `specs`, `review`.

---

## 5. Extended Plan Schema

The router returns a structured JSON plan matching the updated schema:

```json
{
  "intent": "recommendation | comparison | specification | price_lookup | availability | review | general | mixed | lifecycle_advisory | resale_tradein | deals_financing",
  "engines": [
    {
      "name": "recommend | compare | pricing | specs | review | buying_guide | future_phones | deals | resale | hybrid",
      "args": { "priority": "camera", "persona": "student" },
      "weight": 1.0,
      "rationale": "Rank camera phones under budget constraint"
    }
  ],
  "merge": "ranked | table | spec_then_pricing | concat | advisory_merge | resale_merge | deals_merge",
  "budget": 30000.0,
  "budget_min": null,
  "brands": ["Samsung", "Apple"],
  "models": ["Galaxy S25", "iPhone 17"],
  "priority": "camera",
  "entities": {
    "ai_feature": "galaxy_ai",
    "esim": true,
    "persona": "student"
  },
  "top_k": 5,
  "rerank_candidates": 25,
  "alpha": 0.5,
  "notes": ["Dispatched recommend and hybrid engines for multi-criteria recall"]
}
```
