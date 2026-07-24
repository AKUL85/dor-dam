"""POST /compare — head-to-head phone comparison."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import BoundLogger, get_request_logger, get_session
from ..schemas import CompareRequest, CompareResponse
from ..services import run_compare

router = APIRouter(prefix="/compare", tags=["compare"])


@router.post("", response_model=CompareResponse)
async def post_compare(
    payload: CompareRequest,
    session: Session = Depends(get_session),
    log: BoundLogger = Depends(get_request_logger),
) -> CompareResponse:
    log.info("compare %d phones: %s", len(payload.names), payload.names)
    try:
        response = run_compare(payload, session=session, log=log)
    except LookupError as exc:
        log.warning("compare: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    log.info("compare rendered %d rows", len(response.phones))
    return response