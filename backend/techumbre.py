"""
Partida de techumbre completa para el MVP de SIEC.

Genera dinamicamente los insumos de techo (cerchas, cubierta, aislacion)
a partir del area en planta, asumiendo techo a dos aguas con pendiente 25%.

Los precios son constantes temporales para salir a produccion el 27 de mayo.
"""

import math
from collections import defaultdict
from typing import Any, Dict, List, Optional

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
    latest_precio_record: Optional[Dict[int, Any]] = None,
    material_id: int = 1,
) -> List[CategoriaDesglose]:
    """
    Genera la lista de insumos para una techumbre completa de vivienda
    de un piso con techo a dos aguas y pendiente del 25%.

    El tipo de estructura se adapta al material estructural:
      - Madera (1): cerchas de pino 2x4 (comportamiento actual)
      - Metalcom (2): cerchas de perfil metalcon C
      - Albañilería (3): losa de hormigón armado + cubierta
      - Hormigón Armado (4): losa de hormigón armado + cubierta

    Args:
        area_m2_planta: Superficie total en planta (m²).
        largo_promedio_m: Largo promedio de la casa (opcional; se deriva
            de sqrt(area) si no se provee).
        material_id: ID del material estructural (1=Madera, 2=Metalcom,
            3=Albañilería, 4=Hormigón Armado).

    Returns:
        Lista de CategoriaDesglose con los insumos agrupados en categorías.
    """
    if area_m2_planta <= 0:
        return []

    def _lookup(insumo_id: int, fallback_price: float):
        """Busca precio/tienda/url scrapeados; retorna (precio, tienda, url)."""
        if latest_precio_record:
            pm = latest_precio_record.get(insumo_id)
            if pm and pm.precio:
                return (float(pm.precio), pm.tienda or "", getattr(pm, 'url', '') or "")
        return (fallback_price, "Referencia", "")

    largo = largo_promedio_m if (largo_promedio_m and largo_promedio_m > 0) else _derive_largo(area_m2_planta)
    ancho = area_m2_planta / largo if largo > 0 else largo

    # ── Área inclinada (a dos aguas, pendiente 25%) ───────────────────────
    area_inclinada = area_m2_planta * 1.05

    # Elementos comunes: cubierta + aislación (para todos los materiales)
    altura_cumbrera = ancho * 0.25
    largo_vertiente = math.sqrt((ancho / 2) ** 2 + altura_cumbrera ** 2)

    # ── Planchas de zinc ──────────────────────────────────────────────────
    area_plancha = 0.85 * 2.5
    piezas_zinc = math.ceil(area_inclinada / area_plancha * 1.10)

    # ── Costaneras ────────────────────────────────────────────────────────
    sep_costaneras = 0.60
    cant_costaneras_lado = math.ceil(largo_vertiente / sep_costaneras) + 1
    ancho_techo = ancho + 1.0  # con alero
    ml_costaneras = cant_costaneras_lado * ancho_techo * 2

    # ── Tornillos para techo con golilla ──────────────────────────────────
    tornillos_techo_cant = math.ceil(piezas_zinc * 8 / 100)

    # ── Aislación de cielo ────────────────────────────────────────────────
    area_rollo = 14.4
    rollos_aislacion = math.ceil(area_m2_planta / area_rollo)

    # ── Lookup scraped prices ─────────────────────────────────────────────
    precio_zinc, tienda_zinc, url_zinc = _lookup(49, _PRECIOS["plancha zinc"])
    precio_torn, tienda_torn, url_torn = _lookup(51, 8500.0)
    precio_lana, tienda_lana, url_lana = _lookup(48, _PRECIOS["lana vidrio"])

    # ── Estructura según material ─────────────────────────────────────────
    if material_id in (1, 2, 5):
        # ── Madera, Metalcom o Híbrido: cerchas ───────────────────────────
        cant_cerchas = math.ceil(largo / 0.60) + 1
        if material_id == 1:
            # Cerchas de pino 2x4
            ml_pino_por_cercha = 10.0
            total_ml_pino = cant_cerchas * ml_pino_por_cercha
            largo_comercial = 3.2
            piezas_pino = math.ceil(total_ml_pino / largo_comercial * 1.15)
            precio_pino, tienda_pino, url_pino = _lookup(11, _PRECIOS["pino 2x4"])
            subtotal_estructura = piezas_pino * precio_pino

            items_estructura = [
                InsumoCalculado(
                    insumo="Cercha pino 2x4 (10 ml c/u)",
                    cantidad=float(cant_cerchas),
                    unidad="un",
                    precio_unitario=float(precio_pino * ml_pino_por_cercha / largo_comercial),
                    subtotal=float(subtotal_estructura),
                    tienda=tienda_pino if tienda_pino != "Referencia" else "Referencia",
                    url_producto=url_pino if url_pino else None,
                    perdida_porcentual=15.0,
                    formato_comercial="3.2 m",
                ),
            ]
            # Costaneras de pino 2x2
            precio_cost, tienda_cost, url_cost = _lookup(50, 2800.0)
            piezas_costanera = math.ceil(ml_costaneras / 3.2 * 1.10)
            subtotal_costaneras = piezas_costanera * precio_cost
            items_costanera = InsumoCalculado(
                insumo="Costanera pino 2x2 3.2m",
                cantidad=float(piezas_costanera),
                unidad="un",
                precio_unitario=float(precio_cost),
                subtotal=float(subtotal_costaneras),
                tienda=tienda_cost if tienda_cost != "Referencia" else "Referencia",
                url_producto=url_cost if url_cost else None,
                perdida_porcentual=10.0,
                formato_comercial="3.2 m",
            )
        else:
            # Metalcom / Híbrido: cerchas de perfil C 60x38mm
            ml_perfil_por_cercha = 10.0
            total_ml_perfil = cant_cerchas * ml_perfil_por_cercha
            largo_comercial = 6.0
            piezas_perfil = math.ceil(total_ml_perfil / largo_comercial * 1.10)
            precio_perfil, tienda_perfil, url_perfil = _lookup(7, 8500.0)
            subtotal_estructura = piezas_perfil * precio_perfil

            items_estructura = [
                InsumoCalculado(
                    insumo="Cercha Perfil C 60x38mm (10 ml c/u)",
                    cantidad=float(cant_cerchas),
                    unidad="un",
                    precio_unitario=float(precio_perfil * ml_perfil_por_cercha / largo_comercial),
                    subtotal=float(subtotal_estructura),
                    tienda=tienda_perfil if tienda_perfil != "Referencia" else "Referencia",
                    url_producto=url_perfil if url_perfil else None,
                    perdida_porcentual=10.0,
                    formato_comercial="6.0 m",
                ),
            ]
            # Costaneras de perfil C (mismas que estructura)
            precio_cost, tienda_cost, url_cost = _lookup(7, 8500.0)
            piezas_costanera = math.ceil(ml_costaneras / 6.0 * 1.10)
            subtotal_costaneras = piezas_costanera * precio_cost
            items_costanera = InsumoCalculado(
                insumo="Costanera Perfil C 60x38mm 6m",
                cantidad=float(piezas_costanera),
                unidad="un",
                precio_unitario=float(precio_cost),
                subtotal=float(subtotal_costaneras),
                tienda=tienda_cost if tienda_cost != "Referencia" else "Referencia",
                url_producto=url_cost if url_cost else None,
                perdida_porcentual=10.0,
                formato_comercial="6.0 m",
            )

        subtotal_zinc = piezas_zinc * precio_zinc
        subtotal_tornillos_techo = tornillos_techo_cant * precio_torn
        subtotal_aislacion = rollos_aislacion * precio_lana

        items_cubierta = [
            InsumoCalculado(
                insumo="Plancha zinc 0.85x2.5m",
                cantidad=float(piezas_zinc),
                unidad="un",
                precio_unitario=float(precio_zinc),
                subtotal=float(subtotal_zinc),
                tienda=tienda_zinc if tienda_zinc != "Referencia" else "Referencia",
                url_producto=url_zinc if url_zinc else None,
                perdida_porcentual=10.0,
                formato_comercial="0.85 x 2.5 m",
            ),
            items_costanera,
            InsumoCalculado(
                insumo="Tornillo techo golilla neopreno (caja 100un)",
                cantidad=float(tornillos_techo_cant),
                unidad="caja",
                precio_unitario=float(precio_torn),
                subtotal=float(subtotal_tornillos_techo),
                tienda=tienda_torn if tienda_torn != "Referencia" else "Referencia",
                url_producto=url_torn if url_torn else None,
                perdida_porcentual=5.0,
                formato_comercial="caja 100 unidades",
            ),
            InsumoCalculado(
                insumo="Lana vidrio 50mm rollo 14.4m2",
                cantidad=float(rollos_aislacion),
                unidad="un",
                precio_unitario=float(precio_lana),
                subtotal=float(subtotal_aislacion),
                tienda=tienda_lana if tienda_lana != "Referencia" else "Referencia",
                url_producto=url_lana if url_lana else None,
                perdida_porcentual=5.0,
                formato_comercial="14.4 m\u00b2",
            ),
        ]

    else:
        # ── Albañilería (3) o Hormigón Armado (4): losa de hormigón ────────
        espesor_losa = 0.10  # 10 cm
        vol_hormigon = area_m2_planta * espesor_losa
        kg_acero = vol_hormigon * 100.0  # 100 kg/m³
        area_moldaje = 0.0  # moldaje perimetral borde losa
        # estimar perímetro desde sqrt
        perim_est = 4.0 * math.sqrt(area_m2_planta)
        area_moldaje = perim_est * espesor_losa

        # Fallback directo: la techumbre de losa es estimación gruesa,
        # no usa el scraper para evitar contaminar precios del fierro (ID 3)
        precio_hormigon = 85000.0; tienda_horm = "Referencia"; url_horm = ""
        precio_acero = 1200.0; tienda_acero = "Referencia"; url_acero = ""

        subtotal_hormigon = vol_hormigon * precio_hormigon
        subtotal_acero = kg_acero * precio_acero

        items_estructura = [
            InsumoCalculado(
                insumo="Losa hormigón armado e=10cm (H25)",
                cantidad=float(round(vol_hormigon, 2)),
                unidad="m3",
                precio_unitario=float(precio_hormigon),
                subtotal=float(subtotal_hormigon),
                tienda=tienda_horm if tienda_horm != "Referencia" else "Referencia",
                url_producto=url_horm if url_horm else None,
                perdida_porcentual=5.0,
                formato_comercial="m3",
            ),
            InsumoCalculado(
                insumo="Acero losa (100 kg/m³)",
                cantidad=float(round(kg_acero, 1)),
                unidad="kg",
                precio_unitario=float(precio_acero),
                subtotal=float(subtotal_acero),
                tienda=tienda_acero if tienda_acero != "Referencia" else "Referencia",
                url_producto=url_acero if url_acero else None,
                perdida_porcentual=5.0,
                formato_comercial="kg",
            ),
        ]

        # Cubierta sobre losa: zinc sobre estructura metálica liviana
        precio_cost, tienda_cost, url_cost = _lookup(7, 8500.0)
        piezas_costanera = math.ceil(ml_costaneras / 6.0 * 1.10)
        subtotal_costaneras = piezas_costanera * precio_cost

        subtotal_zinc = piezas_zinc * precio_zinc
        subtotal_tornillos_techo = tornillos_techo_cant * precio_torn
        subtotal_aislacion = rollos_aislacion * precio_lana

        items_cubierta = [
            InsumoCalculado(
                insumo="Plancha zinc 0.85x2.5m",
                cantidad=float(piezas_zinc),
                unidad="un",
                precio_unitario=float(precio_zinc),
                subtotal=float(subtotal_zinc),
                tienda=tienda_zinc if tienda_zinc != "Referencia" else "Referencia",
                url_producto=url_zinc if url_zinc else None,
                perdida_porcentual=10.0,
                formato_comercial="0.85 x 2.5 m",
            ),
            InsumoCalculado(
                insumo="Costanera Perfil C 60x38mm 6m",
                cantidad=float(piezas_costanera),
                unidad="un",
                precio_unitario=float(precio_cost),
                subtotal=float(subtotal_costaneras),
                tienda=tienda_cost if tienda_cost != "Referencia" else "Referencia",
                url_producto=url_cost if url_cost else None,
                perdida_porcentual=10.0,
                formato_comercial="6.0 m",
            ),
            InsumoCalculado(
                insumo="Tornillo techo golilla neopreno (caja 100un)",
                cantidad=float(tornillos_techo_cant),
                unidad="caja",
                precio_unitario=float(precio_torn),
                subtotal=float(subtotal_tornillos_techo),
                tienda=tienda_torn if tienda_torn != "Referencia" else "Referencia",
                url_producto=url_torn if url_torn else None,
                perdida_porcentual=5.0,
                formato_comercial="caja 100 unidades",
            ),
            InsumoCalculado(
                insumo="Lana vidrio 50mm rollo 14.4m2",
                cantidad=float(rollos_aislacion),
                unidad="un",
                precio_unitario=float(precio_lana),
                subtotal=float(subtotal_aislacion),
                tienda=tienda_lana if tienda_lana != "Referencia" else "Referencia",
                url_producto=url_lana if url_lana else None,
                perdida_porcentual=5.0,
                formato_comercial="14.4 m\u00b2",
            ),
        ]

    # ── Mano de obra para techumbre (estimación gruesa) ───────────────────
    hh_techumbre = math.ceil(area_inclinada * 4.5)
    tarifa_hh = 8_500
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
            subtotal_categoria=float(subtotal_estructura if material_id in (1, 2) else subtotal_hormigon + subtotal_acero),
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
