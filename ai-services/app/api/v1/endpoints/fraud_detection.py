# ===========================================
# SmartProperty AI - Fraud Detection Endpoint
# ===========================================

from typing import Any

from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel, Field

from app.services.fraud_detection_service import analyze_document

router = APIRouter()


class AnalyzeDocumentRequest(BaseModel):
    file_url: str = Field(..., description="Public/signed URL of the uploaded document")
    document_type: str = Field(..., description="identity | proof_of_income")
    user_profile: dict[str, Any] | None = Field(
        default=None,
        description="User profile fields used for cross-validation (firstName, lastName, email, phone)",
    )


class AnalyzeDocumentResponse(BaseModel):
    fraud_score: int = Field(ge=0, le=100)
    risk_level: str
    flags: list[str]
    ocr_text: str | None = None
    ocr_fields: dict[str, Any] = {}
    llm_findings: list[str] = []
    analyzed_at: str


@router.post("/analyze", response_model=AnalyzeDocumentResponse)
async def analyze(req: AnalyzeDocumentRequest) -> AnalyzeDocumentResponse:
    """
    Run layered fraud analysis on a verification document.

    Layers: EXIF metadata → OCR + field extraction → user-profile cross-check → Claude Vision.
    Each layer adds weighted points to the overall fraud score (0-100).
    """
    try:
        result = await analyze_document(
            file_url=req.file_url,
            document_type=req.document_type,
            user_profile=req.user_profile,
        )
    except Exception as exc:
        logger.exception("[fraud] analyze failed")
        raise HTTPException(status_code=502, detail=f"fraud analysis failed: {exc}")

    return AnalyzeDocumentResponse(
        fraud_score=result.fraud_score,
        risk_level=result.risk_level,
        flags=result.flags,
        ocr_text=result.ocr_text,
        ocr_fields=result.ocr_fields,
        llm_findings=result.llm_findings,
        analyzed_at=result.analyzed_at,
    )
