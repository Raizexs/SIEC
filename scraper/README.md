Inspección de selectores CSS — Instrucciones rápidas

Objetivo
--------
Identificar y documentar selectores CSS que permiten extraer datos de productos
para las tiendas Sodimac, Easy y Construmart, filtrando por Región de Valparaíso.

Pasos recomendados (Chrome DevTools)
------------------------------------
1. Abrir la URL de listado filtrada por Región de Valparaíso (ej. categoría Cemento).
2. Si aparece modal de selección de región o cookies, ciérralo o elije Valparaíso.
3. Botón derecho sobre el nombre de un producto → "Inspeccionar" → el elemento queda seleccionado.
4. Click derecho en el elemento en el DOM → Copy → "Copy selector". Pegar en `scraper/config.py`.
5. En la Consola de DevTools ejecutar `document.querySelectorAll('TU_SELECTOR')` para verificar que devuelve >0 elementos.
6. Pegar el valor de ejemplo (texto visible) en `example` en `scraper/config.py`.
7. Repetir para `price`, `price_discount` (si existe), `stock`, `category` (breadcrumb), y `pagination`.
8. Para paginación: identifica el enlace a la página siguiente o el patrón de parámetros de página.
9. Repite la inspección para al menos 5 productos por tienda (Cemento, Fierro, Volcanita, Cableado, Tuberías) y guarda sus URLs directas.

Uso del helper `verify_selectors.js`
------------------------------------
- Pegar el contenido de `scraper/verify_selectors.js` en la consola y sustituir el objeto `selectors` por tus selectores.
- El script mostrará el número de coincidencias y hasta 5 ejemplos de texto.

Criterios de aceptación
-----------------------
- `scraper/config.py` existe y contiene las tiendas con `base_urls` y un dict `selectors`.
- Cada tienda documenta al menos 4 selectores: `name`, `price`, `stock`, `pagination`.
- Para cada selector indicaste un `example` (valor extraído manualmente).
- Documentaste si el sitio requiere interacción previa (modal, selección de región, login).
- Se identificaron y guardaron 5 URLs concretas por tienda para los productos solicitados.

Siguientes pasos (después de inspección manual)
-----------------------------------------------
- Yo puedo recibir el `scraper/config.py` actualizado y verificar que los selectores funcionan
  ejecutando pruebas unitarias locales o creando un pequeño script de scraping que use las reglas.

