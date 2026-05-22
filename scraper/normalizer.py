# scraper/normalizer.py
"""
Motor de Normalización y Matching Difuso — SIEC
==============================================
Usa la librería 'thefuzz' (Levenshtein) para comparar nombres de productos 
scrappeades contra nombres canónicos de Insumos de la base de datos.

Incluye:
- Fuzzy matching con fuzz.token_set_ratio
- Filtro dimensional post-match vía regex para evitar falsos positivos
  cuando target y candidate tienen dimensiones incompatibles (ej. 2x4 vs 2x3)
"""

import logging
import re
from typing import Optional, List, Tuple

from thefuzz import process, fuzz

logger = logging.getLogger(__name__)

# Compilación una sola vez para rendimiento
_RE_DIMENSION = re.compile(r"(\d+(?:[.,]\d+)?)\s*(m|mm|cm|kg|g|l|ml|un|m²|m2)", re.IGNORECASE)
_RE_MEDIDA_LINEAL = re.compile(r"(\d+)\s*x\s*(\d+)", re.IGNORECASE)


def _extraer_dimensiones(texto: str) -> set[str]:
    """
    Extrae pares (valor, unidad) normalizados del texto.

    Ejemplo:
        "Pino 2x4 3.2m" -> {"2x4", "3.2m"}
        "Plancha Zinc 0.85x2.5m" -> {"0.85x2.5m"}
        "Cemento 25kg" -> {"25kg"}
    """
    dims: set[str] = set()
    texto_norm = texto.lower().strip()

    # Buscar patrones "NxM" (ej. 2x4, 0.85x2.5, 1.22x2.44)
    for match in _RE_MEDIDA_LINEAL.finditer(texto_norm):
        dims.add(match.group(0))

    # Buscar patrones "valor+unidad" (ej. 3.2m, 25kg, 110mm)
    for match in _RE_DIMENSION.finditer(texto_norm):
        dims.add(match.group(0))

    return dims


def _validar_dimensiones(target_name: str, candidate_name: str) -> bool:
    """
    Valida que las dimensiones explícitas en target_name y candidate_name
    sean compatibles.

    Regla: Si target contiene una dimensión (ej. "3.2m" o "2x4") y candidate
    contiene una dimensión diferente en la misma categoría (ej. "2.4m" o "2x3"),
    retorna False (rechazo absoluto).

    Retorna True si no hay conflicto dimensional.
    """
    target_dims = _extraer_dimensiones(target_name)
    candidate_dims = _extraer_dimensiones(candidate_name)

    if not target_dims or not candidate_dims:
        # Si alguno no tiene dimensiones explícitas, no podemos validar
        return True

    # Agrupar por tipo: medidas lineales (NxM) vs escalares (valor+unidad)
    target_medidas = {d for d in target_dims if "x" in d}
    candidate_medidas = {d for d in candidate_dims if "x" in d}
    target_escalares = target_dims - target_medidas
    candidate_escalares = candidate_dims - candidate_medidas

    # Conflicto: mismo tipo de dimensión, valor diferente
    if target_medidas and candidate_medidas:
        for tm in target_medidas:
            for cm in candidate_medidas:
                if tm != cm:
                    return False

    if target_escalares and candidate_escalares:
        for te in target_escalares:
            # Extraer solo el valor numérico para comparar
            t_num = re.search(r"[\d.]+", te)
            c_num = re.search(r"[\d.]+", candidate_escalares_str := " ".join(candidate_escalares))
            if t_num and c_num:
                # Si la unidad de medida coincide y el número es diferente
                t_unit = re.sub(r"[\d.]+", "", te).strip()
                # Reconstruir escalares del candidate como string único
                c_str = ", ".join(sorted(candidate_escalares))
                if t_unit and t_unit in c_str:
                    t_val = float(t_num.group().replace(",", "."))
                    # Extraer el valor candidate que comparte unidad
                    c_match = re.search(rf"([\d.]+)\s*{re.escape(t_unit)}", c_str)
                    if c_match:
                        c_val = float(c_match.group(1).replace(",", "."))
                        if abs(t_val - c_val) > 0.01:
                            return False

    return True


class FuzzyNormalizer:
    """
    Clase encargada de encontrar la mejor correspondencia entre un texto 
    scrappeado y un catálogo de insumos.
    """

    def __init__(self, threshold: int = 75, unidad_medida: Optional[str] = None):
        self.threshold = threshold
        self.unidad_medida = unidad_medida

    def find_best_match(
        self, 
        target_name: str, 
        candidates: List[str]
    ) -> Tuple[Optional[str], int]:
        """
        Encuentra el candidato que mejor coincide con target_name.
        
        Usa 'token_set_ratio' que es robusto a:
        - Diferente orden de palabras ("Cemento Saco 25kg" vs "Saco 25kg Cemento")
        - Palabras adicionales ("Cemento Portland Especial" vs "Cemento")
        
        Retorna: (nombre_del_match, score)
        """
        if not candidates:
            return None, 0

        # process.extractOne devuelve (match, score)
        best_match, score = process.extractOne(
            target_name, 
            candidates, 
            scorer=fuzz.token_set_ratio
        )

        if score >= self.threshold:
            logger.info(
                f"MATCH ACEPTADO: {target_name} <-> {best_match} | Score: {score}"
                + (f" | Unidad: {self.unidad_medida}" if self.unidad_medida else "")
            )
            return best_match, score
        
        logger.info(
            f"MATCH RECHAZADO POR SCORE: {target_name} <-> {best_match} | Score: {score} < {self.threshold}"
        )
        return None, score

    def filter_results(
        self, 
        generic_name: str, 
        scraped_products: List[dict]
    ) -> Optional[dict]:
        """
        Dada una lista de productos scrappeados de una tienda, devuelve el que 
        mejor coincide con el nombre genérico buscado.
        
        Aplica:
        1. Fuzzy match via find_best_match()
        2. Validación dimensional estricta via _validar_dimensiones()
        """
        if not scraped_products:
            return None

        # Mapear nombres de productos para thefuzz
        names = [p["nombre_producto"] for p in scraped_products if p.get("nombre_producto")]
        if not names:
            return None

        best_name, score = self.find_best_match(generic_name, names)
        
        if best_name:
            # Encontrar el dict original
            for p in scraped_products:
                if p["nombre_producto"] == best_name:
                    # ── Filtro dimensional post-match ────────────────────
                    if not _validar_dimensiones(generic_name, best_name):
                        logger.warning(
                            f"MATCH RECHAZADO POR DIMENSIÓN: {generic_name} <-> {best_name}"
                            + (f" | Unidad: {self.unidad_medida}" if self.unidad_medida else "")
                        )
                        return None

                    p["match_score"] = score
                    return p
        
        return None
