"""
Marketplace router — public catalog of project presets shared by the community.
Each architect can publish a preset to the marketplace; others can browse and
clone it into their workspace.

For the demo, presets are stored in the same `proyecto` table with a special
`is_public_preset` flag (added at runtime if missing — schema migration to add
column lives in a future Alembic revision).
"""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

try:
    from auth import CurrentUser, get_current_user, get_optional_user
    from database import get_db
    import models
    import schemas_projects as schemas
except ModuleNotFoundError:  # pragma: no cover
    from backend.auth import CurrentUser, get_current_user, get_optional_user  # type: ignore
    from backend.database import get_db  # type: ignore
    from backend import models  # type: ignore
    from backend import schemas_projects as schemas  # type: ignore

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


@router.get("/presets")
def list_presets(
    search: Optional[str] = Query(None, max_length=200),
    user: Optional[CurrentUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Return community-published presets. Auth optional — public catalog."""
    q = db.query(models.Proyecto).filter(models.Proyecto.is_public == True)  # noqa: E712
    if search:
        like = f"%{search.lower()}%"
        from sqlalchemy import func, or_
        q = q.filter(
            or_(
                func.lower(models.Proyecto.name).like(like),
                func.lower(models.Proyecto.description).like(like),
            )
        )
    rows = q.order_by(models.Proyecto.updated_at.desc()).limit(48).all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "tags": p.tags or [],
            "thumbnail_url": p.thumbnail_url,
            "m2_totales": p.m2_totales,
            "material_id": p.material_id,
            "owner_id": str(p.owner_id),
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in rows
    ]


@router.post("/presets/{preset_id}/clone", response_model=schemas.ProjectResponse, status_code=201)
def clone_preset(
    preset_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    src = db.query(models.Proyecto).filter_by(id=preset_id, is_public=True).first()
    if not src:
        raise HTTPException(404, "Preset no encontrado o no público")
    clone = models.Proyecto(
        owner_id=user.id,
        name=f"{src.name} (copia)",
        description=src.description,
        tags=src.tags,
        payload=src.payload,
        thumbnail_url=src.thumbnail_url,
        estimated_cost=src.estimated_cost,
        m2_totales=src.m2_totales,
        material_id=src.material_id,
    )
    db.add(clone)
    audit = models.Auditoria(
        actor_id=user.id,
        action="marketplace.preset.cloned",
        entity_type="project",
        entity_id=str(preset_id),
        extra={"name": src.name},
    )
    db.add(audit)
    db.commit()
    db.refresh(clone)
    return clone
