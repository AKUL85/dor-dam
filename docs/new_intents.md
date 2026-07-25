# Intent Classifier Extension Specification
**Target System:** DorDam Mobile Phone Hybrid RAG Chatbot  
**Document Purpose:** Intent Mapping Specification for 162 Extended Queries  
**Output Location:** `docs/new_intents.md`  

---

## 1. Intent Taxonomy Overview

The intent classifier is extended to support **11 total intents** (8 preserved baseline intents + 3 newly created intents).

### Preserved Baseline Intents (No Modifications/Rewrites)
- **`recommendation`**: Seeking phone recommendations based on budget, hardware priority, features, or user persona.
- **`comparison`**: Comparing two or more phones, brands, series, or form factors side-by-side.
- **`price_lookup`**: Querying market prices, price ranges, or price differentials for specific phone models.
- **`availability`**: Checking store availability, stock status, where to buy, or authorized retail locations in BD.
- **`specification`**: Looking up specific hardware, software, or technical attributes of a phone model.
- **`review`**: Requesting expert/user reviews, verdicts, ratings, pros & cons, or worth-buying advice.
- **`general`**: Conversational greetings, off-topic questions, or general help requests.
- **`mixed`**: Multi-intent queries combining two or more distinct equal-weight intents.

### New Extended Intents (Added Only When Necessary)
1. **`lifecycle_advisory`**:
   - **Trigger:** Queries asking about upcoming releases, release timing ("wait vs buy now"), product roadmaps, launch years, or multi-generation upgrade timing.
   - **Reason:** Requires temporal lifecycle reasoning and launch database lookups rather than current static catalog recommendations.
2. **`resale_tradein`**:
   - **Trigger:** Queries asking about second-hand market resale value, depreciation, trade-in/exchange programs, or refurbished/certified pre-owned condition grading.
   - **Reason:** Requires secondary market valuation formulas, trade-in pricing APIs, and refurbished grading rules rather than primary new-device pricing.
3. **`deals_financing`**:
   - **Trigger:** Queries asking about bank EMI/installment options, warranty policies, after-sales service, or seasonal sale promotions (Eid sales, Black Friday/11.11 deals).
   - **Reason:** Requires financial payment term matrices, promotional discount feeds, and retailer warranty policy lookup.

---

## 2. Query Mapping (All 162 Queries)

Every query from the extended 162 dataset is mapped below using the exact required sequence:
`Query` → `Intent` → `Reason` → `Example`

---

### Category 1: Budget / Price-Tier Queries (BDT) (Q1 – Q15)

#### Q1
- **Query:** Best phone under 10000 taka
- **Intent:** `recommendation`
- **Reason:** User is seeking a list of recommended smartphones constrained by a maximum budget of 10,000 BDT. Handled by existing recommendation engine with budget SQL filter.
- **Example:** `"Best phone under 10000 taka"`

#### Q2
- **Query:** Best phone under 12000 taka
- **Intent:** `recommendation`
- **Reason:** Budget-constrained recommendation request under 12,000 BDT.
- **Example:** `"Best phone under 12000 taka"`

#### Q3
- **Query:** Best phone under 15000 taka
- **Intent:** `recommendation`
- **Reason:** Budget-constrained recommendation request under 15,000 BDT.
- **Example:** `"Best phone under 15000 taka"`

#### Q4
- **Query:** Best phone under 20000 taka
- **Intent:** `recommendation`
- **Reason:** Budget-constrained recommendation request under 20,000 BDT.
- **Example:** `"Best phone under 20000 taka"`

#### Q5
- **Query:** Best phone under 25000 taka
- **Intent:** `recommendation`
- **Reason:** Budget-constrained recommendation request under 25,000 BDT.
- **Example:** `"Best phone under 25000 taka"`

#### Q6
- **Query:** Best phone under 30000 taka
- **Intent:** `recommendation`
- **Reason:** Budget-constrained recommendation request under 30,000 BDT.
- **Example:** `"Best phone under 30000 taka"`

#### Q7
- **Query:** Best phone under 35000 taka
- **Intent:** `recommendation`
- **Reason:** Budget-constrained recommendation request under 35,000 BDT.
- **Example:** `"Best phone under 35000 taka"`

#### Q8
- **Query:** Best phone under 40000 taka
- **Intent:** `recommendation`
- **Reason:** Budget-constrained recommendation request under 40,000 BDT.
- **Example:** `"Best phone under 40000 taka"`

#### Q9
- **Query:** Best phone under 50000 taka
- **Intent:** `recommendation`
- **Reason:** Budget-constrained recommendation request under 50,000 BDT.
- **Example:** `"Best phone under 50000 taka"`

#### Q10
- **Query:** Best phone under 60000 taka
- **Intent:** `recommendation`
- **Reason:** Budget-constrained recommendation request under 60,000 BDT.
- **Example:** `"Best phone under 60000 taka"`

#### Q11
- **Query:** Best phone under 80000 taka
- **Intent:** `recommendation`
- **Reason:** High-tier budget recommendation request under 80,000 BDT.
- **Example:** `"Best phone under 80000 taka"`

#### Q12
- **Query:** Best phone under 100000 taka
- **Intent:** `recommendation`
- **Reason:** Premium budget recommendation request under 100,000 BDT.
- **Example:** `"Best phone under 100000 taka"`

#### Q13
- **Query:** Best flagship phone in Bangladesh
- **Intent:** `recommendation`
- **Reason:** Seeking flagship category recommendations in the BD market sorted by overall performance and spec score.
- **Example:** `"Best flagship phone in Bangladesh"`

#### Q14
- **Query:** Best phone in Bangladesh right now (2026)
- **Intent:** `recommendation`
- **Reason:** General top recommendation query for current market devices in BD.
- **Example:** `"Best phone in Bangladesh right now (2026)"`

