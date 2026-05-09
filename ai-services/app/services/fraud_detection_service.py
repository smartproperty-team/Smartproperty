# ===========================================
# SmartProperty AI - Document Fraud Detection
# ===========================================
"""
Layered fraud detection for verification documents.

Phase 1 layers (cheapest first, exit early on strong signals):
  1. EXIF metadata inspection (Pillow)
  2. OCR text + field extraction (Tesseract via pytesseract, optional)
  3. Cross-validation against user profile (string similarity)
  4. Claude Vision LLM check (Anthropic SDK, optional)
"""
from __future__ import annotations

import base64
import io
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Any

import httpx
from loguru import logger
from PIL import Image, ExifTags

from app.core.config import settings


# ─────────────────────────────────────────────────────────
# Result types
# ─────────────────────────────────────────────────────────

@dataclass
class FraudAnalysisResult:
    fraud_score: int  # 0-100
    risk_level: str  # 'low' | 'medium' | 'high'
    flags: list[str] = field(default_factory=list)
    ocr_text: str | None = None
    ocr_fields: dict[str, Any] = field(default_factory=dict)
    llm_findings: list[str] = field(default_factory=list)
    analyzed_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ─────────────────────────────────────────────────────────
# Layer 1: EXIF metadata
# ─────────────────────────────────────────────────────────

# Software signatures that often indicate edited images. We do not flag a
# camera/scanner manufacturer (e.g. "Adobe Scan" is fine) but raw editors are.
_EDIT_SOFTWARE_PATTERNS = [
    r"adobe\s*photoshop",
    r"gimp",
    r"affinity\s*photo",
    r"pixelmator",
    r"paint\.net",
    r"photopea",
]


def analyze_exif(image_bytes: bytes) -> tuple[int, list[str]]:
    """Returns (score_contribution, flags). Score range: 0-40."""
    score = 0
    flags: list[str] = []
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        logger.warning(f"[fraud] cannot open image for EXIF: {exc}")
        return 0, ["exif_unreadable"]

    exif_raw = getattr(img, "_getexif", lambda: None)()
    if not exif_raw:
        # Many legitimate scans strip EXIF. Mild signal only.
        return 5, ["exif_missing"]

    exif = {ExifTags.TAGS.get(k, k): v for k, v in exif_raw.items()}

    software = str(exif.get("Software", "")).lower()
    for pattern in _EDIT_SOFTWARE_PATTERNS:
        if re.search(pattern, software):
            score += 35
            flags.append(f"exif_edited_software:{software.strip()}")
            break

    # DateTimeDigitized vs DateTime mismatch can indicate tampering.
    dt_orig = exif.get("DateTimeOriginal")
    dt_modified = exif.get("DateTime")
    if dt_orig and dt_modified and dt_orig != dt_modified:
        score += 10
        flags.append("exif_modified_date_differs")

    return min(score, 40), flags


# ─────────────────────────────────────────────────────────
# Layer 1b: Image quality / dimensions / file checks
# ─────────────────────────────────────────────────────────

def analyze_image_quality(image_bytes: bytes) -> tuple[int, list[str]]:
    """Heuristics on image dimensions, aspect, file size. Score range: 0-25.

    Catches:
    - Photos of computer screens (low resolution + odd aspect)
    - Heavily downscaled images that hide tampering
    - Tiny file sizes (the document was re-saved at high compression)
    - Atypical aspect ratios for ID documents
    """
    score = 0
    flags: list[str] = []
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception:
        return 0, []

    width, height = img.size
    long_side = max(width, height)
    short_side = min(width, height) or 1

    # Resolution checks. A real ID scan/photo is typically >= 1000px on the long side.
    if long_side < 500:
        score += 20
        flags.append(f"very_low_resolution:{width}x{height}")
    elif long_side < 900:
        score += 10
        flags.append(f"low_resolution:{width}x{height}")

    # File size relative to dimensions. Real photos are at least ~50KB; tiny files
    # for full-resolution images mean aggressive recompression.
    pixels = width * height
    if pixels > 0:
        bytes_per_pixel = len(image_bytes) / pixels
        if pixels > 200_000 and bytes_per_pixel < 0.05:
            score += 5
            flags.append("heavy_compression")

    # Aspect ratio check. ID cards / passports are typically between 1.2:1 and 1.7:1.
    # Screenshots of phones / desktops are often outside that.
    aspect = long_side / short_side
    if aspect > 2.5:
        score += 5
        flags.append(f"unusual_aspect_ratio:{aspect:.2f}")

    return min(score, 25), flags


