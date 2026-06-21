import math
import re
import unicodedata
from typing import Iterable, Optional, Sequence


def _normalize_text(value: str) -> str:
    text = (value or "").strip().lower()
    return "".join(
        char for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )


def _to_float(value: str) -> float:
    return float(str(value).replace(",", "."))


def _as_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def calcular_area_vanos(vanos: Iterable) -> float:
    area_total = 0.0
    for vano in vanos or []:
        ancho = float(getattr(vano, "ancho", 0.0))
        alto = float(getattr(vano, "alto", 0.0))
        if ancho > 0 and alto > 0:
            area_total += (ancho * alto)
    return area_total


def calcular_area_neta(area_bruta: float, area_vanos: float) -> float:
    return max(0.0, float(area_bruta) - float(area_vanos))


def factor_perdida_acero(cortes: int, cruces: int) -> float:
    complejidad = max(0, int(cortes)) + max(0, int(cruces))
    factor = 1.03 + min(0.07, complejidad * 0.005)
    return round(factor, 4)


def inferir_factor_perdida(insumo: str, categoria: str, cortes_acero: int, cruces_acero: int) -> float:
    text = _normalize_text(f"{insumo} {categoria}")

    if any(token in text for token in ("mortero", "pega", "repello", "estuco")):
        return 1.10

    if any(token in text for token in ("acero", "fierro", "enfierr", "barra")):
        return factor_perdida_acero(cortes_acero, cruces_acero)

    if any(token in text for token in ("albaniler", "hormigon", "ladrillo", "bloque")):
        return 1.05

    return 1.0


PANEL_DEFAULT_WIDTH_M = 1.22
PANEL_DEFAULT_HEIGHT_M = 2.44
MIN_WASTE_RATIO = 0.04
TARGET_WASTE_RATIO = 0.08
MAX_WASTE_RATIO = 0.12


def _is_panel_item(text: str) -> bool:
    return any(token in text for token in ("panel", "placa", "plancha", "volcanita", "yeso carton", "osb", "sip"))


def _is_linear_item(text: str) -> bool:
    return any(token in text for token in ("rollo", "tubo", "barra", "perfil", "liston", "metro lineal"))


def _parse_panel_dims_m(text: str) -> tuple[float, float]:
    normalized = _normalize_text(text).replace("×", "x")
    matches = re.findall(r"(\d+(?:[.,]\d+)?)\s*[x]\s*(\d+(?:[.,]\d+)?)", normalized)
    if not matches:
        return PANEL_DEFAULT_WIDTH_M, PANEL_DEFAULT_HEIGHT_M
    width = _to_float(matches[0][0])
    height = _to_float(matches[0][1])
    if width > 20 and height > 20:
        width /= 100.0
        height /= 100.0
    width = max(0.1, min(width, 5.0))
    height = max(0.1, min(height, 5.0))
    if width > height:
        width, height = height, width
    return width, height


def _parse_stock_length_m(text: str) -> Optional[float]:
    normalized = _normalize_text(text)
    matches = re.findall(r"(\d+(?:[.,]\d+)?)\s*(?:m|mt|mts|metro|metros)\b", normalized)
    if matches:
        candidate = max(_to_float(match) for match in matches)
        if candidate > 300:
            candidate /= 100.0
        return max(0.1, candidate)
    if "rollo" in normalized:
        return 100.0
    if "tubo" in normalized:
        return 3.0
    if "barra" in normalized or "perfil" in normalized or "liston" in normalized:
        return 6.0
    return None


def _explode_pieces_2d(piezas_2d: Sequence[tuple[float, float, int]], max_items: int = 4000) -> list[tuple[float, float]]:
    pieces: list[tuple[float, float]] = []
    for width, height, qty in piezas_2d:
        safe_qty = max(1, min(int(qty), max_items))
        w = max(0.05, float(width))
        h = max(0.05, float(height))
        for _ in range(safe_qty):
            pieces.append((w, h))
            if len(pieces) >= max_items:
                return pieces
    return pieces


def _explode_pieces_1d(cortes_1d: Sequence[tuple[float, int]], max_items: int = 6000) -> list[float]:
    pieces: list[float] = []
    for length, qty in cortes_1d:
        safe_qty = max(1, min(int(qty), max_items))
        item_len = max(0.01, float(length))
        for _ in range(safe_qty):
            pieces.append(item_len)
            if len(pieces) >= max_items:
                return pieces
    return pieces


