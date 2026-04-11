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
            'name': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'Ladrillo Volcanita 12mm'},
            'price': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'CLP 2.990'},
            'price_discount': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'CLP 2.490'},
            'stock': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'En stock'},
            'category': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'Revestimientos > Volcanita'},
            'pagination': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'https://www.easy.cl/.../page=2'}
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
            'name': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'Fierro 10mm 6m'},
            'price': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'CLP 8.490'},
            'price_discount': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'CLP 7.990'},
            'stock': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'Últimas unidades'},
            'category': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'Fierros > Acero'},
            'pagination': {'css': 'PLACEHOLDER_SELECTOR', 'example': 'https://www.construmart.cl/.../page=2'}
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
