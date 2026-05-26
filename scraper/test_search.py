"""
Test ultra-compacto: prueba PDP URLs directas de Sodimac.
Solo prueba UNA URL, rapido, resultado en JSON.
"""
import sys, json, logging
logging.basicConfig(level=logging.WARNING)

output_path = "/app/test_result.json"
store = sys.argv[1] if len(sys.argv) > 1 else "sodimac"
result = {"store": store}

if store == "sodimac":
    from sodimac_scraper import SodimacScraper
    scraper = SodimacScraper()
    urls = scraper._get_urls()
    result["total_urls"] = len(urls)
    result["first_url"] = urls[0] if urls else ""

    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = scraper._launch_browser(p, "chromium")
        context = scraper._new_context(browser, "chromium")
        page = context.new_page()
        page.set_default_timeout(30_000)
        prod = scraper._scrape_product(page, urls[0]) if urls else {"exitoso": False}
        browser.close()
    result["producto"] = {
        "nombre": prod.get("nombre_producto"),
        "precio": prod.get("precio"),
        "exitoso": prod.get("exitoso"),
    }
    result["insumo_id_mapeado"] = scraper._map_insumo_id(prod.get("nombre_producto") or "")

elif store == "construmart":
    from construmart_scraper import ConstrumartScraper
    scraper = ConstrumartScraper()
    query = sys.argv[2] if len(sys.argv) > 2 else "Cemento Portland"
    search_url = scraper._get_search_url(query)
    from base_scraper import BaseScraper
    prods = BaseScraper._http_search(store, search_url, query)
    result["http_products"] = len(prods)
    result["products"] = [{"name": p["nombre_producto"][:60], "price": p["precio"]} for p in prods[:5]]

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)
print(json.dumps(result, indent=2, ensure_ascii=False))
