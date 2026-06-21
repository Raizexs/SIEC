"""Test Construmart HTTP + JSON-LD for multiple products"""
import urllib.request, re, json, time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
}

def http_search(store_name, search_url):
    try:
        req = urllib.request.Request(search_url, headers=HEADERS)
        html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", errors="replace")
        for match in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
            data = json.loads(match.group(1))
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict): continue
                if item.get("@type") in ("ItemList", "Product"):
                    entries = item.get("itemListElement") or [item]
                    results = []
                    for entry in entries[:10]:
                        obj = entry.get("item", entry) if isinstance(entry, dict) else entry
                        if not isinstance(obj, dict): continue
                        name = obj.get("name", "").strip()
                        offers = obj.get("offers", {}) or {}
                        if isinstance(offers, list): offers = offers[0] if offers else {}
                        price = offers.get("price")
                        if name and price:
                            try: pval = float(price) if isinstance(price, (int, float)) else float(str(price).replace(",", "."))
                            except: continue
                            if pval < 100: continue
                            results.append((name[:60], pval))
                    if results:
                        return results
        return []
    except Exception as e:
        return []

INSUMOS = [
    "Cemento Portland",
    "Cemento Especial",
    "Fierro A63-42H",
    "Arena Gruesa",
    "Ripio",
    "Perfil C 60x38",
    "Perfil U 62x25",
    "Perfil Omega",
    "Pino 2x3",
    "Pino 2x4",
    "Terciado 12mm",
    "Volcanita RH Standard",
    "Pintura Acrilica Blanca",
    "Pintura Esmalte",
    "Ceramica Piso",
    "Ceramica Muro",
    "Piso Flotante",
    "Adhesivo Ceramico",
    "Cable 2.5mm",
    "Tubo PVC 110mm",
    "Tubo PVC 75mm",
    "Tubo PVC 50mm",
    "Tornillo Volcanita",
]

print(f"{'Insumo':30s} | Productos encontrados")
print("-" * 70)
ok = 0
for insumo in INSUMOS:
    url = f"https://www.construmart.cl/catalogsearch/result/?q={insumo.replace(' ', '+')}"
    prods = http_search("construmart", url)
    if prods:
        ok += 1
        print(f"{insumo:30s} | {len(prods)} productos. Primero: {prods[0][0][:40]} -> ${prods[0][1]:,.0f}")
    else:
        print(f"{insumo:30s} | Sin resultados")
    time.sleep(0.5)

print(f"\nTotal con datos: {ok}/{len(INSUMOS)}")
