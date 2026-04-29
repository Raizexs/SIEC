# scraper/tests/test_search.py
import sys
import os
import logging
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sodimac_scraper import SodimacScraper
from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO)

def test_sodimac_search():
    scraper = SodimacScraper()
    with sync_playwright() as p:
        browser = scraper._launch_browser(p)
        context = scraper._new_context(browser)
        page = context.new_page()
        
        # Probar con "Cemento Portland"
        resultado = scraper.search_and_match(page, "Cemento Portland", insumo_id=1)
        
        if resultado:
            print(f"\nRESULTADO ENCONTRADO:")
            print(f"Nombre: {resultado['nombre_producto']}")
            print(f"Precio: {resultado['precio']}")
            print(f"URL: {resultado['url']}")
        else:
            print("\nNo se encontró match.")
            
        browser.close()

if __name__ == "__main__":
    test_sodimac_search()
