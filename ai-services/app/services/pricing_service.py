# ===========================================
# SmartProperty AI - Price Prediction Service
# ===========================================

from typing import List, Optional, Dict, Any
import numpy as np
from loguru import logger
import joblib
from pathlib import Path

from app.core.config import settings
from app.core.database import get_collection
from app.core.redis import cache_get, cache_set


class PricePredictionService:
    """
    Rental price prediction service using machine learning.
    """
    
    def __init__(self):
        self.model = None
        self.feature_names = [
            "bedrooms",
            "bathrooms",
            "area_sqft",
            "parking_spaces",
            "furnished",
            "pet_friendly",
            "amenities_count",
            "property_type_encoded",
            "city_encoded",
        ]
        self.property_type_mapping = {
            "apartment": 0,
            "house": 1,
            "condo": 2,
            "studio": 3,
            "villa": 4,
            "land": 5,
        }
        self.is_loaded = False
        
        # Try to load existing model
        self._load_model()
    
    def _load_model(self):
        """Load trained model from disk."""
        model_path = Path(settings.price_model_path) / "price_model.joblib"
        
        if model_path.exists():
            try:
                self.model = joblib.load(model_path)
                self.is_loaded = True
                logger.info(f"Loaded price prediction model from {model_path}")
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
    
    def _save_model(self):
        """Save trained model to disk."""
        model_path = Path(settings.price_model_path)
        model_path.mkdir(parents=True, exist_ok=True)
        
        if self.model:
            joblib.dump(self.model, model_path / "price_model.joblib")
            logger.info(f"Saved price prediction model to {model_path}")
    
    async def predict_price(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict rental price for given property features.
        
        Args:
            features: Dictionary of property features
            
        Returns:
            Prediction with confidence and factors
        """
        # Extract features
        feature_vector = self._extract_features(features)
        
        if self.model and self.is_loaded:
            # Use trained model
            predicted_price = self.model.predict([feature_vector])[0]
            confidence = 0.85  # TODO: Calculate actual confidence
        else:
            # Use rule-based estimation
            predicted_price = self._rule_based_estimate(features)
            confidence = 0.65
        
        # Calculate price range
        price_range = {
            "low": predicted_price * 0.85,
            "high": predicted_price * 1.15,
        }
        
        # Get comparable properties count
        comparable_count = await self._get_comparable_count(features)
        
        # Get price factors
        factors = self._analyze_price_factors(features, predicted_price)
        
        return {
            "predicted_price": round(predicted_price, 2),
            "confidence": confidence,
            "price_range": {
                "low": round(price_range["low"], 2),
                "high": round(price_range["high"], 2),
            },
            "comparable_properties": comparable_count,
            "factors": factors,
        }
    
    def _extract_features(self, features: Dict[str, Any]) -> np.ndarray:
        """Extract feature vector from property features."""
        return np.array([
            features.get("bedrooms", 0),
            features.get("bathrooms", 0),
            features.get("area_sqft", 0),
            features.get("parking_spaces", 0),
            1.0 if features.get("furnished") else 0.0,
            1.0 if features.get("pet_friendly") else 0.0,
            len(features.get("amenities", [])),
            self.property_type_mapping.get(features.get("property_type"), 0),
            hash(features.get("city", "")) % 100,  # Simple city encoding
        ])
    
    def _rule_based_estimate(self, features: Dict[str, Any]) -> float:
        """
        Rule-based price estimation when no model is available.
        
        Based on market research and common pricing factors.
        """
        # Base price by property type
        base_prices = {
            "studio": 800,
            "apartment": 1000,
            "condo": 1200,
            "house": 1500,
            "villa": 2500,
            "land": 500,
        }
        
        price = base_prices.get(features.get("property_type"), 1000)
        
        # Bedroom adjustment
        bedrooms = features.get("bedrooms", 0)
        price += bedrooms * 250
        
        # Bathroom adjustment
        bathrooms = features.get("bathrooms", 0)
        price += (bathrooms - 1) * 100 if bathrooms > 1 else 0
        
        # Size adjustment
        area = features.get("area_sqft", 0)
        if area > 0:
            price += (area - 500) * 0.3  # $0.30 per sqft above 500
        
        # Parking adjustment
        price += features.get("parking_spaces", 0) * 75
        
        # Furnished adjustment
        if features.get("furnished"):
            price += 200
        
        # Pet friendly adjustment
        if features.get("pet_friendly"):
            price += 50
        
        # Amenities adjustment
        amenities_count = len(features.get("amenities", []))
        price += amenities_count * 25
        
        return max(price, 500)  # Minimum price
    
    async def _get_comparable_count(self, features: Dict[str, Any]) -> int:
        """Get count of comparable properties in database."""
        try:
            properties_col = get_collection("properties")
            
            query = {
                "type": features.get("property_type"),
                "status": "available",
            }
            
            if features.get("city"):
                query["address.city"] = features["city"]
            
            count = await properties_col.count_documents(query)
            return count
        except:
            return 0
    
    def _analyze_price_factors(
        self,
        features: Dict[str, Any],
        predicted_price: float,
    ) -> List[Dict[str, str]]:
        """Analyze which factors impact the price most."""
        factors = []
        
        # Location
        if features.get("city"):
            factors.append({
                "factor": "Location",
                "impact": "high",
                "direction": "positive",
                "description": f"Located in {features['city']}",
            })
        
        # Size
        bedrooms = features.get("bedrooms", 0)
        if bedrooms >= 3:
            factors.append({
                "factor": "Size",
                "impact": "high",
                "direction": "positive",
                "description": f"{bedrooms} bedrooms adds significant value",
            })
        elif bedrooms > 0:
            factors.append({
                "factor": "Size",
                "impact": "medium",
                "direction": "positive",
                "description": f"{bedrooms} bedroom(s)",
            })
        
        # Amenities
        amenities = features.get("amenities", [])
        if len(amenities) > 5:
            factors.append({
                "factor": "Amenities",
                "impact": "medium",
                "direction": "positive",
                "description": f"{len(amenities)} amenities included",
            })
        
        # Furnished
        if features.get("furnished"):
            factors.append({
                "factor": "Furnished",
                "impact": "low",
                "direction": "positive",
                "description": "Fully furnished property",
            })
        
        return factors
    
    async def get_market_analysis(
        self,
        city: str,
        property_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get market analysis for a location."""
        # Check cache
        cache_key = f"market:{city}:{property_type or 'all'}"
        cached = await cache_get(cache_key)
        if cached:
            return cached
        
        try:
            properties_col = get_collection("properties")
            
            query = {"address.city": city, "status": "available"}
            if property_type:
                query["type"] = property_type
            
            # Get properties
            properties = await properties_col.find(query).to_list(length=1000)
            
            if not properties:
                return {
                    "location": city,
                    "property_type": property_type or "all",
                    "current_average": 0,
                    "message": "No data available for this location",
                }
            
            # Calculate stats
            prices = [p.get("price", 0) for p in properties if p.get("price")]
            
            analysis = {
                "location": city,
                "property_type": property_type or "all",
                "current_average": np.mean(prices) if prices else 0,
                "median_price": np.median(prices) if prices else 0,
                "min_price": min(prices) if prices else 0,
                "max_price": max(prices) if prices else 0,
                "total_listings": len(properties),
            }
            
            # Cache for 1 hour
            await cache_set(cache_key, analysis, expire=3600)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Market analysis error: {e}")
            return {
                "location": city,
                "error": str(e),
            }
    
    async def train_model(self):
        """Train price prediction model on historical data."""
        logger.info("Starting price model training...")
        
        try:
            from sklearn.ensemble import RandomForestRegressor
            from sklearn.model_selection import train_test_split
            
            # Get training data
            properties_col = get_collection("properties")
            properties = await properties_col.find({
                "price": {"$exists": True, "$gt": 0}
            }).to_list(length=10000)
            
            if len(properties) < 100:
                logger.warning("Not enough data for training")
                return {"status": "failed", "message": "Insufficient training data"}
            
            # Prepare features and labels
            X = []
            y = []
            
            for prop in properties:
                features = prop.get("features", {})
                feature_dict = {
                    "bedrooms": features.get("bedrooms", 0),
                    "bathrooms": features.get("bathrooms", 0),
                    "area_sqft": features.get("area", 0),
                    "parking_spaces": features.get("parkingSpaces", 0),
                    "furnished": features.get("furnished", False),
                    "pet_friendly": features.get("petFriendly", False),
                    "amenities": features.get("amenities", []),
                    "property_type": prop.get("type", "apartment"),
                    "city": prop.get("address", {}).get("city", ""),
                }
                
                X.append(self._extract_features(feature_dict))
                y.append(prop["price"])
            
            X = np.array(X)
            y = np.array(y)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Train model
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
            )
            self.model.fit(X_train, y_train)
            
            # Evaluate
            score = self.model.score(X_test, y_test)
            
            # Save model
            self._save_model()
            self.is_loaded = True
            
            logger.info(f"Model training completed. R² score: {score:.3f}")
            
            return {
                "status": "completed",
                "r2_score": score,
                "training_samples": len(X_train),
                "test_samples": len(X_test),
            }
            
        except Exception as e:
            logger.error(f"Training error: {e}")
            return {"status": "failed", "error": str(e)}


# Singleton instance
price_service = PricePredictionService()
