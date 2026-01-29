# ===========================================
# SmartProperty AI - Price Prediction Tests
# ===========================================

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


class TestPricePrediction:
    """Test price prediction endpoints."""
    
    def test_predict_price(self):
        """Test price prediction for a property."""
        features = {
            "property_type": "apartment",
            "city": "New York",
            "state": "NY",
            "bedrooms": 2,
            "bathrooms": 1,
            "area_sqft": 850,
            "parking_spaces": 1,
            "furnished": True,
            "pet_friendly": False,
            "amenities": ["gym", "pool", "doorman"]
        }
        
        response = client.post(
            "/api/v1/pricing/predict",
            json=features
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "predicted_price" in data
        assert "confidence" in data
        assert "price_range" in data
        assert "low" in data["price_range"]
        assert "high" in data["price_range"]
        assert "factors" in data
        
        # Price should be positive
        assert data["predicted_price"] > 0
        
        # Confidence should be between 0 and 1
        assert 0 <= data["confidence"] <= 1
    
    def test_predict_price_minimal_features(self):
        """Test prediction with minimal features."""
        features = {
            "property_type": "studio",
            "city": "Boston",
            "bedrooms": 0,
            "bathrooms": 1,
            "area_sqft": 400
        }
        
        response = client.post(
            "/api/v1/pricing/predict",
            json=features
        )
        
        assert response.status_code == 200
        assert response.json()["predicted_price"] > 0
    
    def test_bulk_predict(self):
        """Test bulk price prediction."""
        properties = [
            {
                "property_type": "apartment",
                "city": "New York",
                "bedrooms": 1,
                "bathrooms": 1,
                "area_sqft": 600
            },
            {
                "property_type": "house",
                "city": "Los Angeles",
                "bedrooms": 3,
                "bathrooms": 2,
                "area_sqft": 1500
            }
        ]
        
        response = client.post(
            "/api/v1/pricing/bulk-predict",
            json=properties
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "predictions" in data
        assert len(data["predictions"]) == 2
    
    def test_get_market_analysis(self):
        """Test market analysis endpoint."""
        response = client.get("/api/v1/pricing/market/New York")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "location" in data
        assert "current_average" in data
    
    def test_get_price_factors(self):
        """Test getting price factors."""
        response = client.get("/api/v1/pricing/factors")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "factors" in data
        assert len(data["factors"]) > 0
