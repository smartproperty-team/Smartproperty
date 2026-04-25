# ===========================================
# SmartProperty AI - Tunisia Price Prediction
# ===========================================
#
# GradientBoostingRegressor trained on blended
# real (Tayara scrape) + synthetic data.  Predicts
# monthly rent in TND for Tunisian properties.
# ===========================================

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
from loguru import logger

from app.services.tunisia_market import (
    CITY_RATES,
    TYPE_MULTIPLIER,
    apply_calibration,
    city_rate,
    estimate_rule_based,
)

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "pricing"
MODEL_FILE = MODEL_DIR / "tunisia_pricing.joblib"

# Feature order used by the model
FEATURE_NAMES = [
    "area_sqm",
    "bedrooms",
    "bathrooms",
    "parking_spaces",
    "furnished",
    "pet_friendly",
    "amenity_count",
    "type_encoded",
    "city_rate",
]

TYPE_ENCODING = {
    "apartment": 0,
    "studio": 1,
    "condo": 2,
    "house": 3,
    "villa": 4,
    "land": 5,
}

BASE_CAP_RATE_BY_CITY = {
    "tunis": 0.050,
    "la marsa": 0.048,
    "carthage": 0.046,
    "sidi bou said": 0.045,
    "les berges du lac": 0.047,
    "lac 1": 0.047,
    "lac 2": 0.048,
    "mutuelleville": 0.049,
    "hammamet": 0.053,
    "sousse": 0.055,
    "monastir": 0.056,
    "djerba": 0.056,
    "sfax": 0.060,
}

CAP_RATE_ADJUST_BY_TYPE = {
    "studio": 0.005,
    "apartment": 0.000,
    "condo": -0.002,
    "house": 0.002,
    "villa": -0.007,
    "land": 0.008,
}


