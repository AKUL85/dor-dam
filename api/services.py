"""Orchestrator: classify → plan → dispatch → merge → final answer.

This module is the only place where the four engines talk to each other
and to the LLM prompts. It is intentionally *not* an LLM-driven router
yet — for now it uses a deterministic decision table mirroring
``prompts/router.md`` so the API is testable end-to-end without an API
key. A future swap-in can replace :func:`plan` with an LLM call that
renders ``prompts/router.md`` and parses JSON.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Iterable, Optional, Sequence

from sqlalchemy.orm import Session

from compare import compare as compare_eng
from intent_classifier import IntentType, get_default_classifier
from pricing import price_check
from recommend import recommend as recommend_eng, RecommendationQuery
from search import SearchEngine, render_markdown as render_search_markdown
from specs import lookup as specs_lookup

from .deps import BoundLogger
from .schemas import (
    ChatRequest,
    CompareRequest,
    CompareResponse,
    PriceRequest,
    PriceResponse,
    RecommendItem,
    RecommendRequest,
    RecommendResponse,
    SearchHitOut,
    SearchRequest,
    SearchResponse,
    StoreOfferOut,
)


logger = logging.getLogger("api.services")


# ──────────────────────────────────────────────────────────────────────
# Plan
# ──────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class EnginePlan:
    """One engine step in the orchestrator's plan."""

    name: str                  # specs | pricing | recommend | compare | search
    args: dict[str, Any] = field(default_factory=dict)
    rationale: str = ""


@dataclass(frozen=True)
class Plan:
    intent: IntentType
    engines: list[EnginePlan]
    budget: Optional[float] = None
    brands: list[str] = field(default_factory=list)
    models: list[str] = field(default_factory=list)
    top_k: int = 5
    alpha: float = 0.5
    where: dict[str, Any] = field(default_factory=dict)
    where_expr: dict[str, dict[str, Any]] = field(default_factory=dict)
    clarifying_question: Optional[str] = None


# Decision table — mirrors ``prompts/router.md``.
_RUBRIC: dict[IntentType, list[tuple[str, str]]] = {
    IntentType.RECOMMENDATION: [
        ("recommend", "rank candidates by priority + budget"),
        ("search", "supporting evidence for reasons"),
    ],
    IntentType.COMPARISON: [
        ("specs", "resolve each phone"),
        ("compare", "head-to-head across dimensions"),
    ],
    IntentType.SPECIFICATION: [
        ("specs", "spec lookup"),
    ],
    IntentType.PRICE_LOOKUP: [
        ("pricing", "stores + prices for the named phone"),
    ],
    IntentType.AVAILABILITY: [
        ("pricing", "in-stock flag per store"),
    ],
    IntentType.REVIEW: [
        ("search", "subjective signals from the catalog"),
    ],
    IntentType.MIXED: [
        ("recommend", "if budget or priority is implied"),
        ("search", "supporting evidence"),
    ],
    IntentType.GENERAL: [
        ("search", "no specific engine; recall"),
    ],
}


def plan(query: str, intent_value: str | IntentType, *,
         top_k: int = 5, alpha: float = 0.5,
         where: Optional[dict[str, Any]] = None,
         where_expr: Optional[dict[str, dict[str, Any]]] = None) -> Plan:
    """Map a classified intent to a deterministic plan."""
    try:
        intent = intent_value if isinstance(intent_value, IntentType) \
            else IntentType(intent_value)
    except ValueError:
        intent = IntentType.GENERAL

    engines = [
        EnginePlan(name=n, rationale=r)
        for n, r in _RUBRIC.get(intent, _RUBRIC[IntentType.GENERAL])
    ]
    return Plan(
        intent=intent,
        engines=engines,
        top_k=top_k,
        alpha=alpha,
        where=dict(where or {}),
        where_expr=dict(where_expr or {}),
    )


# ──────────────────────────────────────────────────────────────────────
# Engine dispatch — turn plan steps into rendered context blocks
# ──────────────────────────────────────────────────────────────────────

@dataclass
class DispatchResult:
    """Aggregated output of one plan execution."""

    sql_context: str = ""
    vector_context: str = ""
    engines_called: list[str] = field(default_factory=list)
    recommendation_items: list[RecommendItem] = field(default_factory=list)
    compare_result: Optional[CompareResponse] = None
    price_result: Optional[PriceResponse] = None
    search_response: Optional[SearchResponse] = None


def _search_hit_to_out(hit: Any) -> SearchHitOut:
    md = hit.metadata or {}
    return SearchHitOut(
        rank=hit.rank,
        id=hit.id,
        name=hit.name,
        brand=hit.brand or md.get("brand"),
        category=hit.category or md.get("category"),
        price_min=md.get("price_min"),
        price_max=md.get("price_max"),
        in_stock_count=md.get("in_stock_count"),
        store_count=md.get("store_count"),
        score=hit.score,
        cosine_score=hit.cosine_score,
        bm25_score=hit.bm25_score,
        snippet=hit.snippet,
    )


