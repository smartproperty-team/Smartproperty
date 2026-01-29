# ===========================================
# SmartProperty AI Services - MongoDB Connection
# ===========================================

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from loguru import logger

from app.core.config import settings


class MongoDB:
    """MongoDB connection manager."""
    
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None


mongodb = MongoDB()


async def connect_to_mongo():
    """Connect to MongoDB."""
    try:
        logger.info(f"Connecting to MongoDB...")
        mongodb.client = AsyncIOMotorClient(settings.mongodb_uri)
        mongodb.db = mongodb.client[settings.mongodb_db_name]
        
        # Verify connection
        await mongodb.client.admin.command("ping")
        logger.info(f"✅ Connected to MongoDB: {settings.mongodb_db_name}")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection."""
    if mongodb.client:
        mongodb.client.close()
        logger.info("Closed MongoDB connection")


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance."""
    return mongodb.db


def get_collection(collection_name: str):
    """Get a specific collection."""
    return mongodb.db[collection_name]
