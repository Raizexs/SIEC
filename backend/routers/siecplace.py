"""Router SIEC Place — marketplace de obras."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from auth import CurrentUser, get_current_user
    from database import get_db
    from billing.service import require_marketplace_access
    import models
    from siecplace.payments import create_lead_unlock_checkout, create_listing_publish_checkout
    from siecplace.serializers import get_owner_contact, listing_to_public, user_has_unlock
except ModuleNotFoundError:
    from backend.auth import CurrentUser, get_current_user  # type: ignore
    from backend.database import get_db  # type: ignore
    from backend.billing.service import require_marketplace_access  # type: ignore
    from backend import models  # type: ignore
    from backend.siecplace.payments import create_lead_unlock_checkout, create_listing_publish_checkout  # type: ignore
    from backend.siecplace.serializers import (  # type: ignore
        get_owner_contact,
        listing_to_public,
        user_has_unlock,
    )

router = APIRouter(prefix="/siecplace", tags=["siecplace"])


class ListingCreateBody(BaseModel):
    project_id: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=200)
    region: Optional[str] = Field(None, max_length=120)
    m2: Optional[int] = Field(None, ge=1)
    material_id: Optional[int] = None
    estimated_total_clp: Optional[float] = None
    budget_metadata: dict = Field(default_factory=dict)


class ListingResponse(BaseModel):
    id: str
    title: str
    region: Optional[str] = None
    m2: Optional[int] = None
    material_id: Optional[int] = None
    material_label: Optional[str] = None
    estimated_total_clp: Optional[float] = None
    status: str
    published_at: Optional[str] = None
    created_at: Optional[str] = None
    owner_id: str
    project_id: Optional[str] = None
    unlocked: bool = False
    contact: Optional[dict] = None


def _get_listing_or_404(db: Session, listing_id: str) -> models.SiecplaceListing:
    try:
        lid = UUID(listing_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Listado no encontrado") from exc
    row = db.query(models.SiecplaceListing).filter_by(id=lid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Listado no encontrado")
    return row


def _hydrate_from_project(db: Session, body: ListingCreateBody, user: CurrentUser) -> ListingCreateBody:
    if not body.project_id:
        return body
    try:
        pid = UUID(body.project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="project_id inválido") from exc

    project = db.query(models.Proyecto).filter_by(id=pid).first()
    if not project or str(project.owner_id) != user.id:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    return ListingCreateBody(
        project_id=body.project_id,
        title=body.title or project.name,
        region=body.region or project.ubicacion,
        m2=body.m2 or project.m2_totales,
        material_id=body.material_id or project.material_id,
        estimated_total_clp=(
            body.estimated_total_clp
            if body.estimated_total_clp is not None
            else (float(project.estimated_cost) if project.estimated_cost is not None else None)
        ),
        budget_metadata=body.budget_metadata or {},
    )


@router.get("/listings", response_model=List[ListingResponse])
def list_published_listings(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.SiecplaceListing)
        .filter(models.SiecplaceListing.status == "published")
        .order_by(models.SiecplaceListing.published_at.desc())
        .limit(100)
        .all()
    )
    return [
        listing_to_public(
            row,
            unlocked=user_has_unlock(db, row.id, user.id),
        )
        for row in rows
    ]


@router.get("/listings/mine", response_model=List[ListingResponse])
def list_my_listings(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_marketplace_access(db, user.id)
    rows = (
        db.query(models.SiecplaceListing)
        .filter(models.SiecplaceListing.owner_id == UUID(user.id))
        .order_by(models.SiecplaceListing.created_at.desc())
        .all()
    )
    return [listing_to_public(row, unlocked=True) for row in rows]


@router.post("/listings", response_model=ListingResponse)
def create_listing(
    body: ListingCreateBody,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_marketplace_access(db, user.id)
    hydrated = _hydrate_from_project(db, body, user)

    project_uuid = UUID(hydrated.project_id) if hydrated.project_id else None
    listing = models.SiecplaceListing(
        owner_id=UUID(user.id),
        project_id=project_uuid,
        title=hydrated.title.strip(),
        region=(hydrated.region or "").strip() or None,
        m2=hydrated.m2,
        material_id=hydrated.material_id,
        estimated_total_clp=hydrated.estimated_total_clp,
        status="draft",
        budget_metadata=hydrated.budget_metadata,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing_to_public(listing, unlocked=True)


@router.get("/listings/{listing_id}", response_model=ListingResponse)
def get_listing(
    listing_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = _get_listing_or_404(db, listing_id)
    if listing.status != "published" and str(listing.owner_id) != user.id:
        raise HTTPException(status_code=404, detail="Listado no encontrado")

    is_owner = str(listing.owner_id) == user.id
    unlocked = is_owner or user_has_unlock(db, listing.id, user.id)
    contact = None
    if unlocked and listing.status == "published":
        contact = get_owner_contact(db, listing.owner_id)

    return listing_to_public(listing, unlocked=unlocked, contact=contact if unlocked else None)


@router.post("/listings/{listing_id}/checkout-publish")
def checkout_publish_listing(
    listing_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_marketplace_access(db, user.id)
    listing = _get_listing_or_404(db, listing_id)
    if str(listing.owner_id) != user.id:
        raise HTTPException(status_code=403, detail="No puedes publicar este listado")
    if listing.status == "published":
        raise HTTPException(status_code=409, detail="Este listado ya está publicado")

    result = create_listing_publish_checkout(
        db,
        listing=listing,
        user_id=user.id,
        user_email=user.email,
    )
    db.commit()
    return result


@router.post("/listings/{listing_id}/checkout-unlock")
def checkout_unlock_listing(
    listing_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_marketplace_access(db, user.id)
    listing = _get_listing_or_404(db, listing_id)
    if listing.status != "published":
        raise HTTPException(status_code=400, detail="Solo puedes desbloquear obras publicadas")
    if str(listing.owner_id) == user.id:
        raise HTTPException(status_code=400, detail="No puedes desbloquear tu propia publicación")

    result = create_lead_unlock_checkout(
        db,
        listing=listing,
        contractor_user_id=user.id,
        contractor_email=user.email,
    )
    db.commit()
    return result
