"""
Observability stack:
  - Structured logging (structlog) with request IDs.
  - Sentry SDK init (frontend+backend share DSN via env).
  - Slowapi rate limiter.
  - Redis cache helper (decorator + manual API).
  - Lifecycle hooks called from main.py.

All optional: graceful degradation when libs/env are missing.
"""
from __future__ import annotations

import os
import time
import uuid
from contextlib import contextmanager
from functools import wraps
from typing import Callable, Optional

from fastapi import FastAPI, Request, Response

# ── Structured logging ──────────────────────────────────────────────────────
try:
    import structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    log = structlog.get_logger("siec")
except ImportError:  # pragma: no cover
    import logging
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    log = logging.getLogger("siec")

# ── Sentry ──────────────────────────────────────────────────────────────────
SENTRY_DSN = os.getenv("SENTRY_DSN", "")


def init_sentry():
    if not SENTRY_DSN:
        return False
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE", "0.1")),
            profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_SAMPLE", "0.1")),
            environment=os.getenv("ENVIRONMENT", "development"),
        )
        return True
    except Exception as exc:  # pragma: no cover
        log.warn("sentry_init_failed", error=str(exc))
        return False


# ── Rate limiting ──────────────────────────────────────────────────────────
try:
    from slowapi import Limiter
    from slowapi.errors import RateLimitExceeded
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
except ImportError:  # pragma: no cover
    limiter = None


# ── Redis cache ────────────────────────────────────────────────────────────
REDIS_URL = os.getenv("REDIS_URL", "")
_redis_client = None


def get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    if not REDIS_URL:
        return None
    try:
        import redis
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        _redis_client.ping()
        return _redis_client
    except Exception as exc:  # pragma: no cover
        log.warn("redis_init_failed", error=str(exc))
        return None


def cached(key_prefix: str, ttl: int = 60):
    """Decorator: cache a sync function's return JSON in Redis (if available)."""
    import json

    def decorator(fn: Callable):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            r = get_redis()
            if r is None:
                return fn(*args, **kwargs)
            cache_key = f"{key_prefix}:" + ":".join(map(str, args)) + ":" + ":".join(f"{k}={v}" for k, v in kwargs.items())
            cached_val = r.get(cache_key)
            if cached_val:
                return json.loads(cached_val)
            value = fn(*args, **kwargs)
            try:
                r.setex(cache_key, ttl, json.dumps(value, default=str))
            except Exception:
                pass
            return value
        return wrapper
    return decorator


# ── App wiring ──────────────────────────────────────────────────────────────


def install(app: FastAPI):
    init_sentry()

    if limiter is not None:
        app.state.limiter = limiter

        @app.exception_handler(RateLimitExceeded)
        async def _rl_handler(request: Request, exc: RateLimitExceeded):
            return Response(content="Rate limit exceeded", status_code=429)

    @app.middleware("http")
    async def request_logger(request: Request, call_next):
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        start = time.perf_counter()
        try:
            with _bind(rid=rid, path=request.url.path, method=request.method):
                response = await call_next(request)
        except Exception as exc:
            log.error("request_failed", rid=rid, error=str(exc), path=request.url.path)
            raise
        dur_ms = (time.perf_counter() - start) * 1000
        log.info("request", rid=rid, status=response.status_code, ms=round(dur_ms, 1))
        response.headers["x-request-id"] = rid
        return response


@contextmanager
def _bind(**kwargs):
    if hasattr(log, "bind"):
        token = structlog.contextvars.bind_contextvars(**kwargs)
        try:
            yield
        finally:
            structlog.contextvars.unbind_contextvars(*kwargs.keys())
    else:
        yield
