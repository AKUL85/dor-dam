"""Production prompt library for the dordam pipeline.

This package is **just text** — it loads three markdown files and applies
``{{placeholder}}`` substitution. No LLM calls happen here. The orchestrator
decides which prompt to send to which model.

Public surface:

- ``load(name)``     — return raw prompt text (with placeholders intact).
- ``render(name, **kwargs)`` — return the prompt with substitutions applied.
- ``PROMPTS``        — names: ``"system"``, ``"router"``, ``"fallback"``.

CLI self-check:

    python -m prompts                  # show available prompts + sizes
    python -m prompts system           # print the rendered system prompt
    python -m prompts system query="Is X worth buying?" intent=review \\
                            today=2026-07-18 sql_context="..." vector_context="..."

Every rule in each prompt file is also reflected as a string constant in
this module, so other code (tests, lint, evaluator) can assert the rules
without parsing markdown.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Mapping


PROMPTS_DIR = Path(__file__).resolve().parent
PROMPTS = {
    "system":   PROMPTS_DIR / "system.md",
    "router":   PROMPTS_DIR / "router.md",
    "fallback": PROMPTS_DIR / "fallback.md",
}


# --------------------------------------------------------------------------- #
# Load + render
# --------------------------------------------------------------------------- #

_PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")


def load(name: str) -> str:
    """Return the raw prompt text for ``name``. Placeholders are kept."""
    if name not in PROMPTS:
        raise KeyError(f"unknown prompt: {name!r}; available: {sorted(PROMPTS)}")
    return PROMPTS[name].read_text(encoding="utf-8")


def render(name: str, **kwargs: object) -> str:
    """Return ``name`` with every ``{{key}}`` replaced by ``kwargs[key]``.

    Unfilled placeholders are left as ``{{key}}`` so the LLM never sees
    ``None`` literals. Strings, numbers, and dicts (JSON-serialised) are
    accepted.
    """
    text = load(name)
    def _sub(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in kwargs:
            return match.group(0)
        value = kwargs[key]
        if isinstance(value, (dict, list)):
            return json.dumps(value, ensure_ascii=False, indent=2)
        return str(value)
    return _PLACEHOLDER_RE.sub(_sub, text)


def placeholders(name: str) -> list[str]:
    """Return the list of placeholders used in ``name``, in order."""
    return _PLACEHOLDER_RE.findall(load(name))


# --------------------------------------------------------------------------- #
# The 8 production rules, as code (for tests / evaluators)
# --------------------------------------------------------------------------- #

PRODUCTION_RULES: tuple[str, ...] = (
    "Never hallucinate.",
    "Only answer from retrieved context.",
    "Mention uncertainty.",
    "Recommend phones with reasons.",
    "Mention prices.",
    "Mention stores.",
    "Keep answers concise.",
    "Support markdown.",
)


def assert_rules_present(name: str) -> None:
    """Raise ``AssertionError`` if any of the 8 rules is missing from ``name``.

    Each rule is matched by a substring of its headline (without the §
    numbering). Tests use this to catch prompt regressions.
    """
    text = load(name)
    fragments = (
        "Never hallucinate",
        "Only answer from retrieved context",
        "Mention uncertainty",
        "Recommend phones with reasons",
        "Mention prices",
        "Mention stores",
        "Keep answers concise",
        "Support markdown",
    )
    missing = [frag for frag in fragments if frag.lower() not in text.lower()]
    if missing:
        raise AssertionError(
            f"{name!r} prompt is missing rules: {missing}"
        )


# --------------------------------------------------------------------------- #
# CLI self-check
# --------------------------------------------------------------------------- #

def _cli(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="prompts",
        description="Prompt library self-check (no LLM calls).",
    )
    sub = parser.add_subparsers(dest="cmd", required=False)

    # Default: list mode
    sub.add_parser("list", help="Show available prompts and their sizes.")

    p_show = sub.add_parser("show", help="Print a prompt's raw text.")
    p_show.add_argument("name", choices=sorted(PROMPTS))

    p_render = sub.add_parser("render", help="Print a prompt with substitutions.")
    p_render.add_argument("name", choices=sorted(PROMPTS))
    p_render.add_argument("--kv", action="append", default=[],
                          help="key=value pair, repeatable. Dict/list values are JSON.")

    p_check = sub.add_parser("check", help="Verify every prompt has all 8 rules.")

    args = parser.parse_args(argv)

    if args.cmd is None or args.cmd == "list":
        out = {name: len(load(name).encode("utf-8"))
               for name in sorted(PROMPTS)}
        print(json.dumps(out, indent=2))
        return 0

    if args.cmd == "show":
        sys.stdout.write(load(args.name))
        return 0

    if args.cmd == "render":
        # Parse --kv pairs; JSON literals become Python objects.
        kwargs: dict[str, object] = {}
        for kv in args.kv:
            if "=" not in kv:
                print(f"bad --kv: {kv!r}", file=sys.stderr)
                return 2
            key, raw = kv.split("=", 1)
            raw = raw.strip()
            try:
                kwargs[key.strip()] = json.loads(raw)
            except json.JSONDecodeError:
                kwargs[key.strip()] = raw
        sys.stdout.write(render(args.name, **kwargs))
        return 0

    if args.cmd == "check":
        for name in sorted(PROMPTS):
            assert_rules_present(name)
            print(f"{name}: ok")
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(_cli())