def dispatch(
    query: str,
    plan_obj: Plan,
    *,
    session: Session,
    search_engine: SearchEngine,
) -> DispatchResult:
    """Run each engine in order; collect markdown contexts."""
    out = DispatchResult()

    for step in plan_obj.engines:
        out.engines_called.append(step.name)
        try:
            if step.name == "search":
                result = search_engine.search(
                    query,
                    top_k=plan_obj.top_k,
                    blend_alpha=plan_obj.alpha,
                    where=plan_obj.where or None,
                    where_document=None,
                )
                out.search_response = SearchResponse(
                    query=result.query,
                    top_k=result.top_k,
                    candidates=result.candidates,
                    hits=[_search_hit_to_out(h) for h in result.hits],
                )
                out.vector_context = render_search_markdown(result)

            elif step.name == "specs":
                # Specs needs a phone name. If the query names one we
                # try to resolve; otherwise we skip silently.
                from specs.engine import _resolve_phone  # local import
                phone = _resolve_phone(session, query)
                if phone is not None:
                    result = specs_lookup(phone.name, session=session)
                    out.sql_context += result.markdown + "\n\n"

            elif step.name == "pricing":
                from pricing.engine import _resolve_phone as _resolve_price
                phone = _resolve_price(session, query)
                if phone is not None:
                    pr = price_check(phone.name, session=session)
                    from pricing import render_markdown as render_price_md
                    out.price_result = PriceResponse(
                        name=f"{pr.brand} {pr.name}",
                        phone_id=pr.phone_id,
                        price_min=pr.price_range.min_price,
                        price_max=pr.price_range.max_price,
                        discount_pct=pr.price_range.spread_pct,
                        store_count=len(pr.offers),
                        in_stock_count=pr.in_stock_count,
                        offers=[
                            StoreOfferOut(
                                store=o.store_name,
                                price=o.price,
                                url=o.store_url,
                                in_stock=o.in_stock,
                            )
                            for o in pr.offers[:20]
                        ],
                    )
                    out.sql_context += render_price_md(pr) + "\n\n"

            elif step.name == "recommend":
                rq = RecommendationQuery(query=query, limit=plan_obj.top_k)
                results = recommend_eng(rq, session=session)
                items: list[RecommendItem] = []
                for idx, r in enumerate(results, start=1):
                    items.append(RecommendItem(
                        rank=idx,
                        phone_id=r.phone_id,
                        name=r.name,
                        brand=r.brand,
                        category=getattr(r, "category", None),
                        score=r.score,
                        score_breakdown=r.score_breakdown,
                        price_min=getattr(r, "price_min", None),
                        price_max=getattr(r, "price_max", None),
                        reason=r.reason,
                        vector_hits=[],
                    ))
                out.recommendation_items = items
                # Render a compact markdown context from the items.
                if items:
                    rows = [
                        f"{idx}. {it.name} ({it.brand}) — score {it.score:.2f}"
                        f" — {it.reason}"
                        for idx, it in enumerate(items, start=1)
                    ]
                    out.sql_context += "### Recommendations\n" + "\n".join(rows) + "\n\n"

            elif step.name == "compare":
                # Compare needs ≥2 model names. Best-effort: try the
                # full query; if the SQL engine can resolve ≥2 phones,
                # render the comparison table.
                names = _split_compare_names(query)
                if len(names) >= 2:
                    cr = compare_eng(names, session=session)
                    from compare import render_markdown as render_compare_md
                    if cr.phones:
                        out.compare_result = CompareResponse(
                            names=names,
                            table_md=render_compare_md(cr),
                            recommendation=cr.recommendation,
                            phones=[
                                {"key": p.key, "name": p.name, "brand": p.brand,
                                 "price_min": p.price_min, "price_max": p.price_max}
                                for p in cr.phones
                            ],
                        )
                        out.sql_context += render_compare_md(cr) + "\n\n"

        except Exception as exc:  # noqa: BLE001
            logger.warning("engine %s failed: %s", step.name, exc,
                           extra={"engine": step.name})

    return out


def _split_compare_names(query: str) -> list[str]:
    """Cheap splitter on ``vs`` / ``and`` / ``,``."""
    import re
    parts = re.split(r"\b(?:vs\.?|versus|and|,)\b", query, flags=re.IGNORECASE)
    return [p.strip() for p in parts if p.strip()]


# ──────────────────────────────────────────────────────────────────────
# Final-answer composition (no LLM call yet — uses ``prompts/system.md``
# skeleton so the API is testable offline)
# ──────────────────────────────────────────────────────────────────────

def compose_final_answer(
    query: str,
    intent: IntentType,
    dispatch_result: DispatchResult,
) -> str:
    """Render a deterministic final answer from the dispatched contexts.

    When an LLM is configured, swap this function for a renderer that
    uses ``prompts/system.md``; the input shape stays the same.
    """
    if dispatch_result.sql_context or dispatch_result.vector_context:
        sections: list[str] = []
        sections.append(f"### {intent.value.title()} — answer")
        if dispatch_result.sql_context:
            sections.append("#### From the catalog (SQL)")
            sections.append(dispatch_result.sql_context.strip())
        if dispatch_result.vector_context:
            sections.append("#### Supporting snippets (vector search)")
            sections.append(dispatch_result.vector_context.strip())
        return "\n\n".join(sections)

    return (
        "I don't have enough information in the current catalog to answer that "
        "confidently. Could you rephrase or add a price range, brand, or use case?"
    )


