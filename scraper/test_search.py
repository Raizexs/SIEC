"""
Test rápido: busca un producto y guarda resultado en JSON para depuración.
Así no necesitas copiar logs.
"""
import sys, json, logging, os
logging.basicConfig(level=logging.WARNING)

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
    result = {"error": f"Tienda desconocida: {store}"}
    json.dump(result, open("/app/test_result.json", "w"))
    sys.exit(1)

search_url = scraper._get_search_url(query)
result = {
    "store": store,
    "query": query,
    "url": search_url,
    "http": None,
    "playwright": None,
    "html_title": None,
    "html_size": None,
    "has_products_in_html": None,
}

# Capa 0: API directa (intentar endpoint REST de Sodimac)
api_products = []
import urllib.request
for api_url in [
    f"https://www.sodimac.cl/sodimac-cl/rest/search/products?q={query.replace(' ', '+')}",
    f"https://www.sodimac.cl/api/search?q={query.replace(' ', '+')}",
    f"https://www.sodimac.cl/rest/model/sodimac/search?q={query.replace(' ', '+')}",
]:
    try:
        req = urllib.request.Request(api_url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
            if isinstance(data, dict):
                items = data.get("products") or data.get("results") or data.get("data") or data.get("items") or []
                if isinstance(items, list) and len(items) > 0:
                    for item in items[:5]:
                        name = item.get("name") or item.get("title") or item.get("productDisplayName") or ""
                        price = item.get("price") or (item.get("prices") or {}).get("current") or item.get("priceValue")
                        if name and price:
                            api_products.append({"name": name[:80], "price": price})
    except Exception:
        pass
result["api_direct"] = {"success": len(api_products) > 0, "count": len(api_products), "products": api_products}

# Capa Google Shopping
gs_products = []
try:
    import urllib.request, re as _re
    gs_url = f"https://www.google.com/search?tbm=shop&q={query.replace(' ', '+')}&hl=es&gl=cl"
    req = urllib.request.Request(gs_url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CL,es;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="replace")
        # Buscar precios en formato CLP
        for match in _re.finditer(r'\$\s*([\d.,]+)\s*CLP', html):
            name_match = _re.search(r'(?:<[^>]+>)*([^<]{10,80}?)' + _re.escape(match.group(0))[:20], html[max(0, match.start()-500):match.start()])
            name = name_match.group(1).strip() if name_match else ""
            price = match.group(1).replace(".", "").replace(",", ".")
            try:
                gs_products.append({"name": name[:60] or query, "price": float(price)})
            except: pass
        if not gs_products:
            # Fallback: buscar cualquier precio en el HTML de Shopping
            for match in _re.finditer(r'data-price="([\d.]+)"', html):
                name = query
                gs_products.append({"name": name, "price": float(match.group(1))})
except Exception as e:
    gs_products = []
result["google_shopping"] = {"success": len(gs_products) > 0, "count": len(gs_products), "products": gs_products[:5]}
uc_products = []
if not api_products:
    uc_products = BaseScraper._uc_search(store, search_url, query)
result["uc"] = {"success": len(uc_products) > 0, "count": len(uc_products), "products": [{"name": p["nombre_producto"][:80], "price": p["precio"]} for p in uc_products[:5]]}

# Capa 1: HTTP
http_products = BaseScraper._http_search(store, search_url, query)
result["http"] = {
    "success": len(http_products) > 0,
    "count": len(http_products),
    "products": [{"name": p["nombre_producto"][:80], "price": p["precio"]} for p in http_products[:5]],
}

# Capa 2: Playwright
if not http_products:
    from playwright.sync_api import sync_playwright
    try:
        with sync_playwright() as p:
            browser = scraper._launch_browser(p, "firefox")
            context = scraper._new_context(browser, "firefox")
            page = context.new_page()
            page.set_default_timeout(30_000)

            # Interceptar respuestas de red
            api_calls = []
            def on_response(resp):
                if resp.status == 200:
                    url_lower = resp.url.lower()
                    if any(k in url_lower for k in ["api", "graphql", "search", "buscar", "plp", "products"]):
                        try:
                            data = resp.json()
                            api_calls.append({"url": resp.url[:200], "type": str(type(data).__name__), "keys": list(data.keys()) if isinstance(data, dict) else []})
                        except Exception:
                            pass
            page.on("response", on_response)

            pw_products = scraper._scrape_search_results(page, query)
            result["playwright"] = {
                "success": len(pw_products) > 0,
                "count": len(pw_products),
                "products": [{"name": r["nombre_producto"][:80], "price": r["precio"]} for r in pw_products[:5]],
            }
            # Capturar info del HTML
            try:
                html = page.content()
                import re
                m = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
                result["html_title"] = m.group(1).strip()[:150] if m else "(sin title)"
                result["html_size"] = len(html)
                result["html_final_url"] = page.url
                result["has_products_in_html"] = any(k in html.lower() for k in ["product", "articulo", "precio", "price", "card"])
            except Exception:
                pass
            result["api_calls"] = api_calls[:10]
            browser.close()
    except Exception as e:
        result["playwright"] = {"error": str(e)}

# Guardar resultado
output_path = "/app/test_result.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)
print(f"Resultado guardado en {output_path}")
print(json.dumps(result, indent=2, ensure_ascii=False))
