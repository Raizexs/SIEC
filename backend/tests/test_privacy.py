"""Tests for Ley 21.719 privacy compliance endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest

try:
    from database import SessionLocal, engine, check_database_connection
    import models
    from services.privacy_helpers import has_active_consent, record_consent
    from schemas_privacy import CONSENT_TYPES
except ModuleNotFoundError:
    from backend.database import SessionLocal, engine, check_database_connection  # type: ignore
    from backend import models  # type: ignore
    from backend.services.privacy_helpers import has_active_consent, record_consent  # type: ignore
    from backend.schemas_privacy import CONSENT_TYPES  # type: ignore

try:
    _db_ok = check_database_connection().get("ok", False)
except Exception:
    _db_ok = False


@pytest.fixture(scope="module", autouse=True)
def ensure_privacy_tables():
    if not _db_ok:
        return
    models.Base.metadata.create_all(bind=engine)


pytestmark_db = pytest.mark.skipif(not _db_ok, reason="Postgres no disponible para tests de integración")


def test_consent_types_defined():
    assert "privacy_policy" in CONSENT_TYPES
    assert "public_share" in CONSENT_TYPES


@pytest.mark.usefixtures("ensure_privacy_tables")
@pytestmark_db
def test_record_and_check_consent_sqlite_or_postgres():
    db = SessionLocal()
    user_id = uuid.uuid4()
    try:
        if not db.query(models.AppUser).filter_by(id=user_id).first():
            db.add(
                models.AppUser(
                    id=user_id,
                    email=f"privacy-test-{user_id}@example.com",
                    role="user",
                )
            )
            db.commit()

        if db.query(models.PrivacyPolicyVersion).count() == 0:
            db.add(
                models.PrivacyPolicyVersion(
                    id="test-policy",
                    version="1.0",
                    published_at=datetime.now(timezone.utc),
                )
            )
            db.commit()

        assert not has_active_consent(db, str(user_id), "privacy_policy")

        record_consent(
            db,
            user_id=str(user_id),
            consent_type="privacy_policy",
            policy_version="1.0",
            granted=True,
            ip_address="127.0.0.1",
            user_agent="pytest",
        )
        db.commit()

        assert has_active_consent(db, str(user_id), "privacy_policy")
    finally:
        db.query(models.UserConsent).filter_by(user_id=user_id).delete()
        db.query(models.AppUser).filter_by(id=user_id).delete()
        db.commit()
        db.close()


@pytest.mark.usefixtures("ensure_privacy_tables")
@pytestmark_db
def test_export_schema_has_meta():
    from services.data_export import EXPORT_SCHEMA_VERSION, build_user_export

    db = SessionLocal()
    user_id = uuid.uuid4()
    try:
        db.add(
            models.AppUser(
                id=user_id,
                email=f"export-{user_id}@example.com",
                full_name="Test User",
                role="user",
            )
        )
        db.commit()
        payload = build_user_export(
            db,
            str(user_id),
            {"user_metadata": {"full_name": "Test User"}},
        )
        assert payload["_meta"]["schema_version"] == EXPORT_SCHEMA_VERSION
        assert payload["profile"]["app_user"]["email"].startswith("export-")
    finally:
        db.query(models.AppUser).filter_by(id=user_id).delete()
        db.commit()
        db.close()
