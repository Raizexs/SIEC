"""
ley21725.py
Validador de Regularización — Ley 21.725 (Ley del Mono)
SCRUM-97

Reglas de negocio:
  - Umbral social inferior:  90 m²
  - Umbral social superior: 140 m²
  - Límite de tasación:     < 520 UF
  - Si el área geométrica del diseño supera 140 m² → Infracción Ley 21.725
  - Si el área está en rango (90–140 m²) pero la tasación estimada >= 520 UF → Infracción Ley 21.725
  - Si el área < 90 m²  → fuera del umbral social mínimo (advertencia, no bloqueo)
"""

from pydantic import BaseModel, Field
from typing import Optional

# ──────────────────────────────────────────────────────────────────────────────
# Constantes normativas (Ley 21.725 / DS 18 MINVU)
# ──────────────────────────────────────────────────────────────────────────────
AREA_UMBRAL_MIN_M2: float = 90.0   # m² mínimo del umbral social
AREA_UMBRAL_MAX_M2: float = 140.0  # m² máximo del umbral social
TASACION_LIMITE_UF: float = 520.0  # Tope de tasación en UF


# ──────────────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────────────
class ValidacionLeyMonoRequest(BaseModel):
    area_m2: float = Field(
        ...,
        gt=0,
        description="Área geométrica total del diseño en m²",
    )
    valor_uf_actual: float = Field(
        ...,
        gt=0,
        description="Valor actual de la UF en CLP (para conversión de tasación)",
    )
    costo_total_clp: Optional[float] = Field(
        None,
        ge=0,
        description="Costo total estimado del proyecto en CLP (opcional, para calcular tasación en UF)",
    )


class ValidacionLeyMonoResponse(BaseModel):
    cumple_ley: bool
    bloqueante: bool
    codigo_infraccion: Optional[str]
    mensaje: str
    detalle: str
    area_m2: float
    tasacion_uf: Optional[float]
    umbral_min_m2: float = AREA_UMBRAL_MIN_M2
    umbral_max_m2: float = AREA_UMBRAL_MAX_M2
    limite_tasacion_uf: float = TASACION_LIMITE_UF


# ──────────────────────────────────────────────────────────────────────────────
# Lógica pura (testeable sin FastAPI)
# ──────────────────────────────────────────────────────────────────────────────
def validar_ley_21725(
    area_m2: float,
    costo_total_clp: Optional[float],
    valor_uf_actual: float,
) -> ValidacionLeyMonoResponse:
    """
    Ejecuta la validación normativa Ley 21.725.

    Returns:
        ValidacionLeyMonoResponse con cumple_ley=False y bloqueante=True
        si se detecta una infracción bloqueante.
    """
    tasacion_uf: Optional[float] = None
    if costo_total_clp is not None and valor_uf_actual > 0:
        tasacion_uf = round(costo_total_clp / valor_uf_actual, 2)

    # ── Caso 1: Área supera el umbral social máximo (140 m²) ─────────────────
    if area_m2 > AREA_UMBRAL_MAX_M2:
        return ValidacionLeyMonoResponse(
            cumple_ley=False,
            bloqueante=True,
            codigo_infraccion="LEY21725-AREA-EXCEDE",
            mensaje="Infracción Ley 21.725",
            detalle=(
                f"El diseño supera el umbral social máximo de {AREA_UMBRAL_MAX_M2:.0f} m² "
                f"establecido por la Ley 21.725 (Ley del Mono). "
                f"Área actual: {area_m2:.2f} m². "
                f"Para ser regularizable, la superficie no puede exceder {AREA_UMBRAL_MAX_M2:.0f} m²."
            ),
            area_m2=area_m2,
            tasacion_uf=tasacion_uf,
        )

    # ── Caso 2: Área dentro del umbral (90–140 m²) pero tasación >= 520 UF ──
    if (
        AREA_UMBRAL_MIN_M2 <= area_m2 <= AREA_UMBRAL_MAX_M2
        and tasacion_uf is not None
        and tasacion_uf >= TASACION_LIMITE_UF
    ):
        return ValidacionLeyMonoResponse(
            cumple_ley=False,
            bloqueante=True,
            codigo_infraccion="LEY21725-TASACION-EXCEDE",
            mensaje="Infracción Ley 21.725",
            detalle=(
                f"La tasación estimada del proyecto ({tasacion_uf:.1f} UF) supera el límite "
                f"de {TASACION_LIMITE_UF:.0f} UF exigido por la Ley 21.725 (Ley del Mono). "
                f"Para acceder al proceso de regularización, el valor de tasación debe ser "
                f"inferior a {TASACION_LIMITE_UF:.0f} UF."
            ),
            area_m2=area_m2,
            tasacion_uf=tasacion_uf,
        )

    # ── Caso 3: Área por debajo del umbral mínimo (< 90 m²) — advertencia ───
    if area_m2 < AREA_UMBRAL_MIN_M2:
        return ValidacionLeyMonoResponse(
            cumple_ley=True,
            bloqueante=False,
            codigo_infraccion="LEY21725-AREA-BAJO-UMBRAL",
            mensaje="Fuera del umbral social mínimo",
            detalle=(
                f"El diseño ({area_m2:.2f} m²) está por debajo del umbral social mínimo "
                f"de {AREA_UMBRAL_MIN_M2:.0f} m² de la Ley 21.725. "
                f"El proceso de regularización aplica para construcciones entre "
                f"{AREA_UMBRAL_MIN_M2:.0f} m² y {AREA_UMBRAL_MAX_M2:.0f} m²."
            ),
            area_m2=area_m2,
            tasacion_uf=tasacion_uf,
        )

    # ── Caso 4: Cumple todos los requisitos ──────────────────────────────────
    tasacion_info = (
        f" Tasación estimada: {tasacion_uf:.1f} UF (dentro del límite de {TASACION_LIMITE_UF:.0f} UF)."
        if tasacion_uf is not None
        else ""
    )
    return ValidacionLeyMonoResponse(
        cumple_ley=True,
        bloqueante=False,
        codigo_infraccion=None,
        mensaje="Diseño regularizable bajo Ley 21.725",
        detalle=(
            f"El diseño cumple los requisitos de la Ley 21.725 (Ley del Mono). "
            f"Área: {area_m2:.2f} m² (dentro del rango {AREA_UMBRAL_MIN_M2:.0f}–{AREA_UMBRAL_MAX_M2:.0f} m²)."
            f"{tasacion_info}"
        ),
        area_m2=area_m2,
        tasacion_uf=tasacion_uf,
    )