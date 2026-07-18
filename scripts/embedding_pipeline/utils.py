"""
utils.py
========

Small utilities shared across the pipeline:

* :func:`setup_logging` — standardised logger output (one-line INFO by
  default, switches to DEBUG when ``--verbose`` is passed).
* :class:`FailureTracker` — append-only JSONL log of every failure with
  enough context to reproduce it.
* :func:`chunked` — yield successive ``n``-sized batches from any
  iterable without materialising it.
"""

from __future__ import annotations

import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator, TypeVar


T = TypeVar("T")
_LOGGER_NAME = "embedding_pipeline"


def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configure and return the package-wide logger.

    Args:
        verbose: When ``True`` emits DEBUG-level records; otherwise INFO.

    Returns:
        The configured logger instance (idempotent — re-running replaces
        handlers, which matters when the CLI is invoked from tests).
    """
    logger = logging.getLogger(_LOGGER_NAME)
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)

    # Avoid duplicating handlers if setup_logging is called twice.
    if logger.handlers:
        for handler in list(logger.handlers):
            logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s :: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    logger.addHandler(handler)
    logger.propagate = False
    return logger


class FailureTracker:
    """Persist per-document failure records to a JSONL file.

    Each failure record carries:

    * ``id``        — document id that failed.
    * ``stage``     — which pipeline stage raised (e.g. ``"embed"``).
    * ``error``     — stringified exception class + message.
    * ``traceback`` — full traceback (helpful for debugging scrape quirks).
    * ``timestamp`` — ISO-8601 UTC.

    The file is opened in append mode so re-runs accumulate failures from
    previous attempts without overwriting evidence.
    """

    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._fh = self.path.open("a", encoding="utf-8")

    def record(self, *, doc_id: str, stage: str, exc: BaseException) -> None:
        """Append one failure record."""
        import traceback as _tb

        record = {
            "id": doc_id,
            "stage": stage,
            "error": f"{type(exc).__name__}: {exc}",
            "traceback": "".join(_tb.format_exception(type(exc), exc, exc.__traceback__)),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._fh.write(json.dumps(record, ensure_ascii=False) + "\n")
        self._fh.flush()

    def close(self) -> None:
        if not self._fh.closed:
            self._fh.close()


def chunked(items: Iterable[T], size: int) -> Iterator[list[T]]:
    """Yield successive ``size``-sized chunks from ``items``.

    Pulls lazily so we never hold more than one batch in memory — important
    when embedding tens of thousands of long documents.
    """
    chunk: list[T] = []
    for item in items:
        chunk.append(item)
        if len(chunk) >= size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def utc_now_iso() -> str:
    """Return current UTC time as ISO-8601 (used in run metadata)."""
    return datetime.now(timezone.utc).isoformat()


def time_block() -> float:
    """Return a monotonically-increasing float in seconds (for timing)."""
    return time.perf_counter()