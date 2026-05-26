"""
Partida de techumbre completa para el MVP de SIEC.

Genera dinamicamente los insumos de techo (cerchas, cubierta, aislacion)
a partir del area en planta, asumiendo techo a dos aguas con pendiente 25%.

Los precios son constantes temporales para salir a produccion el 27 de mayo.
"""

import math
from collections import defaultdict
from typing import List, Optional

from schemas import InsumoCalculado, CategoriaDesglose


METALCON_MATERIAL_ID = 2
PERIMETRO_FACTOR_BASE = 4.0
SEPARACION_ESTRUCTURAL_METALCON = 0.40
LARGO_COMERCIAL_PERFILES = 3.0
UNIDADES_POR_INTERSECCION = 4


def es_metalcon_material(material_id: int) -> bool:
    return int(material_id) == METALCON_MATERIAL_ID


def perimetro_aproximado(area_bruta_m2: float) -> float:
    return PERIMETRO_FACTOR_BASE * math.sqrt(max(float(area_bruta_m2), 0.0))


def perimetro_desde_recintos(recintos: list[dict], area_bruta_m2: float) -> float:
    if not recintos:
        return perimetro_aproximado(area_bruta_m2)

    recintos_por_piso = defaultdict(list)
    for recinto in recintos:
        try:
            piso = int(recinto.get("piso", 1))
            x = float(recinto.get("coords_x", recinto.get("x", 0.0)))
            z = float(recinto.get("coords_z", recinto.get("z", 0.0)))
            width = float(recinto.get("width", recinto.get("w", 0.0)))
            length = float(recinto.get("length", recinto.get("l", 0.0)))
        except Exception:
            continue

        if width <= 0 or length <= 0:
            continue

        recintos_por_piso[piso].append((x, z, width, length))

    if not recintos_por_piso:
        return perimetro_aproximado(area_bruta_m2)

    perimetro_total = 0.0
    for recintos_piso in recintos_por_piso.values():
        min_x = min(x for x, _, _, _ in recintos_piso)
        min_z = min(z for _, z, _, _ in recintos_piso)
        max_x = max(x + width for x, _, width, _ in recintos_piso)
        max_z = max(z + length for _, z, _, length in recintos_piso)
        perimetro_total += 2.0 * ((max_x - min_x) + (max_z - min_z))

    return perimetro_total if perimetro_total > 0 else perimetro_aproximado(area_bruta_m2)


def nombre_insumo_metalcon(nombre_insumo: str) -> str:
    nombre_normalizado = (nombre_insumo or "").strip().lower()

    if any(palabra in nombre_normalizado for palabra in ("solera", "canal u", "perfil u")):
        return "Perfil U 62x25mm 3m"

    if any(palabra in nombre_normalizado for palabra in ("pie derecho", "montante", "perfil c")):
        return "Perfil C 60x38mm 3m"

    if any(palabra in nombre_normalizado for palabra in ("cercha", "costanera")):
        return "Perfil C 60x38mm 3m"

    if any(palabra in nombre_normalizado for palabra in ("clavo", "tornillo", "autoperforante")):
        if "techo" in nombre_normalizado or "madera" in nombre_normalizado:
            return "Tornillo hexagonal con golilla"
        return "Tornillo autoperforante 8x1/2"

    return nombre_insumo


def cantidad_insumo_metalcon(
    nombre_insumo: str,
    area_bruta_m2: float,
    recintos: list[dict] | None = None,
) -> float | None:
    nombre_normalizado = (nombre_insumo or "").strip().lower()
    perimetro = perimetro_desde_recintos(recintos or [], area_bruta_m2)

    if any(palabra in nombre_normalizado for palabra in ("solera", "canal u", "perfil u")):
        return float(math.ceil(perimetro * 2.0 / LARGO_COMERCIAL_PERFILES))

    if any(palabra in nombre_normalizado for palabra in ("pie derecho", "montante", "perfil c")):
        return float(math.ceil(perimetro / SEPARACION_ESTRUCTURAL_METALCON) + 4)

    if any(palabra in nombre_normalizado for palabra in ("cercha", "costanera")):
        return float(math.ceil(perimetro / SEPARACION_ESTRUCTURAL_METALCON) + 4)

    if any(palabra in nombre_normalizado for palabra in ("clavo", "tornillo", "autoperforante")):
        return float(UNIDADES_POR_INTERSECCION * (math.ceil(perimetro / SEPARACION_ESTRUCTURAL_METALCON) + 4))

    return None


