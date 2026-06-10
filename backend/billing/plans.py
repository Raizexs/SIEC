"""Límites comerciales por plan — fuente única de verdad."""

from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet


@dataclass(frozen=True)
class PlanLimits:
    plan_id: str
    label: str
    price_clp_month: int | None
    price_clp_one_time: int | None
    billing_mode: str
    max_active_projects: int | None
    max_saved_projects: int | None
    max_exports_per_month: int | None
    allowed_material_ids: FrozenSet[int]
    pdf_watermark: bool
    commercial_proposal: bool
    custom_export_branding: bool
    construction_layers_3d: bool
    walkthrough_3d: bool
    marketplace_access: bool


PLAN_LIMITS: dict[str, PlanLimits] = {
    "free": PlanLimits(
        plan_id="free",
        label="Free",
        price_clp_month=0,
        price_clp_one_time=0,
        billing_mode="free",
        max_active_projects=None,
        max_saved_projects=None,
        max_exports_per_month=None,
        allowed_material_ids=frozenset({1, 2, 3, 4}),
        pdf_watermark=False,
        commercial_proposal=True,
        custom_export_branding=True,
        construction_layers_3d=True,
        walkthrough_3d=True,
        marketplace_access=True,
    ),
    "pro": PlanLimits(
        plan_id="pro",
        label="Pro",
        price_clp_month=4990,
        price_clp_one_time=4990,
        billing_mode="one_time",
        max_active_projects=5,
        max_saved_projects=10,
        max_exports_per_month=20,
        allowed_material_ids=frozenset({1, 2}),
        pdf_watermark=False,
        commercial_proposal=True,
        custom_export_branding=False,
        construction_layers_3d=True,
        walkthrough_3d=True,
        marketplace_access=False,
    ),
    "pro_plus": PlanLimits(
        plan_id="pro_plus",
        label="Pro+",
        price_clp_month=9990,
        price_clp_one_time=9990,
        billing_mode="one_time",
        max_active_projects=None,
        max_saved_projects=None,
        max_exports_per_month=None,
        allowed_material_ids=frozenset({1, 2, 3, 4}),
        pdf_watermark=False,
        commercial_proposal=True,
        custom_export_branding=True,
        construction_layers_3d=True,
        walkthrough_3d=True,
        marketplace_access=True,
    ),
}


STRIPE_PRICE_ENV = {
    "pro": "STRIPE_PRICE_PRO_ONETIME",
    "pro_plus": "STRIPE_PRICE_PRO_PLUS_ONETIME",
}

STRIPE_PRICE_ENV_FALLBACK = {
    "pro": "STRIPE_PRICE_PRO",
    "pro_plus": "STRIPE_PRICE_PRO_PLUS",
}

SIECPLACE_LISTING_FEE_CLP = 4990
SIECPLACE_LEAD_FEE_CLP = 2990

STRIPE_PRICE_LISTING_ENV = "STRIPE_PRICE_LISTING"
STRIPE_PRICE_LEAD_ENV = "STRIPE_PRICE_LEAD"
