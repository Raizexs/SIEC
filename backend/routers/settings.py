from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

try:
    from database import get_db
except ModuleNotFoundError:
    from backend.database import get_db  # type: ignore

try:
    from auth import get_current_user, CurrentUser
except ModuleNotFoundError:
    from backend.auth import get_current_user, CurrentUser  # type: ignore

router = APIRouter(prefix="", tags=["settings"])

_PREFS = {}
_INTEGRATIONS = {}
_SITE_PROFILES = {}


class PreferencesPayload(BaseModel):
    language: str = "es"
    units: str = "metric"
    currency: str = "CLP"
    reduced_motion: bool = False
    high_contrast: bool = False


class AccessibilityPayload(BaseModel):
    density: str = "normal"
    keyboard_focus_mode: str = "enhanced"
    reduce_animations: bool = False


class SiteProfilePayload(BaseModel):
    terrain_type: str = "flat"
    slope_mode: str = "stable"
    slope_percent: float = 0.0
    slope_direction: str = "N"
    structure_type: str = "metalcom"
    structure_strategy: str = "platform"
    terrain_image: Optional[str] = None


@router.get("/settings/preferences")
def get_preferences(user: CurrentUser = Depends(get_current_user)):
    return _PREFS.get(user.id, PreferencesPayload().model_dump())


@router.put("/settings/preferences")
def put_preferences(payload: PreferencesPayload, user: CurrentUser = Depends(get_current_user)):
    _PREFS[user.id] = payload.model_dump()
    return {"ok": True, "preferences": _PREFS[user.id]}


@router.get("/settings/accessibility")
def get_accessibility(user: CurrentUser = Depends(get_current_user)):
    default = AccessibilityPayload().model_dump()
    return _PREFS.get(f"{user.id}:a11y", default)


@router.put("/settings/accessibility")
def put_accessibility(payload: AccessibilityPayload, user: CurrentUser = Depends(get_current_user)):
    _PREFS[f"{user.id}:a11y"] = payload.model_dump()
    return {"ok": True, "accessibility": _PREFS[f'{user.id}:a11y']}


@router.get("/integrations")
def get_integrations(user: CurrentUser = Depends(get_current_user)):
    return _INTEGRATIONS.get(user.id, {"googleDrive": False, "onedrive": False, "autodesk": False, "erpWebhook": False})


@router.put("/integrations")
def put_integrations(payload: dict, user: CurrentUser = Depends(get_current_user)):
    _INTEGRATIONS[user.id] = payload
    return {"ok": True, "integrations": payload}


@router.get("/billing/plan")
def get_billing_plan(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        from billing.service import build_plan_payload
    except ModuleNotFoundError:
        from backend.billing.service import build_plan_payload  # type: ignore
    return build_plan_payload(db, user.id)


@router.get("/billing/usage")
def get_billing_usage(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        from billing.service import build_plan_payload
    except ModuleNotFoundError:
        from backend.billing.service import build_plan_payload  # type: ignore
    payload = build_plan_payload(db, user.id)
    return payload["usage"]


@router.get("/projects/{project_id}/site-profile")
def get_site_profile(project_id: str, user: CurrentUser = Depends(get_current_user)):
    return _SITE_PROFILES.get(project_id, SiteProfilePayload().model_dump())


@router.put("/projects/{project_id}/site-profile")
def put_site_profile(project_id: str, payload: SiteProfilePayload, user: CurrentUser = Depends(get_current_user)):
    _SITE_PROFILES[project_id] = payload.model_dump()
    return {"ok": True, "project_id": project_id, "site_profile": _SITE_PROFILES[project_id]}
