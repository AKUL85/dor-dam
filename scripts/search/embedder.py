"""Hashed-feature TF-IDF embedder.

Why hashed TF-IDF?
------------------
The project needs a retrieval-quality embedder that:

* requires zero model downloads (the local Python environment has
  only ``numpy`` + ``chromadb`` — no ``sentence_transformers`` /
  ``torch`` / ``openai``);
* is fully deterministic so re-runs produce identical vectors;
* scales to a few thousand documents.

We use the classic IR trick: hash each token into one of ``dim``
buckets with a second hash for sign-flipping (Weinberger
``signed hashing``). The vocabulary is therefore unbounded and the
vocabulary file never grows, but IDF is computed exactly over the
corpus we *have*.

The result is a dense, L2-normalised float32 vector of length
``dim`` (default 384 — same as MiniLM so the rest of the system
can later swap embedders without changing collection dimensions).
"""
from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np


# ──────────────────────────────────────────────────────────────────────
# Tokenisation
# ──────────────────────────────────────────────────────────────────────

# A conservative tokeniser for English + digits + simple punctuation.
# Keeps numbers, model identifiers, units (MP, MHZ, MAH), and skips
# one-character noise.
_TOKEN_RE = re.compile(r"[A-Za-z0-9]+(?:[\-_/][A-Za-z0-9]+)*")


def tokenize(text: str) -> list[str]:
    """Lower-cased, alpha-stable tokeniser used for both indexing
    and query embedding."""
    return [tok.lower() for tok in _TOKEN_RE.findall(text or "") if len(tok) > 1]


# ──────────────────────────────────────────────────────────────────────
# Hashed-feature vectoriser
# ──────────────────────────────────────────────────────────────────────

def _mmh3_like_hash(token: str, seed: int = 0) -> int:
    """Stable 32-bit hash. We re-implement ``mmh3`` semantics with
    Python's built-in ``hash`` is *not* stable across runs, so we use
    SHA-1 truncated to 4 bytes — deterministic, fast, and free.
    """
    import hashlib
    h = hashlib.sha1(f"{seed}:{token}".encode("utf-8")).digest()
    return int.from_bytes(h[:4], "big", signed=False)


def hashed_vector(
    tokens: Sequence[str],
    *,
    dim: int,
    idf: dict[str, float] | None = None,
    bucket_idf: dict[int, float] | None = None,
) -> np.ndarray:
    """Project ``tokens`` into a ``dim``-dim TF-IDF vector using
    signed-feature hashing.

    The output is L2-normalised so cosine similarity collapses to a
    plain dot product.

    Pass either ``idf`` (a ``{token: idf}`` dict) or ``bucket_idf``
    (a ``{bucket: mean_idf}`` dict produced by ``fit``). When IDF is
    supplied, the per-bucket weight is the mean IDF of every input
    token that landed in that bucket.
    """
    vec = np.zeros(dim, dtype=np.float32)
    if not tokens:
        return vec
    counts: dict[int, int] = {}
    signs: dict[int, int] = {}
    for tok in tokens:
        bucket = _mmh3_like_hash(tok, seed=0) % dim
        sign = -1 if (_mmh3_like_hash(tok, seed=1) & 1) else 1
        counts[bucket] = counts.get(bucket, 0) + 1
        signs[bucket] = sign

    if bucket_idf is not None:
        for bucket, count in counts.items():
            tf = 1.0 + math.log(count)
            vec[bucket] = signs[bucket] * tf * bucket_idf.get(bucket, 1.0)
    elif idf is not None:
        for bucket, count in counts.items():
            tf = 1.0 + math.log(count)
            weights = [
                idf[t]
                for t in tokens
                if _mmh3_like_hash(t, seed=0) % dim == bucket
            ]
            idf_w = float(np.mean(weights)) if weights else 1.0
            vec[bucket] = signs[bucket] * tf * idf_w
    else:
        for bucket, count in counts.items():
            tf = 1.0 + math.log(count)
            vec[bucket] = signs[bucket] * tf

    n = float(np.linalg.norm(vec))
    if n > 0:
        vec /= n
    return vec


# ──────────────────────────────────────────────────────────────────────
# IDF computation + persistence
# ──────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class EmbedderConfig:
    dim: int = 384
    cache_dir: Path = Path("processed/search_cache")