#### Q15
- **Query:** Cheapest 5G phone in Bangladesh
- **Intent:** `recommendation`
- **Reason:** Seeking recommendations filtered by 5G network support and ordered by lowest price (`price_bdt ASC`).
- **Example:** `"Cheapest 5G phone in Bangladesh"`

---

### Category 2: Camera-Focused Queries (Q16 – Q27)

#### Q16
- **Query:** Best camera phone under 30k
- **Intent:** `recommendation`
- **Reason:** Recommending top camera devices within a 30,000 BDT budget constraint (`priority="camera"`).
- **Example:** `"Best camera phone under 30k"`

#### Q17
- **Query:** Best camera phone under 50k
- **Intent:** `recommendation`
- **Reason:** Camera-focused recommendation query under 50,000 BDT budget.
- **Example:** `"Best camera phone under 50k"`

#### Q18
- **Query:** Best camera phone under 20k
- **Intent:** `recommendation`
- **Reason:** Entry-level camera phone recommendation under 20,000 BDT budget.
- **Example:** `"Best camera phone under 20k"`

#### Q19
- **Query:** Phones with 100MP camera
- **Intent:** `recommendation`
- **Reason:** Filtering device recommendations by camera sensor resolution (`camera_mp >= 100`).
- **Example:** `"Phones with 100MP camera"`

#### Q20
- **Query:** Phones with 200MP camera
- **Intent:** `recommendation`
- **Reason:** Filtering recommendations by ultra-high resolution camera sensor (`camera_mp >= 200`).
- **Example:** `"Phones with 200MP camera"`

#### Q21
- **Query:** Best telephoto lens phone
- **Intent:** `recommendation`
- **Reason:** Seeking camera recommendations filtered by dedicated telephoto optical zoom hardware.
- **Example:** `"Best telephoto lens phone"`

#### Q22
- **Query:** Best zoom camera phone (10x/30x/100x)
- **Intent:** `recommendation`
- **Reason:** Recommending phones with high optical and space zoom capabilities (`priority="zoom"`).
- **Example:** `"Best zoom camera phone (10x/30x/100x)"`

#### Q23
- **Query:** Best low-light / night photography phone
- **Intent:** `recommendation`
- **Reason:** Seeking recommendations based on night mode sensor performance and low-light image processing.
- **Example:** `"Best low-light / night photography phone"`

#### Q24
- **Query:** Best selfie camera phone
- **Intent:** `recommendation`
- **Reason:** Recommending phones with high-grade front camera sensors, autofocus, and portrait features.
- **Example:** `"Best selfie camera phone"`

#### Q25
- **Query:** Best phone for vlogging / video recording
- **Intent:** `recommendation`
- **Reason:** Recommending phones based on 4K video recording, stabilization (OIS/EIS), and audio recording quality.
- **Example:** `"Best phone for vlogging / video recording"`

#### Q26
- **Query:** Best phone with OIS (optical image stabilization)
- **Intent:** `recommendation`
- **Reason:** SQL/Spec-filtered recommendation query requiring `ois == true`.
- **Example:** `"Best phone with OIS (optical image stabilization)"`

#### Q27
- **Query:** Best camera phone under $500
- **Intent:** `recommendation`
- **Reason:** Camera recommendation with USD budget converted into equivalent BDT range.
- **Example:** `"Best camera phone under $500"`

---

### Category 3: Gaming-Focused Queries (Q28 – Q37)

#### Q28
- **Query:** Best gaming phone under 30k
- **Intent:** `recommendation`
- **Reason:** Recommending high-performance gaming phones under 30,000 BDT (`priority="gaming"`).
- **Example:** `"Best gaming phone under 30k"`

#### Q29
- **Query:** Best gaming phone under 50k
- **Intent:** `recommendation`
- **Reason:** Gaming-focused recommendation query under 50,000 BDT.
- **Example:** `"Best gaming phone under 50k"`

#### Q30
- **Query:** Best gaming phone for PUBG / Free Fire
- **Intent:** `recommendation`
- **Reason:** Recommending devices optimized for popular mobile esports titles (90fps/120fps support).
- **Example:** `"Best gaming phone for PUBG / Free Fire"`

#### Q31
- **Query:** Best phone with highest AnTuTu score
- **Intent:** `recommendation`
- **Reason:** Recommending devices ranked by synthetic benchmark scores (`AnTuTu`).
- **Example:** `"Best phone with highest AnTuTu score"`

#### Q32
- **Query:** Best Snapdragon processor phone under 30k
- **Intent:** `recommendation`
- **Reason:** Recommendation query filtering by Qualcomm Snapdragon SoC under 30,000 BDT.
- **Example:** `"Best Snapdragon processor phone under 30k"`

#### Q33
- **Query:** Best phone with 120Hz/144Hz display for gaming
- **Intent:** `recommendation`
- **Reason:** Recommending gaming devices filtered by high display refresh rate (`refresh_rate >= 120Hz`).
- **Example:** `"Best phone with 120Hz/144Hz display for gaming"`

#### Q34
- **Query:** Best phone with cooling system for gaming
- **Intent:** `recommendation`
- **Reason:** Recommending gaming phones featuring vapor chamber or liquid thermal cooling hardware.
- **Example:** `"Best phone with cooling system for gaming"`

#### Q35
- **Query:** Best phone with high RAM (12GB/16GB) for gaming
- **Intent:** `recommendation`
- **Reason:** Recommendation query filtering by RAM capacity (`ram >= 12GB`).
- **Example:** `"Best phone with high RAM (12GB/16GB) for gaming"`

