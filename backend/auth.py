"""
Authentication for SIEC FastAPI backend.

Hybrid model: identity is owned by Supabase Auth. We verify the bearer JWT
either with the shared HS256 secret (fast path, default) or by fetching the
JWKS for ES256/RS256 (when running with project-level signing keys).

Usage in routes:
    from auth import get_current_user, require_role, CurrentUser

    @app.get("/me")
    def me(user: CurrentUser = Depends(get_current_user)):
        return {"id": user.id, "email": user.email}

    @app.post("/admin/things")
    def admin_only(user: CurrentUser = Depends(require_role("admin"))):
        ...
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_JWT_ALGORITHM = os.getenv("SUPABASE_JWT_ALGORITHM", "HS256")
SUPABASE_JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")
ALLOW_ANONYMOUS = os.getenv("ALLOW_ANONYMOUS_DEV", "false").lower() == "true"

bearer_scheme = HTTPBearer(auto_error=False)

@dataclass
class CurrentUser:
    id: str
    email: Optional[str]
    role: str
    aal: Optional[str]
    raw_claims: dict

    @property
    def is_anonymous(self) -> bool:
        return self.id.startswith("anon-")

# ── JWKS cache (only used when algorithm is RS256/ES256) ─────────────────────
@lru_cache(maxsize=1)
def _jwks_url() -> str:
    if not SUPABASE_URL:
        return ""
    return SUPABASE_URL.rstrip("/") + "/auth/v1/.well-known/jwks.json"

_jwks_cache: dict = {"data": None, "expires": 0}

def _fetch_jwks() -> dict:
    now = time.time()
    if _jwks_cache["data"] and _jwks_cache["expires"] > now:
        return _jwks_cache["data"]
    url = _jwks_url()
    if not url:
        raise HTTPException(status_code=500, detail="SUPABASE_URL not configured")
    try:
        with httpx.Client(timeout=5.0) as client:
            res = client.get(url)
            res.raise_for_status()
            data = res.json()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"JWKS fetch failed: {exc}") from exc
    _jwks_cache["data"] = data
    _jwks_cache["expires"] = now + 60 * 60
    return data

def _decode_with_jwks(token: str) -> dict:
    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")
    jwks = _fetch_jwks()
    keys = jwks.get("keys", [])
    matching = next((k for k in keys if k.get("kid") == kid), None)
    if not matching:
        raise HTTPException(status_code=401, detail="Unknown signing key")
    return jwt.decode(
        token,
        matching,
        algorithms=[matching.get("alg", "RS256")],
        audience=SUPABASE_JWT_AUDIENCE,
        options={"verify_aud": True},
    )

def _decode_with_secret(token: str) -> dict:
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")
    return jwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        algorithms=[SUPABASE_JWT_ALGORITHM],
        audience=SUPABASE_JWT_AUDIENCE,
        options={"verify_aud": True},
    )

def verify_supabase_jwt(token: str) -> dict:
    """Verify the Supabase JWT and return its claims."""
    try:
        if SUPABASE_JWT_ALGORITHM in {"RS256", "ES256", "ES384"}:
            return _decode_with_jwks(token)
        return _decode_with_secret(token)
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado") from None
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Token inválido: {exc}") from exc

# ── FastAPI dependencies ─────────────────────────────────────────────────────
def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUser:
    """Resolve the current user from the Authorization header.

    If `ALLOW_ANONYMOUS_DEV=true`, missing tokens fall back to an anonymous
    pseudo-user — useful for local development before Supabase is wired up.
    """
    if not creds or not creds.credentials:
        if ALLOW_ANONYMOUS:
            return CurrentUser(id="anon-dev", email=None, role="anonymous", aal=None, raw_claims={})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta token de autorización",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = verify_supabase_jwt(creds.credentials)
    user_metadata = claims.get("user_metadata", {}) or {}
    role = user_metadata.get("role") or claims.get("role") or "authenticated"
    return CurrentUser(
        id=claims.get("sub"),
        email=claims.get("email"),
        role=role,
        aal=claims.get("aal"),
        raw_claims=claims,
    )

def get_optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[CurrentUser]:
    if not creds or not creds.credentials:
        return None
    try:
        claims = verify_supabase_jwt(creds.credentials)
    except HTTPException:
        return None
    user_metadata = claims.get("user_metadata", {}) or {}
    role = user_metadata.get("role") or claims.get("role") or "authenticated"
    return CurrentUser(
        id=claims.get("sub"),
        email=claims.get("email"),
        role=role,
        aal=claims.get("aal"),
        raw_claims=claims,
    )

def require_role(*allowed_roles: str):
    """Dependency factory: returns a dependency that enforces one of the roles."""
    def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"Requires role in {allowed_roles}")
        return user
    return _checker

def require_aal2(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Require Authentication Assurance Level 2 (i.e. MFA-verified session)."""
    if user.aal != "aal2":
        raise HTTPException(status_code=403, detail="Esta acción requiere MFA verificado")
    return user