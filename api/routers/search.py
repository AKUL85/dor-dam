"""POST /search — semantic search over the phone catalog."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..deps import BoundLogger, get_request_logger, get_search_engine, get_session
from ..schemas import SearchRequest, SearchResponse
from ..services import run_search

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def post_search(
    payload: SearchRequest,
    log: BoundLogger = Depends(get_request_logger),
    _session: Session = Depends(get_session),  # ensures DB readiness
) -> SearchResponse:
    log.info("search query=%r top_k=%d", payload.query, payload.top_k)
    engine = get_search_engine()
    response = run_search(payload, search_engine=engine)
    log.info("search returned %d hits (candidates=%d)",
             len(response.hits), response.candidates)
    return response