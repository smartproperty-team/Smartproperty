# ===========================================
# SmartProperty AI - Recommendations Tests
# ===========================================

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


class TestRecommendations:
    """Test recommendation endpoints."""
    
    def test_get_user_recommendations(self):
        """Test getting recommendations for a user."""
        response = client.get("/api/v1/recommendations/user/test_user_123")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "recommendations" in data
        assert "total_count" in data
        assert "algorithm" in data
    
    def test_get_recommendations_with_limit(self):
        """Test recommendations with custom limit."""
        response = client.get(
            "/api/v1/recommendations/user/test_user_123",
            params={"limit": 5}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["recommendations"]) <= 5
    
    def test_get_recommendations_by_preferences(self):
        """Test getting recommendations by preferences."""
        preferences = {
            "property_types": ["apartment", "condo"],
            "min_price": 1000,
            "max_price": 2000,
            "min_bedrooms": 2,
            "preferred_locations": ["Downtown"],
            "pet_friendly": True
        }
        
        response = client.post(
            "/api/v1/recommendations/preferences",
            json=preferences
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "recommendations" in data
    
    def test_get_similar_properties(self):
        """Test finding similar properties."""
        response = client.post(
            "/api/v1/recommendations/similar",
            json={
                "property_id": "prop_test_123",
                "limit": 5
            }
        )
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_model_status(self):
        """Test model status endpoint."""
        response = client.get("/api/v1/recommendations/model/status")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "model_version" in data
        assert "status" in data
