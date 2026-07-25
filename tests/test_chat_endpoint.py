"""
tests/test_chat_endpoint.py
===========================
End-to-end integration tests for the /chat pipeline.
Flow: Query → Intent → Entities → Router → Retrieval Engine → LLM/Composition → Structured Response
"""

import sys
from pathlib import Path

# Add workspace root, scripts, and api to python path
ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
API_DIR = ROOT_DIR / "api"
for d in [str(SCRIPTS_DIR), str(ROOT_DIR), str(API_DIR)]:
    if d not in sys.path:
        sys.path.insert(0, d)

import pytest
from api.schemas import ChatRequest, ChatResponse
from api.services import run_chat


class MockSearchEngine:
    """Mock SearchEngine for testing the chat endpoint without loading ChromaDB."""

    def search(self, query: str, top_k: int = 5, **kwargs):
        class Hit:
            rank = 1
            id = "phone_001"
            name = "Samsung Galaxy S25 Ultra"
            brand = "Samsung"
            category = "Flagship"
            score = 0.95
            cosine_score = 0.90
            bm25_score = 10.0
            snippet = "Sample snippet for Samsung Galaxy S25 Ultra"
            metadata = {}

        class SearchResult:
            pass

        res = SearchResult()
        res.query = query
        res.top_k = top_k
        res.candidates = 1
        res.hits = [Hit()]
        return res


class TestChatPipeline:
    """End-to-end test suite for the /chat request flow."""

    def test_run_chat_end_to_end_flow(self):
        req = ChatRequest(message="Best gaming phone under 100000 taka", top_k=3)
        mock_log = type("Log", (), {"info": lambda *a, **k: None})()
        mock_search = MockSearchEngine()

        # We pass session=None since recommend_eng and filter logic handle offline fallback or mock
        from db.session import session_scope
        with session_scope() as session:
            answer, intent_val, extracted, dispatched = run_chat(
                req,
                session=session,
                search_engine=mock_search,
                log=mock_log,
                request_id="test-req-123",
            )

        assert isinstance(answer, str) and len(answer) > 0
        assert intent_val in ["recommendation", "buying_guide", "general", "specification"]
        assert hasattr(extracted, "intent")
        assert hasattr(extracted, "priority") or hasattr(extracted, "budget")
        assert len(dispatched.engines_called) > 0
