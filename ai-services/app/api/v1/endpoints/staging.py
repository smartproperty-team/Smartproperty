# ===========================================
# SmartProperty AI - Virtual Staging Endpoints
# ===========================================
"""Virtual staging endpoints.

POST /api/v1/staging/stage   — Request AI staging of a room image
GET  /api/v1/staging/jobs/{job_id} — Poll job status
GET  /api/v1/staging/result/{job_id} — Serve staged image
GET  /api/v1/staging/styles  — List available staging styles
DELETE /api/v1/staging/jobs/{job_id} — Delete a staging job
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse
from loguru import logger
from pydantic import BaseModel, Field

from app.services.staging_service import get_staging_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class StageRequest(BaseModel):
    image_url: str = Field(..., description="URL of the room image to stage")
    style: str = Field(..., description="Staging style ID (modern, scandinavian, etc.)")
    room_type: Optional[str] = Field(
        None, description="Room type for context (living_room, bedroom, etc.)"
    )
    strength: Optional[float] = Field(
        None,
        ge=0.1,
        le=0.8,
        description="How much to change the image (0.1=subtle, 0.8=dramatic)",
    )
    property_id: Optional[str] = Field(None, description="Property ID for file organization")


class StageResponse(BaseModel):
    job_id: str = Field(..., alias="jobId")
    status: str
    message: str
    staged_image_path: Optional[str] = Field(None, alias="stagedImagePath")
    error: Optional[str] = None

    model_config = {"populate_by_name": True}


class StyleInfo(BaseModel):
    id: str
    name: str
    description: str
    prompt: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/styles", response_model=list[StyleInfo])
async def list_styles():
    """List all available virtual staging styles."""
    svc = get_staging_service()
    return svc.get_styles()


@router.post("/stage", response_model=StageResponse, status_code=status.HTTP_202_ACCEPTED)
async def request_staging(req: StageRequest, background_tasks: BackgroundTasks):
    """Request AI virtual staging of a room image.

    Creates an async job that downloads the image, sends it to Stability AI,
    and saves the staged result. Poll /jobs/{job_id} for status.
    """
    svc = get_staging_service()
    try:
        job = svc.request_staging(
            image_url=req.image_url,
            style=req.style,
            room_type=req.room_type,
            strength=req.strength,
            property_id=req.property_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    # Process in background
    background_tasks.add_task(_process_job, job["jobId"])

    return StageResponse(
        jobId=job["jobId"],
        status=job["status"],
        message=job["message"],
    )


@router.get("/jobs/{job_id}", response_model=StageResponse)
async def get_job_status(job_id: str):
    """Get the status of a staging job."""
    svc = get_staging_service()
    job = svc.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return StageResponse(
        jobId=job["jobId"],
        status=job["status"],
        message=job["message"],
        stagedImagePath=job.get("stagedImagePath"),
        error=job.get("error"),
    )


@router.get("/result/{job_id}")
async def get_staged_image(job_id: str):
    """Serve the staged image file for a completed job."""
    svc = get_staging_service()
    job = svc.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Job is not yet completed (status: {job['status']})",
        )

    path = job.get("stagedImagePath")
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="Staged image file not found")

    return FileResponse(
        path=path,
        media_type="image/jpeg",
        filename=f"staged-{job_id}.jpg",
    )


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str):
    """Delete a staging job and its output file."""
    svc = get_staging_service()
    if not svc.delete_job(job_id):
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")


# ---------------------------------------------------------------------------
# Background task helper
# ---------------------------------------------------------------------------


async def _process_job(job_id: str) -> None:
    svc = get_staging_service()
    try:
        await svc.process_job(job_id)
    except Exception as exc:
        logger.error(f"[staging] Background processing failed for {job_id}: {exc}")
