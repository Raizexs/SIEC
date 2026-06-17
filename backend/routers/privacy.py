from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

try:
    from auth import CurrentUser, get_current_user
    from database import get_db
    import models
    from schemas_privacy import (
        CONSENT_TYPES,
        REVOKEABLE_CONSENTS,
        ConsentCreate,
        ConsentOut,
        ConsentRevoke,
        ConsentStatusOut,
        PrivacyPolicyOut,
    )
    from services.privacy_helpers import (
        get_active_policy,
        get_client_ip,
        has_active_consent,
        record_consent,
    )
except ModuleNotFoundError:
    from backend.auth import CurrentUser, get_current_user  # type: ignore
    from backend.database import get_db  # type: ignore
    from backend import models  # type: ignore
    from backend.schemas_privacy import (  # type: ignore
        CONSENT_TYPES,
        REVOKEABLE_CONSENTS,
        ConsentCreate,
        ConsentOut,
        ConsentRevoke,
        ConsentStatusOut,
        PrivacyPolicyOut,
    )
    from backend.services.privacy_helpers import (  # type: ignore
        get_active_policy,
        get_client_ip,
        has_active_consent,
        record_consent,
    )

router = APIRouter(prefix="/privacy", tags=["privacy"])


@router.get("/policy", response_model=PrivacyPolicyOut)
def get_policy(db: Session = Depends(get_db)):
    policy = get_active_policy(db)
    if not policy:
        raise HTTPException(status_code=404, detail="No hay política de privacidad publicada")
    return policy


@router.post("/consent", response_model=ConsentOut, status_code=status.HTTP_201_CREATED)
def create_consent(
    body: ConsentCreate,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.consent_type not in CONSENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Tipo de consentimiento no válido: {body.consent_type}")

    policy = get_active_policy(db)
    if policy and body.consent_type in ("privacy_policy", "terms"):
        if body.policy_version != policy.version:
            raise HTTPException(
                status_code=400,
                detail=f"Debe aceptar la versión vigente de la política: {policy.version}",
            )

    row = record_consent(
        db,
        user_id=user.id,
        consent_type=body.consent_type,
        policy_version=body.policy_version,
        granted=body.granted,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        metadata=body.metadata,
    )
    db.commit()
    db.refresh(row)
    return row


@router.get("/consents", response_model=List[ConsentOut])
def list_consents(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.UserConsent)
        .filter(models.UserConsent.user_id == user.id)
        .order_by(models.UserConsent.granted_at.desc())
        .all()
    )
    return rows


@router.get("/consents/status", response_model=List[ConsentStatusOut])
def consent_status(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result: List[ConsentStatusOut] = []
    for ctype in sorted(CONSENT_TYPES):
        row = (
            db.query(models.UserConsent)
            .filter(
                models.UserConsent.user_id == user.id,
                models.UserConsent.consent_type == ctype,
                models.UserConsent.granted.is_(True),
                models.UserConsent.revoked_at.is_(None),
            )
            .order_by(models.UserConsent.granted_at.desc())
            .first()
        )
        result.append(
            ConsentStatusOut(
                consent_type=ctype,
                has_active_consent=row is not None,
                policy_version=row.policy_version if row else None,
                granted_at=row.granted_at if row else None,
            )
        )
    return result


@router.post("/consent/revoke", response_model=ConsentOut)
def revoke_consent(
    body: ConsentRevoke,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.consent_type not in REVOKEABLE_CONSENTS:
        raise HTTPException(
            status_code=400,
            detail="Este consentimiento no puede revocarse sin eliminar la cuenta",
        )

    policy = get_active_policy(db)
    version = policy.version if policy else "1.0"

    row = record_consent(
        db,
        user_id=user.id,
        consent_type=body.consent_type,
        policy_version=version,
        granted=False,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.commit()
    db.refresh(row)
    return row


def require_consent(consent_type: str):
    """Dependency factory: raises 403 if user lacks active consent."""

    def _check(
        user: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> CurrentUser:
        if not has_active_consent(db, user.id, consent_type):
            raise HTTPException(
                status_code=403,
                detail=f"Se requiere consentimiento activo: {consent_type}",
            )
        return user

    return _check
