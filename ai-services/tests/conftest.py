# ===========================================
# SmartProperty AI - Pytest Configuration
# ===========================================

import pytest
import asyncio
from typing import Generator

from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.main import app


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client() -> Generator:
    """Create a test client."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
async def async_client() -> AsyncClient:
    """Create an async test client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