def compute_idf(docs: Iterable[Sequence[str]]) -> dict[str, float]:
    """Standard smoothed IDF:
        log( (1 + N) / (1 + df_t) ) + 1
    """
    df: dict[str, int] = {}
    n = 0
    for tokens in docs:
        n += 1
        seen = set(tokens)
        for t in seen:
            df[t] = df.get(t, 0) + 1
    idf: dict[str, float] = {}
    for tok, df_t in df.items():
        idf[tok] = math.log((1 + n) / (1 + df_t)) + 1.0
    return idf


def build_bucket_idf(
    idf: dict[str, float], *, dim: int
) -> dict[int, float]:
    """Pre-compute ``{bucket: mean_idf_of_tokens_in_bucket}`` so we
    don't have to reverse-lookup every token at embed time.

    Tokens with the same hash bucket get averaged together (collision
    merge). The result is a sparse dict of length ≤ ``dim``.
    """
    bucket_sums: dict[int, float] = {}
    bucket_counts: dict[int, int] = {}
    for tok, w in idf.items():
        bucket = _mmh3_like_hash(tok, seed=0) % dim
        bucket_sums[bucket] = bucket_sums.get(bucket, 0.0) + w
        bucket_counts[bucket] = bucket_counts.get(bucket, 0) + 1
    return {
        b: bucket_sums[b] / bucket_counts[b]
        for b in bucket_sums
    }


def save_idf(idf: dict[str, float], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        json.dump(idf, f, ensure_ascii=False, indent=2)


def load_idf(path: Path) -> dict[str, float]:
    with path.open() as f:
        return json.load(f)


def save_bucket_idf(bucket_idf: dict[int, float], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        json.dump({str(b): w for b, w in bucket_idf.items()}, f)


def load_bucket_idf(path: Path) -> dict[int, float]:
    with path.open() as f:
        return {int(b): w for b, w in json.load(f).items()}


# ──────────────────────────────────────────────────────────────────────
# High-level embedder
# ──────────────────────────────────────────────────────────────────────

class HashedTfIdfEmbedder:
    """Wraps the helpers above into a tiny ``BaseEmbedder``-shaped
    interface so future code can plug in a real model without
    changing call sites."""

    def __init__(self, cfg: EmbedderConfig | None = None) -> None:
        self.cfg = cfg or EmbedderConfig()
        self._idf: dict[str, float] | None = None
        self._bucket_idf: dict[int, float] | None = None

    @property
    def dimension(self) -> int:
        return self.cfg.dim

    def fit(self, docs: Sequence[str]) -> None:
        """Compute IDF + bucket-IDF over a corpus and persist both."""
        tokenised = [tokenize(d) for d in docs]
        self._idf = compute_idf(tokenised)
        self._bucket_idf = build_bucket_idf(self._idf, dim=self.cfg.dim)
        save_idf(self._idf, self.cfg.cache_dir / "idf.json")
        save_bucket_idf(self._bucket_idf, self.cfg.cache_dir / "bucket_idf.json")

    def load(self) -> None:
        """Load a previously persisted IDF table."""
        self._idf = load_idf(self.cfg.cache_dir / "idf.json")
        self._bucket_idf = load_bucket_idf(
            self.cfg.cache_dir / "bucket_idf.json"
        )

    def embed_documents(self, texts: Sequence[str]) -> np.ndarray:
        if self._bucket_idf is not None:
            vecs = np.stack(
                [hashed_vector(tokenize(t), dim=self.cfg.dim,
                               bucket_idf=self._bucket_idf)
                 for t in texts],
                axis=0,
            )
            return vecs.astype(np.float32)
        if self._idf is not None:
            vecs = np.stack(
                [hashed_vector(tokenize(t), dim=self.cfg.dim, idf=self._idf)
                 for t in texts],
                axis=0,
            )
            return vecs.astype(np.float32)
        # No IDF table available — TF-only vectors.
        vecs = np.stack(
            [hashed_vector(tokenize(t), dim=self.cfg.dim) for t in texts],
            axis=0,
        )
        return vecs.astype(np.float32)

    def embed_query(self, text: str) -> np.ndarray:
        return self.embed_documents([text])[0]
