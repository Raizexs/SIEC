# scraper/validators.py
"""
Validadores del pipeline de persistencia del microservicio scraper SIEC.

Filtro de Variación de Precios
-------------------------------
Descarta automáticamente cualquier precio que represente una variación
irracional respecto al último precio registrado para ese insumo/tienda.

Reglas:
  - nuevo_precio > 3 × ultimo_precio  (+200%): DESCARTAR y logear
  - nuevo_precio < 0.5 × ultimo_precio (-50%):  DESCARTAR y logear
  - Sin precio previo (primer registro):         ACEPTAR siempre
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Umbrales de variación aceptable
# ──────────────────────────────────────────────────────────────────────────────

UMBRAL_MAXIMO_FACTOR = 3.0    # nuevo > 3× anterior  → rechazo (+200%)
UMBRAL_MINIMO_FACTOR = 0.5    # nuevo < 0.5× anterior → rechazo (−50%)


# ──────────────────────────────────────────────────────────────────────────────
# Función principal
# ──────────────────────────────────────────────────────────────────────────────

def validar_variacion_precio(
    insumo_id: Optional[int],
    tienda: str,
    nuevo_precio: float,
    db,                         # módulo db (inyectado para facilitar el testing)
    nombre_producto: str = "",  # usado solo para el mensaje de log
    url: str = "",              # usado para recuperar el último precio histórico
) -> bool:
    """
    Valida si *nuevo_precio* representa una variación aceptable respecto
    al último precio registrado para el par (tienda, url) en precio_mercado.

    Args:
        insumo_id:       FK al insumo (puede ser None si no fue mapeado).
        tienda:          Clave de tienda: 'sodimac' | 'easy' | 'construmart'.
        nuevo_precio:    Precio recién scrapeado (en CLP, float).
        db:              Módulo de persistencia que expone
                         ``get_ultimo_precio_valido(tienda, url) -> Optional[float]``.
        nombre_producto: Nombre legible del producto (para logs).
        url:             URL del producto; clave de búsqueda en precio_mercado.

    Returns:
        True  → precio aceptado, debe persistirse.
        False → precio rechazado, debe descartarse.

    Reglas de decisión:
        1. Si no existe precio previo → ACEPTAR (primer registro).
        2. Si nuevo > 3 × anterior   → DESCARTAR (variación > +200%).
        3. Si nuevo < 0.5 × anterior → DESCARTAR (variación < −50%).
        4. En cualquier otro caso    → ACEPTAR.
    """
    # Obtener último precio registrado para esta URL/tienda
    ultimo_precio: Optional[float] = db.get_ultimo_precio_valido(tienda, url)

    # Regla 1: primer registro — siempre aceptar
    if ultimo_precio is None:
        return True

    # Calcular variación porcentual para el log
    variacion_pct = ((nuevo_precio - ultimo_precio) / ultimo_precio) * 100

    # Regla 2: aumento irracional
    if nuevo_precio > UMBRAL_MAXIMO_FACTOR * ultimo_precio:
        _log_descarte(
            nombre_producto=nombre_producto,
            tienda=tienda,
            ultimo_precio=ultimo_precio,
            nuevo_precio=nuevo_precio,
            variacion_pct=variacion_pct,
            umbral_desc=f"+{int((UMBRAL_MAXIMO_FACTOR - 1) * 100)}%",
        )
        return False

    # Regla 3: caída irracional
    if nuevo_precio < UMBRAL_MINIMO_FACTOR * ultimo_precio:
        _log_descarte(
            nombre_producto=nombre_producto,
            tienda=tienda,
            ultimo_precio=ultimo_precio,
            nuevo_precio=nuevo_precio,
            variacion_pct=variacion_pct,
            umbral_desc=f"-{int((1 - UMBRAL_MINIMO_FACTOR) * 100)}%",
        )
        return False

    # Regla 4: variación dentro del rango aceptable
    return True


# ──────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ──────────────────────────────────────────────────────────────────────────────

def _fmt_clp(valor: float) -> str:
    """Formatea un precio en CLP usando punto como separador de miles (ej. $5.000)."""
    return f"${int(valor):,}".replace(",", ".")


def _log_descarte(
    nombre_producto: str,
    tienda: str,
    ultimo_precio: float,
    nuevo_precio: float,
    variacion_pct: float,
    umbral_desc: str,
) -> None:
    """Emite el WARNING estándar cuando un precio es descartado."""
    tienda_display = tienda.capitalize()
    nombre_display = nombre_producto if nombre_producto else "(sin nombre)"
    signo = "+" if variacion_pct >= 0 else ""
    logger.warning(
        f"Precio descartado: {nombre_display} en {tienda_display} "
        f"pasó de {_fmt_clp(ultimo_precio)} a {_fmt_clp(nuevo_precio)} "
        f"({signo}{variacion_pct:.0f}%). "
        f"Supera umbral de {umbral_desc}."
    )
