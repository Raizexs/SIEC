"""
Project CRUD + versioning + collaboration + comments routes.

Mounted onto the main FastAPI app via:
    from routers.projects import router as projects_router
    app.include_router(projects_router)

Authorization is enforced via Depends(get_current_user). RLS in Postgres
provides defense-in-depth when running on Supabase, but we double-check
ownership in code so the API also works on plain Postgres.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_, func, and_
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

router = APIRouter(prefix="/projects", tags=["projects"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _user_can_view(db: Session, project: models.Proyecto, user: CurrentUser) -> bool:
    if str(project.owner_id) == user.id:
        return True
    if project.is_public and (project.public_expires_at is None or project.public_expires_at > datetime.now(timezone.utc)):
        return True
    collab = (
        db.query(models.ProyectoColaborador)
        .filter_by(proyecto_id=project.id, usuario_id=user.id)
        .first()
    )
    return collab is not None


def _user_can_edit(db: Session, project: models.Proyecto, user: CurrentUser) -> bool:
    if str(project.owner_id) == user.id:
        return True
    collab = (
        db.query(models.ProyectoColaborador)
        .filter_by(proyecto_id=project.id, usuario_id=user.id)
        .first()
    )
    return collab is not None and collab.rol in {"editor", "owner"}


def _audit(
    db: Session,
    user: CurrentUser,
    action: str,
    entity_id: str,
    metadata: Optional[dict] = None,
    request: Optional[Request] = None,
):
    ip_address = None
    user_agent = None
    if request is not None:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip_address = forwarded.split(",")[0].strip()
        elif request.client:
            ip_address = request.client.host
        user_agent = request.headers.get("user-agent")

    log = models.Auditoria(
        actor_id=user.id,
        action=action,
        entity_type="project",
        entity_id=entity_id,
        extra=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log)


# ─────────────────────────────────────────────────────────────────────────────
# Projects
# ─────────────────────────────────────────────────────────────────────────────


@router.get("", response_model=List[schemas.ProjectResponse])
def list_projects(
    archived: bool = False,
    search: Optional[str] = Query(None, min_length=1, max_length=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Proyecto).filter(
        or_(
            models.Proyecto.owner_id == user.id,
            models.Proyecto.id.in_(
                db.query(models.ProyectoColaborador.proyecto_id).filter_by(usuario_id=user.id)
            ),
        )
    )
    q = q.filter(models.Proyecto.archived == archived)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(
            or_(
                func.lower(models.Proyecto.name).like(like),
                func.lower(models.Proyecto.cliente).like(like),
                func.lower(models.Proyecto.ubicacion).like(like),
            )
        )
    return q.order_by(models.Proyecto.updated_at.desc()).limit(200).all()


@router.get("/share/{token}", response_model=schemas.PublicProjectResponse)
def get_public_project_by_token(token: str, db: Session = Depends(get_db)):
    project = (
        db.query(models.Proyecto)
        .filter(
            models.Proyecto.public_token == token,
            models.Proyecto.is_public.is_(True),
        )
        .first()
    )
    if not project:
        raise HTTPException(404, "Enlace no válido")
    now = datetime.now(timezone.utc)
    if project.public_expires_at and project.public_expires_at < now:
        raise HTTPException(410, "Enlace expirado")

    hide_cliente = bool((project.payload or {}).get("_share_hide_cliente"))
    return schemas.PublicProjectResponse(
        name=project.name,
        description=project.description,
        m2_totales=project.m2_totales,
        estimated_cost=float(project.estimated_cost) if project.estimated_cost is not None else None,
        material_id=project.material_id,
        expires_at=project.public_expires_at,
    )


@router.post("", response_model=schemas.ProjectResponse, status_code=201)
def create_project(
    payload: schemas.ProjectCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        from billing.service import assert_can_create_project
    except ModuleNotFoundError:
        from backend.billing.service import assert_can_create_project  # type: ignore
    assert_can_create_project(db, user.id)
    data = payload.model_dump()
    if data.get("material_id") is not None:
        try:
            from billing.service import assert_material_allowed
        except ModuleNotFoundError:
            from backend.billing.service import assert_material_allowed  # type: ignore
        assert_material_allowed(db, user.id, int(data["material_id"]))
    project = models.Proyecto(owner_id=user.id, **data)
    db.add(project)
    db.flush()
    _audit(db, user, "project.created", str(project.id), {"name": project.name})
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def get_project(
    project_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    if not _user_can_view(db, project, user):
        raise HTTPException(403, "Sin permisos")
    return project


@router.patch("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(
    project_id: UUID,
    update: schemas.ProjectUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    if not _user_can_edit(db, project, user):
        raise HTTPException(403, "Sin permisos de edición")
    patch = update.model_dump(exclude_unset=True)
    if patch.get("material_id") is not None:
        try:
            from billing.service import assert_material_allowed
        except ModuleNotFoundError:
            from backend.billing.service import assert_material_allowed  # type: ignore
        assert_material_allowed(db, user.id, int(patch["material_id"]))
    for field, value in patch.items():
        setattr(project, field, value)
    _audit(db, user, "project.updated", str(project.id))
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    if str(project.owner_id) != user.id:
        raise HTTPException(403, "Solo el owner puede eliminar")
    db.delete(project)
    _audit(db, user, "project.deleted", str(project_id))
    db.commit()
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Versions
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/{project_id}/versions", response_model=List[schemas.VersionResponse])
def list_versions(
    project_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project or not _user_can_view(db, project, user):
        raise HTTPException(404, "Proyecto no encontrado")
    return (
        db.query(models.ProyectoVersion)
        .filter_by(proyecto_id=project_id)
        .order_by(models.ProyectoVersion.version_number.desc())
        .all()
    )


@router.post("/{project_id}/versions", response_model=schemas.VersionResponse, status_code=201)
def create_version(
    project_id: UUID,
    payload: schemas.VersionCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project or not _user_can_edit(db, project, user):
        raise HTTPException(403, "Sin permisos")
    last = (
        db.query(func.max(models.ProyectoVersion.version_number))
        .filter_by(proyecto_id=project_id)
        .scalar()
    ) or 0
    version = models.ProyectoVersion(
        proyecto_id=project_id,
        version_number=last + 1,
        author_id=user.id,
        summary=payload.summary,
        payload=payload.payload,
    )
    db.add(version)
    _audit(db, user, "project.version.created", str(project_id), {"version": last + 1})
    db.commit()
    db.refresh(version)
    return version


@router.post("/{project_id}/versions/{version_id}/restore", response_model=schemas.ProjectResponse)
def restore_version(
    project_id: UUID,
    version_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project or not _user_can_edit(db, project, user):
        raise HTTPException(403, "Sin permisos")
    version = db.query(models.ProyectoVersion).filter_by(id=version_id, proyecto_id=project_id).first()
    if not version:
        raise HTTPException(404, "Versión no encontrada")
    project.payload = version.payload
    _audit(db, user, "project.version.restored", str(project_id), {"version_id": str(version_id)})
    db.commit()
    db.refresh(project)
    return project


# ─────────────────────────────────────────────────────────────────────────────
# Collaboration
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/{project_id}/collaborators", response_model=List[schemas.CollaboratorResponse])
def list_collaborators(
    project_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project or not _user_can_view(db, project, user):
        raise HTTPException(404, "Proyecto no encontrado")
    return db.query(models.ProyectoColaborador).filter_by(proyecto_id=project_id).all()


@router.post("/{project_id}/collaborators", response_model=schemas.CollaboratorResponse, status_code=201)
def add_collaborator(
    project_id: UUID,
    payload: schemas.CollaboratorAdd,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project or str(project.owner_id) != user.id:
        raise HTTPException(403, "Solo el owner gestiona colaboradores")
    collab = models.ProyectoColaborador(
        proyecto_id=project_id,
        usuario_id=payload.usuario_id,
        rol=payload.rol,
    )
    db.merge(collab)
    _audit(db, user, "project.collaborator.added", str(project_id), {"usuario_id": str(payload.usuario_id), "rol": payload.rol})
    db.commit()
    return collab


@router.delete("/{project_id}/collaborators/{usuario_id}", status_code=204)
def remove_collaborator(
    project_id: UUID,
    usuario_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project or str(project.owner_id) != user.id:
        raise HTTPException(403, "Solo el owner gestiona colaboradores")
    db.query(models.ProyectoColaborador).filter_by(proyecto_id=project_id, usuario_id=usuario_id).delete()
    _audit(db, user, "project.collaborator.removed", str(project_id))
    db.commit()


@router.post("/{project_id}/share", response_model=schemas.ShareLinkResponse)
def create_share_link(
    project_id: UUID,
    payload: schemas.ShareLinkRequest,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        from services.privacy_helpers import has_active_consent
    except ModuleNotFoundError:
        from backend.services.privacy_helpers import has_active_consent  # type: ignore

    if not has_active_consent(db, user.id, "public_share"):
        raise HTTPException(
            status_code=403,
            detail="Se requiere consentimiento para enlaces públicos (public_share)",
        )

    project = db.get(models.Proyecto, project_id)
    if not project or str(project.owner_id) != user.id:
        raise HTTPException(403, "Solo el owner puede crear enlaces")
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=min(payload.expires_in_days, 90))
    project.is_public = True
    project.public_token = token
    project.public_expires_at = expires
    if payload.hide_cliente:
        pl = dict(project.payload or {})
        pl["_share_hide_cliente"] = True
        project.payload = pl
        if project.cliente:
            project.cliente = None
    _audit(
        db,
        user,
        "project.shared",
        str(project_id),
        {"expires": expires.isoformat(), "hide_cliente": payload.hide_cliente},
        request=request,
    )
    db.commit()
    return schemas.ShareLinkResponse(
        public_token=token,
        public_url_path=f"/share/{token}",
        expires_at=expires,
    )


@router.delete("/{project_id}/share", status_code=204)
def revoke_share_link(
    project_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project or str(project.owner_id) != user.id:
        raise HTTPException(403, "Sin permisos")
    project.is_public = False
    project.public_token = None
    project.public_expires_at = None
    _audit(db, user, "project.share.revoked", str(project_id))
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Comments
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/{project_id}/comments", response_model=List[schemas.CommentResponse])
def list_comments(
    project_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project or not _user_can_view(db, project, user):
        raise HTTPException(404, "Proyecto no encontrado")
    return (
        db.query(models.ProyectoComentario)
        .filter_by(proyecto_id=project_id)
        .order_by(models.ProyectoComentario.created_at.asc())
        .all()
    )


@router.post("/{project_id}/comments", response_model=schemas.CommentResponse, status_code=201)
def create_comment(
    project_id: UUID,
    payload: schemas.CommentCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Proyecto, project_id)
    if not project or not _user_can_view(db, project, user):
        raise HTTPException(404, "Proyecto no encontrado")
    comment = models.ProyectoComentario(
        proyecto_id=project_id,
        author_id=user.id,
        body=payload.body,
        parent_id=payload.parent_id,
        anchor=payload.anchor,
    )
    db.add(comment)
    _audit(db, user, "comment.created", str(comment.id), {"project_id": str(project_id)})
    db.commit()
    db.refresh(comment)
    return comment


@router.patch("/{project_id}/comments/{comment_id}/resolve", response_model=schemas.CommentResponse)
def resolve_comment(
    project_id: UUID,
    comment_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(models.ProyectoComentario).filter_by(id=comment_id, proyecto_id=project_id).first()
    if not comment:
        raise HTTPException(404, "Comentario no encontrado")
    project = db.get(models.Proyecto, project_id)
    if not _user_can_view(db, project, user):
        raise HTTPException(403, "Sin permisos")
    comment.resolved = not comment.resolved
    db.commit()
    db.refresh(comment)
    return comment
