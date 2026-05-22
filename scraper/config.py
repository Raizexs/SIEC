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
            'name': {'css': '.pdp-basic-info__product-name, [class*="product-name"], h1', 'example': 'Hormigón Preparado Para Radieres Sobrelosas Pilares 25 Kg'},
            'price': {'css': '.copy12.primary.senary, [class*="price"], .primary.senary', 'example': '$ 2.851'},
            'price_discount': {'css': '.copy12.primary.senary.bold, [class*="discount"]', 'example': 'N/A (sin descuento)'},
            'stock': {'css': 'p.store-availability.available, [class*="availability"], .stock', 'example': '89 unidades disponibles'},
            'category': {'css': 'a.Breadcrumbs-module_selected-bread-crumb__ZPj02, .selected-bread-crumb', 'example': 'Cemento'},
            'pagination': {'css': 'a[rel="next"]', 'example': 'N/A (en PDPs no hay paginación)'}
        },

        'product_urls': [
            'https://www.sodimac.cl/sodimac-cl/articulo/110277134/hormigon-preparado-para-radieres-sobrelosas-pilares-25-kg/110277137',
            'https://www.sodimac.cl/sodimac-cl/articulo/110282820/fierro-liso-cuadrado-acero-10x10-5-mm-6-m/110282823',
            'https://www.sodimac.cl/sodimac-cl/articulo/110288145/placa-fibrocemento-lisa-4-mm-120x240-cm-blanco/110288165',
            'https://www.sodimac.cl/sodimac-cl/articulo/113214486/cable-libre-de-halogenos-h07z1-k-1x2-5-mm2-rojo-100-metros/113214489',
            'https://www.sodimac.cl/sodimac-cl/articulo/135520693/tubo-gris-pvc-agua-110-mmx6-m/135520694',
            'https://www.sodimac.cl/sodimac-cl/search?Ntt=Perfil+C+60x38',
            'https://www.sodimac.cl/sodimac-cl/search?Ntt=Perfil+U+62x25',
            'https://www.sodimac.cl/sodimac-cl/search?Ntt=Pino+Dimensionado+2x4',
            'https://www.sodimac.cl/sodimac-cl/search?Ntt=Tornillo+Volcanita'
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
