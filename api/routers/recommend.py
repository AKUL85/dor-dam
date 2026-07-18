"""POST /recommend — structured + fallback recommendation engine."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..deps import (
    BoundLogger,
    get_request_logger,
    get_search_engine,
    get_session,
)
from ..schemas import RecommendRequest, RecommendResponse
from ..services import run_recommend

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.post("", response_model=RecommendResponse)
async def post_recommend(
    payload: RecommendRequest,
    session: Session = Depends(get_session),
    log: BoundLogger = Depends(get_request_logger),
) -> RecommendResponse:
    log.info(
        "recommend query=%r budget=%s priority=%s limit=%d",
        payload.query, payload.budget, payload.priority, payload.limit,
    )
    engine = get_search_engine()
    response = run_recommend(
        payload,
        session=session,
        search_engine=engine,
        log=log,
    )
    log.info("recommend returned %d items", response.count)
    return response