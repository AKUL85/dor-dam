"""
loaders.py
==========

Readers for the RAG-ready document corpus produced by
``scripts/build_rag_documents.py``.

Each loader yields :class:`Document` dataclasses so the downstream
embedding stage can stay provider-agnostic.

Two loaders are provided:

* :class:`JsonlDocumentLoader` — streaming reader for the canonical
  ``phone_documents.jsonl`` format. Streaming avoids loading the full
  ~823-doc corpus into memory before we even start embedding.
* :func:`load_jsonl` — convenience wrapper for one-shot use.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator


@dataclass
class Document:
    """One RAG-ready phone document, ready for embedding.

    Attributes:
        id:       Stable document identifier (``phone_001`` …).
        text:     Natural-language document body.
        metadata: Optional sidecar dict stored alongside the embedding.
                  Keep values short — Chroma metadata values are not full-
                  text indexed and large payloads bloat the on-disk store.
    """

    id: str
    text: str
    metadata: dict = field(default_factory=dict)

    @classmethod
    def from_jsonl(cls, raw: dict) -> "Document":
        """Build a Document from one parsed JSONL row."""
        return cls(
            id=str(raw["id"]),
            text=str(raw["text"]),
            metadata=dict(raw.get("metadata", {})),
        )


class JsonlDocumentLoader:
    """Streaming JSONL loader.

    The constructor only opens the file; documents are produced lazily by
    ``__iter__`` so memory stays flat regardless of corpus size.

    Args:
        path: File containing one JSON object per line.

    Raises:
        FileNotFoundError: If ``path`` does not exist.
    """

    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        if not self.path.is_file():
            raise FileNotFoundError(f"JSONL corpus not found at {self.path}")

    def __iter__(self) -> Iterator[Document]:
        with self.path.open("r", encoding="utf-8") as fp:
            for lineno, line in enumerate(fp, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(
                        f"Invalid JSON at {self.path}:{lineno}: {exc}"
                    ) from exc
                yield Document.from_jsonl(payload)


def load_jsonl(path: Path) -> list[Document]:
    """Materialise an entire JSONL corpus into a list.

    Convenience wrapper used by tests and small scripts. For 100k+
    documents prefer iterating :class:`JsonlDocumentLoader` directly.
    """
    return list(JsonlDocumentLoader(path))