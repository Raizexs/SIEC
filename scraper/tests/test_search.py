# scraper/tests/test_search.py
import sys
import os
import logging
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sodimac_scraper import SodimacScraper
from playwright.sync_api import sync_playwright

from logger import setup_logging
import logging
setup_logging(logging.INFO)
logger = logging.getLogger(__name__)

def test_sodimac_search():
    scraper = SodimacScraper()
    with sync_playwright() as p:
        browser = scraper._launch_browser(p)
        context = scraper._new_context(browser)
        page = context.new_page()
        
        # Probar con "Cemento Portland"
        resultado = scraper.search_and_match(page, "Cemento Portland", insumo_id=1)
        
        if resultado:
            logger.info(f"RESULTADO ENCONTRADO - Nombre: {resultado['nombre_producto']}, Precio: {resultado['precio']}, URL: {resultado['url']}")
        else:
            logger.warning("No se encontró match.")
            
        browser.close()

if __name__ == "__main__":
    test_sodimac_search()
