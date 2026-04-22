import unicodedata
from typing import Iterable


def _normalize_text(value: str) -> str:
    text = (value or "").strip().lower()
    return "".join(
        char for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )


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
