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

    def _run() -> tuple[str, str, ChatEngineTrace, dict]:
        answer, intent_value, extracted, dispatched = run_chat(
            payload,
            session=session,
            search_engine=get_search_engine(),
            log=log,
            request_id=request_id,
        )

        sql_ctx = dispatched.sql_context or ""
        vec_ctx = dispatched.vector_context or ""

        extracted_dict = extracted.to_dict() if hasattr(extracted, "to_dict") else {
            "intent": getattr(extracted, "intent", intent_value),
            "brand": getattr(extracted, "brand", None),
            "budget": getattr(extracted, "budget", None),
            "budget_min": getattr(extracted, "budget_min", None),
            "priority": getattr(extracted, "priority", None),
            "spec_fields": getattr(extracted, "spec_fields", []),
            "models": getattr(extracted, "models", []),
        }

        trace = ChatEngineTrace(
            intent=intent_value,
            engines_called=dispatched.engines_called,
            extracted_entities=extracted_dict,
            sql_context=sql_ctx[:1200],
            vector_context=vec_ctx[:1200],
            prompt_tokens_estimate=(len(sql_ctx) + len(vec_ctx)) // 4,
        )
        return answer, intent_value, trace, extracted_dict

    answer, intent_value, trace, extracted_dict = await run_in_threadpool(_run)
    log.info("chat intent=%s answer_chars=%d", intent_value, len(answer))
    return ChatResponse(
        answer=answer,
        intent=intent_value,
        request_id=request_id,
        trace=trace,
        extracted_entities=extracted_dict,
    )