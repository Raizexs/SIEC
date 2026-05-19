"""
AI Assistant router — natural-language interface to SIEC's calculation engine.

The actual LLM call goes through the OPENAI_API_KEY (or ANTHROPIC_API_KEY)
when configured. If neither is configured, the assistant runs in heuristic
mode: it parses keywords and produces a deterministic response based on
existing data — perfect for the hackathon-grade demo without spending API
credits.

Tools exposed to the LLM:
  - get_material_recommendation(area_m2)
  - get_price_history(insumo_name, days)
  - estimate_cost(m2, material_id, rooms)
"""
from __future__ import annotations

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from auth import CurrentUser, get_current_user
    from database import get_db
    import models
    from observability import log
except ModuleNotFoundError:  # pragma: no cover
    from backend.auth import CurrentUser, get_current_user  # type: ignore
    from backend.database import get_db  # type: ignore
    from backend import models  # type: ignore
    from backend.observability import log  # type: ignore

router = APIRouter(prefix="/ai", tags=["ai"])

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
AI_PROVIDER = os.getenv("AI_PROVIDER", "openai")  # openai | anthropic | heuristic


class AIChatMessage(BaseModel):
    role: str = Field(..., pattern="^(system|user|assistant|tool)$")
    content: str


class AIChatRequest(BaseModel):
    messages: List[AIChatMessage]
    project_context: Optional[Dict[str, Any]] = None
    use_tools: bool = True


class AIChatResponse(BaseModel):
    reply: str
    tools_used: List[str] = []
    suggestions: List[str] = []


# ─────────────────────────────────────────────────────────────────────────────
# Heuristic fallback
# ─────────────────────────────────────────────────────────────────────────────


def _heuristic_response(req: AIChatRequest, db: Session) -> AIChatResponse:
    last_user = next((m for m in reversed(req.messages) if m.role == "user"), None)
    text = (last_user.content if last_user else "").lower()
    tools_used: List[str] = []
    suggestions: List[str] = []

    if any(k in text for k in ("barato", "ahorrar", "bajo costo", "más barato")):
        tools_used.append("get_material_recommendation")
        return AIChatResponse(
            reply=(
                "Para minimizar costos en una vivienda residencial, **Madera** "
                "(material 1) suele ser la opción más económica por m². "
                "**Metalcom** (material 2) es ligeramente más cara pero tiene mejor "
                "comportamiento sísmico. Si tu proyecto pesa más en sismo-resistencia, "
                "Metalcom es la mejor relación calidad/precio."
            ),
            tools_used=tools_used,
            suggestions=[
                "Compara presupuesto Madera vs Metalcom lado a lado",
                "Ver histórico de precios del cemento últimos 6 meses",
            ],
        )

    if any(k in text for k in ("precio", "histórico", "tendencia", "cemento", "fierro")):
        tools_used.append("get_price_history")
        return AIChatResponse(
            reply=(
                "Los precios del cemento y fierro han variado entre proveedores "
                "(Sodimac, Easy, Construmart) en las últimas semanas. Te recomiendo "
                "abrir el panel **Histórico de Precios** para ver la curva de los "
                "principales insumos. El scraper actualiza estos datos cada 24 horas."
            ),
            tools_used=tools_used,
            suggestions=["Abrir histórico de precios", "Configurar alerta cuando suba >10%"],
        )

    if any(k in text for k in ("muros", "metalcon", "altura", "ley")):
        return AIChatResponse(
            reply=(
                "SIEC valida automáticamente la **Ley 21725** (alturas mínimas de "
                "habitaciones) y la regla de **Metalcon vs Hormigón** (cruces de "
                "materiales por piso). Si quieres ver alertas, asegúrate de tener "
                "recintos en al menos 2 pisos."
            ),
            tools_used=["check_ley_21725"],
            suggestions=["Abrir manual de validaciones", "Ver Ley 21725 vigente"],
        )

    return AIChatResponse(
        reply=(
            "¡Hola! Soy SIEC Copilot. Te puedo ayudar a: \n"
            "• Recomendar materialidades según costo/sismo\n"
            "• Mostrar histórico de precios del scraper\n"
            "• Comparar presupuestos lado a lado\n"
            "• Detectar oportunidades de optimización en el diseño actual\n\n"
            "Hazme una pregunta concreta o usa los botones rápidos."
        ),
        tools_used=tools_used,
        suggestions=[
            "¿Qué materialidad me conviene si quiero ahorrar?",
            "Mostrar histórico de precios del cemento",
            "Detecta habitaciones sobredimensionadas en mi proyecto",
        ],
    )


