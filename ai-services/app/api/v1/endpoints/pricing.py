# ===========================================
# SmartProperty AI - Tunisia Price Prediction
# ===========================================

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.pricing_service import price_service

router = APIRouter()


# ===========================================
# Request / Response Models
# ===========================================

class TunisiaPropertyFeatures(BaseModel):
    """Property features for Tunisian rental price prediction."""

    property_type: str = Field(
        default="apartment",
        description="apartment, house, condo, studio, villa, land",
    )
    city: str = Field(description="Tunisian city / delegation name")
    governorate: Optional[str] = None
    area_sqm: float = Field(ge=10, description="Area in square metres")
    bedrooms: int = Field(default=1, ge=0)
    bathrooms: int = Field(default=1, ge=0)
    parking_spaces: int = Field(default=0, ge=0)
    furnished: bool = False
    pet_friendly: bool = False
    amenities: List[str] = Field(default_factory=list)


class PriceFactor(BaseModel):
    factor: str
    impact: str
    direction: str
    description: str


class PricePrediction(BaseModel):
    predicted_price: float
    rental_price: float
    sale_price: float
    currency: str = "TND"
    confidence: float = Field(ge=0, le=1)
    price_range: Dict[str, float]
    sale_price_range: Dict[str, float]
    base_rate_per_sqm: float
    method: str
    factors: List[PriceFactor]


# ===========================================
# Endpoints
# ===========================================

@router.post("/predict", response_model=PricePrediction)
async def predict_price(features: TunisiaPropertyFeatures):
    """
    Predict monthly rental price in TND for a Tunisian property.

    Uses a GradientBoosting model trained on real Tayara data
    blended with synthetic samples, plus a rule-based fallback.
    """
    result = price_service.predict_price(features.model_dump())
    return PricePrediction(**result)


@router.get("/cities")
async def list_supported_cities():
    """Return the list of Tunisian cities with known pricing data."""
    return {"cities": price_service.get_supported_cities()}


@router.post("/train")
async def trigger_training():
    """Re-train the pricing model (admin use)."""
    result = price_service.train()
    return result


@router.get("/status")
async def model_status():
    """Check whether the ML model is loaded."""
    return {
        "model_loaded": price_service.is_loaded,
        "supported_cities": len(price_service.get_supported_cities()),
    }
