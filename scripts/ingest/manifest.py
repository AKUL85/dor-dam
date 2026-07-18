"""
manifest.py
===========

Persistent per-productUrl tracking used by the incremental ingest pipeline.

The manifest is a JSON file that maps each stable product identifier (the
scraper's ``productUrl``) to a tuple of two hashes:

* ``content_hash`` — SHA-256 of the *canonicalised* phone record (name,
  brand, specs, stores, prices, …). Two files with identical content hash
  have identical downstream effects.
* ``doc_hash`` — SHA-256 of the *rendered RAG document text* for this
  phone. Two records with identical ``content_hash`` always have
  identical ``doc_hash``, but two records with different ``content_hash``
  may still produce identical text in pathological cases (e.g. a price
  fluctuation that does not change the rendered prose). We re-embed only
  when ``doc_hash`` changes — that's the actual signal that downstream
  retrieval needs new vectors.

Why both?
---------
Splitting "did the data change?" from "did the prose change?" lets the
embed step skip phones whose only delta was a stock-status flip that
never made it into the prose. That's cheap insurance against the
expensive side of the pipeline.

Stability across runs
---------------------
The manifest's stable key is the scraper's ``productUrl`` itself — URLs
are scraped uniquely per store per phone, so a phone that disappears
from one store and reappears on another shows up as a *store-level*
delta inside one ``content_hash``, not a phantom phone add/remove.
"""
from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Mapping

logger = logging.getLogger("ingest.manifest")


# ──────────────────────────────────────────────────────────────────────
# Hash helpers
# ──────────────────────────────────────────────────────────────────────

def canonicalise(raw: Mapping) -> bytes:
    """Serialise ``raw`` to a stable JSON byte string.

    ``sort_keys=True`` means a re-ordered dict produces the same digest
    as the original — vital for incremental detection across scraper
    schema drift.
    """
    return json.dumps(
        raw, sort_keys=True, ensure_ascii=False, default=str
    ).encode("utf-8")


def content_hash(record: Mapping) -> str:
    """SHA-256 of the canonical record payload."""
    return hashlib.sha256(canonicalise(record)).hexdigest()


# Fields that change every scrape but should NOT affect diff detection.
# They are kept on the canonical record for the importer, but stripped
# from the byte string we hash. Without this, renaming a scraper file
# (or re-running the pipeline minutes apart) would mark every phone as
# updated and force an unnecessary re-embed of the entire catalogue.
_VOLATILE_AUDIT_KEYS: frozenset[str] = frozenset({
    "scraped_file",
    "scraped_at",
    "scrapedFile",
    "scrapedAt",
})


def stable_payload(record: Mapping) -> dict:
    """Return a copy of ``record`` with volatile audit fields stripped.

    Used by the incremental pipeline to compute ``content_hash`` so that
    scraper-run metadata (``scraped_file``, ``scraped_at``) does not
    produce false-positive "changed" signals. The stripped copy is also
    walked one level into ``stores`` so per-store audit fields don't
    leak in either.
    """
    payload = {
        k: v for k, v in record.items() if k not in _VOLATILE_AUDIT_KEYS
    }
    stores = payload.get("stores")
    if isinstance(stores, list):
        payload["stores"] = [
            {k: v for k, v in s.items() if k not in _VOLATILE_AUDIT_KEYS}
            if isinstance(s, Mapping) else s
            for s in stores
        ]
    return payload


def content_hash_stable(record: Mapping) -> str:
    """SHA-256 over :func:`stable_payload`, the incremental hash."""
    return hashlib.sha256(canonicalise(stable_payload(record))).hexdigest()