# ──────────────────────────────────────────────────────────────────────
# Public entry points — one per endpoint
# ──────────────────────────────────────────────────────────────────────

def run_search(req: SearchRequest, *, search_engine: SearchEngine) -> SearchResponse:
    where = req.where or None
    where_expr = req.where_expr or None
    if where_expr:
        # Convert {key: {"$lte": 50000}} → Chroma where with $and merge.
        clauses: list[dict[str, Any]] = []
        if where:
            clauses.append(where)
        for k, ops in where_expr.items():
            for op, val in ops.items():
                clauses.append({k: {op: val}})
        if len(clauses) == 1:
            where = clauses[0]
        else:
            where = {"$and": clauses}

    result = search_engine.search(
        req.query,
        top_k=req.top_k,
        candidate_k=req.rerank_candidates,
        where=where,
        blend_alpha=req.alpha,
    )
    return SearchResponse(
        query=result.query,
        top_k=result.top_k,
        candidates=result.candidates,
        hits=[_search_hit_to_out(h) for h in result.hits],
    )


def run_recommend(
    req: RecommendRequest,
    *,
    session: Session,
    search_engine: SearchEngine,
    log: BoundLogger,
) -> RecommendResponse:
    items: list[RecommendItem] = []
    rq = RecommendationQuery(
        query_text=req.query,
        budget_max=req.budget,
        budget_min=req.budget_min,
        priorities=[req.priority] if req.priority else [],
        brand=req.brand,
        limit=req.limit,
    )
    results = recommend_eng(rq, session=session)
    log.info("recommend produced %d candidates", len(results))

    if req.use_vector_fallback and not results:
        # Fall back to semantic recall so the API still returns
        # something useful when SQL filtering is too strict.
        log.info("falling back to vector search")
        sr = search_engine.search(req.query, top_k=req.limit)
        return RecommendResponse(
            query=req.query,
            count=len(sr.hits),
            items=[
                RecommendItem(
                    rank=h.rank,
                    phone_id=-1,
                    name=h.name,
                    brand=h.brand or "",
                    score=h.score,
                    reason=h.snippet[:160],
                    vector_hits=[_search_hit_to_out(h)],
                )
                for h in sr.hits
            ],
        )

    for r in results:
        items.append(RecommendItem(
            rank=r.rank,
            phone_id=r.phone_id,
            name=r.name,
            brand=r.brand,
            category=r.category,
            score=r.score,
            score_breakdown=r.score_breakdown,
            price_min=r.price_min,
            price_max=r.price_max,
            reason=r.reason,
            vector_hits=[],
        ))
    return RecommendResponse(query=req.query, count=len(items), items=items)


def run_compare(
    req: CompareRequest,
    *,
    session: Session,
    log: BoundLogger,
) -> CompareResponse:
    log.info("compare %d phones: %s", len(req.names), req.names)
    cr = compare_eng(req.names, session=session)
    from compare import render_markdown as render_compare_md
    return CompareResponse(
        names=list(req.names),
        table_md=render_compare_md(cr),
        recommendation=cr.recommendation,
        phones=[
            {"key": p.key, "name": p.name, "brand": p.brand,
             "price_min": p.price_min, "price_max": p.price_max}
            for p in cr.phones
        ],
    )


def run_price(req: PriceRequest, *, session: Session, log: BoundLogger) -> PriceResponse:
    log.info("price lookup: %s", req.name)
    pr = price_check(req.name, session=session)
    return PriceResponse(
        name=f"{pr.brand} {pr.name}",
        phone_id=pr.phone_id,
        price_min=pr.price_range.min_price,
        price_max=pr.price_range.max_price,
        discount_pct=pr.price_range.spread_pct,
        store_count=len(pr.offers),
        in_stock_count=pr.in_stock_count,
        offers=[
            StoreOfferOut(
                store=o.store_name,
                price=o.price,
                url=o.store_url,
                in_stock=o.in_stock,
            )
            for o in pr.offers[: req.limit]
        ],
    )


def run_chat(
    req: ChatRequest,
    *,
    session: Session,
    search_engine: SearchEngine,
    log: BoundLogger,
    request_id: str,
) -> tuple[str, str]:
    """End-to-end /chat: classify → plan → dispatch → compose."""
    classifier = get_default_classifier()
    extracted = classifier.classify(req.message)
    intent = IntentType(extracted.intent) if not isinstance(extracted.intent, IntentType) \
        else extracted.intent
    log.info("classified intent=%s confidence=%s",
             intent.value, getattr(extracted, "confidence", None))

    p = plan(req.message, intent, top_k=req.top_k)
    dispatched = dispatch(req.message, p, session=session, search_engine=search_engine)
    answer = compose_final_answer(req.message, intent, dispatched)
    return answer, intent.value