#### Q36
- **Query:** Best phone under 40k for heavy gaming
- **Intent:** `recommendation`
- **Reason:** Heavy gaming recommendation under 40,000 BDT budget.
- **Example:** `"Best phone under 40k for heavy gaming"`

#### Q37
- **Query:** Best gaming phone with triggers/shoulder buttons
- **Intent:** `recommendation`
- **Reason:** Recommending dedicated gaming hardware with physical or capacitive shoulder triggers.
- **Example:** `"Best gaming phone with triggers/shoulder buttons"`

---

### Category 4: Battery & Charging Queries (Q38 – Q45)

#### Q38
- **Query:** Phones with 5000mAh+ battery
- **Intent:** `recommendation`
- **Reason:** Recommending devices filtered by battery capacity (`battery_mah >= 5000`).
- **Example:** `"Phones with 5000mAh+ battery"`

#### Q39
- **Query:** Phones with 6000mAh+ battery
- **Intent:** `recommendation`
- **Reason:** Recommending devices filtered by large battery capacity (`battery_mah >= 6000`).
- **Example:** `"Phones with 6000mAh+ battery"`

#### Q40
- **Query:** Best battery life phone under 20k
- **Intent:** `recommendation`
- **Reason:** Battery endurance recommendation under 20,000 BDT (`priority="battery"`).
- **Example:** `"Best battery life phone under 20k"`

#### Q41
- **Query:** Fastest charging phone (65W/100W/120W)
- **Intent:** `recommendation`
- **Reason:** Recommending devices ordered by charging wattage (`charging_watt DESC`).
- **Example:** `"Fastest charging phone (65W/100W/120W)"`

#### Q42
- **Query:** Best phone with wireless charging
- **Intent:** `recommendation`
- **Reason:** Spec-filtered recommendation query requiring `wireless_charging == true`.
- **Example:** `"Best phone with wireless charging"`

#### Q43
- **Query:** Best phone for all-day battery backup
- **Intent:** `recommendation`
- **Reason:** Battery efficiency recommendation focusing on active Screen-On-Time (SoT).
- **Example:** `"Best phone for all-day battery backup"`

#### Q44
- **Query:** Phone with longest standby time
- **Intent:** `recommendation`
- **Reason:** Recommending phones based on standby endurance and battery optimization.
- **Example:** `"Phone with longest standby time"`

#### Q45
- **Query:** Best phone with battery + fast charging combo under 25k
- **Intent:** `recommendation`
- **Reason:** Composite recommendation combining high battery mAh and high charging W under 25k BDT.
- **Example:** `"Best phone with battery + fast charging combo under 25k"`

---

### Category 5: Brand & Model Comparison Queries (Q46 – Q60)

#### Q46
- **Query:** Samsung vs Xiaomi which is better
- **Intent:** `comparison`
- **Reason:** Comparing two major brands overall across build, UI, camera, and value.
- **Example:** `"Samsung vs Xiaomi which is better"`

#### Q47
- **Query:** iPhone vs Samsung camera comparison
- **Intent:** `comparison`
- **Reason:** Head-to-head camera system comparison between Apple and Samsung flagships.
- **Example:** `"iPhone vs Samsung camera comparison"`

#### Q48
- **Query:** Realme vs Redmi under 20k
- **Intent:** `comparison`
- **Reason:** Brand lineup comparison in the budget segment under 20,000 BDT.
- **Example:** `"Realme vs Redmi under 20k"`

#### Q49
- **Query:** Infinix vs Tecno vs Symphony (local BD brands)
- **Intent:** `comparison`
- **Reason:** Multi-brand comparison focusing on budget brands popular in Bangladesh.
- **Example:** `"Infinix vs Tecno vs Symphony (local BD brands)"`

#### Q50
- **Query:** OnePlus vs Xiaomi flagship comparison
- **Intent:** `comparison`
- **Reason:** Flagship line comparison between OnePlus and Xiaomi.
- **Example:** `"OnePlus vs Xiaomi flagship comparison"`

#### Q51
- **Query:** iPhone 17 vs Samsung S25 Ultra
- **Intent:** `comparison`
- **Reason:** Direct model vs model comparison between two flagship models.
- **Example:** `"iPhone 17 vs Samsung S25 Ultra"`

#### Q52
- **Query:** Redmi Note series vs Realme Number series
- **Intent:** `comparison`
- **Reason:** Product series comparison between two popular mid-range lines.
- **Example:** `"Redmi Note series vs Realme Number series"`

#### Q53
- **Query:** Vivo vs Oppo camera comparison
- **Intent:** `comparison`
- **Reason:** Brand-level camera comparison between Vivo and Oppo.
- **Example:** `"Vivo vs Oppo camera comparison"`

#### Q54
- **Query:** Poco vs Redmi value comparison
- **Intent:** `comparison`
- **Reason:** Sub-brand comparison evaluating price-to-performance value.
- **Example:** `"Poco vs Redmi value comparison"`

#### Q55
- **Query:** Best budget brand in Bangladesh
- **Intent:** `recommendation`
- **Reason:** Brand-level recommendation query asking for top-rated budget brand overall.
- **Example:** `"Best budget brand in Bangladesh"`

#### Q56
- **Query:** iPhone SE vs budget Android
- **Intent:** `comparison`
- **Reason:** Cross-ecosystem entry-level comparison between compact iOS and budget Android.
- **Example:** `"iPhone SE vs budget Android"`

#### Q57
- **Query:** Which phone brand has best resale value in BD
- **Intent:** `resale_tradein`
- **Reason:** Asking for second-hand market resale value and value retention metrics across brands in BD. Cannot be served by new phone catalog specs.
- **Example:** `"Which phone brand has best resale value in BD"`

