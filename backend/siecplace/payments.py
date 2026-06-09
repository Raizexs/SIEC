"""SIEC Place — pagos Stripe y handlers de webhook."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

try:
    from billing.plans import (
        SIECPLACE_LEAD_FEE_CLP,
        SIECPLACE_LISTING_FEE_CLP,
        STRIPE_PRICE_LEAD_ENV,
        STRIPE_PRICE_LISTING_ENV,
    )
    import models
except ModuleNotFoundError:
    from backend.billing.plans import (  # type: ignore
        SIECPLACE_LEAD_FEE_CLP,
        SIECPLACE_LISTING_FEE_CLP,
        STRIPE_PRICE_LEAD_ENV,
        STRIPE_PRICE_LISTING_ENV,
    )
    from backend import models  # type: ignore

STRIPE_SECRET_KEY = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
FRONTEND_URL = (os.getenv("FRONTEND_URL") or os.getenv("VITE_APP_URL") or "http://localhost:5173").rstrip("/")


def _stripe_price_id(env_key: str) -> str:
    price_id = (os.getenv(env_key) or "").strip()
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "STRIPE_PRICE_MISSING",
                "message": f"Falta variable {env_key} en el servidor.",
            },
        )
    return price_id


def _create_checkout_session(
    *,
    price_id: str,
    user_id: str,
    user_email: str | None,
    success_url: str,
    cancel_url: str,
    metadata: dict[str, str],
) -> dict[str, Any]:
    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "BILLING_NOT_CONFIGURED",
                "message": "Pagos en línea no configurados.",
            },
        )

    data: dict[str, str | None] = {
        "mode": "payment",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": user_id,
        "customer_email": user_email,
        "line_items[0][price]": price_id,
        "line_items[0][quantity]": "1",
    }
    for key, value in metadata.items():
        data[f"metadata[{key}]"] = value

    data = {k: v for k, v in data.items() if v is not None}

    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            "https://api.stripe.com/v1/checkout/sessions",
            data=data,
            auth=(STRIPE_SECRET_KEY, ""),
        )

    if res.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Stripe error: {res.text}")

    return res.json()


def create_listing_publish_checkout(
    db: Session,
    *,
    listing: models.SiecplaceListing,
    user_id: str,
    user_email: str | None,
) -> dict[str, Any]:
    price_id = _stripe_price_id(STRIPE_PRICE_LISTING_ENV)
    listing.status = "pending_payment"
    db.flush()

    success_url = f"{FRONTEND_URL}/siecplace?tab=mine&publish=success&listing={listing.id}"
    cancel_url = f"{FRONTEND_URL}/siecplace?tab=mine&publish=cancel&listing={listing.id}"

    session = _create_checkout_session(
        price_id=price_id,
        user_id=user_id,
        user_email=user_email,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "payment_kind": "listing_fee",
            "listing_id": str(listing.id),
            "user_id": user_id,
        },
    )

    payment = models.SiecplacePayment(
        user_id=UUID(user_id),
        stripe_session_id=session.get("id"),
        amount_clp=SIECPLACE_LISTING_FEE_CLP,
        payment_type="listing_fee",
        listing_id=listing.id,
        status="pending",
    )
    db.add(payment)
    db.flush()

    return {
        "checkout_url": session.get("url"),
        "session_id": session.get("id"),
        "amount_clp": SIECPLACE_LISTING_FEE_CLP,
    }


def create_lead_unlock_checkout(
    db: Session,
    *,
    listing: models.SiecplaceListing,
    contractor_user_id: str,
    contractor_email: str | None,
) -> dict[str, Any]:
    price_id = _stripe_price_id(STRIPE_PRICE_LEAD_ENV)
    uid = UUID(contractor_user_id)

    unlock = (
        db.query(models.SiecplaceLeadUnlock)
        .filter_by(listing_id=listing.id, contractor_user_id=uid)
        .first()
    )
    if not unlock:
        unlock = models.SiecplaceLeadUnlock(
            listing_id=listing.id,
            contractor_user_id=uid,
            fee_paid=False,
            compensation_status="pending",
        )
        db.add(unlock)
        db.flush()

    if unlock.fee_paid:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "LEAD_ALREADY_UNLOCKED",
                "message": "Ya desbloqueaste el contacto de esta obra.",
            },
        )

    success_url = f"{FRONTEND_URL}/siecplace?listing={listing.id}&unlock=success"
    cancel_url = f"{FRONTEND_URL}/siecplace?listing={listing.id}&unlock=cancel"

    session = _create_checkout_session(
        price_id=price_id,
        user_id=contractor_user_id,
        user_email=contractor_email,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "payment_kind": "lead_fee",
            "listing_id": str(listing.id),
            "user_id": contractor_user_id,
        },
    )

    payment = models.SiecplacePayment(
        user_id=uid,
        stripe_session_id=session.get("id"),
        amount_clp=SIECPLACE_LEAD_FEE_CLP,
        payment_type="lead_fee",
        listing_id=listing.id,
        status="pending",
    )
    db.add(payment)
    db.flush()

    return {
        "checkout_url": session.get("url"),
        "session_id": session.get("id"),
        "amount_clp": SIECPLACE_LEAD_FEE_CLP,
    }


def handle_siecplace_checkout_completed(db: Session, data_obj: dict) -> bool:
    metadata = data_obj.get("metadata") or {}
    payment_kind = metadata.get("payment_kind")
    if payment_kind not in ("listing_fee", "lead_fee"):
        return False

    session_id = data_obj.get("id")
    listing_id = metadata.get("listing_id")
    user_id = metadata.get("user_id") or data_obj.get("client_reference_id")
    if not listing_id or not user_id:
        return False

    now = datetime.now(timezone.utc)
    payment = None
    if session_id:
        payment = (
            db.query(models.SiecplacePayment)
            .filter_by(stripe_session_id=str(session_id))
            .first()
        )
    if payment:
        payment.status = "completed"

    listing = db.query(models.SiecplaceListing).filter_by(id=UUID(str(listing_id))).first()
    if not listing:
        return True

    if payment_kind == "listing_fee":
        if str(listing.owner_id) != str(user_id):
            return True
        listing.status = "published"
        listing.commitment_fee_paid = True
        listing.published_at = now
    elif payment_kind == "lead_fee":
        unlock = (
            db.query(models.SiecplaceLeadUnlock)
            .filter_by(listing_id=listing.id, contractor_user_id=UUID(str(user_id)))
            .first()
        )
        if not unlock:
            unlock = models.SiecplaceLeadUnlock(
                listing_id=listing.id,
                contractor_user_id=UUID(str(user_id)),
                fee_paid=True,
                compensation_status="eligible",
                unlocked_at=now,
            )
            db.add(unlock)
        else:
            unlock.fee_paid = True
            unlock.compensation_status = "eligible"
            unlock.unlocked_at = now

    db.flush()
    return True