# ─────────────────────────────────────────────────────────
# Layer 2: OCR + field extraction
# ─────────────────────────────────────────────────────────

# Tesseract is optional. We check both the Python wrapper AND the underlying
# binary — pytesseract installs as a pure Python package but raises at call
# time if the system binary is missing.
try:
    import pytesseract  # type: ignore

    pytesseract.get_tesseract_version()  # raises if binary missing
    _TESSERACT_AVAILABLE = True
except Exception:  # pragma: no cover
    pytesseract = None  # type: ignore
    _TESSERACT_AVAILABLE = False


_INCOME_RX = re.compile(
    r"(?:salaire|salary|revenu|income|montant|net|brut)[^\d]{0,20}"
    r"(\d{1,3}(?:[ ,.]\d{3})*(?:[.,]\d{2})?)",
    re.IGNORECASE,
)
_DATE_RX = re.compile(r"\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b")
_NAME_HINT_RX = re.compile(
    r"(?:nom|name|prenom|prénom|first\s*name|last\s*name)\s*[:\-]?\s*([A-Z][A-Za-zÀ-ÖØ-öø-ÿ' \-]{2,})",
    re.IGNORECASE,
)


def run_ocr(
    image_bytes: bytes,
) -> tuple[str | None, dict[str, Any], list[str]]:
    """Returns (text, fields, info_flags). info_flags is empty unless OCR was skipped/failed."""
    if not settings.fraud_detection_use_ocr:
        return None, {}, ["ocr_skipped:disabled"]
    if not _TESSERACT_AVAILABLE:
        return None, {}, ["ocr_skipped:tesseract_not_installed"]
    try:
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img, lang="eng+fra")
    except Exception as exc:
        logger.warning(f"[fraud] OCR failed: {exc}")
        return None, {}, [f"ocr_failed:{type(exc).__name__}"]

    fields: dict[str, Any] = {}
    income_match = _INCOME_RX.search(text)
    if income_match:
        raw = income_match.group(1).replace(" ", "").replace(",", ".")
        try:
            fields["claimed_income"] = float(raw)
        except ValueError:
            pass

    name_match = _NAME_HINT_RX.search(text)
    if name_match:
        fields["claimed_name"] = name_match.group(1).strip()

    dates = _DATE_RX.findall(text)
    if dates:
        fields["dates_found"] = dates[:5]

    return text, fields, []


# ─────────────────────────────────────────────────────────
# Layer 3: Cross-validation against user profile
# ─────────────────────────────────────────────────────────

def _name_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def cross_validate(
    ocr_fields: dict[str, Any],
    user_profile: dict[str, Any] | None,
) -> tuple[int, list[str]]:
    """Returns (score_contribution, flags). Score range: 0-30."""
    if not user_profile or not ocr_fields:
        return 0, []

    score = 0
    flags: list[str] = []

    claimed_name = ocr_fields.get("claimed_name")
    if claimed_name:
        full_name = (
            f"{user_profile.get('firstName', '')} "
            f"{user_profile.get('lastName', '')}"
        ).strip()
        if full_name and _name_similarity(claimed_name, full_name) < 0.6:
            score += 25
            flags.append(
                f"name_mismatch:doc='{claimed_name}' profile='{full_name}'"
            )

    return min(score, 30), flags


# ─────────────────────────────────────────────────────────
# Layer 4: Claude Vision LLM check
# ─────────────────────────────────────────────────────────

