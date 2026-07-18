# Production System Prompts

System and orchestration prompts for the dordam assistant pipeline:

```
prompts/
├── system.md          # Final-answer system prompt (the LLM that faces the user)
├── router.md          # Decision-routing prompt for the orchestrator stage
└── fallback.md        # Tight prompt used when retrieved context is thin/missing
```

## Naming convention

Each file uses `{{ }}` placeholders that the orchestrator (`scripts/router/` — to
be implemented) substitutes at call time:

| Placeholder                | Substituted with                                                 |
| -------------------------- | ---------------------------------------------------------------- |
| `{{query}}`                | The original user question (verbatim, after sanitisation).       |
| `{{today}}`                | ISO-8601 date (YYYY-MM-DD).                                      |
| `{{intent}}`               | Classified `IntentType` (recommendation / spec / …).             |
| `{{sql_context}}`          | Rendered SQL-engine output (markdown table or spec/pricing card).|
| `{{vector_context}}`       | Top-K semantic-search snippets (each headed by name + brand).    |
| `{{candidates}}`           | The ranked candidate list from the recommendation engine.        |
| `{{policy}}`               | The 8 non-negotiable production rules (the table below).         |

## The 8 production rules

These are the non-negotiable rules every prompt must enforce:

| # | Rule                                  | Enforced by                                |
| - | ------------------------------------- | ------------------------------------------ |
| 1 | Never hallucinate                     | `system.md` rule §1 + `fallback.md` rule §1|
| 2 | Only answer from retrieved context    | `system.md` rule §2 + `fallback.md` rule §2|
| 3 | Mention uncertainty                   | `system.md` rule §3 + `fallback.md` rule §3|
| 4 | Recommend phones with reasons         | `system.md` rule §4                        |
| 5 | Mention prices                        | `system.md` rule §5                        |
| 6 | Mention stores                        | `system.md` rule §6                        |
| 7 | Keep answers concise                  | `system.md` rule §7                        |
| 8 | Support markdown                      | `system.md` rule §8                        |

A small Python helper (`prompts/__init__.py`) loads these strings safely and
applies the substitutions. See `python -m prompts` for a CLI self-check.
