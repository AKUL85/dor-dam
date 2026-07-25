# Hybrid RAG System Extension Analysis Report
**Target System:** DorDam Mobile Phone Hybrid RAG Chatbot  
**Scope:** Analysis of 162 New Production Queries across 17 Dataset Categories  
**Document Goal:** Extension Strategy, Gap Analysis, Capability Mapping & Query Deduplication  

---

## 1. Executive Summary

This document provides a comprehensive technical analysis of the **162 query dataset** for extending the existing production **Hybrid RAG Chatbot**. 

### Existing Baseline Capabilities (Preserved - No Rewrites):
- **Intent Classification & Entity Extraction** (NER for Brand, Model, Price, Specs)
- **Hybrid Retrieval System** (SQL Relational Filtering + Vector Similarity Search)
- **Recommendation & Comparison Engines** (Multi-attribute scoring, side-by-side comparison)
- **Lookup Engines** (Price lookup across BD stores, Technical spec lookup)
- **Chat API Interface**

### Key Analysis Highlights:
- **Already Supported Queries:** **68 queries (~42%)** can be directly served using existing SQL schema filters, vector embeddings, spec lookups, and comparison logic.
- **Queries Requiring New Functionality:** **94 queries (~58%)** require new data models, external metadata indexing, specialized heuristic rules, or temporal reasoning engines.
- **Identified New System Capabilities:** **9 Core Capabilities** defined to handle advanced tech specs, BD market dynamics, AI software features, foldable hardware metrics, and lifecycle advice.
- **Duplicates & Overlaps:** **12 major duplicate/near-duplicate query clusters** identified for normalization during intent classification and retrieval indexing.

---

## 2. Task 1: Query Grouping & Functional Domain Clustering

While the dataset provides 17 raw thematic categories, for architectural extension, the **162 queries** are grouped into **10 Functional System Domains**:

| Functional Domain | Included Queries | Count | Primary Retrieval Mechanism |
| :--- | :--- | :---: | :--- |
| **1. Budget & Price Tier Domain** | Q1–Q15, Q27 | 16 | SQL Range Queries + Sort by Popularity |
| **2. Camera & Imaging Domain** | Q16–Q26, Q155 | 12 | SQL (MP/OIS/Lenses) + Vector (Low-light, Vlogging) |
| **3. Gaming & Performance Domain** | Q28–Q37 | 10 | SQL (RAM/Hz/Chipset) + External Benchmark Metadata |
| **4. Battery, Power & Charging Domain** | Q38–Q45, Q127, Q128, Q131, Q132 | 12 | SQL (mAh/Watts/Wireless) + Battery Chemistry Metadata |
| **5. Brand & Model Comparison Domain** | Q46–Q60, Q110 | 16 | Existing Comparison Engine + Spec Diff |
| **6. User Persona & Use-Case Domain** | Q61–Q72, Q156–Q162 | 19 | Weighted Multi-Attribute Heuristic Mapper |
| **7. Feature & Technical Spec Domain** | Q73–Q87, Q114–Q126, Q133–Q140 | 36 | SQL Spec Filters + Advanced Hardware Taxonomy |
| **8. BD Retail & Transactional Domain** | Q88–Q95, Q141–Q144, Q147, Q148 | 14 | BD E-commerce Knowledge Graph + Retail Scrapers |
| **9. AI & Software Intelligence Domain** | Q81, Q82, Q101–Q108 | 10 | AI Feature Taxonomy + Update Horizon Metadata |
| **10. Strategic Buying & Form Factor Domain** | Q75, Q96–Q100, Q109, Q111–Q113, Q145, Q146, Q149–Q154 | 17 | Temporal Lifecycle Engine + Foldable Spec Index |

---

## 3. Task 2: Identification of New System Capabilities

To support the extended query dataset without modifying existing core modules, **9 new modular capabilities/services** must be integrated into the pipeline:

