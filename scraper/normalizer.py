# scraper/normalizer.py
"""
Motor de Normalización y Matching Difuso — SIEC
==============================================
Usa la librería 'thefuzz' (Levenshtein) para comparar nombres de productos 
scrappeados contra nombres canónicos de Insumos de la base de datos.
"""

import logging
from typing import Optional, List, Tuple
from thefuzz import process, fuzz

logger = logging.getLogger(__name__)

class FuzzyNormalizer:
    """
    Clase encargada de encontrar la mejor correspondencia entre un texto 
    scrappeado y un catálogo de insumos.
    """

    def __init__(self, threshold: int = 70):
        self.threshold = threshold

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
            logger.debug(f"[Normalizer] Match encontrado: '{target_name}' -> '{best_match}' (Score: {score})")
            return best_match, score
        
        logger.debug(f"[Normalizer] Sin match claro para '{target_name}' (Mejor: '{best_match}', Score: {score})")
        return None, score

    def filter_results(
        self, 
        generic_name: str, 
        scraped_products: List[dict]
    ) -> Optional[dict]:
        """
        Dada una lista de productos scrappeados de una tienda, devuelve el que 
        mejor coincide con el nombre genérico buscado.
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
                    p["match_score"] = score
                    return p
        
        return None