#### Q58
- **Query:** Samsung A-series vs M-series
- **Intent:** `comparison`
- **Reason:** Internal brand series comparison (Samsung A-series vs M-series).
- **Example:** `"Samsung A-series vs M-series"`

#### Q59
- **Query:** Best Chinese phone brand for durability
- **Intent:** `recommendation`
- **Reason:** Recommending Chinese brands filtered by build durability and drop resistance.
- **Example:** `"Best Chinese phone brand for durability"`

#### Q60
- **Query:** Nothing Phone vs OnePlus
- **Intent:** `comparison`
- **Reason:** Brand and ecosystem comparison between Nothing and OnePlus.
- **Example:** `"Nothing Phone vs OnePlus"`

---

### Category 6: Use-Case / Persona Queries (Q61 – Q72)

#### Q61
- **Query:** Best phone for students under 20k
- **Intent:** `recommendation`
- **Reason:** Persona-based recommendation query (`persona="student"`, `budget=20000`).
- **Example:** `"Best phone for students under 20k"`

#### Q62
- **Query:** Best phone for business use
- **Intent:** `recommendation`
- **Reason:** Persona recommendation focusing on security, clean software, battery, and build (`persona="business"`).
- **Example:** `"Best phone for business use"`

#### Q63
- **Query:** Best lightweight/compact phone
- **Intent:** `recommendation`
- **Reason:** Recommendation query filtering by light weight and small dimensions (`priority="build"`).
- **Example:** `"Best lightweight/compact phone"`

#### Q64
- **Query:** Best phone for elderly / senior citizens
- **Intent:** `recommendation`
- **Reason:** Persona recommendation focusing on readable displays, loud sound, and simple UI (`persona="senior"`).
- **Example:** `"Best phone for elderly / senior citizens"`

#### Q65
- **Query:** Best kids phone with parental controls
- **Intent:** `recommendation`
- **Reason:** Persona recommendation for child safety and durability (`persona="kids"`).
- **Example:** `"Best kids phone with parental controls"`

#### Q66
- **Query:** Best phone for content creators
- **Intent:** `recommendation`
- **Reason:** Persona recommendation for content creation (camera, 4K video, rendering speed).
- **Example:** `"Best phone for content creators"`

#### Q67
- **Query:** Best phone for online classes
- **Intent:** `recommendation`
- **Reason:** Persona recommendation for online learning (large screen, clear mic, front camera).
- **Example:** `"Best phone for online classes"`

#### Q68
- **Query:** Best rugged/waterproof phone
- **Intent:** `recommendation`
- **Reason:** Spec-based recommendation filtering for IP68/MIL-STD durability (`priority="durability"`).
- **Example:** `"Best rugged/waterproof phone"`

#### Q69
- **Query:** Best phone for travel / dual SIM international use
- **Intent:** `recommendation`
- **Reason:** Persona recommendation for global roaming, multi-band 5G, and dual SIM capability.
- **Example:** `"Best phone for travel / dual SIM international use"`

#### Q70
- **Query:** Best phone for photography beginners
- **Intent:** `recommendation`
- **Reason:** Persona recommendation for point-and-shoot camera ease of use.
- **Example:** `"Best phone for photography beginners"`

#### Q71
- **Query:** Best phone for freelancers (multitasking)
- **Intent:** `recommendation`
- **Reason:** Persona recommendation for productivity, RAM capacity, and multi-app performance.
- **Example:** `"Best phone for freelancers (multitasking)"`

#### Q72
- **Query:** Best small-size flagship phone
- **Intent:** `recommendation`
- **Reason:** Recommendation query filtering for flagship performance in compact form factor.
- **Example:** `"Best small-size flagship phone"`

---

### Category 7: Feature-Specific Queries (Q73 – Q87)

#### Q73
- **Query:** Best AMOLED display phone under 20k
- **Intent:** `recommendation`
- **Reason:** Recommendation query combining `display_type="AMOLED"` and `budget=20000`.
- **Example:** `"Best AMOLED display phone under 20k"`

#### Q74
- **Query:** Best phone with 5G under 25k
- **Intent:** `recommendation`
- **Reason:** Recommendation query combining `5g=true` and `budget=25000`.
- **Example:** `"Best phone with 5G under 25k"`

#### Q75
- **Query:** Best foldable phone price in Bangladesh
- **Intent:** `recommendation`
- **Reason:** Recommendation query for foldable devices with local BD market pricing.
- **Example:** `"Best foldable phone price in Bangladesh"`

#### Q76
- **Query:** Best phone with expandable storage
- **Intent:** `recommendation`
- **Reason:** Spec-filtered recommendation requiring microSD card slot (`card_slot=true`).
- **Example:** `"Best phone with expandable storage"`

#### Q77
- **Query:** IP68 waterproof phone under 30k
- **Intent:** `recommendation`
- **Reason:** Spec recommendation combining `ip_rating="IP68"` and `budget=30000`.
- **Example:** `"IP68 waterproof phone under 30k"`

#### Q78
- **Query:** Best phone with stereo speakers
- **Intent:** `recommendation`
- **Reason:** Recommendation filtering for dual stereo speakers (`stereo_speakers=true`).
- **Example:** `"Best phone with stereo speakers"`

#### Q79
- **Query:** Best phone with NFC support
- **Intent:** `recommendation`
- **Reason:** Recommendation filtering for NFC feature (`nfc=true`).
- **Example:** `"Best phone with NFC support"`

#### Q80
- **Query:** Best phone with in-display fingerprint
- **Intent:** `recommendation`
- **Reason:** Spec recommendation requiring under-display fingerprint sensor.
- **Example:** `"Best phone with in-display fingerprint"`

#### Q81
- **Query:** Best phone with clean Android (no bloatware)
- **Intent:** `recommendation`
- **Reason:** Recommendation query filtering by stock Android/lightweight UI (Pixel, Nothing, Motorola).
- **Example:** `"Best phone with clean Android (no bloatware)"`

#### Q82
- **Query:** Best phone with long software update support
- **Intent:** `recommendation`
- **Reason:** Recommendation query filtering for long OS update guarantees (`os_updates >= 4`).
- **Example:** `"Best phone with long software update support"`

#### Q83
- **Query:** Best phone with curved display
- **Intent:** `recommendation`
- **Reason:** Spec recommendation filtering for curved glass display panel.
- **Example:** `"Best phone with curved display"`

#### Q84
- **Query:** Best phone with headphone jack still available
- **Intent:** `recommendation`
- **Reason:** Spec recommendation requiring 3.5mm audio jack (`jack_35mm=true`).
- **Example:** `"Best phone with headphone jack still available"`

#### Q85
- **Query:** Best dual-SIM phone with 5G
- **Intent:** `recommendation`
- **Reason:** Spec recommendation requiring dual SIM and 5G network support.
- **Example:** `"Best dual-SIM phone with 5G"`

#### Q86
- **Query:** Best phone with satellite connectivity
- **Intent:** `recommendation`
- **Reason:** Recommendation filtering for emergency satellite messaging hardware.
- **Example:** `"Best phone with satellite connectivity"`

#### Q87
- **Query:** Best phone with AI features (Galaxy AI / Gemini)
- **Intent:** `recommendation`
- **Reason:** Recommending smartphones featuring AI software suites (Galaxy AI, Gemini).
- **Example:** `"Best phone with AI features (Galaxy AI / Gemini)"`

---

### Category 8: Purchase-Intent / Transactional Queries (Q88 – Q95)

#### Q88
- **Query:** iPhone 17 price in Bangladesh
- **Intent:** `price_lookup`
- **Reason:** Explicit price lookup query for a specific phone model in BD market.
- **Example:** `"iPhone 17 price in Bangladesh"`

#### Q89
- **Query:** Samsung Galaxy S25 price in BD
- **Intent:** `price_lookup`
- **Reason:** Direct price query for Samsung Galaxy S25 in BDT.
- **Example:** `"Samsung Galaxy S25 price in BD"`

#### Q90
- **Query:** Redmi Note 14 price in Bangladesh
- **Intent:** `price_lookup`
- **Reason:** Direct price lookup for Redmi Note 14 in BD.
- **Example:** `"Redmi Note 14 price in Bangladesh"`

#### Q91
- **Query:** Where to buy original phone in Bangladesh
- **Intent:** `availability`
- **Reason:** Asking for authorized BD store locations, official brand outlets, and verified sellers.
- **Example:** `"Where to buy original phone in Bangladesh"`

#### Q92
- **Query:** Official vs unofficial phone price difference BD
- **Intent:** `price_lookup`
- **Reason:** Price comparison query between official warranty BDT price vs grey market unofficial BDT price.
- **Example:** `"Official vs unofficial phone price difference BD"`

#### Q93
- **Query:** Best online store to buy phone in Bangladesh
- **Intent:** `availability`
- **Reason:** Store directory and retailer reliability query for purchasing phones online in BD.
- **Example:** `"Best online store to buy phone in Bangladesh"`

#### Q94
- **Query:** EMI / installment phone purchase options BD
- **Intent:** `deals_financing`
- **Reason:** Asking for financial installment options, credit card 0% EMI plans, and purchasing terms in BD. Requires specialized financing module.
- **Example:** `"EMI / installment phone purchase options BD"`

#### Q95
- **Query:** Phone warranty and after-sales service in BD
- **Intent:** `deals_financing`
- **Reason:** Queries regarding brand warranty terms, distributor guarantees, and after-sales service centers in BD.
- **Example:** `"Phone warranty and after-sales service in BD"`

---

### Category 9: General Decision-Support Queries (Q96 – Q100)

#### Q96
- **Query:** Which phone should I buy in 2026
- **Intent:** `recommendation`
- **Reason:** General recommendation advisory query seeking overall buying guidance.
- **Example:** `"Which phone should I buy in 2026"`

#### Q97
- **Query:** Upcoming phones to launch in 2026
- **Intent:** `lifecycle_advisory`
- **Reason:** Asking about unreleased upcoming phones, product roadmaps, and launch schedules for 2026.
- **Example:** `"Upcoming phones to launch in 2026"`

#### Q98
- **Query:** Is it better to wait for next flagship or buy now
- **Intent:** `lifecycle_advisory`
- **Reason:** Asking for release timing advice and lifecycle positioning ("wait vs buy now").
- **Example:** `"Is it better to wait for next flagship or buy now"`

#### Q99
- **Query:** Best phone to upgrade from a 3-year-old phone
- **Intent:** `lifecycle_advisory`
- **Reason:** Multi-generational upgrade decision query evaluating tech deltas from older models.
- **Example:** `"Best phone to upgrade from a 3-year-old phone"`

#### Q100
- **Query:** Best value-for-money phone overall
- **Intent:** `recommendation`
- **Reason:** Recommending top devices sorted by composite value-for-money algorithm.
- **Example:** `"Best value-for-money phone overall"`

---

### Category 10: AI & Software Feature Queries (Q101 – Q108)

#### Q101
- **Query:** Best phone with on-device AI features
- **Intent:** `recommendation`
- **Reason:** Recommending phones with local NPU on-device AI capabilities (`priority="ai"`).
- **Example:** `"Best phone with on-device AI features"`