### Capability 1: BD E-commerce & Retail Knowledge Graph (`RetailMetadataEngine`)
- **Purpose:** Provide real-time local Bangladesh retail context.
- **Handles:** Official vs unofficial price differentials (Q92), store availability maps (Daraz, Pickaboo, Star Tech, Ryans) (Q91, Q93), EMI/installment terms (Q94), BD warranty policies (Q95), and seasonal deal tracking (Eid, Black Friday) (Q147, Q148).

### Capability 2: Second-Hand & Valuation Engine (`ResaleValuationService`)
- **Purpose:** Calculate trade-in value, depreciation, and refurbished device status.
- **Handles:** 2-year resale value depreciation algorithms (Q57, Q142), refurbished/pre-owned grade verification (Q141, Q143), and exchange/trade-in program valuation (Q144).

### Capability 3: Temporal & Lifecycle Decision Engine (`LifecycleAdvisor`)
- **Purpose:** Process time-sensitive market intelligence, product roadmaps, and release cycles.
- **Handles:** "Buy now vs wait" recommendations (Q98), upcoming 2026 phone launch roadmaps (Q97), 3-year multi-generational upgrade path evaluation (Q99), and current vs previous gen flagship value evaluation (Q146).

### Capability 4: User Persona & Workflow Heuristic Mapper (`PersonaWeightingEngine`)
- **Purpose:** Map non-hardware persona descriptions into weighted multi-attribute database queries.
- **Handles:** Specific user roles like Students (Q61), Seniors (Q64), Content Creators (Q66, Q157), Ride-Share Drivers (Q160), Stock Traders (Q156), Musicians (Q158), and Multitaskers (Q162).

### Capability 5: AI & Software Feature Taxonomy Index (`AIFeatureRegistry`)
- **Purpose:** Structure software capabilities and AI ecosystem attributes.
- **Handles:** Tagging devices with AI suites (Galaxy AI, Google Gemini, Apple Intelligence) (Q102-Q104), processing mode (On-device vs Cloud) (Q101, Q108), specific AI tools (Magic Eraser, Live Translate) (Q105, Q106), and guaranteed OS/security patch update horizons (Q82, Q107).

### Capability 6: Foldable & Next-Gen Form Factor Spec Index (`FormFactorRegistry`)
- **Purpose:** Support complex physical metrics for foldables, flips, and compact flagships.
- **Handles:** Fold type (Book vs Flip) (Q109-Q112), folded/unfolded dimensions (Q114, Q115), weight thresholds (Q116), hinge durability ratings, crease visibility index, and active stylus/S-Pen digitizer support (Q117).

### Capability 7: Advanced Emerging Spec Taxonomy (`EmergingHardwareRegistry`)
- **Purpose:** Extend standard spec lookup to support cutting-edge 2026 mobile hardware.
- **Handles:** Silicon-Carbon battery chemistry (Q127), eSIM/iSIM provisioning (Q119, Q120), Wi-Fi 7 (Q122), Satellite SOS/messaging (Q86, Q123), Ultra-Wideband (UWB) (Q126), and ProRes/LOG video recording support (Q155).

### Capability 8: Synthetic Benchmark & Real-World Endurance Aggregator (`BenchmarkAggregator`)
- **Purpose:** Index non-catalog performance and battery endurance metrics.
- **Handles:** AnTuTu/Geekbench synthetic score retrieval (Q31), thermal cooling system ratings (Q34), real-world Screen-on-Time (SoT) and 2-day battery endurance ratings (Q43, Q44, Q128), and drop-test durability scores (Q59, Q139).

### Capability 9: Cross-Device Ecosystem & Accessory Matrix (`EcosystemMatrixService`)
- **Purpose:** Model device interaction within broader tech ecosystems.
- **Handles:** Smartwatch/wearable synergy (Q149), Apple ecosystem compatibility (Q150), MagSafe/Qi2 magnetic alignment support (Q153), bundled accessory offers (Q151), and local BD accessory availability (Q152).

