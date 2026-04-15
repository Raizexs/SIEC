# scraper/config.py
# Plantilla de configuración de selectores CSS y URLs base por tienda.
# Rellena los valores `css` con los selectores obtenidos desde Chrome DevTools
# y actualiza `example` con un valor real extraído (por copia/pegado desde la consola).

STORES = {
    'sodimac': {
        'name': 'Sodimac',
        'base_urls': [
            # Ejemplo: listar resultados filtrados por Región de Valparaíso
            # Rellena con URLs válidas (listados/categorías) filtradas por región
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
            'https://www.sodimac.cl/sodimac-cl/articulo/135520693/tubo-gris-pvc-agua-110-mmx6-m/135520694'
        ],
        'notes': 'INTERACCIÓN REQUERIDA: 1) Cerrar modal de región/cookies (click X). 2) Seleccionar Región Valparaíso si se solicita. 3) Stock y precio varían por sucursal seleccionada. 4) El producto de fibrocemento se usa como equivalente de Volcanita para el mapeo de insumos. 5) En listados, paginación usa JS (requiere Playwright para automatizar). Ver DOCUMENTACION_SELECTORES.md para paso a paso en DevTools.'
    },
    'easy': {
        'name': 'Easy',
        'base_urls': [
            'https://www.easy.cl/tienda/browse?region=valparaiso'
        ],
        'selectors': {
            'name': {'css': '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > h1', 'example': 'Cemento especial 25 kg Polpaico'},
            'price': {'css': '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo > div.sc-1f784e80-0.bZLqYQ > div', 'example': '$ 5.510'},
            'price_discount': {'css': '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo', 'example': 'N/A'},
            'stock': {'css': '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > div:nth-child(8) > dialog > div > div.sc-b9a1d677-3.kxmjzI > div > div > div > p', 'example': 'Requiere seleccionar ubicación'},
            'category': {'css': '#__next > main > main > div:nth-child(3) > div > div.sc-eb8d352a-0.dTMHsi > div > div:nth-child(4) > a > span', 'example': 'Cementos Especiales'},
            'pagination': {'css': '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > div.sc-1f784e80-0.bZLqYQ > div > a', 'example': 'N/A (en PDPs no hay)'}
        },

        'product_urls': [
            'https://www.easy.cl/cemento-especial-25-kg-polpaico-1195183/p',
            'https://www.easy.cl/perfil-rectangulo-30x20x2-mm-6-m-816-kg-119314/p',
            'https://www.easy.cl/volcanita-acu-br-1-2x2-4-m-10-mm-1354955/p',
            'https://www.easy.cl/cable-eva-2-5-mm-x-100-m-h07z1-k-823913/p',
            'https://www.easy.cl/tuberia-hidrahulica-20-mm-x3-m-clase-16-pvc-235195/p'
        ],
        'notes': 'INTERACCIÓN REQUERIDA: 1) Seleccionar ubicación/región antes de ver precios y stock. 2) Los selectores con nth-child pueden cambiar (framework CSS-in-JS). 3) Sin ubicación seleccionada, price y stock retornan vacíos. 4) Modal de ubicación aparece en startup. Ver DOCUMENTACION_SELECTORES.md para paso a paso en DevTools.'
    },
    'construmart': {
        'name': 'Construmart',
        'base_urls': [
            'https://www.construmart.cl/browse?region=valparaiso'
        ],
        'selectors': {
            'name': {'css': '.product-name, h1', 'example': 'Cemento Especial Saco 25 kg San Juan'},
            'price': {'css': '.price-container .price, .product-price', 'example': 'Requiere seleccionar tienda/región'},
            'price_discount': {'css': '.special-price .price', 'example': 'N/A'},
            'stock': {'css': '.stock-info, .availability', 'example': 'Sin Stock (varía por tienda)'},
            'category': {'css': '.breadcrumb-item, .breadcrumbs li', 'example': 'Cementos'},
            'pagination': {'css': '.pagination .next, a[rel="next"]', 'example': 'N/A (en PDPs no hay)'}
        },

        'product_urls': [
            'https://www.construmart.cl/cemento-especial-saco-25-kg-san-juan-245005',
            'https://www.construmart.cl/barra-cuadrada-laminada-10-x-10-mm-47-30872',
            'https://www.construmart.cl/yeso-carton-volcanita-rh-borde-rebaja-23602',
            'https://www.construmart.cl/cable-evaflex-h07z1-k-c5-25-mm-50-m-219322',
            'https://www.construmart.cl/tubo-ppr-pn-16-25-mm-3-m-213256'
        ],
        'notes': 'INTERACCIÓN REQUERIDA: 1) Seleccionar tienda/sucursal para ver precios y stock locales. 2) Selectores genéricos (.product-name, h1) son más estables. 3) Algunos listados usan infinite scroll (sin botón "Siguiente"). 4) Breadcrumb dinámico con path de categorías. Ver DOCUMENTACION_SELECTORES.md para paso a paso en DevTools.'
    }
}

# Export convenience
__all__ = ['STORES']