def doc_hash(text: str) -> str:
    """SHA-256 of a piece of rendered prose."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ──────────────────────────────────────────────────────────────────────
# Diff primitives
# ──────────────────────────────────────────────────────────────────────

@dataclass
class IngestDiff:
    """Set-difference between the manifest and a fresh scraper batch.

    Attributes:
        added:     ``productUrl`` keys present in the new batch but not
                   in the previous manifest.
        updated:   ``productUrl`` keys present on both sides whose
                   ``content_hash`` changed.
        removed:   ``productUrl`` keys present on the previous side but
                   missing from the new batch.
        unchanged: ``productUrl`` keys present on both sides with the
                   same ``content_hash``.

    Use ``.changed = added | updated`` for "anything that needs a
    re-embed".
    """

    added: set[str] = field(default_factory=set)
    updated: set[str] = field(default_factory=set)
    removed: set[str] = field(default_factory=set)
    unchanged: set[str] = field(default_factory=set)

    @property
    def changed(self) -> set[str]:
        """All productUrls that need a database upsert and embed re-check."""
        return self.added | self.updated

    @property
    def total(self) -> int:
        return len(self.added) + len(self.updated) + len(self.removed) + len(self.unchanged)

    def to_dict(self) -> dict:
        return {
            "added": sorted(self.added),
            "updated": sorted(self.updated),
            "removed": sorted(self.removed),
            "unchanged": sorted(self.unchanged),
        }


# ──────────────────────────────────────────────────────────────────────
# Manifest
# ──────────────────────────────────────────────────────────────────────

@dataclass
class ManifestEntry:
    """One stored row per productUrl."""

    content_hash: str
    doc_hash: str
    name: str = ""
    brand: str = ""


class IngestManifest:
    """Disk-backed inventory of every productUrl we have ever ingested.

    The manifest is a single JSON file containing a dict
    ``{product_url: {content_hash, doc_hash, name, brand}}``. Reads and
    writes are intentionally simple — the file is small (one row per
    phone, currently a few KB even for 800+ phones) so we don't bother
    with line-by-line appends.
    """

    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        self.entries: dict[str, ManifestEntry] = {}

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def load(self) -> "IngestManifest":
        """Read the manifest from disk. Missing file → empty manifest."""
        if not self.path.exists():
            logger.info("No prior manifest at %s — treating run as cold", self.path)
            self.entries = {}
            return self
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            # Corrupt manifest: rather than crash the pipeline, log loudly
            # and start fresh. The downstream apply step will re-insert
            # any rows from a prior DB import that we already had.
            logger.warning("Manifest %s corrupt (%s); rebuilding empty", self.path, exc)
            raw = {}
        self.entries = {
            url: ManifestEntry(
                content_hash=entry["content_hash"],
                doc_hash=entry["doc_hash"],
                name=entry.get("name", ""),
                brand=entry.get("brand", ""),
            )
            for url, entry in raw.items()
            if isinstance(entry, dict)
        }
        logger.info(
            "Loaded manifest from %s — %d entries", self.path, len(self.entries)
        )
        return self

    def save(self) -> None:
        """Atomically write the manifest to disk."""
        serialised = {
            url: {
                "content_hash": e.content_hash,
                "doc_hash": e.doc_hash,
                "name": e.name,
                "brand": e.brand,
            }
            for url, e in self.entries.items()
        }
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(
            json.dumps(serialised, indent=2, sort_keys=True, ensure_ascii=False),
            encoding="utf-8",
        )
        # Atomic rename — readers always see either the old or new file,
        # never a half-written one.
        tmp.replace(self.path)
        logger.debug("Wrote manifest to %s (%d entries)", self.path, len(serialised))

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    def update(
        self,
        url: str,
        *,
        content_hash: str,
        doc_hash: str,
        name: str = "",
        brand: str = "",
    ) -> None:
        self.entries[url] = ManifestEntry(
            content_hash=content_hash,
            doc_hash=doc_hash,
            name=name,
            brand=brand,
        )

    def drop(self, urls: Iterable[str]) -> int:
        """Remove ``urls`` from the manifest. Returns number actually removed."""
        removed = 0
        for url in urls:
            if self.entries.pop(url, None) is not None:
                removed += 1
        return removed

    # ------------------------------------------------------------------
    # Diffing
    # ------------------------------------------------------------------

    def diff_against(
        self,
        batch: Mapping[str, tuple[str, str, str, str]],
    ) -> IngestDiff:
        """Compute the set-difference vs. a fresh batch.

        Args:
            batch: Mapping ``productUrl → (content_hash, doc_hash, name, brand)``
                   for every phone in the new batch.

        Returns:
            :class:`IngestDiff` with ``added``/``updated``/``removed``/
            ``unchanged`` sets.
        """
        new_urls = set(batch.keys())
        old_urls = set(self.entries.keys())

        added = new_urls - old_urls
        removed = old_urls - new_urls
        common = new_urls & old_urls

        updated: set[str] = set()
        unchanged: set[str] = set()
        for url in common:
            new_content, new_doc, _, _ = batch[url]
            old = self.entries[url]
            # Only "content changes" propagate to the database; doc_hash
            # changes are tracked separately for embed diffing.
            if (new_content != old.content_hash) or (new_doc != old.doc_hash):
                updated.add(url)
            else:
                unchanged.add(url)

        return IngestDiff(
            added=added,
            updated=updated,
            removed=removed,
            unchanged=unchanged,
        )
