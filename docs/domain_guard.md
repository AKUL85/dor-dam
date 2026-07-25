# DorDam Domain Guard (Scope Guard) Documentation

## 1. Overview & Purpose

In specialized domain RAG applications (such as mobile phone comparison, pricing, and specs), incoming user traffic often includes conversational greetings, small talk, off-topic requests (e.g., programming questions, recipe requests), or unclassifiable gibberish.

Passing these non-domain queries down the heavy Hybrid RAG pipeline (Vector DB embeddings, SQL filtering, context formatting, and LLM prompting) introduces unnecessary latency, consumes compute/API costs, and can result in hallucinated or awkward domain answers.

The **Domain Guard (Scope Guard)** acts as a lightweight, high-performance gateway **inserted directly before the Intent Classifier**. It classifies every incoming message into domain categories and immediately short-circuits non-phone queries with helpful, structured, pre-templated responses.

---

## 2. Scope Categories & Responses

| Category | Description | Example Query | Routing Behavior |
| :--- | :--- | :--- | :--- |
| `PHONE_DOMAIN` | Valid mobile phone query | *"Best camera phone under 30k taka"* | **Proceed to Hybrid RAG Pipeline** |
| `GENERAL_GREETING` | Conversational greeting | *"Hi"*, *"Hello"*, *"Good morning"* | **Return Greeting Template** (Short-circuit) |
| `SMALL_TALK` | Polite casual chatter | *"How are you?"*, *"Thanks"*, *"Good job"* | **Return Small Talk Template** (Short-circuit) |
| `UNRELATED` | Off-topic question | *"Teach me Python"*, *"How to cook biryani"* | **Return Friendly Refusal Template** (Short-circuit) |
| `UNKNOWN` | Gibberish or unclassifiable | *"asdfghjkl"*, *"???"* | **Return Clarification Prompt** (Short-circuit) |

---

## 3. End-to-End Pipeline Routing Flow

```
                     User Query
                         │
                         ▼
                ┌────────────────┐
                │  Scope Guard   │
                └───────┬────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
 [PHONE_DOMAIN]               [Non-PHONE_DOMAIN]
        │                               │
        ▼                               ▼
┌───────────────┐              ┌────────────────┐
│    Intent     │              │ Return Guarded │
│  Classifier   │              │   Template     │
└───────┬───────┘              │   Response     │
        │                      └────────────────┘
        ▼
┌───────────────┐
│    Entity     │
│  Extractor    │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   Decision    │
│    Router     │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Hybrid RAG /  │
│ LLM Synthesis │
└───────────────┘
```

---

## 4. Classification Logic

The `ScopeClassifier` (`scripts/domain_guard.py`) uses a layered heuristic evaluation order:

1. **Explicit Phone Domain Signals**:
   - Matches brand dictionary (`Samsung`, `Apple`, `Xiaomi`, `Realme`, `OnePlus`, `Google`, etc.).
   - Matches phone hardware keywords (`RAM`, `ROM`, `mAh`, `BDT`, `AMOLED`, `Snapdragon`, `camera`, `gaming`, `5G`, `eSIM`, `IP68`).
   - Matches spec regexes (`under 30k`, `120Hz`, `vs`, `best camera`).
   - *If any phone signal is present, the message is instantly classified as `PHONE_DOMAIN`.*

2. **Greeting Patterns**:
   - Matches regexes for *"hi"*, *"hello"*, *"good morning"*, *"assalamu alaikum"*, *"greetings"*.

3. **Small Talk Patterns**:
   - Matches regexes for *"how are you"*, *"thanks"*, *"thank you"*, *"good job"*, *"awesome"*, *"who are you"*.

4. **Unrelated Topic Patterns**:
   - Matches off-topic categories: programming (`Python`, `Java`, `SQL`), sports (`World Cup`, `Messi`), cooking (`recipe`, `biryani`), writing (`resume`, `essay`), trivia (`capital of France`, `gravity`).

5. **Unknown / Noise Fallback**:
   - Identifies keyboard smashes, repetitive noise (`asdfghjkl`), or empty punctuation and returns clarification prompts.

---

## 5. Example Conversation Flows

### Example A: Valid Phone Query (`PHONE_DOMAIN`)
> **User:** "Compare Galaxy S25 Ultra vs iPhone 16 Pro Max"  
> **Scope Guard:** `PHONE_DOMAIN` (Confidence: 0.95)  
> **System:** Passes query to Intent Classifier → Decision Router → Comparison Engine → Markdown Table Response.

### Example B: General Greeting (`GENERAL_GREETING`)
> **User:** "Hello!"  
> **Scope Guard:** `GENERAL_GREETING` (Confidence: 0.95)  
> **System (Bypasses RAG):**
> *"Hello! 👋 I'm your AI Mobile Assistant.*
> *I can help you compare smartphones, recommend phones based on your budget, explain specifications, compare cameras, gaming performance, battery life, and much more.*
> *Try asking something like:*
> *• Best phone under 30,000 BDT*
> *• Compare Galaxy S25 vs iPhone 17"*

### Example C: Unrelated Question (`UNRELATED`)
> **User:** "How to cook biryani"  
> **Scope Guard:** `UNRELATED` (Confidence: 0.95)  
> **System (Bypasses RAG):**
> *"I'm designed specifically to help with smartphones and mobile technology.*
> *I can't answer general questions, but I'd be happy to help you with:*
> *• Phone recommendations*
> *• Price comparisons*
> *• Camera comparisons"*

---

## 6. How to Extend with New Domains

To add a new domain (e.g., **LAPTOPS** or **SMARTWATCHES**) in the future:

1. **Add new `ScopeCategory`**:
   ```python
   class ScopeCategory(str, Enum):
       PHONE_DOMAIN = "PHONE_DOMAIN"
       LAPTOP_DOMAIN = "LAPTOP_DOMAIN"  # New category
       GENERAL_GREETING = "GENERAL_GREETING"
       ...
   ```

2. **Add Brand & Keyword Sets**:
   ```python
   LAPTOP_BRANDS = {"asus", "lenovo", "hp", "dell", "macbook", "acer", "msi"}
   LAPTOP_KEYWORDS = {"laptop", "gpu", "rtx", "intel", "ryzen", "core i7"}
   ```

3. **Update Response Templates**:
   Add corresponding laptop or multi-domain response templates in `scripts/guard_templates.py`.