#### Q102
- **Query:** Best phone with Galaxy AI
- **Intent:** `recommendation`
- **Reason:** Recommending Samsung devices supporting Galaxy AI software features.
- **Example:** `"Best phone with Galaxy AI"`

#### Q103
- **Query:** Best phone with Google Gemini built-in
- **Intent:** `recommendation`
- **Reason:** Recommending phones integrated with Google Gemini assistant.
- **Example:** `"Best phone with Google Gemini built-in"`

#### Q104
- **Query:** Best phone with Apple Intelligence
- **Intent:** `recommendation`
- **Reason:** Recommending iPhones equipped with Apple Intelligence suite.
- **Example:** `"Best phone with Apple Intelligence"`

#### Q105
- **Query:** Best phone with AI photo editing (magic eraser / object removal)
- **Intent:** `recommendation`
- **Reason:** Recommending camera phones with advanced AI photo editing tools.
- **Example:** `"Best phone with AI photo editing (magic eraser / object removal)"`

#### Q106
- **Query:** Best phone with real-time AI call/text translation
- **Intent:** `recommendation`
- **Reason:** Recommending devices supporting real-time AI voice call and text translation.
- **Example:** `"Best phone with real-time AI call/text translation"`

#### Q107
- **Query:** Best phone with longest software update guarantee (OS + security)
- **Intent:** `recommendation`
- **Reason:** Recommending devices ordered by guaranteed years of OS/security updates.
- **Example:** `"Best phone with longest software update guarantee (OS + security)"`

#### Q108
- **Query:** Best phone with a private/on-device AI assistant (no cloud dependency)
- **Intent:** `recommendation`
- **Reason:** Recommending devices featuring privacy-focused offline AI processing.
- **Example:** `"Best phone with a private/on-device AI assistant (no cloud dependency)"`

---

### Category 11: Foldable & Form-Factor Queries (Q109 – Q118)

#### Q109
- **Query:** Best foldable phone in Bangladesh
- **Intent:** `recommendation`
- **Reason:** Recommending top foldable devices available in the BD market.
- **Example:** `"Best foldable phone in Bangladesh"`

#### Q110
- **Query:** Samsung Galaxy Z Fold vs Z Flip — which to buy
- **Intent:** `comparison`
- **Reason:** Direct form factor comparison between book-style Fold and clamshell Flip.
- **Example:** `"Samsung Galaxy Z Fold vs Z Flip — which to buy"`

#### Q111
- **Query:** Best budget foldable phone
- **Intent:** `recommendation`
- **Reason:** Recommending lower-priced foldable smartphones sorted by price.
- **Example:** `"Best budget foldable phone"`

#### Q112
- **Query:** Best flip phone 2026
- **Intent:** `recommendation`
- **Reason:** Recommending top flip/clamshell format smartphones in 2026.
- **Example:** `"Best flip phone 2026"`

#### Q113
- **Query:** Best small/compact flagship phone
- **Intent:** `recommendation`
- **Reason:** Recommending compact flagship smartphones under 6.2 inches.
- **Example:** `"Best small/compact flagship phone"`

#### Q114
- **Query:** Best phone with the biggest display
- **Intent:** `recommendation`
- **Reason:** Recommending smartphones ordered by screen size (`display_size DESC`).
- **Example:** `"Best phone with the biggest display"`

#### Q115
- **Query:** Thinnest phone available right now
- **Intent:** `recommendation`
- **Reason:** Recommending devices ordered by body thickness (`thickness_mm ASC`).
- **Example:** `"Thinnest phone available right now"`

#### Q116
- **Query:** Lightest smartphone available
- **Intent:** `recommendation`
- **Reason:** Recommending smartphones ordered by weight (`weight_g ASC`).
- **Example:** `"Lightest smartphone available"`

#### Q117
- **Query:** Best phone with stylus/S Pen support
- **Intent:** `recommendation`
- **Reason:** Recommending devices equipped with active stylus digitizer support.
- **Example:** `"Best phone with stylus/S Pen support"`

#### Q118
- **Query:** Best phone for one-handed use
- **Intent:** `recommendation`
- **Reason:** Recommending ergonomic devices designed for single-hand operation (`width <= 70mm`).
- **Example:** `"Best phone for one-handed use"`

---

### Category 12: Connectivity & Technical Spec Queries (Q119 – Q126)

#### Q119
- **Query:** Best phone with eSIM support
- **Intent:** `recommendation`
- **Reason:** Recommending smartphones supporting embedded SIM (eSIM) profiles.
- **Example:** `"Best phone with eSIM support"`

#### Q120
- **Query:** Best phone with iSIM support
- **Intent:** `recommendation`
- **Reason:** Recommending smartphones featuring integrated SIM (iSIM) technology.
- **Example:** `"Best phone with iSIM support"`

#### Q121
- **Query:** Best dual-SIM 5G phone
- **Intent:** `recommendation`
- **Reason:** Recommending dual SIM devices with simultaneous 5G connectivity.
- **Example:** `"Best dual-SIM 5G phone"`

#### Q122
- **Query:** Best phone with Wi-Fi 7
- **Intent:** `recommendation`
- **Reason:** Recommending devices equipped with Wi-Fi 7 (802.11be) networking.
- **Example:** `"Best phone with Wi-Fi 7"`

#### Q123
- **Query:** Best phone with satellite SOS/messaging feature
- **Intent:** `recommendation`
- **Reason:** Recommending devices with hardware satellite emergency communication.
- **Example:** `"Best phone with satellite SOS/messaging feature"`

#### Q124
- **Query:** Best phone with strongest network signal reception
- **Intent:** `recommendation`
- **Reason:** Recommending devices with high antenna performance and RF reception ratings.
- **Example:** `"Best phone with strongest network signal reception"`