---

## 4. Task 3: Current RAG Coverage Analysis (Already Supported Queries)

Out of 162 queries, **68 queries** are fully supported by the existing system baseline (Intent Classification, Entity Extraction, Hybrid SQL+Vector Retrieval, Recommendation Engine, Comparison Engine, Price & Spec Lookup).

### Summary Table of Supported Queries (68 Total):

| Category | Query IDs | Count | Handling Mechanism in Existing System |
| :--- | :--- | :---: | :--- |
| **1. Budget / Price-Tier** | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14, Q15 | 15 | SQL Retrieval (`price_bdt <= X`), sorted by popularity/rating score |
| **2. Camera-Focused** | Q16, Q17, Q18, Q19, Q20, Q26 | 6 | SQL spec filter (`camera_mp >= 100/200`, `ois == true`) + budget SQL |
| **3. Gaming-Focused** | Q28, Q29, Q32, Q33, Q35, Q36 | 6 | SQL filter (`ram >= 12GB`, `refresh_rate >= 120Hz`, `chipset LIKE %Snapdragon%`) |
| **4. Battery & Charging** | Q38, Q39, Q40, Q41, Q42 | 5 | SQL filter (`battery_mah >= 5000/6000`, `charging_watt >= 65`, `wireless_charging == true`) |
| **5. Brand & Model Comparison** | Q46, Q47, Q48, Q49, Q50, Q51, Q52, Q53, Q54, Q58, Q60 | 11 | Existing Comparison Engine side-by-side comparison logic |
| **7. Feature-Specific** | Q73, Q74, Q76, Q77, Q78, Q79, Q80, Q83, Q84, Q85 | 10 | SQL filter (`display_type == AMOLED`, `5g == true`, `ip_rating == IP68`, `nfc == true`, etc.) |
| **8. Purchase-Intent / Pricing** | Q88, Q89, Q90 | 3 | Existing Price Lookup Engine (`PhoneModel` price in BD) |
| **9. General Decision-Support** | Q100 | 1 | Existing Recommendation Engine (value-for-money score formula) |
| **11. Form Factor Baseline** | Q114, Q116 | 2 | SQL spec filter (`display_size >= X`, `weight_g <= Y`) |
| **14. Audio & Build Baseline** | Q133, Q136 | 2 | SQL spec filter (`stereo_speakers == true`, `jack_35mm == true`) |
| **17. Niche Baseline Specs** | Q162 | 1 | SQL spec filter (`desktop_mode == true` / RAM >= 12GB) |

---

## 5. Task 4: Gap Analysis (Queries Requiring New Functionality)

**94 queries** cannot be answered accurately using only basic spec tables and basic price SQL filtering. They require integration with the 9 new capabilities defined in Task 2.

### Complete Gap Analysis Matrix:

| Query ID & Text | Required New Capability / Engine | Reason Current Baseline is Insufficient |
| :--- | :--- | :--- |
| **Q21:** Best telephoto lens phone | `EmergingHardwareRegistry` | Standard camera specs list MP, but lack telephoto periscope vs traditional optical zoom classification. |
| **Q22:** Best zoom camera phone (10x/30x/100x) | `EmergingHardwareRegistry` | Requires indexing digital vs optical zoom capability metrics. |
| **Q23:** Best low-light / night photography phone | `BenchmarkAggregator` + Vector | Requires low-light camera ratings / sensor size data beyond simple MP counts. |
| **Q24:** Best selfie camera phone | `PersonaWeightingEngine` | Requires front camera autofocus, 4K video, and selfie sensor rating. |
| **Q25:** Best phone for vlogging / video recording | `PersonaWeightingEngine` | Requires indexing video specs (4K60, 10-bit LOG, mic noise cancellation). |
| **Q27:** Best camera phone under $500 | `RetailMetadataEngine` | Requires currency conversion rate module ($500 -> BDT equivalent). |
| **Q30:** Best gaming phone for PUBG / Free Fire | `BenchmarkAggregator` | Requires game frame rate optimization data (90fps/120fps support per game). |
| **Q31:** Best phone with highest AnTuTu score | `BenchmarkAggregator` | AnTuTu score is not present in standard product spec catalog. |
| **Q34:** Best phone with cooling system for gaming | `BenchmarkAggregator` | Cooling hardware (vapor chamber size, liquid cooling) is non-standard spec data. |
| **Q37:** Best gaming phone with triggers/shoulder buttons | `FormFactorRegistry` | Physical gaming shoulder triggers are niche form factor specs. |
| **Q43:** Best phone for all-day battery backup | `BenchmarkAggregator` | Screen-on-time (SoT) endurance ratings differ from simple battery mAh capacity. |
| **Q44:** Phone with longest standby time | `BenchmarkAggregator` | Standby time hours are derived from lab testing, not spec sheets. |
| **Q45:** Best phone with battery + fast charging combo under 25k | `PersonaWeightingEngine` | Requires composite score combining battery mAh + charging W + price filter. |
| **Q55:** Best budget brand in Bangladesh | `RetailMetadataEngine` | Requires brand-level catalog analysis in BD market. |
| **Q56:** iPhone SE vs budget Android | `LifecycleAdvisor` | Cross-ecosystem comparison requiring value-over-time reasoning. |
| **Q57:** Which phone brand has best resale value in BD | `ResaleValuationService` | Resale value data requires tracking BD second-hand market pricing. |
| **Q59:** Best Chinese phone brand for durability | `BenchmarkAggregator` | Durability rating requires drop-test and build material index. |
| **Q61:** Best phone for students under 20k | `PersonaWeightingEngine` | Student persona algorithm (durable, high battery, low cost, good screen). |
| **Q62:** Best phone for business use | `PersonaWeightingEngine` | Business persona algorithm (security, clean OS, battery, premium build). |
| **Q63:** Best lightweight/compact phone | `FormFactorRegistry` | Requires physical dimension thresholds (height < 150mm, weight < 170g). |
| **Q64:** Best phone for elderly / senior citizens | `PersonaWeightingEngine` | Senior persona algorithm (large screen, loud speaker, battery life, clean UI). |
| **Q65:** Best kids phone with parental controls | `PersonaWeightingEngine` + Software | Requires OS parental control and durability indexing. |
| **Q66, Q157:** Best phone for content creators | `PersonaWeightingEngine` | Creator algorithm (video stabilization, mic quality, processing speed, storage). |
| **Q67:** Best phone for online classes | `PersonaWeightingEngine` | Student class algorithm (front camera quality, stereo sound, battery, screen). |
| **Q68, Q140:** Best rugged/waterproof phone | `EmergingHardwareRegistry` | MIL-STD-810H military drop-test certification indexing. |
| **Q69, Q125:** Best phone for travel / dual SIM international | `EmergingHardwareRegistry` | Multi-band 5G roaming + eSIM + dual SIM capabilities. |
| **Q70:** Best phone for photography beginners | `PersonaWeightingEngine` | Beginner algorithm (point-and-shoot auto AI camera, reliable processing). |
| **Q71:** Best phone for freelancers (multitasking) | `PersonaWeightingEngine` | Freelancer algorithm (RAM, battery life, fast charging, display size). |
| **Q72, Q113:** Best small-size flagship phone | `FormFactorRegistry` | Flagship chipset + compact form factor query filter. |
| **Q75, Q109, Q111:** Best foldable / budget foldable phone | `FormFactorRegistry` | Foldable form-factor classification & price filter. |
| **Q81:** Clean Android (no bloatware) | `AIFeatureRegistry` | OS stock UI classification (Pixel UI, Motorola MyUX, Nothing OS). |
| **Q82, Q107:** Long software update support | `AIFeatureRegistry` | Years of OS + security updates policy metadata. |
| **Q86, Q123:** Satellite connectivity / SOS | `EmergingHardwareRegistry` | Satellite messaging hardware support attribute. |
| **Q87, Q101-Q106, Q108:** AI features (Galaxy AI, Gemini, Apple Intel) | `AIFeatureRegistry` | Specialized AI suite indexing & execution mode (on-device vs cloud). |
| **Q91:** Where to buy original phone in BD | `RetailMetadataEngine` | BD store directory mapping (official vs verified retail). |
| **Q92:** Official vs unofficial phone price difference BD | `RetailMetadataEngine` | Dual-price indexing (Official BDT vs Unofficial grey market BDT). |
| **Q93:** Best online store to buy phone in BD | `RetailMetadataEngine` | Store reliability ratings, delivery, warranty support metadata. |
| **Q94:** EMI / installment phone purchase options BD | `RetailMetadataEngine` | Bank EMI zero-cost installment availability tracking. |
| **Q95:** Phone warranty and after-sales service in BD | `RetailMetadataEngine` | BD official warranty policy vs seller warranty breakdown. |
| **Q96:** Which phone should I buy in 2026 | `LifecycleAdvisor` | Interactive decision tree advisory engine. |
| **Q97:** Upcoming phones to launch in 2026 | `LifecycleAdvisor` | Rumored & upcoming phone launch database. |
| **Q98:** Is it better to wait for next flagship or buy now | `LifecycleAdvisor` | Release cycle lifecycle position indicator. |
| **Q99:** Best phone to upgrade from a 3-year-old phone | `LifecycleAdvisor` | Multi-generation delta comparison engine. |
| **Q110:** Samsung Z Fold vs Z Flip — which to buy | `FormFactorRegistry` | Foldable use-case decision guidance (Book vs Flip). |
| **Q112:** Best flip phone 2026 | `FormFactorRegistry` | Flip-style foldable filter. |
| **Q115:** Thinnest phone available right now | `FormFactorRegistry` | Thickness spec sorting (`thickness_mm ASC`). |
| **Q117:** Best phone with stylus/S Pen support | `FormFactorRegistry` | Active stylus digitizer support attribute. |
| **Q118:** Best phone for one-handed use | `FormFactorRegistry` | Width (<70mm) and screen size ergonomics index. |
| **Q119, Q120:** eSIM / iSIM support | `EmergingHardwareRegistry` | eSIM / integrated SIM hardware support flags. |
| **Q122:** Wi-Fi 7 support | `EmergingHardwareRegistry` | Wi-Fi 7 (802.11be) connectivity flag. |
| **Q124:** Strongest network signal reception | `EmergingHardwareRegistry` | Antenna quality / signal performance data. |
| **Q126:** UWB (Ultra-Wideband) support | `EmergingHardwareRegistry` | UWB chip feature flag. |
| **Q127:** Silicon-carbon battery | `EmergingHardwareRegistry` | Battery anode chemistry classification. |
| **Q128:** Genuine 2-day battery life | `BenchmarkAggregator` | Real-world 2-day battery endurance rating. |
| **Q129, Q130:** Eco-friendly / recycled materials | `EmergingHardwareRegistry` | Eco sustainability index & recycled material %. |
| **Q132:** Long-term battery health/longevity | `EmergingHardwareRegistry` | Battery cycle lifespan spec (e.g. 1600 cycles to 80%). |
| **Q134:** Premium build (titanium/glass back) | `EmergingHardwareRegistry` | Frame material (Titanium/Aluminum) & Back Glass specs. |
| **Q135:** Matte-finish phone | `EmergingHardwareRegistry` | Rear glass finish texture metadata. |
| **Q137:** Best phone color options 2026 | `EmergingHardwareRegistry` | Phone color variant array catalog. |
| **Q138:** Dolby Atmos support | `EmergingHardwareRegistry` | Audio codec & spatial audio certification specs. |
| **Q139:** Most durable phone (drop-test rated) | `BenchmarkAggregator` | Gorilla Glass Armor rating & drop-test results. |
| **Q141, Q143:** Refurbished / certified pre-owned | `ResaleValuationService` | Refurbished market seller & condition grade guide. |
| **Q142:** Best phone for resale value after 2 years | `ResaleValuationService` | Historical 24-month value retention curves. |
| **Q144:** Trade-in old phone for new phone in BD | `ResaleValuationService` | BD exchange program locations and rules. |
| **Q145:** Budget phone that won't lag after a year | `BenchmarkAggregator` | UFS storage speed + chipset endurance rating. |
| **Q146:** Last year's flagship vs new mid-ranger | `LifecycleAdvisor` | Flagship degradation vs new mid-range comparison. |
| **Q147, Q148:** Eid sale / Daraz deals | `RetailMetadataEngine` | Real-time discount and promotional deal tracker. |
| **Q149:** Pairs well with smartwatch | `EcosystemMatrixService` | Wearable OS companion compatibility index. |
| **Q150:** Best for Apple ecosystem users | `EcosystemMatrixService` | iOS / macOS / AirPlay integration score. |
| **Q151:** Bundled earbuds offer | `RetailMetadataEngine` | Retail promo bundle tracker. |
| **Q152:** Wide case/accessory availability in BD | `EcosystemMatrixService` | BD market accessory supply score. |
| **Q153:** MagSafe-style accessory support | `EcosystemMatrixService` | Magnetic charging & mounting alignment support. |
| **Q154:** Smart home integration | `EcosystemMatrixService` | Smart home protocol support (Matter / Thread / IR blaster). |
| **Q155:** RAW/ProRes/LOG video capture | `EmergingHardwareRegistry` | Professional video format recording specs. |
| **Q156:** Stock trading/finance apps | `PersonaWeightingEngine` | High screen stability + battery + security score. |
| **Q158:** Musicians (audio recording quality) | `PersonaWeightingEngine` | Studio mic setup + audio bit-rate capture specs. |
| **Q159:** Reading (eye-comfort display) | `EmergingHardwareRegistry` | High PWM dimming frequency + TÜV eye comfort certification. |
| **Q160:** Ride-share drivers (GPS + battery) | `PersonaWeightingEngine` | High peak nit outdoor brightness + GPS dual-frequency + battery. |
| **Q161:** E-commerce / online business sellers | `PersonaWeightingEngine` | Camera accuracy + battery + fast charging + dual SIM. |

