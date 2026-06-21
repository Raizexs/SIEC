"""
Pydantic schemas for the multi-tenant project API.
Kept separate from `schemas.py` (cost-estimation domain) to avoid coupling.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    cliente: Optional[str] = None
    ubicacion: Optional[str] = None
    tags: List[str] = []
    payload: dict = {}
    thumbnail_url: Optional[str] = None
    estimated_cost: Optional[float] = None
    m2_totales: Optional[int] = None
    material_id: Optional[int] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cliente: Optional[str] = None
    ubicacion: Optional[str] = None
    tags: Optional[List[str]] = None
    payload: Optional[dict] = None
    thumbnail_url: Optional[str] = None
    estimated_cost: Optional[float] = None
    m2_totales: Optional[int] = None
    material_id: Optional[int] = None
    archived: Optional[bool] = None


class ProjectResponse(ProjectBase):
    id: UUID
    owner_id: UUID
    archived: bool
    is_public: bool
    public_token: Optional[str] = None
    public_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VersionCreate(BaseModel):
    summary: Optional[str] = None
    payload: dict


class VersionResponse(BaseModel):
    id: UUID
    proyecto_id: UUID
    version_number: int
    author_id: UUID
    summary: Optional[str] = None
    payload: dict
    created_at: datetime

    class Config:
        from_attributes = True


class CollaboratorAdd(BaseModel):
    usuario_id: UUID
    rol: str = Field(default="viewer", pattern="^(viewer|editor|owner)$")


class CollaboratorResponse(BaseModel):
    proyecto_id: UUID
    usuario_id: UUID
    rol: str
    invited_at: datetime
    accepted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1)
    parent_id: Optional[UUID] = None
    anchor: Optional[dict] = None


class CommentResponse(BaseModel):
    id: UUID
    proyecto_id: UUID
    parent_id: Optional[UUID] = None
    author_id: UUID
    body: str
    anchor: Optional[dict] = None
    resolved: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShareLinkRequest(BaseModel):
    expires_in_days: int = Field(default=7, ge=1, le=90)
    hide_cliente: bool = False


class PublicProjectResponse(BaseModel):
    name: str
    description: Optional[str] = None
    m2_totales: Optional[int] = None
    estimated_cost: Optional[float] = None
    material_id: Optional[int] = None
    expires_at: Optional[datetime] = None


class ShareLinkResponse(BaseModel):
    public_token: str
    public_url_path: str
    expires_at: datetime
