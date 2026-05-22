"""
Test rápido: busca un producto en una tienda y muestra resultado compacto.
Uso: docker compose run --rm scraper python test_search.py sodimac "Cemento Portland"
"""
import sys, json, logging
logging.basicConfig(level=logging.WARNING, format="%(message)s")

from base_scraper import BaseScraper

store = sys.argv[1] if len(sys.argv) > 1 else "sodimac"
query = sys.argv[2] if len(sys.argv) > 2 else "Cemento Portland"

if store == "sodimac":
    from sodimac_scraper import SodimacScraper
    scraper = SodimacScraper()
elif store == "easy":
    from easy_scraper import EasyScraper
    scraper = EasyScraper()
elif store == "construmart":
    from construmart_scraper import ConstrumartScraper
    scraper = ConstrumartScraper()
else:
    print(f"Tienda desconocida: {store}")
    sys.exit(1)

search_url = scraper._get_search_url(query)
print(f"\n{'='*60}")
print(f"TEST: {store} | Query: '{query}'")
print(f"URL: {search_url}")
print(f"{'='*60}")

# Capa 1: HTTP directo
print("\n[1/2] HTTP directo + JSON-LD...")
productos = BaseScraper._http_search(store, search_url, query)
if productos:
    print(f"  ✅ {len(productos)} productos encontrados via HTTP:")
    for p in productos[:5]:
        print(f"     - {p['nombre_producto'][:70]:70s} ${p['precio']:>8,.0f}")
else:
    print(f"  ❌ Sin productos via HTTP")

# Capa 2: Playwright (solo si el primero falló)
if not productos:
    print("\n[2/2] Playwright Firefox...")
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = scraper._launch_browser(p, "firefox")
        context = scraper._new_context(browser, "firefox")
        page = context.new_page()
        page.set_default_timeout(30_000)
        try:
            resultados = scraper._scrape_search_results(page, query)
            if resultados:
                print(f"  ✅ {len(resultados)} productos encontrados via Playwright:")
                for r in resultados[:5]:
                    print(f"     - {r['nombre_producto'][:70]:70s} ${r['precio']:>8,.0f}")
            else:
                print(f"  ❌ Sin productos via Playwright")
        except Exception as e:
            print(f"  ❌ Error: {e}")
        browser.close()

print(f"\n{'='*60}")
print(f"TEST COMPLETADO")