---

## 6. Task 5: Duplicate & Near-Duplicate Query Analysis

To optimize intent classification and avoid redundant processing, **duplicate and near-duplicate queries** must be clustered into canonical intents during preprocessing.

### Duplicate Intent Mapping Matrix:

| Canonical Intent Cluster | Primary Representative Query | Duplicate / Overlapping Queries | Canonical Intent Action |
| :--- | :--- | :--- | :--- |
| **`INTENT_FOLDABLE_RECOMMEND`** | **Q109:** Best foldable phone in Bangladesh | **Q75:** Best foldable phone price in Bangladesh<br>**Q111:** Best budget foldable phone | Retrieve foldables sorted by price/tier with crease & hinge metrics |
| **`INTENT_HEADPHONE_JACK`** | **Q84:** Best phone with headphone jack still available | **Q136:** Best phone that still has a headphone jack | SQL Filter: `jack_35mm == true` |
| **`INTENT_COMPACT_FLAGSHIP`** | **Q72:** Best small-size flagship phone | **Q63:** Best lightweight/compact phone<br>**Q113:** Best small/compact flagship phone<br>**Q118:** Best phone for one-handed use | Form factor filter: `height <= 152mm`, `width <= 71mm`, `chipset_tier == flagship` |
| **`INTENT_DUAL_SIM_5G`** | **Q85:** Best dual-SIM phone with 5G | **Q121:** Best dual-SIM 5G phone | SQL Filter: `sim_type LIKE %Dual%` AND `5g == true` |
| **`INTENT_SATELLITE_CONNECT`** | **Q86:** Best phone with satellite connectivity | **Q123:** Best phone with satellite SOS/messaging feature | SQL/Feature Filter: `satellite_connectivity == true` |
| **`INTENT_AI_FEATURES`** | **Q101:** Best phone with on-device AI features | **Q87:** Best phone with AI features (Galaxy AI/Gemini)<br>**Q102:** Best phone with Galaxy AI<br>**Q103:** Best phone with Google Gemini built-in | AI Capability lookup matching requested AI engine/suite |
| **`INTENT_RUGGED_PHONE`** | **Q68:** Best rugged/waterproof phone | **Q140:** Best rugged/outdoor phone | Feature Filter: `ip_rating == IP68/IP69K` OR `military_std == true` |
| **`INTENT_CONTENT_CREATOR`** | **Q66:** Best phone for content creators | **Q157:** Best phone for content creators (YouTube/TikTok/Reels) | Creator persona algorithm (4K60 video, OIS, strong front camera, fast rendering) |
| **`INTENT_SOFTWARE_UPDATE`** | **Q82:** Best phone with long software update support | **Q107:** Best phone with longest software update guarantee | Software metadata filter: `os_updates_years >= 4` |
| **`INTENT_STEREO_SPEAKERS`** | **Q78:** Best phone with stereo speakers | **Q133:** Best phone with stereo speakers for music | SQL Filter: `stereo_speakers == true` |
| **`INTENT_RESALE_VALUE`** | **Q57:** Which phone brand has best resale value in BD | **Q142:** Best phone for resale value after 2 years | Resale value calculation module |
| **`INTENT_INTERNATIONAL_TRAVEL`**| **Q69:** Best phone for travel / dual SIM international use | **Q125:** Best unlocked phone for international travel/roaming | Multi-band 5G + eSIM feature query |

