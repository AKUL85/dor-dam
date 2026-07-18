"""Build (or rebuild) the ChromaDB phone-document index.

Reads the JSONL produced by ``build_rag_documents.py``, parses the
plain-text fields into Chroma metadata, embeds each document with
:class:`HashedTfIdfEmbedder`, and persists everything to disk.

Usage:
    PYTHONPATH=scripts python -m search.indexer
    PYTHONPATH=scripts python -m search.indexer --rebuild --top 200
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Sequence

import numpy as np

# Local imports — must come after sys.path tweaks so the package root
# is the ``scripts`` directory, matching the rest of the codebase.
from search.embedder import (
    EmbedderConfig,
    HashedTfIdfEmbedder,
    tokenize,
)

logger = logging.getLogger("search.indexer")


DEFAULT_INPUT = Path("processed/phone_documents.jsonl")
DEFAULT_PERSIST_DIR = Path("processed/chroma")
DEFAULT_COLLECTION = "phone_documents"
DEFAULT_DIM = 384


# ──────────────────────────────────────────────────────────────────────
# Document parsing
# ──────────────────────────────────────────────────────────────────────

_PRICE_RE = re.compile(r"(?:Lowest|Highest)[^0-9]*([\d,]+)\s*BDT", re.IGNORECASE)
_STOCK_RE = re.compile(r"In-stock stores \((\d+)\)", re.IGNORECASE)
_AVAIL_RE = re.compile(r"Available stores \((\d+)\)", re.IGNORECASE)


@dataclass
class ParsedDoc:
    id: str
    text: str
    name: str
    brand: str
    category: str
    price_min: int | None
    price_max: int | None
    in_stock_count: int | None
    store_count: int | None


def _parse_doc(id_: str, text: str) -> ParsedDoc:
    name = ""
    brand = ""
    category = ""
    # The first sentence of every doc is
    #   "Phone name: ….  Brand: ….  Category: ….  …"
    # The three fields are *separated by periods* in the source, but
    # the value after each label can contain periods (e.g.
    # "iPhone 17 Pro Max"), so we can't do a simple ``text.split('.')``.
    # Pull each field by its own label first — this is order-tolerant
    # and avoids losing the rest of the header.
    m_name = re.search(r"Phone name:\s*(.+?)\.\s*(?=Brand:|$)", text)
    if m_name:
        name = m_name.group(1).strip()
    m_brand = re.search(r"Brand:\s*(.+?)\.\s*(?=Category:|$)", text)
    if m_brand:
        brand = m_brand.group(1).strip()
    m_cat = re.search(r"Category:\s*([^\s.]+)", text)
    if m_cat:
        category = m_cat.group(1).strip()

    prices = [int(s.replace(",", "")) for s in _PRICE_RE.findall(text)]
    price_min = min(prices) if prices else None
    price_max = max(prices) if prices else None

    stock_m = _STOCK_RE.search(text)
    avail_m = _AVAIL_RE.search(text)
    in_stock_count = int(stock_m.group(1)) if stock_m else None
    store_count = int(avail_m.group(1)) if avail_m else None

    return ParsedDoc(
        id=id_,
        text=text,
        name=name,
        brand=brand,
        category=category,
        price_min=price_min,
        price_max=price_max,
        in_stock_count=in_stock_count,
        store_count=store_count,
    )


def iter_docs(path: Path) -> Iterator[ParsedDoc]:
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            yield _parse_doc(str(row.get("id", "")), str(row.get("text", "")))


# ──────────────────────────────────────────────────────────────────────
# Index building
# ──────────────────────────────────────────────────────────────────────

@dataclass
class IndexBuildResult:
    collection: str
    persist_dir: Path
    n_records: int
    dim: int


def build_index(
    *,
    input_path: Path = DEFAULT_INPUT,
    persist_dir: Path = DEFAULT_PERSIST_DIR,
    collection: str = DEFAULT_COLLECTION,
    dim: int = DEFAULT_DIM,
    limit: int | None = None,
    reset: bool = False,
) -> IndexBuildResult:
    """Embed the phone-document corpus and push to ChromaDB.

    Args:
        input_path:  JSONL with ``{"id", "text"}`` rows.
        persist_dir: Where Chroma persists its SQLite + HNSW index.
        collection:  Collection name inside the persist dir.
        dim:         Embedder dimension (also Chroma HNSW vector size).
        limit:       If set, only embed the first N rows — handy for
                     smoke tests.
        reset:       If ``True``, wipe the existing collection first.
    """
    if not input_path.exists():
        raise FileNotFoundError(f"No input JSONL at {input_path}")

    cfg = EmbedderConfig(
        dim=dim,
        cache_dir=Path("processed/search_cache"),
    )
    embedder = HashedTfIdfEmbedder(cfg)

    docs: list[ParsedDoc] = []
    texts: list[str] = []
    for i, doc in enumerate(iter_docs(input_path)):
        if limit is not None and i >= limit:
            break
        docs.append(doc)
        texts.append(doc.text)

    if not docs:
        raise RuntimeError(f"No documents found in {input_path}")

    logger.info("Fitting IDF on %d documents", len(texts))
    embedder.fit(texts)

    logger.info("Embedding %d documents (dim=%d)", len(texts), dim)
    vectors = embedder.embed_documents(texts)

    # Open Chroma. Lazy import so the indexer module stays usable
    # in environments without chromadb installed.
    import chromadb
    client = chromadb.PersistentClient(path=str(persist_dir))
    if reset:
        try:
            client.delete_collection(collection)
        except Exception:
            pass
    coll = client.get_or_create_collection(
        name=collection,
        metadata={"hnsw:space": "cosine", "vector_dimension": dim},
    )

    ids = [d.id for d in docs]
    documents = [d.text for d in docs]
    metadatas = []
    for d in docs:
        md: dict = {"name": d.name, "brand": d.brand, "category": d.category}
        if d.price_min is not None:
            md["price_min"] = int(d.price_min)
        if d.price_max is not None:
            md["price_max"] = int(d.price_max)
        if d.in_stock_count is not None:
            md["in_stock_count"] = int(d.in_stock_count)
        if d.store_count is not None:
            md["store_count"] = int(d.store_count)
        metadatas.append(md)

    coll.upsert(
        ids=ids,
        documents=documents,
        embeddings=vectors.tolist(),
        metadatas=metadatas,
    )
    logger.info(
        "Indexed %d records into %s/%s",
        len(ids), persist_dir, collection,
    )
    return IndexBuildResult(
        collection=collection,
        persist_dir=persist_dir,
        n_records=len(ids),
        dim=dim,
    )


# ──────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────

def _main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the Chroma phone-document index.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--persist-dir", default=str(DEFAULT_PERSIST_DIR))
    parser.add_argument("--collection", default=DEFAULT_COLLECTION)
    parser.add_argument("--dim", type=int, default=DEFAULT_DIM)
    parser.add_argument("--top", type=int, default=None,
                        help="Limit to the first N rows (smoke testing).")
    parser.add_argument("--rebuild", action="store_true",
                        help="Drop the existing collection before indexing.")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO)
    result = build_index(
        input_path=Path(args.input),
        persist_dir=Path(args.persist_dir),
        collection=args.collection,
        dim=args.dim,
        limit=args.top,
        reset=args.rebuild,
    )
    print(json.dumps(result.__dict__, default=str, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())