#### Q125
- **Query:** Best unlocked phone for international travel/roaming
- **Intent:** `recommendation`
- **Reason:** Recommending factory unlocked phones supporting global 5G network bands.
- **Example:** `"Best unlocked phone for international travel/roaming"`

#### Q126
- **Query:** Best phone with UWB (Ultra-Wideband) for tracking/tap-to-share
- **Intent:** `recommendation`
- **Reason:** Spec-filtered recommendation requiring Ultra-Wideband (UWB) chipset.
- **Example:** `"Best phone with UWB (Ultra-Wideband) for tracking/tap-to-share"`

---

### Category 13: Battery Tech & Sustainability Queries (Q127 – Q132)

#### Q127
- **Query:** Best phone with silicon-carbon battery
- **Intent:** `recommendation`
- **Reason:** Recommending smartphones featuring high-density silicon-carbon battery chemistry.
- **Example:** `"Best phone with silicon-carbon battery"`

#### Q128
- **Query:** Best phone with genuine 2-day battery life
- **Intent:** `recommendation`
- **Reason:** Recommending phones rated for multi-day battery endurance under real-world testing.
- **Example:** `"Best phone with genuine 2-day battery life"`

#### Q129
- **Query:** Most eco-friendly/sustainable phone brand
- **Intent:** `recommendation`
- **Reason:** Recommending brands and models scored by eco-sustainability metrics.
- **Example:** `"Most eco-friendly/sustainable phone brand"`

#### Q130
- **Query:** Best phone made with recycled materials
- **Intent:** `recommendation`
- **Reason:** Recommending phones manufactured with high percentage of recycled aluminum/plastics.
- **Example:** `"Best phone made with recycled materials"`

#### Q131
- **Query:** Best phone with user-replaceable battery
- **Intent:** `recommendation`
- **Reason:** Spec recommendation requiring removable user-replaceable battery.
- **Example:** `"Best phone with user-replaceable battery"`

#### Q132
- **Query:** Best phone for long-term battery health/longevity
- **Intent:** `recommendation`
- **Reason:** Recommending phones with high battery charge cycle longevity (e.g., 1600 cycles).
- **Example:** `"Best phone for long-term battery health/longevity"`

---

### Category 14: Audio, Build & Design Queries (Q133 – Q140)

#### Q133
- **Query:** Best phone with stereo speakers for music
- **Intent:** `recommendation`
- **Reason:** Recommending smartphones featuring high-fidelity stereo speakers.
- **Example:** `"Best phone with stereo speakers for music"`

#### Q134
- **Query:** Best phone with premium build (titanium/glass back)
- **Intent:** `recommendation`
- **Reason:** Recommending phones featuring titanium frame or Gorilla Glass rear panel.
- **Example:** `"Best phone with premium build (titanium/glass back)"`

#### Q135
- **Query:** Best matte-finish phone (fingerprint resistant)
- **Intent:** `recommendation`
- **Reason:** Recommending phones designed with frosted matte rear glass finish.
- **Example:** `"Best matte-finish phone (fingerprint resistant)"`

#### Q136
- **Query:** Best phone that still has a headphone jack
- **Intent:** `recommendation`
- **Reason:** Spec recommendation requiring 3.5mm analog headphone jack.
- **Example:** `"Best phone that still has a headphone jack"`

#### Q137
- **Query:** Best phone color options 2026
- **Intent:** `recommendation`
- **Reason:** Recommending phones featuring unique or popular 2026 aesthetic colorways.
- **Example:** `"Best phone color options 2026"`

#### Q138
- **Query:** Best phone with Dolby Atmos support
- **Intent:** `recommendation`
- **Reason:** Spec recommendation requiring Dolby Atmos audio spatial processing certification.
- **Example:** `"Best phone with Dolby Atmos support"`

#### Q139
- **Query:** Most durable phone (drop-test rated)
- **Intent:** `recommendation`
- **Reason:** Recommending devices scored high on drop tests and armor glass protection.
- **Example:** `"Most durable phone (drop-test rated)"`

#### Q140
- **Query:** Best rugged/outdoor phone
- **Intent:** `recommendation`
- **Reason:** Recommending heavy-duty outdoor phones with IP69K / MIL-STD ratings.
- **Example:** `"Best rugged/outdoor phone"`

---

### Category 15: Resale, Refurbished, Deals & Value Queries (Q141 – Q148)

#### Q141
- **Query:** Best refurbished phone to buy
- **Intent:** `resale_tradein`
- **Reason:** Recommending refurbished / certified pre-owned devices in BD market with condition grades.
- **Example:** `"Best refurbished phone to buy"`

#### Q142
- **Query:** Best phone for resale value after 2 years
- **Intent:** `resale_tradein`
- **Reason:** Querying devices with minimal 24-month depreciation in the BD secondary market.
- **Example:** `"Best phone for resale value after 2 years"`

#### Q143
- **Query:** Certified pre-owned iPhone worth buying
- **Intent:** `resale_tradein`
- **Reason:** Evaluating pre-owned iPhone models and certified refurb seller options.
- **Example:** `"Certified pre-owned iPhone worth buying"`

#### Q144
- **Query:** Trade-in old phone for new phone in Bangladesh
- **Intent:** `resale_tradein`
- **Reason:** Asking for trade-in / phone exchange program details and valuation logic in BD.
- **Example:** `"Trade-in old phone for new phone in Bangladesh"`

#### Q145
- **Query:** Best budget phone that won't lag after a year
- **Intent:** `recommendation`
- **Reason:** Recommending budget phones with fast UFS storage and long-term performance stability.
- **Example:** `"Best budget phone that won't lag after a year"`