---

## 7. RAG Extension Architecture & Data Flow

To integrate these capabilities without touching existing code:

```
[ User Query ]
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ 1. Extended Intent & Entity Recognizer (Add-on Layer)  │
│    - Normalizes Duplicates to Canonical Intents        │
│    - Extracts Persona, Brand, Spec, AI, Retail entities│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Hybrid Retrieval Router                             │
├──────────────────────────┬─────────────────────────────┤
│ Existing Path            │ Extended Metadata Path      │
│ ├── SQL Spec Lookup      │ ├── RetailMetadataEngine    │
│ ├── Vector Embedding     │ ├── AIFeatureRegistry       │
│ └── Comparison Engine    │ ├── FormFactorRegistry      │
│                          │ ├── LifecycleAdvisor        │
│                          │ └── PersonaWeightingEngine  │
└──────────────────────────┴──────────────┬──────────────┘
                                          │
                                          ▼
┌────────────────────────────────────────────────────────┐
│ 3. Unified Result Builder                              │
│    - Merges Spec/Price with New Extended Metadata      │
│    - Renders Response via Standardized Answer Templates│
└────────────────────────────────────────────────────────┘
```

---

## 8. Summary & Next Steps

1. **Schema Extension (Non-Breaking):** Extend Prisma database models with optional auxiliary tables (`RetailListing`, `AIFeature`, `FormFactorSpec`, `LifecycleInfo`) or enrich vector payload JSON metadata.
2. **Intent Registry Update:** Map all 162 queries to the 10 functional domains and canonical duplicate clusters.
3. **Template Integration:** Implement Answer Templates A through O as defined in the dataset specification to ensure rich, structured frontend cards.

*Report compiled for DorDam Hybrid RAG Architecture Extension.*
