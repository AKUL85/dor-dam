"""
__main__.py
===========

CLI entry point: ``python -m embedding_pipeline [args]``.

Arguments
---------
* ``--provider``  (required)  ``openai`` | ``gemini`` |
                              ``sentence_transformers`` | ``bge_m3``
* ``--model``                 override the default model id for the provider
* ``--input``                 path to phone_documents.jsonl
* ``--persist-dir``           Chroma persistence directory
* ``--collection``            Chroma collection name
* ``--batch-size``            documents per embedder call (default 32)
* ``--api-key``               explicit API key (overrides env vars)
* ``--device``                ``cpu`` | ``cuda`` (local providers)
* ``--normalize``/``--no-normalize``
* ``--verbose``               DEBUG-level logging

The CLI is intentionally thin — the heavy lifting lives in
:mod:`embedding_pipeline.runner`.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .config import EmbeddingProvider, PipelineConfig, PROVIDER_DEFAULTS
from .runner import run_pipeline
from .utils import setup_logging


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="embedding_pipeline",
        description="Embed phone_documents.jsonl into a Chroma collection.",
    )
    parser.add_argument(
        "--provider",
        required=True,
        type=lambda s: EmbeddingProvider(s),
        choices=list(EmbeddingProvider),
        help="Which embedding back-end to use.",
    )
    parser.add_argument(
        "--model",
        default="",
        help=(
            "Model id override. Defaults per provider: "
            + ", ".join(f"{k}={v[1]}" for k, v in PROVIDER_DEFAULTS.items())
        ),
    )
    parser.add_argument("--input", type=Path, default=PipelineConfig.input_path)
    parser.add_argument(
        "--persist-dir", type=Path, default=PipelineConfig.persist_dir
    )
    parser.add_argument(
        "--collection", default=PipelineConfig.collection_name
    )
    parser.add_argument("--batch-size", type=int, default=PipelineConfig.batch_size)
    parser.add_argument("--api-key", default="")
    parser.add_argument("--device", default=PipelineConfig.device)
    parser.add_argument(
        "--normalize",
        dest="normalize",
        action="store_true",
        default=PipelineConfig.normalize,
    )
    parser.add_argument("--no-normalize", dest="normalize", action="store_false")
    parser.add_argument("--verbose", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    logger = setup_logging(verbose=args.verbose)

    cfg = PipelineConfig(
        provider=args.provider,
        model=args.model,
        input_path=args.input,
        persist_dir=args.persist_dir,
        collection_name=args.collection,
        batch_size=args.batch_size,
        api_key=args.api_key,
        device=args.device,
        normalize=args.normalize,
    )

    # Surface a friendly error early for hosted providers so the user
    # doesn't have to wait for the first embedding call to learn their
    # key was missing.
    cfg.require_api_key()

    try:
        summary = run_pipeline(cfg)
    except ImportError as exc:
        logger.error("Missing dependency: %s", exc)
        return 2
    except Exception as exc:  # noqa: BLE001
        logger.exception("Pipeline run failed: %s", exc)
        return 1

    print("✅ Pipeline complete:", summary)
    return 0


if __name__ == "__main__":
    sys.exit(main())