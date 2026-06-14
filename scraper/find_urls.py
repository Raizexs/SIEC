"""Find working Sodimac product URLs via Google Search"""
import urllib.request, re, json, time

def search_google(query):
    url = f"https://www.google.com/search?q=site:sodimac.cl+{query.replace(' ', '+')}&hl=es&gl=cl"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
    })
    html = urllib.request.urlopen(req, timeout=10).read().decode("utf-8", errors="replace")
    urls = re.findall(r'https://www\.sodimac\.cl/sodimac-cl/articulo/\d+/[^"&\s<>]+/\d+', html)
    return list(set(urls))

def test_url(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=5)
        html = resp.read().decode("utf-8", errors="replace")
        has_jsonld = "application/ld+json" in html
        return resp.status == 200 and has_jsonld
    except:
        return False

PRODUCTS = [
    ("Cemento Portland", "Cemento Polpaico 25 kilos"),  # already working
    ("Fierro A63-42H", "Fierro construccion estriado 12 mm"),
    ("Arena Gruesa", "Arena gruesa 25 kg"),
    ("Ripio", "Gravilla 25 kg"),
    ("Perfil C 60x38", "Perfil Metalcon C 60x38"),
    ("Perfil U 62x25", "Perfil Metalcon U 62x25"),
    ("Perfil Omega", "Perfil Metalcon cielo omega"),
    ("Pino 2x3", "Pino dimensionado 2x3"),
    ("Pino 2x4", "Pino dimensionado 2x4"),
    ("Yeso Carton RH Standard", "Volcanita RH 12.5 mm"),
    ("Yeso Carton RH Reforzado", "Volcanita RH 15 mm"),
    ("Tornillo Volcanita", "Tornillo Volcanita punta fina"),
    ("Tornillo Madera", "Tornillo madera aglomerada"),
    ("Tornillo Autoperforante", "Tornillo autoperforante hexagonal"),
    ("Pintura Acrilica", "Esmalte al agua blanco galon"),
    ("Pintura Esmalte", "Esmalte sintetico blanco galon"),
    ("Ceramica Piso", "Ceramica piso 45x45"),
    ("Ceramica Muro", "Ceramica muro 25x40"),
    ("Piso Flotante", "Piso flotante 8 mm"),
    ("Adhesivo Ceramico", "Adhesivo ceramico 25 kg"),
    ("Lechada Ceramica", "Frague impermeable 1 kg"),
    ("Cable 2.5mm", "Cable H07Z1-K 2.5 mm 100 m"),
    ("Cable 4mm", "Cable H07Z1-K 4 mm 100 m"),
    ("Cable 6mm", "Cable H07Z1-K 6 mm 100 m"),
    ("Tubo PVC 110mm", "Tubo PVC sanitario 110 mm"),
    ("Tubo PVC 75mm", "Tubo PVC sanitario 75 mm"),
    ("Tubo PVC 50mm", "Tubo PVC sanitario 50 mm"),
    ("Tubo Cobre 15mm", "Tubo cobre tipo L 15 mm"),
    ("Tubo Cobre 22mm", "Tubo cobre tipo L 22 mm"),
    ("Caja Electrica", "Caja distribucion embutida"),
    ("Disyuntor", "Automatico monofasico 16A"),
]

print(f"{'Producto':35s} | URL")
print("-" * 80)
for name, query in PRODUCTS:
    found = search_google(query)
    if found:
        url = found[0]
        ok = test_url(url)
        print(f"{name:35s} | {'OK' if ok else 'TEST'}: {url}")
    else:
        print(f"{name:35s} | NO ENCONTRADO")
    time.sleep(1)
