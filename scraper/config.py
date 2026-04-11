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
            'https://www.sodimac.cl/sodimac-cl/articulo/110309884/cemento-polpaico-25-kilos/110309919',
            'https://www.sodimac.cl/sodimac-cl/articulo/143739236/cemento-envasado-especial-25-kg-saco/143739237',
            'https://www.sodimac.cl/sodimac-cl/articulo/110328558/plancha-fibrocemento-base-ceramico-6-mm-120x240-cm-blanco/110328570',
            'https://www.sodimac.cl/sodimac-cl/articulo/110289962/perfil-rectangular-acero-30x20x2-mm-6-m/110289975'
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
        'notes': 'Algunos listados cargan por JS (infinite scroll) — documentar paginación específica'
    }
}

# Export convenience
__all__ = ['STORES']