class TunisiaPricePredictionService:
    """ML + rule-based hybrid pricing for Tunisia rentals."""

    def __init__(self):
        self.model = None
        self.is_loaded = False
        self.reference_df = None
        self._bootstrap_calibration()
        self._try_load_model()

    # --------------------------------------------------
    # Initialisation helpers
    # --------------------------------------------------

    def _bootstrap_calibration(self):
        """Load real dataset once at boot and calibrate city rates."""
        try:
            from app.services.dataset_loader import calibrated_rates, load_clean

            self.reference_df = load_clean()
            if self.reference_df is not None and not self.reference_df.empty:
                if "delegation" in self.reference_df.columns:
                    self.reference_df["delegation_norm"] = (
                        self.reference_df["delegation"]
                        .astype(str)
                        .str.strip()
                        .str.lower()
                    )
                if "governorate" in self.reference_df.columns:
                    self.reference_df["governorate_norm"] = (
                        self.reference_df["governorate"]
                        .astype(str)
                        .str.strip()
                        .str.lower()
                    )

            delegation_rates, governorate_rates = calibrated_rates()
            if delegation_rates or governorate_rates:
                apply_calibration(delegation_rates, governorate_rates)
        except Exception as exc:
            logger.warning(f"Calibration skipped: {exc}")

    def _try_load_model(self):
        """Try loading a previously trained model from disk."""
        if MODEL_FILE.exists():
            try:
                self.model = joblib.load(MODEL_FILE)
                self.is_loaded = True
                logger.info(f"Loaded pricing model from {MODEL_FILE}")
            except Exception as exc:
                logger.error(f"Failed to load model: {exc}")

    # --------------------------------------------------
    # Training
    # --------------------------------------------------

    def _load_real_samples(self) -> Tuple[np.ndarray, np.ndarray]:
        """Extract (X, y) from the scraped CSV."""
        try:
            from app.services.dataset_loader import load_clean

            df = load_clean()
            if df.empty:
                return np.empty((0, len(FEATURE_NAMES))), np.empty(0)

            rows: list = []
            targets: list = []
            for _, r in df.iterrows():
                feat = self._vectorise({
                    "area_sqm": r.get("area_m2", 80),
                    "bedrooms": r.get("bedrooms", 1),
                    "bathrooms": r.get("bathrooms", 1),
                    "parking_spaces": 0,
                    "furnished": False,
                    "pet_friendly": False,
                    "amenities": [],
                    "property_type": r.get("property_type", "apartment"),
                    "city": r.get("delegation", "tunis"),
                    "governorate": r.get("governorate"),
                })
                rows.append(feat)
                targets.append(r["price"])

            return np.array(rows), np.array(targets)
        except Exception as exc:
            logger.warning(f"Could not load real samples: {exc}")
            return np.empty((0, len(FEATURE_NAMES))), np.empty(0)

    def _generate_synthetic(self, n: int = 2000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate synthetic training samples from market rules."""
        rng = np.random.default_rng(42)
        rows, targets = [], []

        cities = list(CITY_RATES.keys())
        types = list(TYPE_ENCODING.keys())

        for _ in range(n):
            area = rng.integers(25, 350)
            beds = int(rng.choice([0, 1, 2, 3, 4, 5], p=[0.05, 0.25, 0.35, 0.2, 0.1, 0.05]))
            baths = max(1, beds - rng.integers(0, 2))
            parking = int(rng.choice([0, 1, 2], p=[0.5, 0.35, 0.15]))
            furnished = bool(rng.random() < 0.3)
            pet = bool(rng.random() < 0.15)
            n_amenities = int(rng.integers(0, 6))
            ptype = str(rng.choice(types))
            city_name = str(rng.choice(cities))

            features = {
                "area_sqm": area,
                "bedrooms": beds,
                "bathrooms": baths,
                "parking_spaces": parking,
                "furnished": furnished,
                "pet_friendly": pet,
                "amenities": ["generic"] * n_amenities,
                "property_type": ptype,
                "city": city_name,
            }
            price = estimate_rule_based(features)
            # Add noise ±15%
            price *= 1 + rng.normal(0, 0.15)
            price = max(price, 150)

            rows.append(self._vectorise(features))
            targets.append(price)

        return np.array(rows), np.array(targets)

    def train(self) -> Dict[str, Any]:
        """Train on blended real + synthetic data."""
        from sklearn.ensemble import GradientBoostingRegressor
        from sklearn.model_selection import train_test_split

        X_real, y_real = self._load_real_samples()
        X_synth, y_synth = self._generate_synthetic(2000)

        logger.info(f"Training data: {len(X_real)} real, {len(X_synth)} synthetic")

        # Blend: up-weight real samples ×5
        if len(X_real) > 0:
            X_real_rep = np.repeat(X_real, 5, axis=0)
            y_real_rep = np.repeat(y_real, 5)
            X = np.vstack([X_real_rep, X_synth])
            y = np.concatenate([y_real_rep, y_synth])
        else:
            X, y = X_synth, y_synth

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        self.model = GradientBoostingRegressor(
            n_estimators=300,
            max_depth=4,
            learning_rate=0.05,
            random_state=42,
        )
        self.model.fit(X_train, y_train)

        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)

        # Evaluate on real hold-out if enough samples
        real_metrics: Dict[str, Any] = {}
        if len(X_real) >= 20:
            _, X_real_test, _, y_real_test = train_test_split(
                X_real, y_real, test_size=0.3, random_state=42
            )
            preds = self.model.predict(X_real_test)
            real_metrics = {
                "real_r2": float(self.model.score(X_real_test, y_real_test)),
                "real_mae": float(np.mean(np.abs(preds - y_real_test))),
                "real_test_size": len(X_real_test),
            }

        # Save
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, MODEL_FILE)
        self.is_loaded = True

        result = {
            "status": "completed",
            "train_r2": round(train_score, 4),
            "test_r2": round(test_score, 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "real_samples": len(X_real),
            **real_metrics,
        }
        logger.info(f"Training complete: {result}")
        return result

    # --------------------------------------------------
    # Prediction
    # --------------------------------------------------

    def _vectorise(self, features: dict) -> np.ndarray:
        """Convert feature dict to model input vector."""
        city_name = (features.get("city") or "tunis").strip().lower()
        governorate = features.get("governorate")
        return np.array([
            features.get("area_sqm", 80),
            features.get("bedrooms", 1),
            features.get("bathrooms", 1),
            features.get("parking_spaces", 0),
            1.0 if features.get("furnished") else 0.0,
            1.0 if features.get("pet_friendly") else 0.0,
            len(features.get("amenities", [])),
            TYPE_ENCODING.get(
                (features.get("property_type") or "apartment").lower(), 0
            ),
            city_rate(city_name, governorate),
        ])

    def predict_price(self, features: dict) -> Dict[str, Any]:
        """
        Predict monthly rent in TND.
        Blends ML (75%) + rule-based (25%) for known cities,
        40/60 for unknown cities.
        """
        rule_price = estimate_rule_based(features)
        dataset_ref_price, dataset_match_count = self._dataset_reference_price(features)

        if self.model and self.is_loaded:
            vec = self._vectorise(features)
            ml_price = float(self.model.predict([vec])[0])
            ml_price = max(ml_price, 100)

            city_name = (features.get("city") or "").strip().lower()
            known = city_name in CITY_RATES
            ml_weight = 0.75 if known else 0.40
            blended = ml_weight * ml_price + (1 - ml_weight) * rule_price
            confidence = 0.78 if known else 0.55
            method = "ml_hybrid"
        else:
            blended = rule_price
            confidence = 0.50
            method = "rule_based"

        if dataset_ref_price is not None and dataset_match_count > 0:
            if dataset_match_count >= 20:
                dataset_weight = 0.30
            elif dataset_match_count >= 10:
                dataset_weight = 0.22
            else:
                dataset_weight = 0.15

            blended = (1 - dataset_weight) * blended + dataset_weight * dataset_ref_price
            confidence = min(confidence + min(0.12, dataset_match_count * 0.005), 0.92)
            method = f"{method}_dataset_ref"

        blended = max(blended, 150)
        sale_price, sale_price_range = self._estimate_sale_price(features, blended)

        # Factors
        factors = self._build_factors(features, blended, dataset_match_count)
        factors.append({
            "factor": "Sale Estimate",
            "impact": "medium",
            "direction": "neutral",
            "description": (
                "Estimated from predicted annual rent and Tunisia cap-rate "
                "benchmarks"
            ),
        })

        return {
            # Backward-compatible field used by existing callers.
            "predicted_price": round(blended, 0),
            "rental_price": round(blended, 0),
            "sale_price": round(sale_price, 0),
            "currency": "TND",
            "confidence": confidence,
            "price_range": {
                "low": round(blended * 0.82, 0),
                "high": round(blended * 1.18, 0),
            },
            "sale_price_range": {
                "low": round(sale_price_range["low"], 0),
                "high": round(sale_price_range["high"], 0),
            },
            "base_rate_per_sqm": round(
                city_rate(
                    (features.get("city") or "tunis").lower(),
                    features.get("governorate"),
                ),
                1,
            ),
            "method": method,
            "factors": factors,
        }

    def _estimate_sale_price(self, features: dict, monthly_rent: float) -> Tuple[float, Dict[str, float]]:
        """
        Convert monthly rent estimate to indicative sale value.

        Uses gross cap-rate heuristics tuned for Tunisia local markets.
        """
        city = (features.get("city") or "").strip().lower()
        property_type = (features.get("property_type") or "apartment").strip().lower()

        base_rate = BASE_CAP_RATE_BY_CITY.get(city, 0.062)
        type_adjust = CAP_RATE_ADJUST_BY_TYPE.get(property_type, 0.0)
        cap_rate = float(np.clip(base_rate + type_adjust, 0.040, 0.090))

        annual_rent = max(monthly_rent, 150) * 12
        sale_price = max(annual_rent / cap_rate, 25_000)

        # Broader band than rental because sale extrapolation carries more uncertainty.
        band = 0.14
        return sale_price, {
            "low": sale_price * (1 - band),
            "high": sale_price * (1 + band),
        }

    def _dataset_reference_price(self, features: dict) -> Tuple[Optional[float], int]:
        """
        Estimate price from comparable rows in tunisia_rentals.csv.
        Uses median TND/m² of closest matches then scales by requested area.
        """
        if self.reference_df is None or self.reference_df.empty:
            return None, 0

        df = self.reference_df
        city = (features.get("city") or "").strip().lower()
        governorate = (features.get("governorate") or "").strip().lower()
        property_type = (features.get("property_type") or "apartment").strip().lower()
        area = float(features.get("area_sqm") or 80)
        bedrooms = int(features.get("bedrooms") or 1)
        bathrooms = int(features.get("bathrooms") or 1)

        if "area_m2" not in df.columns or "price" not in df.columns:
            return None, 0

        # 1) Primary scope: same city (delegation if available), otherwise same governorate.
        scoped = df
        if city and "delegation_norm" in df.columns:
            city_scope = df[df["delegation_norm"] == city]
            if len(city_scope) >= 3:
                scoped = city_scope
        if len(scoped) < 3 and governorate and "governorate_norm" in df.columns:
            gov_scope = df[df["governorate_norm"] == governorate]
            if len(gov_scope) >= 3:
                scoped = gov_scope

        # 2) Prefer same property type when enough data exists.
        typed = scoped
        if "property_type" in scoped.columns:
            same_type = scoped[scoped["property_type"].astype(str).str.lower() == property_type]
            if len(same_type) >= 5:
                typed = same_type

        # 3) Similar physical profile (area + rooms). Relax if too strict.
        area_low = area * 0.65
        area_high = area * 1.35
        matches = typed[
            (typed["area_m2"] >= area_low)
            & (typed["area_m2"] <= area_high)
            & (np.abs(typed["bedrooms"] - bedrooms) <= 1)
            & (np.abs(typed["bathrooms"] - bathrooms) <= 1)
        ]

        if len(matches) < 5:
            matches = typed[
                (typed["area_m2"] >= area * 0.55)
                & (typed["area_m2"] <= area * 1.55)
            ]

        if len(matches) == 0:
            return None, 0

        rate_series = matches["price"] / matches["area_m2"]
        ref_rate = float(np.median(rate_series))
        ref_price = max(ref_rate * area, 150)
        return ref_price, int(len(matches))

    def _build_factors(
        self,
        features: dict,
        price: float,
        dataset_match_count: int = 0,
    ) -> List[Dict[str, str]]:
        """Build human-readable price factor list."""
        factors = []
        city = features.get("city", "")
        if city:
            factors.append({
                "factor": "Location",
                "impact": "high",
                "direction": "positive",
                "description": f"City: {city}",
            })

        area = features.get("area_sqm", 0)
        if area:
            factors.append({
                "factor": "Area",
                "impact": "high" if area > 120 else "medium",
                "direction": "positive",
                "description": f"{area} m²",
            })

        beds = features.get("bedrooms", 0)
        if beds and beds >= 2:
            factors.append({
                "factor": "Bedrooms",
                "impact": "high" if beds >= 3 else "medium",
                "direction": "positive",
                "description": f"{beds} bedrooms",
            })

        if features.get("furnished"):
            factors.append({
                "factor": "Furnished",
                "impact": "medium",
                "direction": "positive",
                "description": "+15% furnished premium",
            })

        amenities = features.get("amenities", [])
        if amenities:
            factors.append({
                "factor": "Amenities",
                "impact": "low",
                "direction": "positive",
                "description": f"{len(amenities)} amenities",
            })

        if dataset_match_count > 0:
            factors.append({
                "factor": "Dataset Reference",
                "impact": "high" if dataset_match_count >= 20 else "medium",
                "direction": "neutral",
                "description": (
                    f"Adjusted using {dataset_match_count} comparable rentals "
                    "from tunisia_rentals.csv"
                ),
            })

        return factors

    def get_supported_cities(self) -> List[str]:
        """Return list of cities with known pricing data."""
        return sorted(CITY_RATES.keys())


# -------------------------------------------------
# Singleton  (auto-trains if no saved model exists)
# -------------------------------------------------

price_service = TunisiaPricePredictionService()

if not price_service.is_loaded:
    logger.info("No saved model found — training on first boot...")
    try:
        price_service.train()
    except Exception as exc:
        logger.error(f"Auto-train failed: {exc}")
