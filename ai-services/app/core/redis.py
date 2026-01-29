# ===========================================
# SmartProperty AI Services - Redis Connection
# ===========================================

import redis.asyncio as redis
from loguru import logger

from app.core.config import settings


class RedisClient:
    """Redis connection manager."""
    
    client: redis.Redis = None


redis_client = RedisClient()


async def connect_to_redis():
    """Connect to Redis."""
    try:
        logger.info("Connecting to Redis...")
        redis_client.client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            password=settings.redis_password if settings.redis_password else None,
            db=settings.redis_db,
            decode_responses=True,
        )
        
        # Verify connection
        await redis_client.client.ping()
        logger.info(f"✅ Connected to Redis: {settings.redis_host}:{settings.redis_port}")
    except Exception as e:
        logger.error(f"❌ Failed to connect to Redis: {e}")
        # Don't raise - Redis is optional for some features
        redis_client.client = None


async def close_redis_connection():
    """Close Redis connection."""
    if redis_client.client:
        await redis_client.client.close()
        logger.info("Closed Redis connection")


def get_redis() -> redis.Redis:
    """Get Redis client instance."""
    return redis_client.client


async def cache_get(key: str) -> str | None:
    """Get value from cache."""
    if redis_client.client:
        return await redis_client.client.get(key)
    return None


async def cache_set(key: str, value: str, expire: int = 3600) -> bool:
    """Set value in cache with expiration."""
    if redis_client.client:
        await redis_client.client.set(key, value, ex=expire)
        return True
    return False


async def cache_delete(key: str) -> bool:
    """Delete key from cache."""
    if redis_client.client:
        await redis_client.client.delete(key)
        return True
    return False
