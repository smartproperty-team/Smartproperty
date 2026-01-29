# ===========================================
# SmartProperty AI Services - Main Application
# ===========================================

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.api.v1.router import api_router
from app.core.database import connect_to_mongo, close_mongo_connection
from app.core.redis import connect_to_redis, close_redis_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("🚀 Starting SmartProperty AI Services...")
    await connect_to_mongo()
    await connect_to_redis()
    logger.info(f"✅ AI Services running on http://{settings.host}:{settings.port}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down SmartProperty AI Services...")
    await close_mongo_connection()
    await close_redis_connection()
    logger.info("👋 Goodbye!")


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    
    app = FastAPI(
        title=settings.app_name,
        description="""
## SmartProperty AI Services

AI-powered features for the SmartProperty platform:

- 🏠 **Property Recommendations** - ML-based property matching
- 💰 **Price Prediction** - Rental price estimation
- 🖼️ **Image Analysis** - Property image classification
- 🔍 **Smart Search** - NLP-powered search
- 📊 **Market Analytics** - Trend analysis and insights
        """,
        version="1.0.0",
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
        openapi_url=f"{settings.api_prefix}/openapi.json",
        lifespan=lifespan,
    )
    
    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include API router
    app.include_router(api_router, prefix=settings.api_prefix)
    
    return app


app = create_application()


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "environment": settings.app_env,
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