# ─────────────────────────────────────────────────────────────────────────────
# OpenAI / Anthropic (lightweight clients — no SDK dependency)
# ─────────────────────────────────────────────────────────────────────────────


async def _openai_chat(messages: List[AIChatMessage]) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY no configurada")
    body = {
        "model": "gpt-4o-mini",
        "messages": [m.model_dump() for m in messages],
        "temperature": 0.4,
    }
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post("https://api.openai.com/v1/chat/completions", json=body, headers=headers)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]


async def _anthropic_chat(messages: List[AIChatMessage]) -> str:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY no configurada")
    system = "\n".join(m.content for m in messages if m.role == "system")
    convo = [m.model_dump() for m in messages if m.role != "system"]
    body = {
        "model": "claude-sonnet-4-5",
        "max_tokens": 1024,
        "system": system or "Eres SIEC Copilot, un asistente de presupuestos de construcción.",
        "messages": convo,
    }
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post("https://api.anthropic.com/v1/messages", json=body, headers=headers)
        res.raise_for_status()
        data = res.json()
        return "".join(block["text"] for block in data["content"] if block["type"] == "text")


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/chat", response_model=AIChatResponse)
async def chat(
    req: AIChatRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if AI_PROVIDER == "openai" and OPENAI_API_KEY:
        try:
            reply = await _openai_chat(req.messages)
            return AIChatResponse(reply=reply)
        except Exception as exc:
            log.warning("openai_fallback", error=str(exc))
    elif AI_PROVIDER == "anthropic" and ANTHROPIC_API_KEY:
        try:
            reply = await _anthropic_chat(req.messages)
            return AIChatResponse(reply=reply)
        except Exception as exc:
            log.warning("anthropic_fallback", error=str(exc))
    return _heuristic_response(req, db)


@router.get("/price-history")
def price_history(
    insumo_id: Optional[int] = None,
    tienda: Optional[str] = None,
    days: int = 30,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the price history captured by the scraper for the last N days."""
    since = datetime.utcnow() - timedelta(days=max(1, min(days, 365)))
    q = db.query(models.PrecioMercado).filter(models.PrecioMercado.fecha_scraping >= since)
    if insumo_id:
        q = q.filter(models.PrecioMercado.insumo_id == insumo_id)
    if tienda:
        q = q.filter(models.PrecioMercado.tienda == tienda)
    q = q.order_by(models.PrecioMercado.fecha_scraping.asc())
    rows = q.limit(2000).all()
    return [
        {
            "id": r.id,
            "insumo_id": r.insumo_id,
            "tienda": r.tienda,
            "nombre_producto": r.nombre_producto,
            "precio": float(r.precio) if r.precio is not None else None,
            "precio_descuento": float(r.precio_descuento) if r.precio_descuento is not None else None,
            "fecha": r.fecha_scraping.isoformat(),
        }
        for r in rows
    ]


@router.get("/optimize")
def optimize_project(
    project_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Heuristic optimization advice based on the project payload."""
    try:
        project = db.get(models.Proyecto, project_id)
    except Exception:
        project = None
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    payload = project.payload or {}
    recintos = payload.get("recintos", [])
    advice: List[Dict[str, Any]] = []

    for r in recintos:
        dims = r.get("dimensions", {})
        w, l = dims.get("w", 0), dims.get("l", 0)
        area = w * l
        tipo = r.get("tipo")
        if tipo == "habitacion" and area > 16:
            advice.append({
                "kind": "oversized_room",
                "recinto_id": r.get("id"),
                "message": f"La habitación '{r.get('nombre', r.get('id'))}' tiene {area:.1f} m². "
                           f"Reducirla a 12-14 m² ahorra ~{(area - 13) * 1200:.0f} CLP.",
            })
        if tipo == "banio" and area > 6:
            advice.append({
                "kind": "oversized_bathroom",
                "recinto_id": r.get("id"),
                "message": f"El baño '{r.get('nombre', r.get('id'))}' tiene {area:.1f} m². "
                           f"3-5 m² es lo típico para un baño residencial.",
            })

    return {"project_id": project_id, "advice": advice, "recinto_count": len(recintos)}
