"""Billing comercial: plan, uso, checkout Stripe y webhooks."""

from __future__ import annotations

import os
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from auth import CurrentUser, get_current_user
    from database import get_db
    from billing.service import build_plan_payload, record_export, set_plan
    from billing.plans import PLAN_LIMITS, STRIPE_PRICE_ENV
except ModuleNotFoundError:
    from backend.auth import CurrentUser, get_current_user  # type: ignore
    from backend.database import get_db  # type: ignore
    from backend.billing.service import build_plan_payload, record_export, set_plan  # type: ignore
    from backend.billing.plans import PLAN_LIMITS, STRIPE_PRICE_ENV  # type: ignore

router = APIRouter(prefix="/billing", tags=["billing"])

STRIPE_SECRET_KEY = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
STRIPE_WEBHOOK_SECRET = (os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip()
FRONTEND_URL = (os.getenv("FRONTEND_URL") or os.getenv("VITE_APP_URL") or "http://localhost:5173").rstrip("/")


class CheckoutBody(BaseModel):
    plan: Literal["pro", "pro_plus"]


@router.get("/plan")
def get_plan(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_plan_payload(db, user.id)


@router.get("/usage")
def get_usage(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    payload = build_plan_payload(db, user.id)
    return payload["usage"]


@router.post("/record-export")
def post_record_export(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    result = record_export(db, user.id)
    db.commit()
    return {"ok": True, **result}


@router.post("/checkout")
def create_checkout(
    body: CheckoutBody,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "BILLING_NOT_CONFIGURED",
                "message": "Pagos en línea no configurados. Contacta soporte o configura STRIPE_SECRET_KEY.",
            },
        )

    price_env = STRIPE_PRICE_ENV.get(body.plan)
    price_id = (os.getenv(price_env or "") or "").strip() if price_env else ""
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "STRIPE_PRICE_MISSING",
                "message": f"Falta variable {price_env} en el servidor.",
            },
        )

    limits = PLAN_LIMITS[body.plan]
    success_url = f"{FRONTEND_URL}/settings?tab=billing&checkout=success&plan={body.plan}"
    cancel_url = f"{FRONTEND_URL}/settings?tab=billing&checkout=cancel"

    data = {
        "mode": "subscription",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": user.id,
        "customer_email": user.email or None,
        "line_items[0][price]": price_id,
        "line_items[0][quantity]": "1",
        "metadata[plan]": body.plan,
        "metadata[user_id]": user.id,
        "subscription_data[metadata][plan]": body.plan,
        "subscription_data[metadata][user_id]": user.id,
    }
    data = {k: v for k, v in data.items() if v is not None}

    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            "https://api.stripe.com/v1/checkout/sessions",
            data=data,
            auth=(STRIPE_SECRET_KEY, ""),
        )

    if res.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Stripe error: {res.text}")

    session = res.json()
    db.commit()
    return {
        "checkout_url": session.get("url"),
        "session_id": session.get("id"),
        "plan": body.plan,
        "plan_label": limits.label,
        "amount_clp_hint": limits.price_clp_month,
    }


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    if STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY:
        try:
            import stripe  # type: ignore

            stripe.api_key = STRIPE_SECRET_KEY
            event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        except ImportError:
            event = _parse_webhook_json(payload)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Webhook inválido: {exc}") from exc
    else:
        event = _parse_webhook_json(payload)

    event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)
    data_obj = _event_data(event)

    if event_type == "checkout.session.completed":
        user_id = (data_obj.get("metadata") or {}).get("user_id") or data_obj.get("client_reference_id")
        plan = (data_obj.get("metadata") or {}).get("plan", "pro")
        sub_id = data_obj.get("subscription")
        if user_id and plan in PLAN_LIMITS:
            set_plan(db, str(user_id), plan, provider="stripe", sub_id=str(sub_id) if sub_id else None)
            db.commit()

    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        meta = data_obj.get("metadata") or {}
        user_id = meta.get("user_id")
        plan = meta.get("plan", "pro")
        status = data_obj.get("status", "active")
        if user_id and status in ("active", "trialing") and plan in PLAN_LIMITS:
            set_plan(db, str(user_id), plan, provider="stripe", sub_id=str(data_obj.get("id", "")))
            db.commit()
        elif user_id and status in ("canceled", "unpaid", "past_due"):
            set_plan(db, str(user_id), "free", provider="stripe", sub_id=None)
            db.commit()

    return {"received": True}


def _parse_webhook_json(payload: bytes) -> dict:
    import json

    return json.loads(payload)


def _event_data(event) -> dict:
    if isinstance(event, dict):
        return event.get("data", {}).get("object", {}) or {}
    return event.data.object if hasattr(event, "data") else {}
