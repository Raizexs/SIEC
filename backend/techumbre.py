from __future__ import annotations

from collections import defaultdict
from math import ceil, sqrt

METALCON_MATERIAL_ID = 2
PERIMETRO_FACTOR_BASE = 4.0
SEPARACION_ESTRUCTURAL_METALCON = 0.40
LARGO_COMERCIAL_PERFILES = 3.0
UNIDADES_POR_INTERSECCION = 4


def es_metalcon_material(material_id: int) -> bool:
    return material_id == METALCON_MATERIAL_ID


def perimetro_aproximado(area_bruta_m2: float) -> float:
    return PERIMETRO_FACTOR_BASE * sqrt(max(float(area_bruta_m2), 0.0))


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
        return float(ceil(perimetro * 2.0 / LARGO_COMERCIAL_PERFILES))

    if any(palabra in nombre_normalizado for palabra in ("pie derecho", "montante", "perfil c")):
        return float(ceil(perimetro / SEPARACION_ESTRUCTURAL_METALCON) + 4)

    if any(palabra in nombre_normalizado for palabra in ("cercha", "costanera")):
        return float(ceil(perimetro / SEPARACION_ESTRUCTURAL_METALCON) + 4)

    if any(palabra in nombre_normalizado for palabra in ("clavo", "tornillo", "autoperforante")):
        return float(UNIDADES_POR_INTERSECCION * (ceil(perimetro / SEPARACION_ESTRUCTURAL_METALCON) + 4))

    return None
