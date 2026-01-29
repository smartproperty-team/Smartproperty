# ===========================================
# SmartProperty AI - Recommendation Service
# ===========================================

from typing import List, Optional
import numpy as np
from loguru import logger

from app.core.database import get_collection
from app.core.redis import cache_get, cache_set


class RecommendationService:
    """
    Property recommendation service using collaborative and content-based filtering.
    """
    
    def __init__(self):
        self.model = None
        self.is_trained = False
    
    async def get_user_recommendations(
        self,
        user_id: str,
        limit: int = 10,
        include_viewed: bool = False,
    ) -> List[dict]:
        """
        Get personalized recommendations for a user.
        
        Uses:
        1. User's explicit preferences
        2. User's viewing history
        3. Similar users' preferences (collaborative filtering)
        4. Property features (content-based filtering)
        """
        # Check cache first
        cache_key = f"recommendations:{user_id}:{limit}"
        cached = await cache_get(cache_key)
        if cached:
            return cached
        
        # Get user profile and preferences
        user_profile = await self._get_user_profile(user_id)
        
        # Get user's interaction history
        interactions = await self._get_user_interactions(user_id)
        
        # Get candidate properties
        properties = await self._get_candidate_properties(
            user_profile,
            exclude_viewed=not include_viewed,
            viewed_ids=interactions.get("viewed", [])
        )
        
        # Score and rank properties
        scored_properties = await self._score_properties(
            user_profile,
            interactions,
            properties
        )
        
        # Get top recommendations
        recommendations = sorted(
            scored_properties,
            key=lambda x: x["score"],
            reverse=True
        )[:limit]
        
        # Cache results
        await cache_set(cache_key, recommendations, expire=3600)
        
        return recommendations
    
    async def get_similar_properties(
        self,
        property_id: str,
        limit: int = 10,
    ) -> List[dict]:
        """
        Find properties similar to a given property.
        
        Uses content-based similarity on:
        - Property type
        - Price range
        - Location
        - Features and amenities
        - Size (bedrooms, bathrooms, area)
        """
        # Get the reference property
        properties_col = get_collection("properties")
        reference = await properties_col.find_one({"_id": property_id})
        
        if not reference:
            return []
        
        # Find similar properties
        similar = await properties_col.find({
            "_id": {"$ne": property_id},
            "status": "available",
            "type": reference.get("type"),
            "price": {
                "$gte": reference.get("price", 0) * 0.7,
                "$lte": reference.get("price", 0) * 1.3
            }
        }).limit(limit * 3).to_list(length=limit * 3)
        
        # Calculate similarity scores
        scored = []
        for prop in similar:
            score = self._calculate_similarity(reference, prop)
            scored.append({
                "property_id": str(prop["_id"]),
                "score": score,
                "property": prop
            })
        
        # Sort by similarity
        scored.sort(key=lambda x: x["score"], reverse=True)
        
        return scored[:limit]
    
    def _calculate_similarity(self, prop1: dict, prop2: dict) -> float:
        """Calculate cosine similarity between two properties."""
        # Feature vector extraction
        features1 = self._extract_features(prop1)
        features2 = self._extract_features(prop2)
        
        # Cosine similarity
        dot_product = np.dot(features1, features2)
        norm1 = np.linalg.norm(features1)
        norm2 = np.linalg.norm(features2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
    
    def _extract_features(self, prop: dict) -> np.ndarray:
        """Extract numerical feature vector from property."""
        features = prop.get("features", {})
        
        return np.array([
            features.get("bedrooms", 0) / 10,
            features.get("bathrooms", 0) / 5,
            features.get("area", 0) / 5000,
            prop.get("price", 0) / 10000,
            1.0 if features.get("furnished") else 0.0,
            1.0 if features.get("petFriendly") else 0.0,
            len(features.get("amenities", [])) / 20,
        ])
    
    async def _get_user_profile(self, user_id: str) -> dict:
        """Get user profile with preferences."""
        profiles_col = get_collection("user_profiles")
        profile = await profiles_col.find_one({"userId": user_id})
        return profile or {}
    
    async def _get_user_interactions(self, user_id: str) -> dict:
        """Get user's interaction history."""
        # TODO: Implement interaction tracking
        return {
            "viewed": [],
            "favorited": [],
            "applied": [],
        }
    
    async def _get_candidate_properties(
        self,
        user_profile: dict,
        exclude_viewed: bool = True,
        viewed_ids: List[str] = None,
    ) -> List[dict]:
        """Get candidate properties based on user preferences."""
        properties_col = get_collection("properties")
        
        query = {"status": "available"}
        
        # Apply user preferences
        preferences = user_profile.get("preferences", {})
        
        if preferences.get("propertyTypes"):
            query["type"] = {"$in": preferences["propertyTypes"]}
        
        if preferences.get("maxBudget"):
            query["price"] = {"$lte": preferences["maxBudget"]}
        
        if preferences.get("minBudget"):
            query.setdefault("price", {})["$gte"] = preferences["minBudget"]
        
        if exclude_viewed and viewed_ids:
            query["_id"] = {"$nin": viewed_ids}
        
        # Get properties
        properties = await properties_col.find(query).limit(100).to_list(length=100)
        
        return properties
    
    async def _score_properties(
        self,
        user_profile: dict,
        interactions: dict,
        properties: List[dict],
    ) -> List[dict]:
        """Score properties based on user preferences."""
        scored = []
        preferences = user_profile.get("preferences", {})
        
        for prop in properties:
            score = 0.5  # Base score
            reasons = []
            
            # Price match
            price = prop.get("price", 0)
            max_budget = preferences.get("maxBudget", float("inf"))
            if price <= max_budget * 0.8:
                score += 0.2
                reasons.append("Within your budget")
            
            # Type match
            if prop.get("type") in preferences.get("propertyTypes", []):
                score += 0.15
                reasons.append("Preferred property type")
            
            # Location match
            city = prop.get("address", {}).get("city", "")
            if city in preferences.get("preferredLocations", []):
                score += 0.15
                reasons.append("In your preferred location")
            
            scored.append({
                "property_id": str(prop["_id"]),
                "score": min(score, 1.0),
                "match_reasons": reasons,
                "property": prop,
            })
        
        return scored
    
    async def train_model(self):
        """Train the recommendation model."""
        logger.info("Starting recommendation model training...")
        
        # TODO: Implement actual model training
        # 1. Load user interactions
        # 2. Build user-item matrix
        # 3. Train collaborative filtering model
        # 4. Save model
        
        self.is_trained = True
        logger.info("Recommendation model training completed")


# Singleton instance
recommendation_service = RecommendationService()
