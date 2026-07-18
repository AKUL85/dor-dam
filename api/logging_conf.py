"""Structured JSON logging configuration for the API layer.

Every log line is a single-line JSON object so a downstream log shipper
(Loki / CloudWatch / Datadog) can parse without a custom formatter.
"""

from __future__ import annotations

import json
import logging
import sys
import time
from typing import Any


class JsonFormatter(logging.Formatter):
    """Render :class:`logging.LogRecord` as a one-line JSON object."""

    # Standard ``LogRecord`` attributes we never want to copy verbatim.
    _RESERVED = {
        "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
        "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
        "created", "msecs", "relativeCreated", "thread", "threadName",
        "processName", "process", "asctime", "message", "taskName",
    }

    def format(self, record: logging.LogRecord) -> str:  # noqa: D401
        payload: dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
                  + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)

        # Promote any ``extra={"key": "value"}`` kwargs onto the payload.
        for key, value in record.__dict__.items():
            if key in self._RESERVED or key.startswith("_"):
                continue
            try:
                json.dumps(value)
                payload[key] = value
            except (TypeError, ValueError):
                payload[key] = repr(value)

        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    """Install the JSON formatter on the root logger.

    Safe to call multiple times — re-runs just reset the level.
    """
    root = logging.getLogger()
    # Wipe existing handlers so we don't double-log when uvicorn reimports.
    for h in list(root.handlers):
        root.removeHandler(h)
    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    root.setLevel(level.upper())

    # Quiet the SQL chatter unless explicitly turned on.
    for noisy in ("sqlalchemy.engine", "chromadb"):
        logging.getLogger(noisy).setLevel("WARNING")