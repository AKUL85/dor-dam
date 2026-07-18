"""POST /price — store + price discovery for a single phone."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import BoundLogger, get_request_logger, get_session
from ..schemas import PriceRequest, PriceResponse
from ..services import run_price

router = APIRouter(prefix="/price", tags=["price"])


@router.post("", response_model=PriceResponse)
async def post_price(
    payload: PriceRequest,
    session: Session = Depends(get_session),
    log: BoundLogger = Depends(get_request_logger),
) -> PriceResponse:
    log.info("price: %s", payload.name)
    try:
        response = run_price(payload, session=session, log=log)
    except LookupError as exc:
        log.warning("price: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    log.info("price: %d offers (%d in stock)",
             len(response.offers), response.in_stock_count)
    return response