"""Local entrypoint: ``python -m api.runner``.

This is a convenience wrapper around ``uvicorn`` that respects the
``PORT`` / ``HOST`` env vars (defaults: 0.0.0.0:8000).
"""

from __future__ import annotations

import os

import uvicorn

from .logging_conf import configure_logging


def main() -> None:
    configure_logging(level=os.environ.get("LOG_LEVEL", "INFO"))
    uvicorn.run(
        "api.main:app",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8000")),
        reload=bool(int(os.environ.get("RELOAD", "0"))),
        log_config=None,  # we have our own JSON formatter
    )


if __name__ == "__main__":
    main()