def _generate_virtual_2d_pieces(total_area_m2: float, panel_w: float, panel_h: float) -> list[tuple[float, float]]:
    remaining = max(0.0, float(total_area_m2))
    if remaining <= 0:
        return []
    templates = (
        (panel_w * 0.5, panel_h),
        (panel_w * 0.66, panel_h * 0.5),
        (panel_w * 0.33, panel_h * 0.66),
        (panel_w * 0.25, panel_h * 0.5),
        (panel_w * 0.8, panel_h * 0.33),
    )
    pieces: list[tuple[float, float]] = []
    idx = 0
    while remaining > 0.01 and len(pieces) < 5000:
        base_w, base_h = templates[idx % len(templates)]
        piece_area = base_w * base_h
        if piece_area > remaining:
            base_h = max(0.1, remaining / base_w)
            piece_area = base_w * base_h
        pieces.append((min(base_w, panel_w), min(base_h, panel_h)))
        remaining -= piece_area
        idx += 1
    return pieces


def _generate_virtual_1d_pieces(total_length_m: float, stock_len_m: float) -> list[float]:
    remaining = max(0.0, float(total_length_m))
    if remaining <= 0:
        return []
    ratios = (0.92, 0.74, 0.57, 0.43, 0.31, 0.22)
    pieces: list[float] = []
    idx = 0
    while remaining > 0.01 and len(pieces) < 8000:
        candidate = stock_len_m * ratios[idx % len(ratios)]
        piece = min(max(0.05, candidate), stock_len_m, remaining)
        pieces.append(piece)
        remaining -= piece
        idx += 1
    return pieces


def _pack_1d_best_fit(cuts: Sequence[float], stock_len_m: float) -> tuple[int, float]:
    if not cuts:
        return 0, 0.0
    bins_remaining: list[float] = []
    for cut in sorted((max(0.0, c) for c in cuts), reverse=True):
        if cut <= 0:
            continue
        best_index = -1
        best_remaining_after = None
        for idx, rem in enumerate(bins_remaining):
            after = rem - cut
            if after >= -1e-9 and (best_remaining_after is None or after < best_remaining_after):
                best_index = idx
                best_remaining_after = after
        if best_index >= 0:
            bins_remaining[best_index] -= cut
        else:
            bins_remaining.append(stock_len_m - cut)
    total_used = float(sum(cuts))
    return len(bins_remaining), total_used


def _prune_free_rectangles(rects: list[tuple[float, float]]) -> list[tuple[float, float]]:
    pruned: list[tuple[float, float]] = []
    for rect in rects:
        w, h = rect
        if w <= 1e-6 or h <= 1e-6:
            continue
        dominated = False
        for pw, ph in pruned:
            if pw >= w and ph >= h:
                dominated = True
                break
        if dominated:
            continue
        pruned = [(pw, ph) for pw, ph in pruned if not (w >= pw and h >= ph)]
        pruned.append((w, h))
    return pruned


def _pack_2d_guillotine(pieces: Sequence[tuple[float, float]], stock_w: float, stock_h: float) -> tuple[int, float]:
    if not pieces:
        return 0, 0.0
    bins: list[list[tuple[float, float]]] = [[(stock_w, stock_h)]]
    used_area = 0.0
    sorted_pieces = sorted(
        ((max(0.05, min(stock_w, w)), max(0.05, min(stock_h, h))) for w, h in pieces),
        key=lambda item: item[0] * item[1],
        reverse=True,
    )

    for piece_w, piece_h in sorted_pieces:
        chosen = None
        best_score = None
        for bin_idx, free_rects in enumerate(bins):
            for rect_idx, (free_w, free_h) in enumerate(free_rects):
                for placed_w, placed_h in ((piece_w, piece_h), (piece_h, piece_w)):
                    if placed_w <= free_w + 1e-9 and placed_h <= free_h + 1e-9:
                        waste = (free_w * free_h) - (placed_w * placed_h)
                        balance = abs((free_w - placed_w) - (free_h - placed_h))
                        score = (waste, balance)
                        if best_score is None or score < best_score:
                            best_score = score
                            chosen = (bin_idx, rect_idx, free_w, free_h, placed_w, placed_h)
        if chosen is None:
            bins.append([(stock_w, stock_h)])
            free_w, free_h = stock_w, stock_h
            placed_w, placed_h = piece_w, piece_h
            if placed_w > free_w or placed_h > free_h:
                placed_w, placed_h = min(piece_w, stock_w), min(piece_h, stock_h)
            chosen = (len(bins) - 1, 0, free_w, free_h, placed_w, placed_h)

        bin_idx, rect_idx, free_w, free_h, placed_w, placed_h = chosen
        free_rects = bins[bin_idx]
        free_rects.pop(rect_idx)
        right_w = free_w - placed_w
        top_h = free_h - placed_h
        if right_w > 1e-6:
            free_rects.append((right_w, free_h))
        if top_h > 1e-6:
            free_rects.append((placed_w, top_h))
        bins[bin_idx] = _prune_free_rectangles(free_rects)
        used_area += placed_w * placed_h

    return len(bins), used_area


