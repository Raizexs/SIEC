"""Test each Sodimac URL independently - no external deps needed"""
import urllib.request, re, time

URLS = [
    "https://www.sodimac.cl/sodimac-cl/articulo/110309884/Cemento-Polpaico-25-kilos/110309919",
    "https://www.sodimac.cl/sodimac-cl/articulo/110309884/Cemento-Polpaico-25-kilos/110309919",
    "https://www.sodimac.cl/sodimac-cl/articulo/110023605/Fierro-de-construccion-estriado-12-mm/110023608",
    "https://www.sodimac.cl/sodimac-cl/articulo/110313881/Arena-gruesa-saco-25kg/110313884",
    "https://www.sodimac.cl/sodimac-cl/articulo/110313872/Gravilla-saco-25kg/110313876",
    "https://www.sodimac.cl/sodimac-cl/articulo/110020134/Perfil-metalcon-estructural-C-60x38x0.85-mm-x-3-m/110020138",
    "https://www.sodimac.cl/sodimac-cl/articulo/110020118/Perfil-metalcon-estructural-U-62x25x0.85-mm-x-3-m/110020121",
    "https://www.sodimac.cl/sodimac-cl/articulo/110020177/Perfil-metalcon-cielo-omega-3-m/110020180",
    "https://www.sodimac.cl/sodimac-cl/articulo/110283433/Pino-dimensionado-2x3-32-m-premium/110283436",
    "https://www.sodimac.cl/sodimac-cl/articulo/110283451/Pino-dimensionado-2x4-32-m-premium/110283454",
    "https://www.sodimac.cl/sodimac-cl/articulo/110284022/terciado-estructural-pino-12-mm-122x244-cm/110284026",
    "https://www.sodimac.cl/sodimac-cl/articulo/110286391/Yeso-Carton-Resistente-a-la-humedad-12.5-mm-120x240-cm-Blanco/110286395",
    "https://www.sodimac.cl/sodimac-cl/articulo/110286383/Yeso-Carton-Resistente-a-la-humedad-15-mm-120x240-cm-Blanco/110286386",
    "https://www.sodimac.cl/sodimac-cl/articulo/110196813/Tornillo-Volcanita-Punta-Fina-6x1-58-Zinc-Caja-12000-unds/110196816",
    "https://www.sodimac.cl/sodimac-cl/articulo/110196759/Tornillo-madera-aglomerada-6x1-14-crs-caja-200-un/110196762",
    "https://www.sodimac.cl/sodimac-cl/articulo/110196651/Tornillo-autoperforante-hexagonal-10x1-zincado-caja-100-un/110196654",
    "https://www.sodimac.cl/sodimac-cl/articulo/110034631/Esmalte-al-agua-pieza-y-fachada-galon-blanco/110034635",
    "https://www.sodimac.cl/sodimac-cl/articulo/110036120/Esmalte-sintetico-galon-blanco/110036123",
    "https://www.sodimac.cl/sodimac-cl/articulo/110084531/Ceramica-de-piso-45x45-cm-2.03-m2-madera-caramelo/110084534",
    "https://www.sodimac.cl/sodimac-cl/articulo/110084123/Ceramica-de-muro-25x40-cm-1.5-m2-blanco-brillante/110084126",
    "https://www.sodimac.cl/sodimac-cl/articulo/110088510/Piso-flotante-8-mm-2.4-m2-roble-natural/110088513",
    "https://www.sodimac.cl/sodimac-cl/articulo/110028341/Adhesivo-ceramico-polvo-saco-25-kg/110028344",
    "https://www.sodimac.cl/sodimac-cl/articulo/110028546/Frague-impermeable-1-kg-blanco/110028549",
    "https://www.sodimac.cl/sodimac-cl/articulo/110115632/Cable-electrico-H07Z1-K-libre-de-halogeno-2.5-mm-rojo-100-m/110115635",
    "https://www.sodimac.cl/sodimac-cl/articulo/110115659/Cable-electrico-H07Z1-K-libre-de-halogeno-4-mm-blanco-100-m/110115662",
    "https://www.sodimac.cl/sodimac-cl/articulo/110115683/Cable-electrico-H07Z1-K-libre-de-halogeno-6-mm-verde-100-m/110115686",
    "https://www.sodimac.cl/sodimac-cl/articulo/110024511/Tubo-PVC-sanitario-110-mm-3-m/110024514",
    "https://www.sodimac.cl/sodimac-cl/articulo/110024538/Tubo-PVC-sanitario-75-mm-3-m/110024541",
    "https://www.sodimac.cl/sodimac-cl/articulo/110024562/Tubo-PVC-sanitario-50-mm-3-m/110024565",
    "https://www.sodimac.cl/sodimac-cl/articulo/110025119/Tubo-cobre-tipo-L-12-pulgada-15-mm-x-3-m/110025122",
    "https://www.sodimac.cl/sodimac-cl/articulo/110025143/Tubo-cobre-tipo-L-34-pulgada-22-mm-x-3-m/110025146",
    "https://www.sodimac.cl/sodimac-cl/articulo/110123511/Caja-distribucion-embutida-53x100x48-mm/110123514",
    "https://www.sodimac.cl/sodimac-cl/articulo/110124355/Automatico-monofasico-1x16-A/110124358",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
}

print(f"{'#':>2s} | {'Status':>6s} | {'LD':>2s} | {'Prod':>4s} | {'T(s)':>4s} | Producto")
print("-" * 80)
for i, url in enumerate(URLS):
    try:
        start = time.time()
        req = urllib.request.Request(url, headers=HEADERS)
        resp = urllib.request.urlopen(req, timeout=10)
        html = resp.read().decode("utf-8", errors="replace")
        has_ld = "application/ld+json" in html
        has_product = '"Product"' in html
        elapsed = time.time() - start
        
        name = ""
        if has_product:
            for m in re.finditer(r'"@type"\s*:\s*"Product".*?"name"\s*:\s*"([^"]+)"', html, re.DOTALL):
                name = m.group(1)[:55]
                break
        
        print(f"{i+1:2d} | {resp.status:3d}    | {'Y' if has_ld else 'N'}  | {'Y' if has_product else 'N'}    | {elapsed:.1f} | {name}")
    except Exception as e:
        err = str(e)[:60].replace("\n", " ")
        print(f"{i+1:2d} | ERR   | -  | -    | {time.time()-start:.1f} | {err}")
