# ===========================================
# SmartProperty AI - Health Check Tests
# ===========================================

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "environment" in data


def test_api_docs_available():
    """Test that API docs are accessible."""
    response = client.get("/api/v1/docs")
    
    assert response.status_code == 200


def test_openapi_schema():
    """Test OpenAPI schema is available."""
    response = client.get("/api/v1/openapi.json")
    
    assert response.status_code == 200
    
    data = response.json()
    assert "openapi" in data
    assert "info" in data
    assert "paths" in data