_FRAUD_PROMPT = """You are a strict, suspicious document-forensics reviewer for a tenant verification system.
The user claims to upload either a government-issued ID document or a proof-of-income (payslip, bank statement, tax form).

REJECT BY DEFAULT unless you are confident the document is genuine. Score generously toward fraud.

CHECK FOR THESE SIGNS (any single one is enough to score >= 60):
1. Document type mismatch — does this image actually look like a real ID or income proof? Or is it a screenshot of something else, a meme, a generic photo, a blank document, or unrelated content?
2. Template / stock-photo appearance — looks like a sample, demo, or website preview rather than a real personal document.
3. Photo of a screen (moiré pattern, screen glare, visible pixels, monitor bezel, keyboard, reflection).
4. Inconsistent fonts, kerning, alignment within the same field (signs of text edits).
5. Pixel artifacts around names, dates, amounts (digital tampering).
6. Mismatched compression patches or visible cloning.
7. Implausible or generic placeholder values: "John Doe", "Jane Smith", "1234 5678", future dates, $999,999 income.
8. Watermarks like "SAMPLE", "SPECIMEN", "VOID", "DRAFT", or website URLs in the document.
9. Missing or fake security features: a real ID has a photo, signature, hologram or microprint; a real payslip has employer details, dates, line items.
10. Hand-drawn, sketched, or AI-generated appearance.
11. Image is blank, all-black, all-white, or has near-zero information content.

ALSO extract every visible piece of text from the document for OCR purposes.
Identify key fields when present: full name, date of birth, ID number, issuing authority,
income amount, employer, dates, addresses.

RESPOND ONLY in this exact JSON, no prose, no markdown fences:
{
  "score": <int 0-100, where 100 = clearly fraudulent>,
  "findings": [<short specific finding string>, ...],
  "document_type_appears_to_be": "<short description of what the image actually shows>",
  "confidence": <"low"|"medium"|"high">,
  "extracted_text": "<all visible text from the document, preserve line breaks>",
  "extracted_fields": {
    "name": "<full name on document, or null>",
    "date_of_birth": "<DOB or null>",
    "id_number": "<ID number or null>",
    "issuer": "<issuing authority or null>",
    "income": "<numeric income amount or null>",
    "employer": "<employer name or null>",
    "dates": [<date strings found>],
    "address": "<address or null>"
  }
}
"""


@dataclass
class LlmCheckOutput:
    score_contribution: int
    findings: list[str]
    ocr_text: str | None = None
    ocr_fields: dict[str, Any] = field(default_factory=dict)


def _parse_llm_json(text: str) -> LlmCheckOutput:
    """Extract score + findings + OCR data from a JSON object in the model response."""
    import json

    try:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("no JSON in LLM response")
        parsed = json.loads(text[start : end + 1])
    except Exception as exc:
        logger.warning(f"[fraud] LLM response parse failed: {exc} text={text!r}")
        return LlmCheckOutput(score_contribution=0, findings=[])

    raw_score = int(parsed.get("score", 0))
    findings = [str(f) for f in parsed.get("findings", [])]
    contribution = min(int(raw_score * 0.5), 50)

    extracted_text = parsed.get("extracted_text") or None

    raw_fields = parsed.get("extracted_fields") or {}
    ocr_fields: dict[str, Any] = {}
    if isinstance(raw_fields, dict):
        # Map LLM field names to our internal keys for cross-validation.
        if raw_fields.get("name"):
            ocr_fields["claimed_name"] = str(raw_fields["name"]).strip()
        if raw_fields.get("income"):
            try:
                ocr_fields["claimed_income"] = float(
                    str(raw_fields["income"])
                    .replace(" ", "")
                    .replace(",", ".")
                    .replace("$", "")
                    .replace("€", "")
                    .replace("TND", "")
                )
            except (ValueError, TypeError):
                ocr_fields["claimed_income"] = raw_fields["income"]
        for key in (
            "date_of_birth",
            "id_number",
            "issuer",
            "employer",
            "address",
        ):
            if raw_fields.get(key):
                ocr_fields[key] = raw_fields[key]
        if raw_fields.get("dates"):
            ocr_fields["dates_found"] = raw_fields["dates"]

    return LlmCheckOutput(
        score_contribution=contribution,
        findings=findings,
        ocr_text=extracted_text,
        ocr_fields=ocr_fields,
    )


async def _run_anthropic_check(
    image_bytes: bytes, mime_type: str
) -> tuple[LlmCheckOutput, list[str]]:
    """Returns (output, error_flags)."""
    try:
        from anthropic import AsyncAnthropic
    except ImportError:
        logger.warning("[fraud] anthropic SDK not installed")
        return LlmCheckOutput(0, []), ["llm_unavailable:anthropic_sdk_missing"]

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    try:
        response = await client.messages.create(
            model=settings.anthropic_vision_model,
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": _FRAUD_PROMPT},
                    ],
                }
            ],
        )
    except Exception as exc:
        logger.warning(f"[fraud] anthropic call failed: {exc}")
        return (
            LlmCheckOutput(0, []),
            [f"llm_unavailable:anthropic:{type(exc).__name__}"],
        )

    text = "".join(
        block.text for block in response.content if hasattr(block, "text")
    )
    return _parse_llm_json(text), []


