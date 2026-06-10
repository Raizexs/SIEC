"""Tests de planes SIEC Place y gates de marketplace."""

import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock, patch

try:
    from billing.plans import PLAN_LIMITS, SIECPLACE_LEAD_FEE_CLP, SIECPLACE_LISTING_FEE_CLP
    import billing.service as billing_service
except ModuleNotFoundError:
    from backend.billing.plans import PLAN_LIMITS, SIECPLACE_LEAD_FEE_CLP, SIECPLACE_LISTING_FEE_CLP  # type: ignore
    import backend.billing.service as billing_service  # type: ignore


def test_plan_prices_one_time():
    assert PLAN_LIMITS["pro"].price_clp_one_time == 4990
    assert PLAN_LIMITS["pro_plus"].price_clp_one_time == 9990
    assert PLAN_LIMITS["pro"].billing_mode == "one_time"
    assert PLAN_LIMITS["pro_plus"].billing_mode == "one_time"


def test_marketplace_access_flags():
    assert PLAN_LIMITS["free"].marketplace_access is True
    assert PLAN_LIMITS["pro"].marketplace_access is False
    assert PLAN_LIMITS["pro_plus"].marketplace_access is True


def test_siecplace_microtransaction_amounts():
    assert SIECPLACE_LISTING_FEE_CLP == 4990
    assert SIECPLACE_LEAD_FEE_CLP == 2990


def test_require_marketplace_access_allows_free():
    db = MagicMock()
    with patch.object(billing_service, "get_user_plan_id", return_value="free"):
        billing_service.require_marketplace_access(db, "00000000-0000-0000-0000-000000000001")


def test_require_marketplace_access_allows_pro_plus():
    db = MagicMock()
    with patch.object(billing_service, "get_user_plan_id", return_value="pro_plus"):
        billing_service.require_marketplace_access(db, "00000000-0000-0000-0000-000000000001")
