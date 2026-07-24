# Embedding Pipeline

Configurable, resumable embedding pipeline for the DorDam phone catalogue.
Reads the RAG-ready documents produced by `scripts/build_rag_documents.py`
and indexes them into a persistent ChromaDB collection using one of four
configurable embedding back-ends.

## Modules

| Module                  | Responsibility                                                |
|-------------------------|---------------------------------------------------------------|
| `config.py`             | `PipelineConfig` dataclass + `EmbeddingProvider` enum + defaults |
| `utils.py`              | logging setup, `FailureTracker`, batch helpers, timing       |
| `loaders.py`            | Streaming JSONL loader, `Document` dataclass                 |
| `embedders.py`          | `BaseEmbedder` protocol + provider factory                    |
| `_openai_embedder.py`   | OpenAI SDK (`text-embedding-3-*`)                             |
| `_gemini_embedder.py`   | `google-generativeai` SDK (`text-embedding-004`)             |
| `_st_embedder.py`       | `sentence-transformers` (any HF model)                       |
| `_bge_embedder.py`      | `FlagEmbedding` (BAAI / BGE — bge-m3 by default)             |
| `chroma_store.py`       | `ChromaStore` with skip-if-exists + dimension validation      |
| `runner.py`             | `PipelineRunner` — orchestrate embed → upsert with progress  |
| `__main__.py`           | `python -m embedding_pipeline` CLI                           |

## Install

```bash
pip install -r scripts/embedding_pipeline/requirements.txt
```

Install only the rows for the providers you intend to use; the pipeline
imports each SDK lazily so unused providers never cost you startup time.

## Run

```bash
# Local sentence-transformers (no API key)
python -m embedding_pipeline \
    --provider sentence_transformers

# OpenAI (uses $OPENAI_API_KEY)
OPENAI_API_KEY=... python -m embedding_pipeline --provider openai

# Gemini (uses $GEMINI_API_KEY)
GEMINI_API_KEY=... python -m embedding_pipeline --provider gemini

# BGE-M3 / any other local model
python -m embedding_pipeline \
    --provider bge_m3 \
    --model BAAI/bge-m3 \
    --device cpu
```

## Programmatic use

```python
from embedding_pipeline import (
    PipelineConfig, EmbeddingProvider, run_pipeline,
)

cfg = PipelineConfig(
    provider=EmbeddingProvider.SENTENCE_TRANSFORMERS,
    model="sentence-transformers/all-MiniLM-L6-v2",
    batch_size=32,
)
summary = run_pipeline(cfg)
print(summary)
# {'total': 823, 'added': 823, 'skipped': 0, 'failed': 0, ...}
```

## CLI flags

| Flag                | Default                          | Notes                                |
|---------------------|----------------------------------|--------------------------------------|
| `--provider`        | **required**                     | one of `openai`, `gemini`, `sentence_transformers`, `bge_m3` |
| `--model`           | provider default                 | any model id the SDK accepts         |
| `--input`           | `processed/phone_documents.jsonl`|                                      |
| `--persist-dir`     | `processed/chroma`               | local Chroma directory               |
| `--collection`      | `phone_documents`                |                                      |
| `--batch-size`      | `32`                             | documents per embed call             |
| `--api-key`         | env var                          | overrides `OPENAI_API_KEY` / `GEMINI_API_KEY` |
| `--device`          | `cpu`                            | torch device (`cuda`, `mps`, `cpu`)  |
| `--normalize`       | on                               | L2-normalise embeddings              |
| `--verbose`         | off                              | DEBUG-level logging                  |

## Skip-if-exists + failures

Re-running the pipeline is **free** — every document id is checked against
the Chroma `get` API before being re-embedded, and the runner short-
circuits that batch. Failures are isolated (one bad document does not stop
the run) and appended to `processed/chroma/failures_<ISO>.jsonl` with the
exception trace so they can be triaged offline.

## Persistence

Local Chroma writes to `--persist-dir` (defaults to `processed/chroma/`).
Drop the directory to start clean, or change `--collection` to load two
indexes side-by-side for the same documents with different embedders.