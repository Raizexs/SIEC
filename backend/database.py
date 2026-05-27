import os
import socket
from urllib.parse import urlparse

from sqlalchemy import create_engine, text
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
            "From Railway/Vercel use Supabase Connection pooling → Session mode "
            "(host *.pooler.supabase.com, port 6543). "
            f"Parsed host: {host}"
        ) from exc
    return normalized


SQLALCHEMY_DATABASE_URL = _validate_database_url(_pick_database_url())


def _ipv4_hostaddr(hostname: str | None) -> str | None:
    """Railway often cannot reach Supabase over IPv6 (Network is unreachable)."""
    if not hostname:
        return None
    try:
        results = socket.getaddrinfo(
            hostname, None, family=socket.AF_INET, type=socket.SOCK_STREAM
        )
        return results[0][4][0] if results else None
    except OSError:
        return None


def _is_supabase_host(host: str) -> bool:
    return "supabase.co" in host or "pooler.supabase.com" in host


def _engine_connect_args(url: str) -> dict:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if not _is_supabase_host(host):
        return {}
    args: dict = {"sslmode": "require"}
    ipv4 = _ipv4_hostaddr(parsed.hostname)
    if ipv4:
        args["hostaddr"] = ipv4
    return args


def check_database_connection() -> dict:
    """Lightweight connectivity probe for /health and deploy diagnostics."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)[:240]}


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
