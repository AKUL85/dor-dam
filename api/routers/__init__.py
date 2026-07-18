"""FastAPI routers.

Each module exposes an ``APIRouter`` named ``router``. ``api/main``
mounts them under ``/chat``, ``/recommend``, ``/compare``, ``/price``,
``/search``, ``/update``.
"""

from .chat import router as chat_router
from .recommend import router as recommend_router
from .compare import router as compare_router
from .price import router as price_router
from .search import router as search_router
from .update import router as update_router

__all__ = [
    "chat_router",
    "recommend_router",
    "compare_router",
    "price_router",
    "search_router",
    "update_router",
]