# ── Precios referenciales mercado chileno Mayo 2026 (CLP) ─────────────────────
# Valores temporales mientras el scraper no cubra estos insumos.
_PRECIOS: dict[str, float] = {
    "pino 2x4": 4_500,
    "plancha zinc": 12_900,
    "lana vidrio": 32_000,
}


def _derive_largo(area_m2: float) -> float:
    """
    Estima el largo promedio de la casa asumiendo planta rectangular.
    Si el area es ~105 m2 (15x7), la raiz cuadrada da ~10.25 m,
    que es un promedio razonable entre 15 y 7.
    """
    return math.sqrt(area_m2)


def calcular_partida_techumbre(
    area_m2_planta: float,
    largo_promedio_m: Optional[float] = None,
) -> List[CategoriaDesglose]:
    """
    Genera la lista de insumos para una techumbre completa de vivienda
    de un piso con techo a dos aguas y pendiente del 25%.

    Args:
        area_m2_planta: Superficie total en planta (m²).
        largo_promedio_m: Largo promedio de la casa (opcional; se deriva
            de sqrt(area) si no se provee).

    Returns:
        Lista de CategoriaDesglose con los insumos agrupados en dos
        categorias: "Techumbre - Estructura" y "Techumbre - Cubierta".
    """
    if area_m2_planta <= 0:
        return []

    largo = largo_promedio_m if (largo_promedio_m and largo_promedio_m > 0) else _derive_largo(area_m2_planta)

    # ── Área inclinada ────────────────────────────────────────────────────
    # Pendiente 25% → factor = sqrt(1 + 0.25²) = 1.0308
    # Se redondea a 1.05 para incluir aleros y voladizos.
    area_inclinada = area_m2_planta * 1.05

    # ── 1. Cerchas (estructura de techo) ──────────────────────────────────
    # Separación cada 60 cm a lo largo del largo promedio
    cant_cerchas = math.ceil(largo / 0.60) + 1

    # Cada cercha consume ~10 ml de pino 2x4
    ml_pino_por_cercha = 10.0
    total_ml_pino = cant_cerchas * ml_pino_por_cercha

    # Largo comercial pino 2x4 = 3.2 m → piezas enteras con merma 15%
    largo_comercial = 3.2
    piezas_pino = math.ceil(total_ml_pino / largo_comercial * 1.15)
    subtotal_pino = piezas_pino * _PRECIOS["pino 2x4"]

    # Geometria del techo
    ancho = area_m2_planta / largo if largo > 0 else largo
    altura_cumbrera = ancho * 0.25  # pendiente 25%
    largo_vertiente = math.sqrt((ancho / 2) ** 2 + altura_cumbrera ** 2)

    # ── 2. Planchas de zinc ───────────────────────────────────────────────
    area_plancha = 0.85 * 2.5
    piezas_zinc = math.ceil(area_inclinada / area_plancha * 1.10)
    subtotal_zinc = piezas_zinc * _PRECIOS["plancha zinc"]

    # ── 2b. Costaneras pino 2x2 (correas transversales a cerchas) ─────────
    sep_costaneras = 0.60  # cada 60 cm a lo largo de la pendiente
    cant_costaneras_lado = math.ceil(largo_vertiente / sep_costaneras) + 1
    # Cada costanera recorre el ancho del techo; son 2 lados (vertientes)
    ancho_techo = ancho + 1.0  # ancho con alero
    ml_costaneras = cant_costaneras_lado * ancho_techo * 2  # 2 lados
    piezas_costanera = math.ceil(ml_costaneras / 3.2 * 1.10)  # pino 2x2 en 3.2m
    subtotal_costaneras = piezas_costanera * 2800.0

    # ── 2c. Tornillos para techo con golilla ───────────────────────────────
    tornillos_techo_cant = math.ceil(piezas_zinc * 8 / 100)  # ~8 tornillos por plancha, caja 100
    subtotal_tornillos_techo = tornillos_techo_cant * 8500

    # ── 3. Aislación de cielo (lana de vidrio) ────────────────────────────
    # Rollo de 14.4 m² (0.60 × 8.0 m con traslapo efectivo)
    area_rollo = 14.4
    rollos_aislacion = math.ceil(area_m2_planta / area_rollo)
    subtotal_aislacion = rollos_aislacion * _PRECIOS["lana vidrio"]

    # ── Construir items ───────────────────────────────────────────────────
    items_estructura = [
        InsumoCalculado(
            insumo="Cercha pino 2x4 (10 ml c/u)",
            cantidad=float(cant_cerchas),
            unidad="un",
            precio_unitario=float(_PRECIOS["pino 2x4"] * ml_pino_por_cercha / largo_comercial),
            subtotal=float(subtotal_pino),
            tienda="Referencia",
            perdida_porcentual=15.0,
            formato_comercial="3.2 m",
        ),
    ]

    items_cubierta = [
        InsumoCalculado(
            insumo="Plancha zinc 0.85x2.5m",
            cantidad=float(piezas_zinc),
            unidad="un",
            precio_unitario=float(_PRECIOS["plancha zinc"]),
            subtotal=float(subtotal_zinc),
            tienda="Referencia",
            perdida_porcentual=10.0,
            formato_comercial="0.85 x 2.5 m",
        ),
        InsumoCalculado(
            insumo="Costanera pino 2x2 3.2m",
            cantidad=float(piezas_costanera),
            unidad="un",
            precio_unitario=2800.0,
            subtotal=float(subtotal_costaneras),
            tienda="Referencia",
            perdida_porcentual=10.0,
            formato_comercial="3.2 m",
        ),
        InsumoCalculado(
            insumo="Tornillo techo golilla neopreno (caja 100un)",
            cantidad=float(tornillos_techo_cant),
            unidad="caja",
            precio_unitario=8500.0,
            subtotal=float(subtotal_tornillos_techo),
            tienda="Referencia",
            perdida_porcentual=5.0,
            formato_comercial="caja 100 unidades",
        ),
        InsumoCalculado(
            insumo="Lana vidrio 50mm rollo 14.4m2",
            cantidad=float(rollos_aislacion),
            unidad="un",
            precio_unitario=float(_PRECIOS["lana vidrio"]),
            subtotal=float(subtotal_aislacion),
            tienda="Referencia",
            perdida_porcentual=5.0,
            formato_comercial="14.4 m\u00b2",
        ),
    ]

    # ── Mano de obra para techumbre (estimación gruesa) ───────────────────
    # ~4.5 HH/m² incluyendo estructura + cubierta
    hh_techumbre = math.ceil(area_inclinada * 4.5)
    tarifa_hh = 8_500  # CLP/HH para maestro+ayudante
    subtal_mo = hh_techumbre * tarifa_hh

    items_mo = [
        InsumoCalculado(
            insumo="Mano de obra techumbre (estructura + cubierta)",
            cantidad=float(hh_techumbre),
            unidad="HH",
            precio_unitario=float(tarifa_hh),
            subtotal=float(subtal_mo),
            tienda="Referencia",
            perdida_porcentual=0.0,
        ),
    ]

    return [
        CategoriaDesglose(
            categoria="Techumbre - Estructura",
            items=items_estructura,
            subtotal_categoria=float(subtotal_pino),
        ),
        CategoriaDesglose(
            categoria="Techumbre - Cubierta",
            items=items_cubierta,
            subtotal_categoria=float(subtotal_zinc + subtotal_costaneras + subtotal_tornillos_techo + subtotal_aislacion),
        ),
        CategoriaDesglose(
            categoria="Techumbre - Mano de Obra",
            items=items_mo,
            subtotal_categoria=float(subtal_mo),
        ),
    ]
