"""Servicio de billing: plan efectivo, uso y enforcement."""

from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

try:
    from billing.plans import PLAN_LIMITS, PlanLimits
    import models
except ModuleNotFoundError:
    from backend.billing.plans import PLAN_LIMITS, PlanLimits  # type: ignore
    from backend import models  # type: ignore


def _month_start(d: date | None = None) -> date:
    d = d or datetime.now(timezone.utc).date()
    return d.replace(day=1)


def get_limits(plan_id: str) -> PlanLimits:
    return PLAN_LIMITS.get(plan_id, PLAN_LIMITS["free"])


def get_user_plan_id(db: Session, user_id: str) -> str:
    try:
        uid = UUID(user_id)
        row = db.query(models.UserSubscription).filter_by(user_id=uid).first()
        if row and row.status in ("active", "trialing"):
            return row.plan if row.plan in PLAN_LIMITS else "free"
    except Exception:
        pass
    return "free"


def ensure_usage_row(db: Session, user_id: str) -> models.UserUsage:
    uid = UUID(user_id)
    row = db.query(models.UserUsage).filter_by(user_id=uid).first()
    current_month = _month_start()
    if not row:
        row = models.UserUsage(
            user_id=uid,
            exports_this_month=0,
            usage_month=current_month,
        )
        db.add(row)
        db.flush()
        return row
    if row.usage_month != current_month:
        row.exports_this_month = 0
        row.usage_month = current_month
        db.flush()
    return row


def count_projects(db: Session, user_id: str) -> dict[str, int]:
    uid = UUID(user_id)
    active = (
        db.query(func.count(models.Proyecto.id))
        .filter(models.Proyecto.owner_id == uid, models.Proyecto.archived.is_(False))
        .scalar()
        or 0
    )
    saved = (
        db.query(func.count(models.Proyecto.id))
        .filter(models.Proyecto.owner_id == uid)
        .scalar()
        or 0
    )
    return {"active_projects": int(active), "saved_projects": int(saved)}


def build_plan_payload(db: Session, user_id: str) -> dict[str, Any]:
    plan_id = get_user_plan_id(db, user_id)
    limits = get_limits(plan_id)
    usage_row = ensure_usage_row(db, user_id)
    counts = count_projects(db, user_id)

    return {
        "plan": plan_id,
        "plan_label": limits.label,
        "limits": {
            "max_active_projects": limits.max_active_projects,
            "max_saved_projects": limits.max_saved_projects,
            "max_exports_per_month": limits.max_exports_per_month,
            "allowed_material_ids": sorted(limits.allowed_material_ids),
            "pdf_watermark": limits.pdf_watermark,
            "commercial_proposal": limits.commercial_proposal,
            "custom_export_branding": limits.custom_export_branding,
            "construction_layers_3d": limits.construction_layers_3d,
            "walkthrough_3d": limits.walkthrough_3d,
        },
        "usage": {
            "active_projects": counts["active_projects"],
            "saved_projects": counts["saved_projects"],
            "exports_this_month": usage_row.exports_this_month,
            "usage_month": usage_row.usage_month.isoformat(),
        },
        "pricing": {
            "pro_clp_month": PLAN_LIMITS["pro"].price_clp_month,
            "pro_plus_clp_month": PLAN_LIMITS["pro_plus"].price_clp_month,
        },
    }


def enforce_simulation_material(db: Session, user: Any | None, material_id: int) -> None:
    """Aplica límites de materialidad: autenticado → plan; sin token → solo Free."""
    if user and getattr(user, "id", None):
        assert_material_allowed(db, str(user.id), material_id)
        return
    free_ids = PLAN_LIMITS["free"].allowed_material_ids
    if material_id not in free_ids:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PLAN_MATERIAL_LOCKED",
                "message": "Inicia sesión y usa un plan que incluya esta materialidad.",
                "material_id": material_id,
                "plan": "free",
                "allowed_material_ids": sorted(free_ids),
            },
        )


def assert_material_allowed(db: Session, user_id: str, material_id: int) -> None:
    plan_id = get_user_plan_id(db, user_id)
    limits = get_limits(plan_id)
    if material_id not in limits.allowed_material_ids:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PLAN_MATERIAL_LOCKED",
                "message": "Tu plan no incluye esta materialidad. Mejora a Pro o Pro+.",
                "material_id": material_id,
                "plan": plan_id,
                "allowed_material_ids": sorted(limits.allowed_material_ids),
            },
        )


def assert_can_create_project(db: Session, user_id: str) -> None:
    plan_id = get_user_plan_id(db, user_id)
    limits = get_limits(plan_id)
    counts = count_projects(db, user_id)

    if limits.max_active_projects is not None and counts["active_projects"] >= limits.max_active_projects:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PLAN_PROJECT_LIMIT",
                "message": "Alcanzaste el límite de proyectos activos de tu plan.",
                "plan": plan_id,
                "limit": limits.max_active_projects,
            },
        )
    if limits.max_saved_projects is not None and counts["saved_projects"] >= limits.max_saved_projects:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PLAN_SAVED_PROJECT_LIMIT",
                "message": "Alcanzaste el límite de proyectos guardados de tu plan.",
                "plan": plan_id,
                "limit": limits.max_saved_projects,
            },
        )


def record_export(db: Session, user_id: str) -> dict[str, Any]:
    plan_id = get_user_plan_id(db, user_id)
    limits = get_limits(plan_id)
    usage_row = ensure_usage_row(db, user_id)

    if limits.max_exports_per_month is not None:
        if usage_row.exports_this_month >= limits.max_exports_per_month:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "PLAN_EXPORT_LIMIT",
                    "message": "Alcanzaste el límite de exportaciones mensuales.",
                    "plan": plan_id,
                    "limit": limits.max_exports_per_month,
                    "used": usage_row.exports_this_month,
                },
            )

    usage_row.exports_this_month += 1
    db.flush()
    return {
        "exports_this_month": usage_row.exports_this_month,
        "limit": limits.max_exports_per_month,
        "pdf_watermark": limits.pdf_watermark,
    }


def set_plan(db: Session, user_id: str, plan: str, provider: str | None = None, sub_id: str | None = None) -> None:
    if plan not in PLAN_LIMITS:
        raise ValueError(f"Plan inválido: {plan}")
    uid = UUID(user_id)
    row = db.query(models.UserSubscription).filter_by(user_id=uid).first()
    now = datetime.now(timezone.utc)
    if not row:
        row = models.UserSubscription(user_id=uid, plan=plan, status="active")
        db.add(row)
    else:
        row.plan = plan
        row.status = "active"
    row.provider = provider
    row.provider_subscription_id = sub_id
    row.current_period_start = now
    row.current_period_end = now + timedelta(days=30)
    db.flush()
