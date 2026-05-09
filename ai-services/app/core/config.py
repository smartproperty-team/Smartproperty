# ===========================================
# SmartProperty AI Services - Configuration
# ===========================================

from functools import lru_cache
from typing import List

from pydantic_settings import SettingsConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        protected_namespaces=("settings_",),
    )

    # Application
    app_name: str = "SmartProperty AI Services"
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = "/api/v1"
    host: str = "0.0.0.0"
    port: int = 8000

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "smartproperty"

    # Redis
    redis_enabled: bool = False
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 1

    # Backend API
    backend_api_url: str = "http://localhost:3000/api"

    # JWT
    jwt_secret: str = "your-super-secret-jwt-key"
    jwt_algorithm: str = "HS256"

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    aws_s3_bucket: str = "smartproperty-ai-models"

    # Model Paths
    model_path: str = "./models"
    recommendation_model_path: str = "./models/recommendation"
    price_model_path: str = "./models/pricing"
    image_model_path: str = "./models/image_analysis"

    # Marketing AI - Description generation
    marketing_generation_model_name: str = "google/flan-t5-base"
    marketing_translation_model_name: str = "facebook/nllb-200-distilled-600M"
    marketing_model_device: str = "cpu"  # "cpu" or "cuda"
    marketing_cache_ttl_seconds: int = 60 * 60 * 24  # 24h
    marketing_generation_timeout_ms: int = 45000

    # Fraud Detection (Document verification)
    # LLM provider priority: Anthropic > Gemini. Whichever key is set first wins.
    anthropic_api_key: str = ""
    anthropic_vision_model: str = "claude-sonnet-4-6"
    gemini_api_key: str = ""
    gemini_vision_model: str = "gemini-2.5-flash-lite"
    fraud_detection_timeout_ms: int = 30000
    fraud_detection_use_llm: bool = True
    fraud_detection_use_ocr: bool = True

    # Virtual Staging (Stability AI)
    stability_api_key: str = "sk-q6XFnQyEAb2CKb32m30US7MvdtygmdRgVOIX0jRpFjYYL32d"
    staging_output_dir: str = "./data/staging"
    staging_max_image_size_mb: int = 10
    staging_cache_ttl_seconds: int = 60 * 60 * 24  # 24h
    staging_default_strength: float = 0.35
    staging_cfg_scale: float = 7.0

    # Logging
    log_level: str = "DEBUG"
    log_format: str = "json"

    # Rate Limiting
    rate_limit_per_minute: int = 60

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string to list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
