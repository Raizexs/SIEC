"""Serialización y helpers de listados SIEC Place."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

try:
    import models
except ModuleNotFoundError:
    from backend import models  # type: ignore

MATERIAL_LABELS = {
    1: "Madera",
    2: "Metalcom",
    3: "Albañilería",
    4: "Hormigón",
}


def material_label(material_id: int | None) -> str | None:
    if material_id is None:
        return None
    return MATERIAL_LABELS.get(int(material_id))


def listing_to_public(row: models.SiecplaceListing, *, unlocked: bool = False, contact: dict | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": str(row.id),
        "title": row.title,
        "region": row.region,
        "m2": row.m2,
        "material_id": row.material_id,
        "material_label": material_label(row.material_id),
        "estimated_total_clp": float(row.estimated_total_clp) if row.estimated_total_clp is not None else None,
        "status": row.status,
        "published_at": row.published_at.isoformat() if row.published_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "owner_id": str(row.owner_id),
        "project_id": str(row.project_id) if row.project_id else None,
        "unlocked": unlocked,
    }
    if unlocked and contact:
        payload["contact"] = contact
    return payload


def get_owner_contact(db: Session, owner_id: UUID) -> dict[str, str | None]:
    user = db.query(models.AppUser).filter_by(id=owner_id).first()
    if not user:
        return {"email": None, "full_name": None}
    return {"email": user.email, "full_name": user.full_name}


def user_has_unlock(db: Session, listing_id: UUID, user_id: str) -> bool:
    row = (
        db.query(models.SiecplaceLeadUnlock)
        .filter_by(listing_id=listing_id, contractor_user_id=UUID(user_id), fee_paid=True)
        .first()
    )
    return row is not None


def close_stale_pending_listings(db: Session, listing: models.SiecplaceListing) -> None:
    if listing.status == "pending_payment":
        listing.status = "draft"
