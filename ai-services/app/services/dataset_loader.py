# ===========================================
# SmartProperty AI - Dataset Loader
# ===========================================
#
# Loads ai-services/data/tunisia_rentals.csv
# (Tayara scrape) and produces clean DataFrames
# for training and calibration.
# ===========================================

from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from loguru import logger

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
CSV_PATH = DATA_DIR / "tunisia_rentals.csv"


# -------------------------------------------------
# Property-type detection from Tayara URL path
# -------------------------------------------------

_URL_TYPE_MAP = {
    "appartements": "apartment",
    "maisons-et-villas": "house",
    "studios": "studio",
    "terrains": "land",
    "bureaux": "apartment",  # treat office as apt for pricing
    "colocation": "apartment",
}


def _type_from_url(url: str) -> str:
    """Extract property type from Tayara detail_url path segment."""
    if not isinstance(url, str):
        return "apartment"
    for segment, ptype in _URL_TYPE_MAP.items():
        if segment in url.lower():
            return ptype
    return "apartment"


def _refine_type(row: pd.Series) -> str:
    """Refine: detect studio (bedrooms<=1, area<=50) and villa (house + area>=200)."""
    ptype = row.get("property_type", "apartment")
    area = row.get("area_m2", 0) or 0
    beds = row.get("bedrooms", 0) or 0

    if ptype == "apartment" and beds <= 1 and 0 < area <= 50:
        return "studio"
    if ptype == "house" and area >= 200:
        return "villa"
    return ptype


# -------------------------------------------------
# Public API
# -------------------------------------------------

def load_clean() -> pd.DataFrame:
    """
    Load tunisia_rentals.csv, filter to residential rentals,
    and return a tidy DataFrame with columns:
      price, governorate, delegation, area_m2, bedrooms,
      bathrooms, property_type
    """
    if not CSV_PATH.exists():
        logger.warning(f"Dataset not found at {CSV_PATH}")
        return pd.DataFrame()

    df = pd.read_csv(CSV_PATH)
    logger.info(f"Raw dataset: {len(df)} rows")

    # Keep rentals only
    if "transaction_type" in df.columns:
        df = df[df["transaction_type"].str.contains("Louer", case=False, na=False)]

    # Numeric coercion
    for col in ("price", "area_m2", "bedrooms", "bathrooms"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop rows missing critical fields
    df = df.dropna(subset=["price", "area_m2"])
    df = df[(df["price"] > 50) & (df["area_m2"] > 10)]

    # Exclude shops / commercial
    if "is_shop" in df.columns:
        df = df[df["is_shop"] != True]  # noqa: E712

    # Property type from URL
    if "detail_url" in df.columns:
        df["property_type"] = df["detail_url"].apply(_type_from_url)
    else:
        df["property_type"] = "apartment"

    df["property_type"] = df.apply(_refine_type, axis=1)

    # Clean governorate / delegation
    for col in ("governorate", "delegation"):
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    # Fill missing bedrooms/bathrooms with sensible defaults
    df["bedrooms"] = df["bedrooms"].fillna(1).astype(int)
    df["bathrooms"] = df["bathrooms"].fillna(1).astype(int)

    keep = ["price", "governorate", "delegation", "area_m2", "bedrooms",
            "bathrooms", "property_type"]
    df = df[[c for c in keep if c in df.columns]].reset_index(drop=True)

    logger.info(f"Clean dataset: {len(df)} rows")
    return df


def calibrated_rates() -> Tuple[Dict[str, float], Dict[str, float]]:
    """
    Compute per-delegation and per-governorate median TND/m².
    Returns (delegation_rates, governorate_rates).
    """
    df = load_clean()
    if df.empty:
        return {}, {}

    df["tnd_per_sqm"] = df["price"] / df["area_m2"]

    delegation_rates: Dict[str, float] = {}
    governorate_rates: Dict[str, float] = {}

    if "delegation" in df.columns:
        grp = df.groupby("delegation")["tnd_per_sqm"].median()
        delegation_rates = grp.to_dict()

    if "governorate" in df.columns:
        grp = df.groupby("governorate")["tnd_per_sqm"].median()
        governorate_rates = grp.to_dict()

    logger.info(
        f"Calibration: {len(delegation_rates)} delegations, "
        f"{len(governorate_rates)} governorates"
    )
    return delegation_rates, governorate_rates