async def _run_gemini_check(
    image_bytes: bytes, mime_type: str
) -> tuple[LlmCheckOutput, list[str]]:
    """Returns (output, error_flags)."""
    try:
        import google.generativeai as genai  # type: ignore
    except ImportError:
        logger.warning("[fraud] google-generativeai SDK not installed")
        return LlmCheckOutput(0, []), ["llm_unavailable:gemini_sdk_missing"]

    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_vision_model)
        # Gemini SDK is sync; run in a thread to avoid blocking the event loop.
        import asyncio

        def _call() -> str:
            response = model.generate_content(
                [
                    {"mime_type": mime_type, "data": image_bytes},
                    _FRAUD_PROMPT,
                ],
                generation_config={
                    "temperature": 0.0,
                    "max_output_tokens": 2048,
                    "response_mime_type": "application/json",
                },
            )
            return response.text or ""

        text = await asyncio.to_thread(_call)
    except Exception as exc:
        logger.warning(f"[fraud] gemini call failed: {exc}")
        return (
            LlmCheckOutput(0, []),
            [f"llm_unavailable:gemini:{type(exc).__name__}"],
        )

    return _parse_llm_json(text), []


async def run_llm_check(
    image_bytes: bytes, mime_type: str
) -> tuple[LlmCheckOutput, list[str]]:
    """Returns (output, info_flags).

    Provider priority: Anthropic if key set, else Gemini.
    info_flags is non-empty when the LLM layer was skipped — admins should know
    that the analysis is incomplete.
    """
    if not settings.fraud_detection_use_llm:
        return LlmCheckOutput(0, []), ["llm_skipped:disabled"]

    if settings.anthropic_api_key:
        return await _run_anthropic_check(image_bytes, mime_type)

    if settings.gemini_api_key:
        return await _run_gemini_check(image_bytes, mime_type)

    return LlmCheckOutput(0, []), ["llm_skipped:no_api_key"]


# ─────────────────────────────────────────────────────────
# Orchestration
# ─────────────────────────────────────────────────────────

def _compute_risk_level(score: int) -> str:
    if score >= 60:
        return "high"
    if score >= 30:
        return "medium"
    return "low"


async def fetch_image(url: str) -> tuple[bytes, str]:
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        mime = resp.headers.get("content-type", "image/jpeg").split(";")[0]
        if mime not in {"image/jpeg", "image/png", "image/webp"}:
            # Default to jpeg for unknown image types; PDFs are not supported in Phase 1.
            mime = "image/jpeg"
        return resp.content, mime


async def analyze_document(
    file_url: str,
    document_type: str,
    user_profile: dict[str, Any] | None = None,
) -> FraudAnalysisResult:
    logger.info(
        f"[fraud] analyze_document type={document_type} url={file_url[:80]}"
    )
    image_bytes, mime = await fetch_image(file_url)

    total_score = 0
    flags: list[str] = []

    # Layer 1: EXIF
    exif_score, exif_flags = analyze_exif(image_bytes)
    total_score += exif_score
    flags.extend(exif_flags)

    # Layer 1b: Image quality / dimensions
    quality_score, quality_flags = analyze_image_quality(image_bytes)
    total_score += quality_score
    flags.extend(quality_flags)

    # Layer 2 + 4: LLM does fraud detection AND OCR + field extraction in one call.
    llm_output, llm_info_flags = await run_llm_check(image_bytes, mime)
    total_score += llm_output.score_contribution
    flags.extend(llm_info_flags)

    ocr_text = llm_output.ocr_text
    ocr_fields: dict[str, Any] = dict(llm_output.ocr_fields)

    # Tesseract is only attempted when the LLM call actually FAILED (e.g. SDK
    # missing, network error). If the LLM call succeeded but the document just
    # has no extractable text, that's a valid empty result — don't fall back.
    llm_call_failed = any(
        f.startswith("llm_unavailable") or f.startswith("llm_skipped")
        for f in llm_info_flags
    )
    if llm_call_failed and not ocr_text:
        tess_text, tess_fields, tess_info = run_ocr(image_bytes)
        if tess_text:
            ocr_text = tess_text
            for k, v in tess_fields.items():
                ocr_fields.setdefault(k, v)
        else:
            flags.extend(tess_info)

    # Layer 3: Cross-validation against user profile
    cross_score, cross_flags = cross_validate(ocr_fields, user_profile)
    total_score += cross_score
    flags.extend(cross_flags)

    final_score = max(0, min(100, total_score))

    return FraudAnalysisResult(
        fraud_score=final_score,
        risk_level=_compute_risk_level(final_score),
        flags=flags,
        ocr_text=ocr_text,
        ocr_fields=ocr_fields,
        llm_findings=llm_output.findings,
    )
