"""
Validador normativo agregado para proyectos SIEC.

Combina Ley 21.725, altura mínima de recintos (OGUC), y sugerencias
LOSCAT (térmico) / LOSCAA (acústico-fuego) sin bloquear el flujo de diseño.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    from Ley21725 import validar_ley_21725
except ModuleNotFoundError:
    from backend.Ley21725 import validar_ley_21725  # type: ignore

MIN_ROOM_HEIGHT_M = 2.1
SUPPORT_SAMPLE_THRESHOLD = 0.98
SUPPORT_GRID = 4
MAX_CANTILEVER_BY_MATERIAL = {1: 1.0, 2: 1.2, 3: 1.5, 4: 2.0}
EDGE_SAMPLE_STEP = 0.12
MASONRY_CONCRETE_MATERIAL_IDS: Set[int] = {3, 4}
HABITACION_TIPOS = frozenset({"habitacion", "habitación", "dormitorio", "bedroom"})
BANIO_TIPOS = frozenset({"banio", "baño", "bathroom", "wc"})


def _norm_tipo(tipo: Any) -> str:
    if tipo is None:
        return ""
    return str(tipo).strip().lower().replace("á", "a").replace("í", "i")


def _recinto_altura(recinto: Dict[str, Any]) -> Optional[float]:
    for key in ("altura_m", "altura", "h"):
        if recinto.get(key) is not None:
            try:
                return float(recinto[key])
            except (TypeError, ValueError):
                pass
    dims = recinto.get("dimensions")
    if isinstance(dims, dict) and dims.get("h") is not None:
        try:
            return float(dims["h"])
        except (TypeError, ValueError):
            pass
    return None


def _material_id(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _es_mamposteria_hormigon(material_id: Optional[int]) -> bool:
    return material_id in MASONRY_CONCRETE_MATERIAL_IDS


def _recinto_footprint(recinto: Dict[str, Any]) -> Optional[Tuple[float, float, float, float]]:
    """Retorna (x, z, w, l) en metros si hay datos suficientes."""
    x = recinto.get("x_m")
    z = recinto.get("z_m")
    w = recinto.get("width_m")
    l = recinto.get("length_m")

    dims = recinto.get("dimensions")
    if isinstance(dims, dict):
        x = x if x is not None else dims.get("x")
        z = z if z is not None else dims.get("z")
        w = w if w is not None else dims.get("w")
        l = l if l is not None else dims.get("l")

    coords = recinto.get("coords")
    if isinstance(coords, dict):
        x = x if x is not None else coords.get("x")
        z = z if z is not None else coords.get("z")

    try:
        xf = float(x if x is not None else 0.0)
        zf = float(z if z is not None else 0.0)
        wf = float(w if w is not None else 0.0)
        lf = float(l if l is not None else 0.0)
    except (TypeError, ValueError):
        return None

    if wf <= 0 or lf <= 0:
        return None
    return xf, zf, wf, lf


def _point_inside_rect(px: float, pz: float, rect: Tuple[float, float, float, float]) -> bool:
    x, z, w, l = rect
    return x <= px <= x + w and z <= pz <= z + l


def _supported_fraction(
    upper: Tuple[float, float, float, float],
    lowers: List[Tuple[float, float, float, float]],
) -> float:
    if not lowers:
        return 0.0

    x, z, w, l = upper
    supported = 0
    total = 0
    for i in range(SUPPORT_GRID + 1):
        for j in range(SUPPORT_GRID + 1):
            px = x + (w * i) / SUPPORT_GRID
            pz = z + (l * j) / SUPPORT_GRID
            total += 1
            if any(_point_inside_rect(px, pz, lower) for lower in lowers):
                supported += 1
    return supported / total if total else 0.0


def _max_allowed_cantilever(material_id: Optional[int]) -> float:
    try:
        mid = int(material_id) if material_id is not None else 2
    except (TypeError, ValueError):
        mid = 2
    return MAX_CANTILEVER_BY_MATERIAL.get(mid, 1.2)


def _measure_edge_overhang(
    upper: Tuple[float, float, float, float],
    lowers: List[Tuple[float, float, float, float]],
) -> float:
    x, z, w, l = upper
    max_depth = 0.0

    zc = z + EDGE_SAMPLE_STEP / 2
    while zc < z + l:
        min_lower_west = float("inf")
        max_lower_east = float("-inf")
        for lx, lz, lw, ll in lowers:
            if zc < lz or zc > lz + ll:
                continue
            overlap_x = min(x + w, lx + lw) - max(x, lx)
            if overlap_x <= 0.001:
                continue
            min_lower_west = min(min_lower_west, lx)
            max_lower_east = max(max_lower_east, lx + lw)
        if min_lower_west < float("inf"):
            max_depth = max(max_depth, max(0.0, min_lower_west - x))
        if max_lower_east > float("-inf"):
            max_depth = max(max_depth, max(0.0, (x + w) - max_lower_east))
        zc += EDGE_SAMPLE_STEP

    xc = x + EDGE_SAMPLE_STEP / 2
    while xc < x + w:
        min_lower_south = float("inf")
        max_lower_north = float("-inf")
        for lx, lz, lw, ll in lowers:
            if xc < lx or xc > lx + lw:
                continue
            overlap_z = min(z + l, lz + ll) - max(z, lz)
            if overlap_z <= 0.001:
                continue
            min_lower_south = min(min_lower_south, lz)
            max_lower_north = max(max_lower_north, lz + ll)
        if min_lower_south < float("inf"):
            max_depth = max(max_depth, max(0.0, min_lower_south - z))
        if max_lower_north > float("-inf"):
            max_depth = max(max_depth, max(0.0, (z + l) - max_lower_north))
        xc += EDGE_SAMPLE_STEP

    return max_depth


def _check_apoyo_vertical(
    recintos: List[Dict[str, Any]],
    default_material_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Alertas por voladizo o recintos superiores sin apoyo (OGUC / estructura)."""
    alerts: List[Dict[str, Any]] = []
    by_floor: Dict[int, List[Dict[str, Any]]] = defaultdict(list)

    for recinto in recintos:
        try:
            piso = int(recinto.get("piso") or 1)
        except (TypeError, ValueError):
            piso = 1
        by_floor[piso].append(recinto)

    for recinto in recintos:
        try:
            piso = int(recinto.get("piso") or 1)
        except (TypeError, ValueError):
            piso = 1
        if piso <= 1:
            continue

        footprint = _recinto_footprint(recinto)
        if footprint is None:
            continue

        lowers_raw = by_floor.get(piso - 1, [])
        if not lowers_raw:
            alerts.append(
                {
                    "codigo": "OGUC-APOYO-VERTICAL",
                    "normativa": "OGUC",
                    "nivel": "warning",
                    "bloqueante": False,
                    "recinto_id": recinto.get("id", ""),
                    "mensaje": (
                        f"Recinto en piso {piso} sin apoyo en el piso inferior "
                        f"('{recinto.get('nombre', recinto.get('id', ''))}')."
                    ),
                    "detalle": (
                        "Todo recinto en pisos superiores debe apoyarse sobre construcción "
                        "del nivel inferior. Evite voladizos o ampliaciones sin soporte estructural."
                    ),
                }
            )
            continue

        lower_footprints = [
            fp for fp in (_recinto_footprint(lower) for lower in lowers_raw) if fp is not None
        ]
        fraction = _supported_fraction(footprint, lower_footprints)
        if fraction >= SUPPORT_SAMPLE_THRESHOLD:
            continue

        material_id = _material_id(recinto.get("material_id")) or default_material_id
        allowed = _max_allowed_cantilever(material_id)
        max_overhang = _measure_edge_overhang(footprint, lower_footprints)

        if max_overhang > allowed + 0.01:
            alerts.append(
                {
                    "codigo": "OGUC-VOLADIZO-EXCESO",
                    "normativa": "OGUC",
                    "nivel": "warning",
                    "bloqueante": False,
                    "recinto_id": recinto.get("id", ""),
                    "mensaje": (
                        f"Voladizo en piso {piso} excede el límite referencial "
                        f"({max_overhang:.2f} m > {allowed:.1f} m para el material)."
                    ),
                    "detalle": (
                        "Reduzca la ampliación lateral o solicite diseño estructural "
                        "con vigas/losa de borde visadas."
                    ),
                }
            )
            continue

        alerts.append(
            {
                "codigo": "OGUC-VOLADIZO-VIGAS",
                "normativa": "OGUC",
                "nivel": "info",
                "bloqueante": False,
                "recinto_id": recinto.get("id", ""),
                "mensaje": (
                    f"Voladizo en piso {piso} dentro del límite referencial "
                    f"({max_overhang:.2f} m ≤ {allowed:.1f} m): se modelan vigas de borde."
                ),
                "detalle": (
                    "Active la capa Estructura en la vista 3D para revisar el refuerzo "
                    "automático bajo el voladizo. Validación referencial — no reemplaza cálculo estructural."
                ),
            }
        )

    return alerts


