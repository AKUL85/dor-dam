"""Request and response models for the dordam API.

These wrap the existing engine dataclasses (``RecommendationQuery``,
``PricingQuery``, ``SearchEngine.search`` kwargs, etc.) so the wire
format stays decoupled from the internal engine schemas.

Validation is handled by Pydantic v2 — endpoints only see validated
input. ``Field(..., ge=...)`` / ``le=...`` enforce numeric ranges;
``min_length`` / ``max_length`` enforce text limits.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ──────────────────────────────────────────────────────────────────────
# Shared
# ──────────────────────────────────────────────────────────────────────

class StrictModel(BaseModel):
    """Strip unknown fields, accept camelCase aliases."""

    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class ErrorResponse(StrictModel):
    error: str
    detail: Optional[str] = None
    request_id: Optional[str] = None


class HealthResponse(StrictModel):
    status: str = "ok"
    db: str
    search_corpus: int


# ──────────────────────────────────────────────────────────────────────
# /search
# ──────────────────────────────────────────────────────────────────────

class SearchRequest(StrictModel):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(5, ge=1, le=20)
    rerank_candidates: int = Field(25, ge=5, le=200)
    alpha: float = Field(0.5, ge=0.0, le=1.0)
    where: dict[str, Any] = Field(default_factory=dict)
    where_expr: dict[str, dict[str, Any]] = Field(default_factory=dict)

    @field_validator("query")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query must not be blank")
        return v


class SearchHitOut(StrictModel):
    rank: int
    id: str
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    in_stock_count: Optional[int] = None
    store_count: Optional[int] = None
    score: float
    cosine_score: float
    bm25_score: float
    snippet: str


class SearchResponse(StrictModel):
    query: str
    top_k: int
    candidates: int
    hits: list[SearchHitOut]


# ──────────────────────────────────────────────────────────────────────
# /recommend
# ──────────────────────────────────────────────────────────────────────

class RecommendRequest(StrictModel):
    query: str = Field(..., min_length=1, max_length=500)
    budget: Optional[float] = Field(None, ge=0, le=10_000_000)
    budget_min: Optional[float] = Field(None, ge=0, le=10_000_000)
    priority: Optional[str] = Field(
        None,
        pattern="^(camera|gaming|battery|performance|display|charging|value)$",
    )
    brand: Optional[str] = Field(None, max_length=80)
    brands: list[str] = Field(default_factory=list, max_length=20)
    limit: int = Field(5, ge=1, le=20)
    use_vector_fallback: bool = True

    @field_validator("budget_min")
    @classmethod
    def _budget_range(cls, v: Optional[float], info) -> Optional[float]:
        budget = info.data.get("budget")
        if v is not None and budget is not None and v > budget:
            raise ValueError("budget_min must be <= budget")
        return v


class RecommendItem(StrictModel):
    rank: int
    phone_id: int
    name: str
    brand: str
    category: Optional[str] = None
    score: float
    score_breakdown: dict[str, float] = Field(default_factory=dict)
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    reason: str
    vector_hits: list[SearchHitOut] = Field(default_factory=list)


class RecommendResponse(StrictModel):
    query: str
    count: int
    items: list[RecommendItem]


# ──────────────────────────────────────────────────────────────────────
# /compare
# ──────────────────────────────────────────────────────────────────────

class CompareRequest(StrictModel):
    names: list[str] = Field(..., min_length=2, max_length=6)
    dimensions: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("names", mode="before")
    @classmethod
    def _unique(cls, v: list[str]) -> list[str]:
        seen: list[str] = []
        for n in v:
            n = (n or "").strip()
            if not n:
                raise ValueError("names must not contain blank entries")
            if n.lower() not in {s.lower() for s in seen}:
                seen.append(n)
        return seen


class CompareResponse(StrictModel):
    names: list[str]
    table_md: str
    recommendation: Optional[str] = None
    phones: list[dict[str, Any]] = Field(default_factory=list)


# ──────────────────────────────────────────────────────────────────────
# /price
# ──────────────────────────────────────────────────────────────────────

class PriceRequest(StrictModel):
    name: str = Field(..., min_length=1, max_length=200)
    include_out_of_stock: bool = False
    limit: int = Field(20, ge=1, le=100)


class StoreOfferOut(StrictModel):
    store: str
    price: float
    url: Optional[str] = None
    in_stock: bool


class PriceResponse(StrictModel):
    name: str
    phone_id: Optional[int] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    discount_pct: Optional[float] = None
    store_count: int
    in_stock_count: int
    offers: list[StoreOfferOut]


# ──────────────────────────────────────────────────────────────────────
# /update
# ──────────────────────────────────────────────────────────────────────

class UpdateRequest(StrictModel):
    """Trigger an out-of-band scrape + re-index."""

    stores: list[str] = Field(default_factory=list, max_length=20)
    reindex: bool = True
    dry_run: bool = False


class UpdateResponse(StrictModel):
    started: bool
    dry_run: bool
    stores: list[str]
    reindex: bool
    job_id: str
    detail: Optional[dict[str, Any]] = None


# ──────────────────────────────────────────────────────────────────────
# /chat
# ──────────────────────────────────────────────────────────────────────

class ChatMessage(StrictModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=8000)


class ChatRequest(StrictModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)
    stream: bool = False
    top_k: int = Field(5, ge=1, le=10)


class ChatEngineTrace(StrictModel):
    intent: str
    engines_called: list[str]
    extracted_entities: dict[str, Any] = Field(default_factory=dict)
    sql_context: str
    vector_context: str
    prompt_tokens_estimate: int


class ChatResponse(StrictModel):
    answer: str
    intent: str
    request_id: str
    trace: Optional[ChatEngineTrace] = None
    extracted_entities: dict[str, Any] = Field(default_factory=dict)