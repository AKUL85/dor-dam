# Automated Query Test Suite Documentation

**Location:** `tests/query_tests/`  
**Total Tests:** 36 Category Query Tests + 95 System Unit Tests (**131 Total Tests Passed**)

---

## 1. Overview

The automated query test suite in `tests/query_tests/` validates the extended Hybrid RAG system across every new query category. Each test case defines 5 mandatory criteria:

1. **Expected Intent**: Core or extended intent classification (e.g. `recommendation`, `comparison`, `price_lookup`, `specification`, `review`, `lifecycle_advisory`, `resale_tradein`, `deals_financing`).
2. **Expected Entities**: Structured entities (e.g. `budget`, `budget_min`, `brand`, `priority`, `spec_fields`, `models`).
3. **Expected Retrieval Engine**: Targeted execution engine (`Recommendation`, `Comparison`, `Price`, `Specification`, `Review`, `Future Phones`, `Deals`, `Resale`, `Buying Guide`, `Hybrid`).
4. **Expected Response Type**: API response model (`RecommendResponse`, `CompareResponse`, `PriceResponse`, `SearchResponse`, `ChatResponse`).
5. **Expected Ranking Logic**: Core ranking formula or scoring metric applied to candidates.

---

## 2. Directory Structure & Test Categories

```
tests/query_tests/
├── __init__.py
├── utils.py                          # Shared QueryTestCase dataclass & validation logic
├── test_budget_queries.py            # Category 1: Budget & Price Tier Domain
├── test_camera_queries.py            # Category 2: Camera & Imaging Domain
├── test_gaming_queries.py            # Category 3: Gaming & Performance Domain
├── test_battery_queries.py           # Category 4: Battery, Power & Charging Domain
├── test_comparison_queries.py        # Category 5: Brand & Model Comparison Domain
├── test_persona_queries.py           # Category 6: User Persona & Use-Case Domain
├── test_specs_queries.py             # Category 7: Feature & Technical Spec Domain
├── test_retail_queries.py            # Category 8: BD Retail & Transactional Domain
├── test_ai_software_queries.py       # Category 9: AI & Software Intelligence Domain
└── test_lifecycle_foldables_queries.py # Category 10: Strategic Buying & Form Factor Domain
```

---

## 3. Query Specification Matrix

| Category | Example Query | Expected Intent | Expected Entities | Expected Engine | Expected Response Type | Expected Ranking Logic |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Budget** | *"Best phone under 20000 taka"* | `recommendation` | `budget=20000.0` | `Recommendation` | `RecommendResponse` | `price_min <= 20000` + composite baseline score |
| **Camera** | *"Best camera phone under 40k"* | `recommendation` | `budget=40000.0, priority='camera'` | `Recommendation` | `RecommendResponse` | Camera scorer (MP + OIS + Zoom weight) |
| **Gaming** | *"Snapdragon 8 Gen 3 phone"* | `specification` | `spec_fields=['processor']` | `Specification` | `SearchResponse` | `processor_text LIKE %Snapdragon 8 Gen 3%` |
| **Battery** | *"Best phone with 6000mAh battery"* | `recommendation` | `priority='battery'` | `Recommendation` | `RecommendResponse` | `battery_mah >= 6000` + endurance scorer |
| **Comparison** | *"Samsung S25 Ultra vs iPhone 16 Pro Max"* | `comparison` | `models=['Samsung S25 Ultra', 'Iphone 16 Pro Max']` | `Comparison` | `CompareResponse` | Side-by-side spec matrix across 5 dimensions |
| **Persona** | *"Best phone for students under 20k"* | `recommendation` | `budget=20000.0, priority='persona'` | `Recommendation` | `RecommendResponse` | Student persona algorithm (battery + display + durability) |
| **Specs** | *"Phones with IP68 waterproof rating"* | `review` | `priority='build'` | `Specification` | `SearchResponse` | `features LIKE %IP68%` rating match |
| **Retail** | *"iPhone 16 Pro price in BD"* | `price_lookup` | `brand='Apple'` | `Price` | `PriceResponse` | Price check across BD stores sorted by lowest price |
| **AI / Software** | *"Best phone with Galaxy AI"* | `recommendation` | `priority='ai'` | `Recommendation` | `RecommendResponse` | Candidate ranking with AI suite bonus |
| **Lifecycle** | *"Upcoming flagships launching in 2026"* | `lifecycle_advisory` | `{}` | `Future Phones` | `SearchResponse` | Semantic retrieval of launch roadmaps & specs |

---

## 4. Test Execution & Verification

Run the full suite using pytest:
```bash
pytest tests/query_tests/
```
Output:
```
============================= 131 passed in 4.23s ==============================
```