def _check_ley_21725(payload: Dict[str, Any]) -> tuple[List[Dict[str, Any]], bool]:
    alerts: List[Dict[str, Any]] = []
    compliant = True

    area_m2 = payload.get("area_m2")
    if area_m2 is None:
        return alerts, compliant

    try:
        area = float(area_m2)
    except (TypeError, ValueError):
        return alerts, compliant

    valor_uf = payload.get("valor_uf_actual")
    if valor_uf is None:
        valor_uf = 38500.0
    try:
        valor_uf_f = float(valor_uf)
    except (TypeError, ValueError):
        valor_uf_f = 38500.0

    costo = payload.get("costo_total_clp")
    costo_f: Optional[float] = None
    if costo is not None:
        try:
            costo_f = float(costo)
        except (TypeError, ValueError):
            costo_f = None

    resultado = validar_ley_21725(area, costo_f, valor_uf_f)

    if resultado.bloqueante:
        compliant = False
        alerts.append(
            {
                "codigo": resultado.codigo_infraccion or "LEY21725",
                "normativa": "Ley 21.725",
                "nivel": "error",
                "bloqueante": True,
                "mensaje": resultado.mensaje,
                "detalle": resultado.detalle,
            }
        )
    elif resultado.codigo_infraccion:
        alerts.append(
            {
                "codigo": resultado.codigo_infraccion,
                "normativa": "Ley 21.725",
                "nivel": "warning",
                "bloqueante": False,
                "mensaje": resultado.mensaje,
                "detalle": resultado.detalle,
            }
        )

    return alerts, compliant


