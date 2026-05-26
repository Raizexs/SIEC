from __future__ import annotations

import os
from typing import Optional

import requests

SERPAPI_METALCON_KEY_ENV = "SERPAPI_METALCON_API_KEY"
SERPAPI_ENDPOINT = "https://serpapi.com/search.json"

REFERENCE_PRICES = {
    "perfil c 60x38mm 3m": 12990.0,
    "perfil u 62x25mm 3m": 11990.0,
    "tornillo autoperforante caja 100un": 5990.0,
}

SERPAPI_KEYWORDS = {
    "perfil c 60x38mm 3m": ["perfil metalcon C", "perfil c 60x38", "perfil c metalcon"],
    "perfil u 62x25mm 3m": ["perfil metalcon U", "perfil u 62x25", "perfil u metalcon"],
    "tornillo autoperforante caja 100un": ["tornillo autoperforante", "tornillo punta broca", "tornillo metalcon"],
}


def _normalize(text: str) -> str:
    return " ".join((text or "").strip().lower().split())


def _reference_key(query: str) -> Optional[str]:
    normalized = _normalize(query)
    for key, keywords in SERPAPI_KEYWORDS.items():
        if normalized == key:
            return key
        if any(_normalize(keyword) in normalized for keyword in keywords):
            return key
    return None


def _fallback_url(query: str) -> str:
    return f"fallback://{_normalize(query).replace(' ', '-') }"


def _serpapi_price(query: str) -> Optional[float]:
    api_key = os.getenv(SERPAPI_METALCON_KEY_ENV, "").strip()
    if not api_key:
        return None

    try:
        response = requests.get(
            SERPAPI_ENDPOINT,
            params={
                "engine": "google_shopping",
                "q": query,
                "hl": "es",
                "gl": "cl",
                "api_key": api_key,
            },
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return None

    shopping_results = payload.get("shopping_results") or []
    if not shopping_results:
        return None

    for result in shopping_results:
        raw_price = result.get("extracted_price") or result.get("price")
        try:
            if raw_price is not None:
                return float(str(raw_price).replace("$", "").replace(".", "").replace(",", "."))
        except Exception:
            continue

    return None


def lookup_reference_offer(query: str, tienda: str, insumo_id: Optional[int] = None) -> Optional[dict]:
    key = _reference_key(query)
    if not key:
        return None

    precio = REFERENCE_PRICES.get(key) or _serpapi_price(query)
    if precio is None:
        return None

    nombre_producto = {
        "perfil c 60x38mm 3m": "Perfil C 60x38mm 3m",
        "perfil u 62x25mm 3m": "Perfil U 62x25mm 3m",
        "tornillo autoperforante caja 100un": "Tornillo autoperforante (caja 100un)",
    }[key]

    return {
        "tienda": tienda,
        "url": _fallback_url(query),
        "nombre_producto": nombre_producto,
        "precio": float(precio),
        "precio_descuento": None,
        "stock": "Referencia",
        "categoria": "Obra Gruesa",
        "insumo_id": insumo_id,
        "exitoso": True,
    }