def _calibrate_units(total_required: float, unit_capacity: float, packed_units: int) -> tuple[int, float]:
    if total_required <= 0 or unit_capacity <= 0:
        return 0, 0.0
    min_units = int(math.ceil(total_required / unit_capacity))
    min_for_floor = int(math.ceil(total_required / (unit_capacity * (1.0 - MIN_WASTE_RATIO))))
    max_for_ceiling = int(math.floor(total_required / (unit_capacity * (1.0 - MAX_WASTE_RATIO))))
    ideal_for_target = int(math.ceil(total_required / (unit_capacity * (1.0 - TARGET_WASTE_RATIO))))

    units = max(min_units, int(packed_units), ideal_for_target)
    if max_for_ceiling >= max(min_units, min_for_floor):
        low_bound = max(min_units, min_for_floor)
        high_bound = max_for_ceiling
        units = max(low_bound, min(units, high_bound))
    else:
        # Escenario de granularidad indivisible: privilegiar compra mínima factible.
        units = min_units

    waste = 1.0 - (total_required / (units * unit_capacity))
    return units, max(0.0, waste)


def optimizar_compra_por_nesting(
    *,
    insumo: str,
    categoria: str,
    unidad_medida: str,
    unidad_factor: str,
    descripcion: Optional[str],
    cantidad_objetivo: float,
    piezas_2d: Optional[Sequence[tuple[float, float, int]]] = None,
    cortes_1d: Optional[Sequence[tuple[float, int]]] = None,
) -> Optional[dict]:
    objetivo = float(cantidad_objetivo)
    if objetivo <= 0:
        return None

    descriptor = _normalize_text(" ".join(
        filter(
            None,
            (
                _as_text(insumo),
                _as_text(categoria),
                _as_text(unidad_medida),
                _as_text(unidad_factor),
                _as_text(descripcion),
            ),
        )
    ))
    if _is_panel_item(descriptor):
        panel_w, panel_h = _parse_panel_dims_m(" ".join(
            filter(None, (_as_text(insumo), _as_text(unidad_medida), _as_text(descripcion)))
        ))
        panel_area = panel_w * panel_h
        required_area = objetivo * panel_area
        user_pieces = _explode_pieces_2d(piezas_2d or [])
        piece_list = user_pieces or _generate_virtual_2d_pieces(required_area, panel_w, panel_h)
        packed_units, used_area = _pack_2d_guillotine(piece_list, panel_w, panel_h)
        calibrated_units, waste_ratio = _calibrate_units(used_area, panel_area, packed_units)
        cantidad_compra = float(calibrated_units)
        factor_equivalente = cantidad_compra / objetivo
        return {
            "metodo": "nesting-2d",
            "cantidad_compra": cantidad_compra,
            "factor_perdida_equivalente": factor_equivalente,
            "perdida_fraccion": waste_ratio,
            "perdida_porcentual": waste_ratio * 100.0,
            "cantidad_objetivo": objetivo,
            "formato_comercial": f"{panel_w:.2f} x {panel_h:.2f} m",
        }

    if _is_linear_item(descriptor):
        stock_length = _parse_stock_length_m(" ".join(
            filter(None, (_as_text(insumo), _as_text(unidad_medida), _as_text(unidad_factor), _as_text(descripcion)))
        ))
        if stock_length is None:
            return None
        required_length = objetivo * stock_length
        user_cuts = _explode_pieces_1d(cortes_1d or [])
        cut_list = user_cuts or _generate_virtual_1d_pieces(required_length, stock_length)
        packed_units, used_length = _pack_1d_best_fit(cut_list, stock_length)
        calibrated_units, waste_ratio = _calibrate_units(used_length, stock_length, packed_units)
        cantidad_compra = float(calibrated_units)
        factor_equivalente = cantidad_compra / objetivo
        return {
            "metodo": "nesting-1d",
            "cantidad_compra": cantidad_compra,
            "factor_perdida_equivalente": factor_equivalente,
            "perdida_fraccion": waste_ratio,
            "perdida_porcentual": waste_ratio * 100.0,
            "cantidad_objetivo": objetivo,
            "formato_comercial": f"{stock_length:.2f} m",
        }

    return None
