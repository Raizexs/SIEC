"""
Exportación de documentos (PDF vectorial vía Playwright).
"""
from __future__ import annotations

import asyncio
import os
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

try:
    from auth import (
        ALLOW_ANONYMOUS,
        SUPABASE_JWT_SECRET,
        CurrentUser,
        bearer_scheme,
        verify_supabase_jwt,
    )
except ModuleNotFoundError:
    from backend.auth import (  # type: ignore
        ALLOW_ANONYMOUS,
        SUPABASE_JWT_SECRET,
        CurrentUser,
        bearer_scheme,
        verify_supabase_jwt,
    )

try:
    from services.proposal_pdf import (
        ProposalPdfError,
        html_to_pdf_bytes,
        is_proposal_pdf_available,
    )
except ModuleNotFoundError:
    from backend.services.proposal_pdf import (  # type: ignore
        ProposalPdfError,
        html_to_pdf_bytes,
        is_proposal_pdf_available,
    )

router = APIRouter(prefix="/export", tags=["export"])

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="proposal-pdf")


class ProposalPdfRequest(BaseModel):
    html: str = Field(..., min_length=50, max_length=6_000_000)
    filename: Optional[str] = Field(
        default=None,
        description="Nombre sugerido para Content-Disposition",
        max_length=200,
    )


def _is_dev_export() -> bool:
    return os.getenv("ENV", "development").lower() == "development"


def get_user_for_export(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUser:
    """Auth laxa en dev: exportar PDF sin bloquear por JWT local incompleto."""
    dev_mode = _is_dev_export() or ALLOW_ANONYMOUS

    if not creds or not creds.credentials:
        if dev_mode:
            return CurrentUser(
                id="anon-dev",
                email=None,
                role="anonymous",
                aal=None,
                raw_claims={},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inicia sesión para exportar PDF.",
        )

    if not SUPABASE_JWT_SECRET or SUPABASE_JWT_SECRET == "your-jwt-secret":
        if dev_mode:
            return CurrentUser(
                id="dev-export",
                email=None,
                role="authenticated",
                aal=None,
                raw_claims={},
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPABASE_JWT_SECRET no configurado en el servidor.",
        )

    try:
        claims = verify_supabase_jwt(creds.credentials)
    except HTTPException:
        if dev_mode:
            return CurrentUser(
                id="dev-export-jwt-skip",
                email=None,
                role="authenticated",
                aal=None,
                raw_claims={},
            )
        raise
    user_metadata = claims.get("user_metadata", {}) or {}
    role = user_metadata.get("role") or claims.get("role") or "authenticated"
    return CurrentUser(
        id=claims.get("sub"),
        email=claims.get("email"),
        role=role,
        aal=claims.get("aal"),
        raw_claims=claims,
    )


def _safe_filename(name: Optional[str]) -> str:
    raw = (name or "SIEC_Presupuesto.pdf").strip()
    if not raw.lower().endswith(".pdf"):
        raw = f"{raw}.pdf"
    safe = re.sub(r"[^\w.\-]+", "_", raw, flags=re.UNICODE)
    return safe[:180] or "SIEC_Presupuesto.pdf"


@router.get("/proposal-pdf/status")
def proposal_pdf_status():
    return {
        "available": is_proposal_pdf_available(),
        "engine": "playwright-chromium-print",
        "vector_text": True,
    }


@router.post("/proposal-pdf")
async def create_proposal_pdf(
    body: ProposalPdfRequest,
    _user: CurrentUser = Depends(get_user_for_export),
):
    if not is_proposal_pdf_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Exportación PDF vectorial no disponible en este servidor. "
                "Instala Playwright: pip install playwright && playwright install chromium"
            ),
        )

    loop = asyncio.get_running_loop()
    try:
        pdf_bytes = await loop.run_in_executor(
            _executor,
            html_to_pdf_bytes,
            body.html,
        )
    except ProposalPdfError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo generar el PDF: {exc}",
        ) from exc

    filename = _safe_filename(body.filename)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )
