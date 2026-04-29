# ===========================================
# SmartProperty AI Services - API Router
# ===========================================

from importlib import import_module

from fastapi import APIRouter
from loguru import logger

api_router = APIRouter()

_ENDPOINTS = [
    ("recommendations", "/recommendations", ["Recommendations"]),
    ("pricing", "/pricing", ["Price Prediction"]),
    ("image_analysis", "/images", ["Image Analysis"]),
    ("search", "/search", ["Smart Search"]),
    ("analytics", "/analytics", ["Market Analytics"]),
    ("marketing", "/marketing", ["Marketing & Distribution"]),
    ("virtual_tour", "/virtual-tour", ["Virtual Tour"]),
    ("staging", "/staging", ["Virtual Staging"]),
]

# Load endpoint routers defensively so core features can still boot
# when optional ML dependencies are unavailable in local dev.
for module_name, prefix, tags in _ENDPOINTS:
    try:
        module = import_module(f"app.api.v1.endpoints.{module_name}")
        api_router.include_router(module.router, prefix=prefix, tags=tags)
    except Exception as exc:  # pragma: no cover - startup resilience
        logger.warning(
            "Skipping endpoint module '{}' due to import error: {}",
            module_name,
            exc,
        )
