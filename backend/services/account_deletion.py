from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

try:
    import models
    from observability import log
except ModuleNotFoundError:
    from backend import models  # type: ignore
    from backend.observability import log  # type: ignore

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
DELETION_TOKEN_TTL_HOURS = int(os.getenv("DELETION_TOKEN_TTL_HOURS", "24"))


def create_deletion_token(db: Session, user_id: str) -> str:
    uid = UUID(user_id) if isinstance(user_id, str) else user_id
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=DELETION_TOKEN_TTL_HOURS)

    db.query(models.AccountDeletionToken).filter(
        models.AccountDeletionToken.user_id == uid,
        models.AccountDeletionToken.used_at.is_(None),
    ).delete(synchronize_session=False)

    row = models.AccountDeletionToken(
        user_id=uid,
        token=token,
        expires_at=expires,
    )
    db.add(row)
    db.flush()
    return token


def validate_deletion_token(db: Session, user_id: str, token: str) -> bool:
    uid = UUID(user_id) if isinstance(user_id, str) else user_id
    now = datetime.now(timezone.utc)
    row = (
        db.query(models.AccountDeletionToken)
        .filter(
            models.AccountDeletionToken.user_id == uid,
            models.AccountDeletionToken.token == token,
            models.AccountDeletionToken.used_at.is_(None),
            models.AccountDeletionToken.expires_at > now,
        )
        .first()
    )
    return row is not None


def _mark_token_used(db: Session, user_id: str, token: str) -> None:
    uid = UUID(user_id) if isinstance(user_id, str) else user_id
    row = (
        db.query(models.AccountDeletionToken)
        .filter(
            models.AccountDeletionToken.user_id == uid,
            models.AccountDeletionToken.token == token,
        )
        .first()
    )
    if row:
        row.used_at = datetime.now(timezone.utc)


async def delete_supabase_auth_user(user_id: str) -> bool:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        log.warning("supabase_admin_delete_skipped", reason="missing credentials")
        return False
    url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.delete(url, headers=headers)
            if res.status_code in (200, 204):
                return True
            log.warning("supabase_admin_delete_failed", status=res.status_code, body=res.text[:200])
    except Exception as exc:
        log.error("supabase_admin_delete_error", error=str(exc))
    return False


def delete_user_data(db: Session, user_id: str, token: Optional[str] = None) -> None:
    uid = UUID(user_id) if isinstance(user_id, str) else user_id

    if token and not validate_deletion_token(db, user_id, token):
        raise ValueError("Token de eliminación inválido o expirado")

    listing_ids = [
        row.id
        for row in db.query(models.SiecplaceListing.id)
        .filter(models.SiecplaceListing.owner_id == uid)
        .all()
    ]

    if listing_ids:
        db.query(models.SiecplaceLeadUnlock).filter(
            models.SiecplaceLeadUnlock.listing_id.in_(listing_ids)
        ).delete(synchronize_session=False)

    db.query(models.SiecplacePayment).filter(models.SiecplacePayment.user_id == uid).delete(synchronize_session=False)
    db.query(models.SiecplaceLeadUnlock).filter(models.SiecplaceLeadUnlock.contractor_user_id == uid).delete(synchronize_session=False)
    db.query(models.SiecplaceListing).filter(models.SiecplaceListing.owner_id == uid).delete(synchronize_session=False)

    project_ids = [
        row.id for row in db.query(models.Proyecto.id).filter(models.Proyecto.owner_id == uid).all()
    ]
    if project_ids:
        db.query(models.ProyectoColaborador).filter(
            models.ProyectoColaborador.proyecto_id.in_(project_ids)
        ).delete(synchronize_session=False)
        db.query(models.ProyectoComentario).filter(
            models.ProyectoComentario.proyecto_id.in_(project_ids)
        ).delete(synchronize_session=False)
        db.query(models.ProyectoVersion).filter(
            models.ProyectoVersion.proyecto_id.in_(project_ids)
        ).delete(synchronize_session=False)

    db.query(models.ProyectoColaborador).filter(models.ProyectoColaborador.usuario_id == uid).delete(synchronize_session=False)
    db.query(models.Proyecto).filter(models.Proyecto.owner_id == uid).delete(synchronize_session=False)
    db.query(models.Notificacion).filter(models.Notificacion.user_id == uid).delete(synchronize_session=False)
    db.query(models.UserConsent).filter(models.UserConsent.user_id == uid).delete(synchronize_session=False)
    db.query(models.UserSubscription).filter(models.UserSubscription.user_id == uid).delete(synchronize_session=False)
    db.query(models.UserUsage).filter(models.UserUsage.user_id == uid).delete(synchronize_session=False)
    db.query(models.AccountDeletionToken).filter(models.AccountDeletionToken.user_id == uid).delete(synchronize_session=False)

    db.query(models.Auditoria).filter(models.Auditoria.actor_id == uid).delete(synchronize_session=False)

    db.query(models.AppUser).filter(models.AppUser.id == uid).delete(synchronize_session=False)

    if token:
        _mark_token_used(db, user_id, token)

    db.flush()
