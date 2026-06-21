#!/usr/bin/env python3
import logging
import sys
import os

try:
    # Attempt to import setup_logging if running directly from scraper folder
    from logger import setup_logging
    setup_logging(logging.INFO)
except ImportError:
    try:
        from scraper.logger import setup_logging
        setup_logging(logging.INFO)
    except ImportError:
        pass

logger = logging.getLogger(__name__)

from scraper.config import STORES

for store_name, store in STORES.items():
    logger.info(f"=== {store_name.upper()} ===")
    logger.info(f"Base URLs: {len(store['base_urls'])}")
    logger.info(f"Product URLs: {len(store['product_urls'])}")
    for i, url in enumerate(store['product_urls'], 1):
        logger.info(f"URL {i}: {url}")
    logger.info(f"Selectores: {list(store['selectors'].keys())}")
