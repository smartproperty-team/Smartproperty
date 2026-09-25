# ===========================================
# SmartProperty AI - Health Check Tests
# ===========================================

from fastapi.testclient import TestClient

from app.core.config import settings
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


def test_api_docs_follow_debug_setting():
    """Docs are served only when debug is enabled.

    They expose the full endpoint surface, so they must be absent in a
    production configuration (debug=False, the default).
    """
    response = client.get("/api/v1/docs")

    if settings.debug:
        assert response.status_code == 200
    else:
        assert response.status_code == 404


def test_openapi_schema_follows_debug_setting():
    """The OpenAPI schema is gated the same way as the docs UI."""
    response = client.get("/api/v1/openapi.json")

    if not settings.debug:
        assert response.status_code == 404
        return

    assert response.status_code == 200

    data = response.json()
    assert "openapi" in data
    assert "info" in data
    assert "paths" in data
