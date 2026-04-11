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
            # Usar selectores alternativos combinados (coma) para mayor resiliencia
            'name': {'css': 'h1[itemprop="name"], .pdp-basic-info__product-name', 'example': 'Hormigón Preparado Para Radieres Sobrelosas Pilares 25 Kg'},

            # Precio principal (CLP) - selector genérico que suele aplicar en PDP
            'price': {'css': '[itemprop="price"], span.price, .price', 'example': 'CLP 2.590'},

            # Precio con descuento (si aplica)
            'price_discount': {'css': '.price--discount, .price.discount, [data-discount-price]', 'example': 'CLP 2.512'},

            # Stock / disponibilidad
            'stock': {'css': 'p.store-availability.available, .stock, .availability', 'example': '885 unidades disponibles'},

            # Categoría / breadcrumb
            'category': {'css': 'nav.breadcrumbs a, .breadcrumbs a, .Breadcrumbs-module_selected-bread-crumb__ZPj02', 'example': 'Cemento'},

            # Paginación: suele encontrarse en páginas de listado. Recomendado verificar
            # en listados; selector común: 'a[rel="next"]' o '.pagination a.next'
            'pagination': {'css': 'a[rel="next"], .pagination a.next, .pager a.next', 'example': 'https://www.sodimac.cl/.../page=2'}
        },
        'product_urls': [
            'https://www.sodimac.cl/sodimac-cl/articulo/110277134/hormigon-preparado-para-radieres-sobrelosas-pilares-25-kg/110277137',
            'https://www.sodimac.cl/sodimac-cl/articulo/110282820/fierro-liso-cuadrado-acero-10x10-5-mm-6-m/110282823',
            'https://www.sodimac.cl/sodimac-cl/articulo/110288145/placa-fibrocemento-lisa-4-mm-120x240-cm-blanco/110288165',
            'https://www.sodimac.cl/sodimac-cl/articulo/113214486/cable-libre-de-halogenos-h07z1-k-1x2-5-mm2-rojo-100-metros/113214489',
            'https://www.sodimac.cl/sodimac-cl/articulo/135520693/tubo-gris-pvc-agua-110-mmx6-m/135520694'
        ],
        'notes': 'Si el sitio muestra modal de región/cookies, cerrar antes de ejecutar selectores.\nImportante: Sodimac también requiere seleccionar región/tienda para obtener stock y precios locales; estos valores pueden variar por sucursal.\nPaginación en algunos listados es por JS (botones sin href) — puede requerir emulación de clicks o uso de Playwright/Puppeteer para interactuar.'
    },
    'easy': {
        'name': 'Easy',
        'base_urls': [
            'https://www.easy.cl/tienda/browse?region=valparaiso'
        ],
        'selectors': {
            # El selector directo desde DevTools puede ser muy largo; usar alternativa más corta cuando sea posible
            'name': {'css': '#__next h1, div.sc-8e800ca6-5 h1', 'example': 'Cemento Especial 25 kg Polpaico'},
            # Precio observado en la página (ejemplo obtenido manualmente)
            'price': {'css': 'span[data-testid*="price"], span.price, .sc-1f784e80-0', 'example': '$ 42.100'},
            # Easy muestra precio/stock tras seleccionar ubicación; marcar como interacción requerida
            'price_discount': {'css': '.price--discount, [data-discount-price]', 'example': 'N/A'},
            'stock': {'css': '.stock, .availability, [data-store-stock]', 'example': 'Ingresa tu ubicación para ver opciones de entrega'},
            'category': {'css': 'nav.breadcrumbs a, .sc-7ec5121f-3 a', 'example': 'Cementos Especiales'},
            'pagination': {'css': 'a[rel="next"], .pagination a', 'example': 'N/A'}
        },
        'product_urls': [
            'https://www.easy.cl/cemento-especial-25-kg-polpaico-1195183/p',
            'https://www.easy.cl/perfil-rectangulo-30x20x2-mm-6-m-816-kg-119314/p',
            'https://www.easy.cl/volcanita-acu-br-1-2x2-4-m-10-mm-1354955/p',
            'https://www.easy.cl/cable-eva-2-5-mm-x-100-m-h07z1-k-823913/p',
            'https://www.easy.cl/tuberia-hidrahulica-20-mm-x3-m-clase-16-pvc-235195/p'
        ],
        'notes': 'Easy requiere seleccionar ubicación/region para ver stock y precios por tienda. Usar Playwright/Puppeteer para emular esta interacción si se automatiza.'
    },
    'construmart': {
        'name': 'Construmart',
        'base_urls': [
            'https://www.construmart.cl/browse?region=valparaiso'
        ],
        'selectors': {
            'name': {'css': '#maincontent h1.page-title, #maincontent h1 span', 'example': 'Cemento Especial Saco 25 kg San Juan'},
            # Magento/Hybris suelen exponer precio en span.price o [itemprop="price"]
            'price': {'css': 'span.price, [itemprop="price"], .product-price', 'example': 'Consultar precio (seleccionar tienda/region)'},
            'price_discount': {'css': '.price--discount, .special-price', 'example': 'N/A'},
            'stock': {'css': '.stock, .stock-info strong, [data-stock-status]', 'example': 'Selecciona tienda/region para ver stock'},
            'category': {'css': 'nav.breadcrumbs a, .breadcrumbs a, ul.breadcrumbs li > strong', 'example': 'Cementos'},
            'pagination': {'css': 'a[rel="next"], .pagination a, .pager a.next', 'example': 'N/A'}
        },
        'product_urls': [
            'https://www.construmart.cl/cemento-especial-saco-25-kg-san-juan-245005',
            'https://www.construmart.cl/barra-cuadrada-laminada-10-x-10-mm-47-30872',
            'https://www.construmart.cl/yeso-carton-volcanita-rh-borde-rebaja-23602',
            'https://www.construmart.cl/cable-evaflex-h07z1-k-c5-25-mm-50-m-219322',
            'https://www.construmart.cl/tubo-ppr-pn-16-25-mm-3-m-213256'
        ],
        'notes': 'Algunos listados cargan por JS (infinite scroll) — documentar paginación específica. Para stock/precio por tienda es necesario seleccionar la sucursal o región.'
    }
}

# Export convenience
__all__ = ['STORES']
