"""Límites comerciales por plan — fuente única de verdad."""

from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet


@dataclass(frozen=True)
class PlanLimits:
    plan_id: str
    label: str
    price_clp_month: int | None
    max_active_projects: int | None
    max_saved_projects: int | None
    max_exports_per_month: int | None
    allowed_material_ids: FrozenSet[int]
    pdf_watermark: bool
    commercial_proposal: bool
    custom_export_branding: bool
    construction_layers_3d: bool
    walkthrough_3d: bool


PLAN_LIMITS: dict[str, PlanLimits] = {
    "free": PlanLimits(
        plan_id="free",
        label="Free",
        price_clp_month=0,
        max_active_projects=1,
        max_saved_projects=1,
        max_exports_per_month=2,
        allowed_material_ids=frozenset({1}),
        pdf_watermark=True,
        commercial_proposal=False,
        custom_export_branding=False,
        construction_layers_3d=False,
        walkthrough_3d=False,
    ),
    "pro": PlanLimits(
        plan_id="pro",
        label="Pro",
        price_clp_month=8990,
        max_active_projects=5,
        max_saved_projects=10,
        max_exports_per_month=20,
        allowed_material_ids=frozenset({1, 2}),
        pdf_watermark=False,
        commercial_proposal=True,
        custom_export_branding=False,
        construction_layers_3d=True,
        walkthrough_3d=True,
    ),
    "pro_plus": PlanLimits(
        plan_id="pro_plus",
        label="Pro+",
        price_clp_month=16990,
        max_active_projects=None,
        max_saved_projects=None,
        max_exports_per_month=None,
        allowed_material_ids=frozenset({1, 2, 3, 4}),
        pdf_watermark=False,
        commercial_proposal=True,
        custom_export_branding=True,
        construction_layers_3d=True,
        walkthrough_3d=True,
    ),
}


STRIPE_PRICE_ENV = {
    "pro": "STRIPE_PRICE_PRO",
    "pro_plus": "STRIPE_PRICE_PRO_PLUS",
}