#### Q146
- **Query:** Is it worth buying last year's flagship instead of the new one
- **Intent:** `comparison`
- **Reason:** Value comparison between previous generation flagship vs current generation mid-ranger.
- **Example:** `"Is it worth buying last year's flagship instead of the new one"`

#### Q147
- **Query:** Best phone deals during Eid sale in Bangladesh
- **Intent:** `deals_financing`
- **Reason:** Querying active promotional discounts and deals during Eid holiday sales in BD.
- **Example:** `"Best phone deals during Eid sale in Bangladesh"`

#### Q148
- **Query:** Best phone deals on Daraz/Black Friday sale
- **Intent:** `deals_financing`
- **Reason:** Querying e-commerce platform sales (Daraz 11.11 / Black Friday deals).
- **Example:** `"Best phone deals on Daraz/Black Friday sale"`

---

### Category 16: Ecosystem & Accessories Queries (Q149 – Q154)

#### Q149
- **Query:** Best phone that pairs well with a smartwatch
- **Intent:** `recommendation`
- **Reason:** Recommending phones based on smartwatch OS ecosystem compatibility (WearOS, WatchOS).
- **Example:** `"Best phone that pairs well with a smartwatch"`

#### Q150
- **Query:** Best phone for Apple ecosystem users (Mac/iPad/AirPods)
- **Intent:** `recommendation`
- **Reason:** Recommending devices tailored for Apple hardware integration.
- **Example:** `"Best phone for Apple ecosystem users (Mac/iPad/AirPods)"`

#### Q151
- **Query:** Best phone with a bundled earbuds offer
- **Intent:** `recommendation`
- **Reason:** Recommending smartphones offering free TWS earbuds in retail launch bundles.
- **Example:** `"Best phone with a bundled earbuds offer"`

#### Q152
- **Query:** Best phone with wide case/accessory availability in BD
- **Intent:** `recommendation`
- **Reason:** Recommending popular phone models with abundant local BD case and screen protector supply.
- **Example:** `"Best phone with wide case/accessory availability in BD"`

#### Q153
- **Query:** Best phone with MagSafe-style accessory support
- **Intent:** `recommendation`
- **Reason:** Spec recommendation filtering for magnetic accessory and Qi2 charging support.
- **Example:** `"Best phone with MagSafe-style accessory support"`

#### Q154
- **Query:** Best phone for smart home integration
- **Intent:** `recommendation`
- **Reason:** Recommending phones with IR blaster, Matter/Thread, and smart home hub apps.
- **Example:** `"Best phone for smart home integration"`

---

### Category 17: Professional & Niche Use-Case Queries (Q155 – Q162)

#### Q155
- **Query:** Best phone for professional photographers (RAW/ProRes/LOG video)
- **Intent:** `recommendation`
- **Reason:** Recommending camera phones supporting professional format video recording (ProRes, 10-bit LOG, RAW).
- **Example:** `"Best phone for professional photographers (RAW/ProRes/LOG video)"`

#### Q156
- **Query:** Best phone for stock trading/finance apps
- **Intent:** `recommendation`
- **Reason:** Persona recommendation for financial traders (screen stability, multi-app RAM, battery).
- **Example:** `"Best phone for stock trading/finance apps"`

#### Q157
- **Query:** Best phone for content creators (YouTube/TikTok/Reels)
- **Intent:** `recommendation`
- **Reason:** Recommending creator phones with 4K video, front camera stabilization, and microphone clarity.
- **Example:** `"Best phone for content creators (YouTube/TikTok/Reels)"`

#### Q158
- **Query:** Best phone for musicians (audio recording quality)
- **Intent:** `recommendation`
- **Reason:** Recommending phones with high-bitrate studio microphone array and low-latency audio capture.
- **Example:** `"Best phone for musicians (audio recording quality)"`

#### Q159
- **Query:** Best phone for reading (eye-comfort/low blue-light display)
- **Intent:** `recommendation`
- **Reason:** Recommending phones featuring high PWM dimming frequency and TÜV eye protection.
- **Example:** `"Best phone for reading (eye-comfort/low blue-light display)"`

#### Q160
- **Query:** Best phone for ride-share/delivery drivers (GPS + battery)
- **Intent:** `recommendation`
- **Reason:** Persona recommendation for drivers (dual-frequency GPS, high peak nit sunlight display, battery).
- **Example:** `"Best phone for ride-share/delivery drivers (GPS + battery)"`

#### Q161
- **Query:** Best phone for e-commerce/online business sellers
- **Intent:** `recommendation`
- **Reason:** Persona recommendation for online store owners (accurate camera colors, fast charging, dual SIM).
- **Example:** `"Best phone for e-commerce/online business sellers"`

#### Q162
- **Query:** Best phone for multitasking (split-screen/DeX-style desktop mode)
- **Intent:** `recommendation`
- **Reason:** Recommending high-RAM phones featuring desktop extension mode (Samsung DeX, Motorola Smart Connect).
- **Example:** `"Best phone for multitasking (split-screen/DeX-style desktop mode)"`

---

## 3. Summary of Intent Distribution

| Intent Type | Status | Query Count | Percentage |
| :--- | :--- | :---: | :---: |
| **`recommendation`** | Preserved Existing Intent | 134 | 82.7% |
| **`comparison`** | Preserved Existing Intent | 12 | 7.4% |
| **`price_lookup`** | Preserved Existing Intent | 4 | 2.5% |
| **`availability`** | Preserved Existing Intent | 2 | 1.2% |
| **`lifecycle_advisory`** | **NEW Intent Created** | 3 | 1.9% |
| **`resale_tradein`** | **NEW Intent Created** | 5 | 3.1% |
| **`deals_financing`** | **NEW Intent Created** | 2 | 1.2% |
| **Total** | | **162** | **100%** |
