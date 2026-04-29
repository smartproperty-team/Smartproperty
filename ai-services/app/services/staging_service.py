# ===========================================
# SmartProperty AI - Virtual Staging Service
# ===========================================
"""AI-powered virtual staging using Stability AI's image-to-image API.

Downloads a room photo, sends it to Stability AI with a style-specific prompt,
and saves the staged result. Follows the singleton + async job pattern
established by VirtualTourService.
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import json
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional
from urllib.parse import urlparse, urlunparse
from uuid import uuid4

import httpx
import numpy as np
from loguru import logger
from PIL import Image, ImageEnhance, ImageFilter

from app.core.config import settings
from app.core.redis import cache_get, cache_set

# ---------------------------------------------------------------------------
# Staging styles
# ---------------------------------------------------------------------------

STAGING_STYLES: Dict[str, Dict[str, str]] = {
    "modern": {
        "name": "Modern",
        "description": "Contemporary furniture with clean lines and neutral colors",
        "prompt": (
            "Modern furnished interior, contemporary furniture, clean lines, "
            "neutral color palette, elegant decor, professional real estate photo, "
            "high quality, photorealistic, well-lit"
        ),
    },
    "scandinavian": {
        "name": "Scandinavian",
        "description": "Light wood, white walls, minimal decor, cozy textiles",
        "prompt": (
            "Scandinavian style furnished interior, light wood furniture, white walls, "
            "minimal decor, cozy textiles, hygge atmosphere, natural light, "
            "professional real estate photo, photorealistic"
        ),
    },
    "minimalist": {
        "name": "Minimalist",
        "description": "Very few pieces, open space, simple and functional design",
        "prompt": (
            "Minimalist furnished interior, very few furniture pieces, open space, "
            "simple functional design, clean aesthetic, uncluttered, "
            "professional real estate photo, photorealistic"
        ),
    },
    "luxury": {
        "name": "Luxury",
        "description": "High-end furniture, rich materials, elegant and opulent decor",
        "prompt": (
            "Luxury furnished interior, high-end designer furniture, rich materials, "
            "marble accents, gold details, elegant opulent decor, chandelier, "
            "professional real estate photo, photorealistic"
        ),
    },
    "industrial": {
        "name": "Industrial",
        "description": "Exposed brick, metal accents, rustic and raw furniture",
        "prompt": (
            "Industrial style furnished interior, exposed brick walls, metal accents, "
            "rustic wood furniture, Edison bulb lighting, raw aesthetic, "
            "professional real estate photo, photorealistic"
        ),
    },
    "bohemian": {
        "name": "Bohemian",
        "description": "Eclectic furniture, colorful textiles, plants and art",
        "prompt": (
            "Bohemian style furnished interior, eclectic furniture mix, colorful textiles, "
            "indoor plants, macrame, layered rugs, artistic decor, warm atmosphere, "
            "professional real estate photo, photorealistic"
        ),
    },
}

ROOM_TYPE_CONTEXT: Dict[str, str] = {
    "living_room": "spacious living room with seating area and coffee table",
    "bedroom": "cozy bedroom with bed, nightstands, and soft lighting",
    "kitchen": "functional kitchen with dining area",
    "dining_room": "elegant dining room with dining table and chairs",
    "office": "productive home office with desk and shelving",
    "bathroom": "spa-like bathroom with fresh towels and accessories",
    "balcony": "inviting balcony with outdoor seating",
}

StagingStatus = Literal["queued", "processing", "completed", "failed"]

STABILITY_API_BASE = "https://api.stability.ai"

# ---------------------------------------------------------------------------
# Singleton service
# ---------------------------------------------------------------------------


class StagingService:
    """Singleton service for AI virtual staging via Stability AI."""

    _instance: Optional["StagingService"] = None

    def __init__(self) -> None:
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    @classmethod
    def instance(cls) -> "StagingService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ---- Styles -----------------------------------------------------------

    @staticmethod
    def get_styles() -> List[Dict[str, str]]:
        return [
            {"id": style_id, **style_data}
            for style_id, style_data in STAGING_STYLES.items()
        ]

    # ---- Job management ---------------------------------------------------

    def request_staging(
        self,
        image_url: str,
        style: str,
        room_type: Optional[str] = None,
        strength: Optional[float] = None,
        property_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if style not in STAGING_STYLES:
            raise ValueError(
                f"Invalid style '{style}'. Valid styles: {list(STAGING_STYLES.keys())}"
            )

        job_id = f"stg_{uuid4().hex[:12]}"
        job: Dict[str, Any] = {
            "jobId": job_id,
            "status": "queued",
            "message": "Virtual staging request queued.",
            "imageUrl": image_url,
            "style": style,
            "roomType": room_type,
            "strength": strength or settings.staging_default_strength,
            "propertyId": property_id,
            "stagedImagePath": None,
            "error": None,
            "createdAt": time.time(),
        }

        with self._lock:
            self._jobs[job_id] = job

        logger.info(f"[staging] Job created: {job_id} style={style} room={room_type}")
        return dict(job)

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None

    def delete_job(self, job_id: str) -> bool:
        with self._lock:
            job = self._jobs.pop(job_id, None)
        if not job:
            return False
        # Clean up output file
        if job.get("stagedImagePath"):
            path = Path(job["stagedImagePath"])
            if path.exists():
                path.unlink()
                logger.info(f"[staging] Deleted output file: {path}")
        return True

    async def process_job(self, job_id: str) -> Dict[str, Any]:
        job = self.get_job(job_id)
        if not job:
            raise KeyError(f"Staging job {job_id} not found")

        with self._lock:
            stored = self._jobs.get(job_id)
            if not stored:
                raise KeyError(f"Staging job {job_id} not found")
            if stored["status"] == "completed":
                return dict(stored)
            stored["status"] = "processing"
            stored["message"] = "Generating staged image..."

        logger.info(f"[staging] Processing job {job_id}")

        try:
            # Check cache first
            cache_key = self._cache_key(
                job["imageUrl"], job["style"], job["roomType"], job["strength"]
            )
            cached = await cache_get(cache_key)
            if cached:
                cached_data = json.loads(cached)
                output_path = cached_data.get("stagedImagePath")
                if output_path and Path(output_path).exists():
                    logger.info(f"[staging] Cache hit for job {job_id}")
                    with self._lock:
                        stored = self._jobs.get(job_id)
                        if stored:
                            stored["status"] = "completed"
                            stored["message"] = "Staged image ready (cached)."
                            stored["stagedImagePath"] = output_path
                    return self.get_job(job_id) or {}

            # Download source image
            image_bytes = await self._download_image(job["imageUrl"])

            if settings.stability_api_key:
                # ---- Production: Stability AI ----
                image_bytes = self._resize_for_api(image_bytes)
                prompt = self._build_prompt(job["style"], job["roomType"])
                result_bytes = await self._call_stability_api(
                    image_bytes=image_bytes,
                    prompt=prompt,
                    strength=job["strength"],
                )
            else:
                # ---- Demo mode: Pillow-based visual transform ----
                logger.info(
                    f"[staging] No STABILITY_API_KEY set — using demo mode for {job_id}"
                )
                result_bytes = await asyncio.to_thread(
                    self._demo_transform,
                    image_bytes,
                    job["style"],
                    job["strength"],
                )

            # Save result
            output_path = self._save_result(
                property_id=job.get("propertyId") or "unknown",
                job_id=job_id,
                image_bytes=result_bytes,
            )

            with self._lock:
                stored = self._jobs.get(job_id)
                if stored:
                    stored["status"] = "completed"
                    stored["message"] = "Staged image ready."
                    stored["stagedImagePath"] = output_path
                    stored["error"] = None

            # Cache the result path
            try:
                await cache_set(
                    cache_key,
                    json.dumps({"stagedImagePath": output_path}),
                    expire=settings.staging_cache_ttl_seconds,
                )
            except Exception as exc:
                logger.warning(f"[staging] cache_set failed: {exc}")

            logger.info(f"[staging] Job {job_id} completed: {output_path}")

        except Exception as exc:
            logger.error(f"[staging] Job {job_id} failed: {exc}", exc_info=True)
            with self._lock:
                stored = self._jobs.get(job_id)
                if stored:
                    stored["status"] = "failed"
                    stored["message"] = "Staging failed."
                    stored["error"] = str(exc)

        return self.get_job(job_id) or {}

    # ---- Image download ---------------------------------------------------

    @staticmethod
    def _resolve_image_url(url: str) -> str:
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        if hostname in {"localhost", "127.0.0.1"}:
            new_netloc = parsed.netloc.replace(hostname, "host.docker.internal", 1)
            return urlunparse(
                (parsed.scheme, new_netloc, parsed.path, parsed.params, parsed.query, parsed.fragment)
            )
        return url

    async def _download_image(self, url: str) -> bytes:
        resolved = self._resolve_image_url(url)
        logger.debug(f"[staging] Downloading image: {url} -> {resolved}")
        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(resolved)
            resp.raise_for_status()
            max_bytes = settings.staging_max_image_size_mb * 1024 * 1024
            if len(resp.content) > max_bytes:
                raise ValueError(
                    f"Image too large ({len(resp.content)} bytes). "
                    f"Max {settings.staging_max_image_size_mb}MB."
                )
            return resp.content

    @staticmethod
    def _resize_for_api(image_bytes: bytes, max_dim: int = 1024) -> bytes:
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
        if w <= max_dim and h <= max_dim:
            return image_bytes
        ratio = min(max_dim / w, max_dim / h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        # Stability API requires dimensions divisible by 64
        new_w = (new_w // 64) * 64
        new_h = (new_h // 64) * 64
        if new_w == 0:
            new_w = 64
        if new_h == 0:
            new_h = 64
        img = img.resize((new_w, new_h), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        logger.debug(f"[staging] Resized image from {w}x{h} to {new_w}x{new_h}")
        return buf.getvalue()

    # ---- Prompt building --------------------------------------------------

    @staticmethod
    def _build_prompt(style: str, room_type: Optional[str]) -> str:
        style_data = STAGING_STYLES[style]
        prompt = style_data["prompt"]
        if room_type and room_type in ROOM_TYPE_CONTEXT:
            prompt = f"{ROOM_TYPE_CONTEXT[room_type]}, {prompt}"
        return prompt

    # ---- Stability AI call ------------------------------------------------

    async def _call_stability_api(
        self,
        image_bytes: bytes,
        prompt: str,
        strength: float,
    ) -> bytes:
        url = (
            f"{STABILITY_API_BASE}/v1/generation/"
            "stable-diffusion-xl-1024-v1-0/image-to-image"
        )

        def _do_request() -> bytes:
            import requests  # noqa: local import to keep httpx as primary

            resp = requests.post(
                url,
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {settings.stability_api_key}",
                },
                files={"init_image": ("room.png", image_bytes, "image/png")},
                data={
                    "text_prompts[0][text]": prompt,
                    "text_prompts[0][weight]": "1",
                    "text_prompts[1][text]": (
                        "blurry, distorted, low quality, watermark, text, "
                        "cartoon, painting, sketch, unrealistic"
                    ),
                    "text_prompts[1][weight]": "-1",
                    "image_strength": str(strength),
                    "cfg_scale": str(settings.staging_cfg_scale),
                    "samples": "1",
                    "steps": "30",
                },
            )

            if resp.status_code != 200:
                detail = resp.json().get("message", resp.text) if resp.text else str(resp.status_code)
                raise RuntimeError(f"Stability AI API error ({resp.status_code}): {detail}")

            data = resp.json()
            artifacts = data.get("artifacts", [])
            if not artifacts:
                raise RuntimeError("Stability AI returned no artifacts")

            import base64
            return base64.b64decode(artifacts[0]["base64"])

        logger.info(f"[staging] Calling Stability AI (strength={strength})")
        return await asyncio.to_thread(_do_request)

    # ---- Demo transform (no API key) ----------------------------------------

    DEMO_STYLE_TINTS: Dict[str, tuple] = {
        "modern": (245, 245, 250),       # cool white
        "scandinavian": (255, 252, 240),  # warm cream
        "minimalist": (250, 250, 255),    # soft blue-white
        "luxury": (255, 245, 220),        # golden warm
        "industrial": (230, 225, 220),    # grey-brown
        "bohemian": (255, 240, 230),      # warm peach
    }

    @staticmethod
    def _demo_transform(image_bytes: bytes, style: str, strength: float) -> bytes:
        """Apply a Pillow-based visual transformation as a demo preview.

        This gives a visible before/after difference without needing an AI API.
        """
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # 1. Brightness boost
        img = ImageEnhance.Brightness(img).enhance(1.0 + strength * 0.3)

        # 2. Contrast boost
        img = ImageEnhance.Contrast(img).enhance(1.0 + strength * 0.2)

        # 3. Color saturation shift per style
        sat_factor = {
            "modern": 0.85,
            "scandinavian": 0.9,
            "minimalist": 0.75,
            "luxury": 1.25,
            "industrial": 0.7,
            "bohemian": 1.3,
        }.get(style, 1.0)
        img = ImageEnhance.Color(img).enhance(sat_factor)

        # 4. Slight style-specific color tint overlay
        tint_color = StagingService.DEMO_STYLE_TINTS.get(style, (255, 255, 255))
        tint_layer = Image.new("RGB", img.size, tint_color)
        img = Image.blend(img, tint_layer, alpha=strength * 0.15)

        # 5. Slight sharpening
        img = img.filter(ImageFilter.SHARPEN)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=92)
        return buf.getvalue()

    # ---- Save result ------------------------------------------------------

    @staticmethod
    def _save_result(property_id: str, job_id: str, image_bytes: bytes) -> str:
        base_dir = Path(settings.staging_output_dir).resolve() / property_id
        base_dir.mkdir(parents=True, exist_ok=True)
        output_path = base_dir / f"{job_id}.jpg"

        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGB")
        img.save(str(output_path), "JPEG", quality=92)

        logger.info(f"[staging] Saved staged image: {output_path}")
        return str(output_path)

    # ---- Cache key --------------------------------------------------------

    @staticmethod
    def _cache_key(
        image_url: str, style: str, room_type: Optional[str], strength: float
    ) -> str:
        payload = json.dumps(
            {
                "image_url": image_url,
                "style": style,
                "room_type": room_type,
                "strength": strength,
            },
            sort_keys=True,
        )
        digest = hashlib.sha256(payload.encode()).hexdigest()[:32]
        return f"staging:{digest}"


def get_staging_service() -> StagingService:
    return StagingService.instance()
