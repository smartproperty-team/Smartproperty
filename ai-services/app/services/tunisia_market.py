# ===========================================
# SmartProperty AI - Tunisia Market Data
# ===========================================
#
# Hand-curated TND/m² rates for Tunisian cities,
# with calibration hooks so the dataset_loader can
# override them with measured medians from real data.
# ===========================================

from typing import Dict, Optional
from loguru import logger

# -------------------------------------------------
# Hand-curated base rates  (TND / m² / month)
# Source: local market knowledge, 2024-25 averages
# -------------------------------------------------

CITY_RATES: Dict[str, float] = {
    # Greater Tunis
    "tunis": 28.0,
    "la marsa": 38.0,
    "carthage": 42.0,
    "sidi bou said": 45.0,
    "les berges du lac": 40.0,
    "lac 1": 40.0,
    "lac 2": 36.0,
    "ariana": 22.0,
    "manouba": 18.0,
    "ben arous": 20.0,
    "el manar": 30.0,
    "ennasr": 26.0,
    "el menzah": 28.0,
    "mutuelleville": 32.0,
    "soukra": 24.0,
    "marsa ville": 36.0,
    "gammarth": 35.0,

    # Cap Bon
    "hammamet": 30.0,
    "nabeul": 20.0,
    "kelibia": 18.0,
    "korba": 16.0,

    # Sahel
    "sousse": 22.0,
    "monastir": 20.0,
    "mahdia": 16.0,
    "msaken": 14.0,

    # Sfax
    "sfax": 16.0,

    # South
    "djerba": 22.0,
    "gabes": 12.0,
    "tozeur": 10.0,
    "douz": 8.0,

    # North-West
    "bizerte": 14.0,
    "tabarka": 12.0,
    "beja": 10.0,
    "jendouba": 8.0,

    # Central
    "kairouan": 10.0,
    "kasserine": 8.0,
    "sidi bouzid": 8.0,
    "gafsa": 9.0,

    # Other
    "medenine": 10.0,
    "tataouine": 8.0,
    "zaghouan": 12.0,
    "siliana": 8.0,
    "kef": 8.0,
}

DEFAULT_RATE = 15.0  # fallback for unknown cities

# -------------------------------------------------
# Calibrated rates (populated at boot from dataset)
# -------------------------------------------------

CALIBRATED_DELEGATION_RATE: Dict[str, float] = {}
CALIBRATED_GOVERNORATE_RATE: Dict[str, float] = {}


def apply_calibration(
    delegation_rates: Dict[str, float],
    governorate_rates: Dict[str, float],
) -> None:
    """Install measured TND/m² medians from real data."""
    global CALIBRATED_DELEGATION_RATE, CALIBRATED_GOVERNORATE_RATE
    CALIBRATED_DELEGATION_RATE = {k.lower(): v for k, v in delegation_rates.items()}
    CALIBRATED_GOVERNORATE_RATE = {k.lower(): v for k, v in governorate_rates.items()}
    logger.info(
        f"Calibration applied: {len(CALIBRATED_DELEGATION_RATE)} delegations, "
        f"{len(CALIBRATED_GOVERNORATE_RATE)} governorates"
    )


def city_rate(city: str, governorate: Optional[str] = None) -> float:
    """
    Look up TND/m² for a city with priority:
      1. calibrated delegation rate (from real data)
      2. calibrated governorate rate
      3. hand-curated city rate
      4. DEFAULT_RATE
    """
    key = city.strip().lower()

    if key in CALIBRATED_DELEGATION_RATE:
        return CALIBRATED_DELEGATION_RATE[key]

    if governorate:
        gov_key = governorate.strip().lower()
        if gov_key in CALIBRATED_GOVERNORATE_RATE:
            return CALIBRATED_GOVERNORATE_RATE[gov_key]

    if key in CITY_RATES:
        return CITY_RATES[key]

    return DEFAULT_RATE


# -------------------------------------------------
# Property-type multipliers  (relative to apartment)
# -------------------------------------------------

TYPE_MULTIPLIER: Dict[str, float] = {
    "apartment": 1.00,
    "studio": 0.90,
    "condo": 1.10,
    "house": 0.85,
    "villa": 1.30,
    "land": 0.30,
}

# -------------------------------------------------
# Amenity bonuses  (flat TND/month additions)
# -------------------------------------------------

AMENITY_BONUS: Dict[str, float] = {
    "pool": 120.0,
    "swimming_pool": 120.0,
    "sea_view": 150.0,
    "garden": 80.0,
    "terrace": 60.0,
    "balcony": 40.0,
    "gym": 50.0,
    "elevator": 30.0,
    "parking": 40.0,
    "security": 50.0,
    "air_conditioning": 35.0,
    "central_heating": 30.0,
}


# -------------------------------------------------
# Rule-based estimator (deterministic fallback)
# -------------------------------------------------

def estimate_rule_based(features: dict) -> float:
    """
    Deterministic price estimate based on Tunisia market rules.
    Returns monthly rent in TND.
    """
    area = features.get("area_sqm", 0) or 80
    prop_type = (features.get("property_type") or "apartment").lower()
    city_name = (features.get("city") or "tunis").lower()
    governorate = features.get("governorate")
    bedrooms = features.get("bedrooms", 0) or 0
    bathrooms = features.get("bathrooms", 0) or 0

    # Base = area × city rate × type multiplier
    rate = city_rate(city_name, governorate)
    mult = TYPE_MULTIPLIER.get(prop_type, 1.0)
    price = area * rate * mult

    # Bedroom bonus (each extra bedroom above 1 adds 5%)
    if bedrooms > 1:
        price *= 1 + (bedrooms - 1) * 0.05

    # Bathroom bonus (each extra above 1 adds 3%)
    if bathrooms > 1:
        price *= 1 + (bathrooms - 1) * 0.03

    # Furnished
    if features.get("furnished"):
        price *= 1.15

    # Parking
    parking = features.get("parking_spaces", 0) or 0
    price += parking * 40

    # Pet friendly (slight premium)
    if features.get("pet_friendly"):
        price += 30

    # Amenity bonuses
    for amenity in features.get("amenities", []):
        bonus = AMENITY_BONUS.get(amenity.lower().replace(" ", "_"), 0)
        price += bonus

    return max(price, 200)  # floor at 200 TND
