from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session

try:
    import models
except ModuleNotFoundError:
    from backend import models  # type: ignore


def get_client_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def ensure_app_user(
    db: Session,
    user_id: str,
    email: Optional[str] = None,
    raw_claims: Optional[dict] = None,
) -> models.AppUser:
    """Garantiza fila en app_user (FK de user_consent). Usuarios antiguos pueden no tener trigger."""
    uid = uuid.UUID(str(user_id))
    row = db.query(models.AppUser).filter(models.AppUser.id == uid).first()
    if row:
        return row

    claims = raw_claims or {}
    meta = claims.get("user_metadata") or {}
    resolved_email = (
        email
        or claims.get("email")
        or meta.get("email")
        or f"{user_id}@users.siec.local"
    )

    row = models.AppUser(
        id=uid,
        email=resolved_email,
        full_name=meta.get("full_name"),
        company=meta.get("company"),
        avatar_url=meta.get("avatar_url"),
        role=(meta.get("role") or claims.get("role") or "architect"),
        preferences=meta.get("preferences") or {},
    )
    db.add(row)
    db.flush()
    return row


def get_active_policy(db: Session) -> Optional[models.PrivacyPolicyVersion]:
    return (
        db.query(models.PrivacyPolicyVersion)
        .order_by(models.PrivacyPolicyVersion.published_at.desc())
        .first()
    )


def has_active_consent(
    db: Session,
    user_id: str,
    consent_type: str,
) -> bool:
    record = (
        db.query(models.UserConsent)
        .filter(
            models.UserConsent.user_id == user_id,
            models.UserConsent.consent_type == consent_type,
            models.UserConsent.granted.is_(True),
            models.UserConsent.revoked_at.is_(None),
        )
        .order_by(models.UserConsent.granted_at.desc())
        .first()
    )
    return record is not None


def record_consent(
    db: Session,
    user_id: str,
    consent_type: str,
    policy_version: str,
    granted: bool,
    ip_address: Optional[str],
    user_agent: Optional[str],
    metadata: Optional[dict] = None,
) -> models.UserConsent:
    if not granted:
        existing = (
            db.query(models.UserConsent)
            .filter(
                models.UserConsent.user_id == user_id,
                models.UserConsent.consent_type == consent_type,
                models.UserConsent.granted.is_(True),
                models.UserConsent.revoked_at.is_(None),
            )
            .all()
        )
        now = datetime.now(timezone.utc)
        for row in existing:
            row.revoked_at = now
            row.granted = False
        db.flush()
        return existing[0] if existing else models.UserConsent(
            user_id=user_id,
            consent_type=consent_type,
            policy_version=policy_version,
            granted=False,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {},
        )

    row = models.UserConsent(
        user_id=user_id,
        consent_type=consent_type,
        policy_version=policy_version,
        granted=True,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata or {},
    )
    db.add(row)
    db.flush()
    return row