def _check_altura_recintos(recintos: List[Dict[str, Any]]) -> tuple[List[Dict[str, Any]], bool]:
    alerts: List[Dict[str, Any]] = []
    compliant = True

    for recinto in recintos:
        altura = _recinto_altura(recinto)
        if altura is None:
            continue
        if altura < MIN_ROOM_HEIGHT_M:
            compliant = False
            rid = recinto.get("id", "")
            alerts.append(
                {
                    "codigo": "OGUC-ALTURA-MINIMA",
                    "normativa": "OGUC",
                    "nivel": "error",
                    "bloqueante": True,
                    "recinto_id": rid,
                    "mensaje": (
                        f"Altura de recinto ({altura:.2f} m) inferior al mínimo "
                        f"de {MIN_ROOM_HEIGHT_M:.1f} m (OGUC / habitabilidad)."
                    ),
                    "detalle": (
                        f"El recinto '{recinto.get('nombre', rid)}' no cumple la altura libre mínima. "
                        f"Ajuste a ≥ {MIN_ROOM_HEIGHT_M:.1f} m."
                    ),
                }
            )

    return alerts, compliant


def _check_loscat(
    payload: Dict[str, Any],
    recintos: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    injections: List[Dict[str, Any]] = []
    seen = False

    muros = payload.get("muros") or []
    for muro in muros:
        if not muro.get("es_exterior"):
            continue
        mat = _material_id(muro.get("material_id")) or _material_id(payload.get("material_id"))
        if _es_mamposteria_hormigon(mat):
            seen = True
            break

    if not seen:
        for recinto in recintos:
            mat = _material_id(recinto.get("material_id")) or _material_id(payload.get("material_id"))
            if recinto.get("es_exterior") and _es_mamposteria_hormigon(mat):
                seen = True
                break

    if seen:
        injections.append(
            {
                "codigo": "LOSCAT-AISLACION-TERMICA",
                "normativa": "LOSCAT",
                "tipo": "sugerencia",
                "mensaje": "Muros exteriores en mampostería/hormigón: considere aislación térmica.",
                "sugerencia": (
                    "Según LOSCAT (DS N°47 MINVU), envolventes opacas en albañilería u hormigón "
                    "requieren solución de acondicionamiento térmico (lana mineral, EPS o barrera de vapor)."
                ),
            }
        )

    return injections


def _check_loscaa(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    injections: List[Dict[str, Any]] = []
    muros = payload.get("muros") or []

    for muro in muros:
        if not muro.get("es_interior", True):
            continue

        tipos_raw = muro.get("tipos_adyacentes") or muro.get("tipos") or []
        tipos = {_norm_tipo(t) for t in tipos_raw}

        recinto_ids = muro.get("recintos_adyacentes") or muro.get("recintos") or []
        if not tipos and len(recinto_ids) >= 2:
            recintos_map = {
                str(r.get("id")): _norm_tipo(r.get("tipo"))
                for r in (payload.get("recintos") or [])
                if r.get("id") is not None
            }
            tipos = {recintos_map.get(str(rid), "") for rid in recinto_ids}

        tiene_hab = any(t in HABITACION_TIPOS for t in tipos)
        tiene_banio = any(t in BANIO_TIPOS for t in tipos)

        if tiene_hab and tiene_banio:
            injections.append(
                {
                    "codigo": "LOSCAA-DIVISION-HAB-BANO",
                    "normativa": "LOSCAA",
                    "tipo": "sugerencia",
                    "mensaje": (
                        "Tabique interior entre habitación y baño: evalúe rating acústico y resistente al fuego."
                    ),
                    "sugerencia": (
                        "LOSCAA y OGUC sugieren doble placa (volcanita RH) con lana mineral intermedia "
                        "para muros divisorios habitación–baño (confort acústico y F-60/F-120 según altura)."
                    ),
                    "muro_id": muro.get("id"),
                    "recintos": list(recinto_ids) if recinto_ids else None,
                }
            )
            break

    adyacencias = payload.get("adyacencias") or []
    for adj in adyacencias:
        ta = _norm_tipo(adj.get("tipo_a") or adj.get("tipo_recinto_a"))
        tb = _norm_tipo(adj.get("tipo_b") or adj.get("tipo_recinto_b"))
        if (ta in HABITACION_TIPOS and tb in BANIO_TIPOS) or (tb in HABITACION_TIPOS and ta in BANIO_TIPOS):
            injections.append(
                {
                    "codigo": "LOSCAA-DIVISION-HAB-BANO",
                    "normativa": "LOSCAA",
                    "tipo": "sugerencia",
                    "mensaje": (
                        "División habitación–baño detectada: evalúe rating acústico y resistente al fuego."
                    ),
                    "sugerencia": (
                        "Configure el tabique con doble placa y aislante acústico según LOSCAA."
                    ),
                    "recinto_a": adj.get("recinto_a"),
                    "recinto_b": adj.get("recinto_b"),
                }
            )
            break

    return injections


def validar_normativa(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Valida normativa aplicable al proyecto.

    Returns:
        {
            "alerts": [...],
            "injections": [...],
            "compliant": bool,
        }
    """
    payload = payload or {}
    recintos = payload.get("recintos") or []

    alerts: List[Dict[str, Any]] = []
    injections: List[Dict[str, Any]] = []
    compliant = True

    ley_alerts, ley_ok = _check_ley_21725(payload)
    alerts.extend(ley_alerts)
    compliant = compliant and ley_ok

    altura_alerts, altura_ok = _check_altura_recintos(recintos)
    alerts.extend(altura_alerts)
    compliant = compliant and altura_ok

    alerts.extend(_check_apoyo_vertical(recintos, _material_id(payload.get("material_estructural_id"))))

    injections.extend(_check_loscat(payload, recintos))
    injections.extend(_check_loscaa(payload))

    return {
        "alerts": alerts,
        "injections": injections,
        "compliant": compliant,
    }
