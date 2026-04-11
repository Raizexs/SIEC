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
            'name': {'css': '.pdp-basic-info__product-name', 'example': 'Hormigón Preparado Para Radieres Sobrelosas Pilares 25 Kg'},

            # Precio principal (CLP)
            # Ejemplo extraído: "$  2.590"
            'price': {'css': '.copy12.primary.senary.normal', 'example': 'CLP 2.590'},

            # Precio con descuento (si aplica)
            # Ejemplo extraído: "$  2.512"
            'price_discount': {'css': '.copy12.primary.senary.bold', 'example': 'CLP 2.512'},

            # Stock / disponibilidad
            # Ejemplo extraído: "885 unidades disponibles"
            'stock': {'css': 'p.store-availability.available', 'example': '885 unidades disponibles'},

            # Categoría / breadcrumb (en este producto la clase específica fue incluida)
            'category': {'css': 'a.Breadcrumbs-module_selected-bread-crumb__ZPj02', 'example': 'Cemento'},

            # Paginación: suele encontrarse en páginas de listado. Recomendado verificar
            # en listados; selector común: 'a[rel="next"]' o '.pagination a.next'
            'pagination': {'css': 'a[rel="next"]', 'example': 'https://www.sodimac.cl/.../page=2'}
        },
        'product_urls': [
            'https://www.sodimac.cl/sodimac-cl/articulo/110277134/hormigon-preparado-para-radieres-sobrelosas-pilares-25-kg/110277137',
            'https://www.sodimac.cl/sodimac-cl/articulo/110282820/fierro-liso-cuadrado-acero-10x10-5-mm-6-m/110282823',
            'https://www.sodimac.cl/sodimac-cl/articulo/110288145/placa-fibrocemento-lisa-4-mm-120x240-cm-blanco/110288165',
            'https://www.sodimac.cl/sodimac-cl/articulo/113214486/cable-libre-de-halogenos-h07z1-k-1x2-5-mm2-rojo-100-metros/113214489',
            'https://www.sodimac.cl/sodimac-cl/articulo/135520693/tubo-gris-pvc-agua-110-mmx6-m/135520694'
        ],
        'notes': 'Si el sitio muestra modal de región/cookies, cerrar antes de ejecutar selectores.\nPaginación en algunos listados es por JS (botones sin href) — puede requerir emulación de clicks.'
    },
    'easy': {
        'name': 'Easy',
        'base_urls': [
            'https://www.easy.cl/tienda/browse?region=valparaiso'
        ],
        'selectors': {
            'name': {'css': '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > h1', 'example': 'Cemento Especial 25 kg Polpaico'},
            'price': {'css': '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo > div.sc-1f784e80-0.bZLqYQ > div', 'example': ''},
            'price_discount': {'css': '', 'example': ''},
            'stock': {'css': '', 'example': ''},
            'category': {'css': '#__next > main > main > div:nth-child(3) > main > div.sc-7ec5121f-3.iSxTWg > div:nth-child(4) > a', 'example': ''},
            'pagination': {'css': '', 'example': ''}
        },
        'product_urls': [
            'https://www.easy.cl/cemento-especial-25-kg-polpaico-1195183/p',
            'https://www.easy.cl/perfil-rectangulo-30x20x2-mm-6-m-816-kg-119314/p',
            'https://www.easy.cl/volcanita-acu-br-1-2x2-4-m-10-mm-1354955/p',
            'https://www.easy.cl/cable-eva-2-5-mm-x-100-m-h07z1-k-823913/p',
            'https://www.easy.cl/tuberia-hidrahulica-20-mm-x3-m-clase-16-pvc-235195/p'
        ],
        'notes': 'Verificar si la tienda requiere cambiar región manualmente.'
    },
    'construmart': {
        'name': 'Construmart',
        'base_urls': [
            'https://www.construmart.cl/browse?region=valparaiso'
        ],
        'selectors': {
            'name': {'css': '#maincontent > div.columns > div > div.product-info-main > div.page-title-wrapper.product > h1 > span', 'example': 'Cemento Especial Saco 25 kg San Juan'},
            'price': {'css': '#product-price-30449 > span', 'example': ''},
            'price_discount': {'css': '', 'example': ''},
            'stock': {'css': '#maincontent > div.columns > div > div.product-info-main > div.stock-info-wrapper > div.stock-info > div > div > strong', 'example': ''},
            'category': {'css': '#html-body > div.page-wrapper > div.breadcrumbs > ul > li.item.category137 > strong', 'example': ''},
            'pagination': {'css': '', 'example': ''}
        },
        'product_urls': [
            'https://www.construmart.cl/cemento-especial-saco-25-kg-san-juan-245005',
            'https://www.construmart.cl/barra-cuadrada-laminada-10-x-10-mm-47-30872',
            'https://www.construmart.cl/yeso-carton-volcanita-rh-borde-rebaja-23602',
            'https://www.construmart.cl/cable-evaflex-h07z1-k-c5-25-mm-50-m-219322',
            'https://www.construmart.cl/tubo-ppr-pn-16-25-mm-3-m-213256'
        ],
        'notes': 'Algunos listados cargan por JS (infinite scroll) — documentar paginación específica'
    }
}

# Export convenience
__all__ = ['STORES']
