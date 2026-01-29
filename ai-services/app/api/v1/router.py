# ===========================================
# SmartProperty AI Services - API Router
# ===========================================

from fastapi import APIRouter

from app.api.v1.endpoints import (
    recommendations,
    pricing,
    image_analysis,
    search,
    analytics,
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    recommendations.router,
    prefix="/recommendations",
    tags=["Recommendations"],
)

api_router.include_router(
    pricing.router,
    prefix="/pricing",
    tags=["Price Prediction"],
)

api_router.include_router(
    image_analysis.router,
    prefix="/images",
    tags=["Image Analysis"],
)

api_router.include_router(
    search.router,
    prefix="/search",
    tags=["Smart Search"],
)

api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["Market Analytics"],
)
