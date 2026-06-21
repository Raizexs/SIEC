# scraper/tests/test_fuzzy.py
import sys
import os
import logging

try:
    from logger import setup_logging
    setup_logging(logging.INFO)
except ImportError:
    try:
        from scraper.logger import setup_logging
        setup_logging(logging.INFO)
    except ImportError:
        pass

logger = logging.getLogger(__name__)

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from normalizer import FuzzyNormalizer

def test_matching():
    normalizer = FuzzyNormalizer(threshold=70)
    
    target = "Cemento Portland"
    candidates = [
        "Saco Cemento Portland 25kg Bio Bio",
        "Pintura Blanca 1L",
        "Hormigon Preparado Radieres",
        "Cemento Especial Polpaico"
    ]
    
    best_match, score = normalizer.find_best_match(target, candidates)
    logger.info(f"Target: {target}")
    logger.info(f"Best Match: {best_match} (Score: {score})")
    
    target2 = "Madera"
    candidates2 = [
        "Pino Dimensionado 2x4 3m",
        "Clavos para madera 2 pulgadas",
        "Barniz para maderas",
        "Madera de Pino Radiata"
    ]
    
    best_match2, score2 = normalizer.find_best_match(target2, candidates2)
    logger.info(f"Target: {target2}")
    logger.info(f"Best Match: {best_match2} (Score: {score2})")

if __name__ == "__main__":
    test_matching()
