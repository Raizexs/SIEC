from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy.orm import Session

try:
    import models
except ModuleNotFoundError:
    from backend import models  # type: ignore


EXPORT_SCHEMA_VERSION = "1.0"
AUDIT_EXPORT_LIMIT = 100


def _serialize_dt(value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _row_to_dict(row: Any, exclude: frozenset = frozenset()) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    for col in row.__table__.columns:
        name = col.name
        if name in exclude:
            continue
        val = getattr(row, name)
        if isinstance(val, UUID):
            val = str(val)
        elif isinstance(val, Decimal):
            val = float(val)
        elif hasattr(val, "isoformat"):
            val = val.isoformat()
        data[name] = val
    return data


def build_user_export(db: Session, user_id: str, jwt_claims: Dict[str, Any]) -> Dict[str, Any]:
    uid = UUID(user_id) if isinstance(user_id, str) else user_id
    now = datetime.now(timezone.utc)

    app_user = db.query(models.AppUser).filter(models.AppUser.id == uid).first()

    projects = db.query(models.Proyecto).filter(models.Proyecto.owner_id == uid).all()
    project_ids = [p.id for p in projects]

    versions: List[models.ProyectoVersion] = []
    comments: List[models.ProyectoComentario] = []
    if project_ids:
        versions = (
            db.query(models.ProyectoVersion)
            .filter(models.ProyectoVersion.proyecto_id.in_(project_ids))
            .all()
        )
        comments = (
            db.query(models.ProyectoComentario)
            .filter(models.ProyectoComentario.proyecto_id.in_(project_ids))
            .all()
        )

    consents: List[models.UserConsent] = []
    try:
        consents = (
            db.query(models.UserConsent)
            .filter(models.UserConsent.user_id == uid)
            .order_by(models.UserConsent.granted_at.desc())
            .all()
        )
    except Exception:
        db.rollback()

    subscription = db.query(models.UserSubscription).filter(models.UserSubscription.user_id == uid).first()
    usage = db.query(models.UserUsage).filter(models.UserUsage.user_id == uid).first()

    listings = db.query(models.SiecplaceListing).filter(models.SiecplaceListing.owner_id == uid).all()
    unlocks = db.query(models.SiecplaceLeadUnlock).filter(models.SiecplaceLeadUnlock.contractor_user_id == uid).all()
    payments = db.query(models.SiecplacePayment).filter(models.SiecplacePayment.user_id == uid).all()

    audit_events = (
        db.query(models.Auditoria)
        .filter(models.Auditoria.actor_id == uid)
        .order_by(models.Auditoria.created_at.desc())
        .limit(AUDIT_EXPORT_LIMIT)
        .all()
    )

    notifications = (
        db.query(models.Notificacion)
        .filter(models.Notificacion.user_id == uid)
        .all()
    )

    metadata = jwt_claims.get("user_metadata", {}) or {}

    return {
        "_meta": {
            "schema_version": EXPORT_SCHEMA_VERSION,
            "generated_at": now.isoformat(),
            "user_id": str(uid),
            "readme": (
                "Exportación de datos personales SIEC conforme a la Ley 21.719. "
                "Incluye perfil, proyectos, consentimientos, facturación y actividad reciente."
            ),
        },
        "profile": {
            "app_user": _row_to_dict(app_user) if app_user else None,
            "auth_metadata": {
                "full_name": metadata.get("full_name"),
                "company": metadata.get("company"),
                "units": metadata.get("units"),
                "currency": metadata.get("currency"),
                "onboarded": metadata.get("onboarded"),
            },
        },
        "projects": [_row_to_dict(p) for p in projects],
        "project_versions": [_row_to_dict(v) for v in versions],
        "project_comments": [_row_to_dict(c) for c in comments],
        "consents": [_row_to_dict(c) for c in consents],
        "subscription": _row_to_dict(subscription) if subscription else None,
        "usage": _row_to_dict(usage) if usage else None,
        "siecplace_listings": [_row_to_dict(l) for l in listings],
        "siecplace_unlocks": [_row_to_dict(u) for u in unlocks],
        "siecplace_payments": [_row_to_dict(p) for p in payments],
        "notifications": [_row_to_dict(n) for n in notifications],
        "audit_events": [_row_to_dict(a) for a in audit_events],
    }
