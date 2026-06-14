# scraper/config.py
# Plantilla de configuración de selectores CSS y URLs base por tienda.
# Rellena los valores `css` con los selectores obtenidos desde Chrome DevTools
# y actualiza `example` con un valor real extraído (por copia/pegado desde la consola).

STORES = {
    'sodimac': {
        'name': 'Sodimac',
        'base_urls': [
            'https://www.sodimac.cl/sodimac-cl/browse?region=valparaiso'
        ],
        'selectors': {
            'name': {'css': '.pdp-basic-info__product-name, [class*="product-name"], h1', 'example': ''},
            'price': {'css': '.copy12.primary.senary, [class*="price"], .primary.senary', 'example': ''},
            'price_discount': {'css': '.copy12.primary.senary.bold, [class*="discount"]', 'example': ''},
            'stock': {'css': 'p.store-availability.available, [class*="availability"], .stock', 'example': ''},
            'category': {'css': 'a.Breadcrumbs-module_selected-bread-crumb__ZPj02, .selected-bread-crumb', 'example': ''},
            'pagination': {'css': 'a[rel="next"]', 'example': ''}
        },

        'product_urls': [
            # Obra Gruesa
            'https://www.sodimac.cl/sodimac-cl/articulo/110309884/Cemento-Polpaico-25-kilos/110309919',
            'https://www.sodimac.cl/sodimac-cl/articulo/110309884/Cemento-Polpaico-25-kilos/110309919',  # Cemento Especial
            'https://www.sodimac.cl/sodimac-cl/articulo/110023605/Fierro-de-construccion-estriado-12-mm/110023608',
            'https://www.sodimac.cl/sodimac-cl/articulo/110313881/Arena-gruesa-saco-25kg/110313884',
            'https://www.sodimac.cl/sodimac-cl/articulo/110313872/Gravilla-saco-25kg/110313876',
            # Estructura
            'https://www.sodimac.cl/sodimac-cl/articulo/110020134/Perfil-metalcon-estructural-C-60x38x0.85-mm-x-3-m/110020138',
            'https://www.sodimac.cl/sodimac-cl/articulo/110020118/Perfil-metalcon-estructural-U-62x25x0.85-mm-x-3-m/110020121',
            'https://www.sodimac.cl/sodimac-cl/articulo/110020177/Perfil-metalcon-cielo-omega-3-m/110020180',
            'https://www.sodimac.cl/sodimac-cl/articulo/110283433/Pino-dimensionado-2x3-32-m-premium/110283436',
            'https://www.sodimac.cl/sodimac-cl/articulo/110283451/Pino-dimensionado-2x4-32-m-premium/110283454',
            # Revestimientos
            'https://www.sodimac.cl/sodimac-cl/articulo/110284022/terciado-estructural-pino-12-mm-122x244-cm/110284026',
            'https://www.sodimac.cl/sodimac-cl/articulo/110286391/Yeso-Carton-Resistente-a-la-humedad-12.5-mm-120x240-cm-Blanco/110286395',
            'https://www.sodimac.cl/sodimac-cl/articulo/110286383/Yeso-Carton-Resistente-a-la-humedad-15-mm-120x240-cm-Blanco/110286386',
            # Fijaciones
            'https://www.sodimac.cl/sodimac-cl/articulo/110196813/Tornillo-Volcanita-Punta-Fina-6x1-58-Zinc-Caja-12000-unds/110196816',
            'https://www.sodimac.cl/sodimac-cl/articulo/110196759/Tornillo-madera-aglomerada-6x1-14-crs-caja-200-un/110196762',
            'https://www.sodimac.cl/sodimac-cl/articulo/110196651/Tornillo-autoperforante-hexagonal-10x1-zincado-caja-100-un/110196654',
            # Terminaciones
            'https://www.sodimac.cl/sodimac-cl/articulo/110034631/Esmalte-al-agua-pieza-y-fachada-galon-blanco/110034635',
            'https://www.sodimac.cl/sodimac-cl/articulo/110036120/Esmalte-sintetico-galon-blanco/110036123',
            'https://www.sodimac.cl/sodimac-cl/articulo/110084531/Ceramica-de-piso-45x45-cm-2.03-m2-madera-caramelo/110084534',
            'https://www.sodimac.cl/sodimac-cl/articulo/110084123/Ceramica-de-muro-25x40-cm-1.5-m2-blanco-brillante/110084126',
            'https://www.sodimac.cl/sodimac-cl/articulo/110088510/Piso-flotante-8-mm-2.4-m2-roble-natural/110088513',
            'https://www.sodimac.cl/sodimac-cl/articulo/110028341/Adhesivo-ceramico-polvo-saco-25-kg/110028344',
            'https://www.sodimac.cl/sodimac-cl/articulo/110028546/Frague-impermeable-1-kg-blanco/110028549',
            # Instalaciones
            'https://www.sodimac.cl/sodimac-cl/articulo/110115632/Cable-electrico-H07Z1-K-libre-de-halogeno-2.5-mm-rojo-100-m/110115635',
            'https://www.sodimac.cl/sodimac-cl/articulo/110115659/Cable-electrico-H07Z1-K-libre-de-halogeno-4-mm-blanco-100-m/110115662',
            'https://www.sodimac.cl/sodimac-cl/articulo/110115683/Cable-electrico-H07Z1-K-libre-de-halogeno-6-mm-verde-100-m/110115686',
            'https://www.sodimac.cl/sodimac-cl/articulo/110024511/Tubo-PVC-sanitario-110-mm-3-m/110024514',
            'https://www.sodimac.cl/sodimac-cl/articulo/110024538/Tubo-PVC-sanitario-75-mm-3-m/110024541',
            'https://www.sodimac.cl/sodimac-cl/articulo/110024562/Tubo-PVC-sanitario-50-mm-3-m/110024565',
            'https://www.sodimac.cl/sodimac-cl/articulo/110025119/Tubo-cobre-tipo-L-12-pulgada-15-mm-x-3-m/110025122',
            'https://www.sodimac.cl/sodimac-cl/articulo/110025143/Tubo-cobre-tipo-L-34-pulgada-22-mm-x-3-m/110025146',
            'https://www.sodimac.cl/sodimac-cl/articulo/110123511/Caja-distribucion-embutida-53x100x48-mm/110123514',
            'https://www.sodimac.cl/sodimac-cl/articulo/110124355/Automatico-monofasico-1x16-A/110124358',
        ],
        'search_url': 'https://www.sodimac.cl/sodimac-cl/search?Ntt={query}',
        'search_selectors': {
            'container': 'div[class*="product"], div[data-testid*="product"], div[class*="card"], div[id^="testId-product-card"], div.product-container',
            'name': 'a[class*="title"] h2, a[id*="title"] h2, [class*="product-name"], .product-title, a[id*="title"]',
            'price': '[class*="price-"], [class*="price-current"], .price-0, [class*="price"] span',
            'link': 'a[class*="title"], a[id*="title"], a[href*="/articulo/"], a[href*="/sodimac-cl/"]'
        },
        'notes': 'INTERACCIÓN REQUERIDA: 1) Cerrar modal de región/cookies (click X). 2) Seleccionar Región Valparaíso si se solicita. 3) Stock y precio varían por sucursal seleccionada. 4) El producto de fibrocemento se usa como equivalente de Volcanita para el mapeo de insumos. 5) En listados, paginación usa JS (requiere Playwright para automatizar). Ver DOCUMENTACION_SELECTORES.md para paso a paso en DevTools.'
    },
    'easy': {
        'name': 'Easy',
        'base_urls': [
            'https://www.easy.cl/tienda/browse?region=valparaiso'
        ],
        'selectors': {
            'name': {'css': 'h1, [class*="product-name"], [class*="title"] h1', 'example': 'Cemento especial 25 kg Polpaico'},
            'price': {'css': '[class*="price"] div, [class*="price"] span, [class*="precio"]', 'example': '$ 5.510'},
            'price_discount': {'css': '[class*="discount"], [class*="offer"]', 'example': 'N/A'},
            'stock': {'css': '[class*="stock"], [class*="availability"], p[class*="status"]', 'example': 'Requiere seleccionar ubicación'},
            'category': {'css': '[class*="breadcrumb"] li, nav a[class*="crumb"]', 'example': 'Cementos Especiales'},
            'pagination': {'css': 'a[rel="next"], [class*="pagination"] a', 'example': 'N/A'}
        },

        'product_urls': [
            'https://www.easy.cl/cemento-especial-25-kg-polpaico-1195183/p',
            'https://www.easy.cl/perfil-rectangulo-30x20x2-mm-6-m-816-kg-119314/p',
            'https://www.easy.cl/volcanita-acu-br-1-2x2-4-m-10-mm-1354955/p',
            'https://www.easy.cl/cable-eva-2-5-mm-x-100-m-h07z1-k-823913/p',
            'https://www.easy.cl/tuberia-hidrahulica-20-mm-x3-m-clase-16-pvc-235195/p',
            'https://www.easy.cl/search/perfil%20c',
            'https://www.easy.cl/search/perfil%20u',
            'https://www.easy.cl/search/pino%20dimensionado',
            'https://www.easy.cl/search/tornillo%20volcanita'
        ],
        'search_url': 'https://www.easy.cl/search/{query}',
        'search_selectors': {
            'container': 'div[class*="productCard"], div[class*="card"], div[class*="item"], [data-testid*="product"]',
            'name': '[class*="productName"], [class*="name"] span, a[href*="/p/"] h2, a[href*="/p/"] span',
            'price': '[class*="price"] div, [class*="price"] span, [class*="precio"]',
            'link': 'a[href*="/p/"], a[class*="link"], a[class*="title"]'
        },
        'notes': 'INTERACCIÓN REQUERIDA: 1) Seleccionar ubicación/región antes de ver precios y stock. 2) Los selectores con nth-child pueden cambiar (framework CSS-in-JS). 3) Sin ubicación seleccionada, price y stock retornan vacíos. 4) Modal de ubicación aparece en startup. Ver DOCUMENTACION_SELECTORES.md para paso a paso en DevTools.'
    },
    'construmart': {
        'name': 'Construmart',
        'base_urls': [
            'https://www.construmart.cl/browse?region=valparaiso'
        ],
        'selectors': {
            'name': {'css': '.product-name, h1, [class*="product"] h1', 'example': 'Cemento Especial Saco 25 kg San Juan'},
            'price': {'css': '.price-container .price, .product-price, [class*="price"]', 'example': 'Requiere seleccionar tienda/región'},
            'price_discount': {'css': '.special-price .price, [class*="special"]', 'example': 'N/A'},
            'stock': {'css': '.stock-info, .availability, [class*="stock"]', 'example': 'Sin Stock (varía por tienda)'},
            'category': {'css': '.breadcrumb-item, .breadcrumbs li, [class*="crumb"]', 'example': 'Cementos'},
            'pagination': {'css': '.pagination .next, a[rel="next"]', 'example': 'N/A'}
        },

        'product_urls': [
            'https://www.construmart.cl/cemento-especial-saco-25-kg-san-juan-245005',
            'https://www.construmart.cl/barra-cuadrada-laminada-10-x-10-mm-47-30872',
            'https://www.construmart.cl/yeso-carton-volcanita-rh-borde-rebaja-23602',
            'https://www.construmart.cl/cable-evaflex-h07z1-k-c5-25-mm-50-m-219322',
            'https://www.construmart.cl/tubo-ppr-pn-16-25-mm-3-m-213256',
            'https://www.construmart.cl/catalogsearch/result/?q=perfil+c',
            'https://www.construmart.cl/catalogsearch/result/?q=perfil+u',
            'https://www.construmart.cl/catalogsearch/result/?q=pino+dimensionado',
            'https://www.construmart.cl/catalogsearch/result/?q=tornillo+volcanita'
        ],
        'search_url': 'https://www.construmart.cl/catalogsearch/result/?q={query}',
        'search_selectors': {
            'container': '.product-item, .product-item-info, [class*="product"], li[class*="item"]',
            'name': '.product-item-link, a[class*="product"], [class*="product-name"] a',
            'price': '.price, [class*="price"], [class*="precio"]',
            'link': '.product-item-link, a[class*="product"], a[href*="/construmart.cl/"]'
        },
        'notes': 'INTERACCIÓN REQUERIDA: 1) Seleccionar tienda/sucursal para ver precios y stock locales. 2) Selectores genéricos (.product-name, h1) son más estables. 3) Algunos listados usan infinite scroll (sin botón "Siguiente"). 4) Breadcrumb dinámico con path de categorías. Ver DOCUMENTACION_SELECTORES.md para paso a paso en DevTools.'
    }
}

# Export convenience
__all__ = ['STORES']
