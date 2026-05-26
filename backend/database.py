import os
from urllib.parse import urlparse

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker


def _pick_database_url() -> str:
    """Resolve DB URL from Railway / Supabase env vars (never accept blank strings)."""
    for key in ("DATABASE_URL", "DATABASE_PRIVATE_URL", "SUPABASE_DATABASE_URL"):
        value = (os.getenv(key) or "").strip()
        if value:
            return value
    return "postgresql://postgres:postgres@localhost:5432/siec"


def _normalize_database_url(url: str) -> str:
    # Railway/Heroku and some providers still emit postgres://
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    return url


def _validate_database_url(url: str) -> str:
    normalized = _normalize_database_url(url)
    try:
        make_url(normalized)
    except Exception as exc:
        host = urlparse(normalized).hostname or "(no host)"
        raise RuntimeError(
            "DATABASE_URL is missing or invalid for SQLAlchemy. "
            "In Railway → Variables, set DATABASE_URL to your Supabase Postgres URI "
            "(Project Settings → Database → Connection string → URI). "
            "Use postgresql://, URL-encode special characters in the password, "
            "and prefer the direct session on port 5432 for the API (not the pooler "
            "unless you know you need it). "
            f"Parsed host: {host}"
        ) from exc
    return normalized


SQLALCHEMY_DATABASE_URL = _validate_database_url(_pick_database_url())


def _engine_connect_args(url: str) -> dict:
    host = (urlparse(url).hostname or "").lower()
    # Supabase Postgres requires SSL from external hosts (e.g. Railway).
    if "supabase.co" in host:
        return {"sslmode": "require"}
    return {}


engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    connect_args=_engine_connect_args(SQLALCHEMY_DATABASE_URL),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
