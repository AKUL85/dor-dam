"""POST /chat — end-to-end pipeline.

Classify → plan → dispatch engines → merge → final answer.

The endpoint is async; engine work is wrapped in
:func:`fastapi.concurrency.run_in_threadpool` so the event loop stays
free even when the SQL/Chroma calls block.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from ..deps import (
    BoundLogger,
    get_request_id,
    get_request_logger,
    get_search_engine,
    get_session,
)
from ..schemas import ChatEngineTrace, ChatRequest, ChatResponse
from ..services import dispatch, plan, run_chat

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def post_chat(
    payload: ChatRequest,
    session: Session = Depends(get_session),
    log: BoundLogger = Depends(get_request_logger),
    request_id: str = Depends(get_request_id),
) -> ChatResponse:
    log.info(
        "chat intent_request=%r top_k=%d",
        payload.message, payload.top_k,
    )

    def _run() -> tuple[str, str, ChatEngineTrace]:
        answer, intent_value = run_chat(
            payload,
            session=session,
            search_engine=get_search_engine(),
            log=log,
            request_id=request_id,
        )
        # Build a small trace so callers can see what the orchestrator did.
        p = plan(payload.message, intent_value, top_k=payload.top_k)
        dispatched = dispatch(payload.message, p, session=session,
                              search_engine=get_search_engine())
        sql_ctx = dispatched.sql_context or ""
        vec_ctx = dispatched.vector_context or ""
        return answer, intent_value, ChatEngineTrace(
            intent=intent_value,
            engines_called=dispatched.engines_called,
            sql_context=sql_ctx[:1200],
            vector_context=vec_ctx[:1200],
            prompt_tokens_estimate=(len(sql_ctx) + len(vec_ctx)) // 4,
        )

    answer, intent_value, trace = await run_in_threadpool(_run)
    log.info("chat intent=%s answer_chars=%d", intent_value, len(answer))
    return ChatResponse(
        answer=answer,
        intent=intent_value,
        request_id=request_id,
        trace=trace,
    )