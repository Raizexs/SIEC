# 📖 DOCUMENTACIÓN DE VERIFICACIÓN DE SELECTORES POR TIENDA

## 🏪 SODIMAC.CL

### Instrucciones paso a paso (Chrome DevTools)

1. **Abrir URL de producto:**
   ```
   https://www.sodimac.cl/sodimac-cl/articulo/110277134/hormigon-preparado-para-radieres-sobrelosas-pilares-25-kg/110277137
   ```

2. **Abrir DevTools:** `F12` → Pestaña "Console"

3. **Cerrar modal (si aparece):**
   - Si ves modal de región → Click en "Cerrar" o selecciona "Valparaíso"
   - Si ves cookie banner → Aceptar

4. **Verificar cada selector:**

   **a) NAME — `.pdp-basic-info__product-name`**
   ```javascript
   document.querySelectorAll('.pdp-basic-info__product-name')
   // Debe retornar 1 elemento
   // Texto esperado: "Hormigón Preparado Para Radieres Sobrelosas Pilares 25 Kg"
   ```

   **b) PRICE — `.copy12.primary.senary`**
   ```javascript
   document.querySelectorAll('.copy12.primary.senary')
   // Debe retornar 1-2 elementos (precio normal y posible oferta)
   // Texto esperado: "$ 2.851" o similar
   ```

   **c) PRICE_DISCOUNT — `.copy12.primary.senary.bold`**
   ```javascript
   document.querySelectorAll('.copy12.primary.senary.bold')
   // Puede retornar 0 (sin descuento) o 1 (con descuento)
   ```

   **d) STOCK — `p.store-availability.available`**
   ```javascript
   document.querySelectorAll('p.store-availability.available')
   // Debe retornar 1 elemento
   // Texto esperado: "89 unidades disponibles" o similar
   ```

   **e) CATEGORY — `a.Breadcrumbs-module_selected-bread-crumb__ZPj02`**
   ```javascript
   document.querySelectorAll('a.Breadcrumbs-module_selected-bread-crumb__ZPj02')
   // Debe retornar 1 elemento (breadcrumb actual)
   // Texto esperado: "Cemento" o "Fierro" según producto
   ```

   **f) PAGINATION — `a[rel="next"]`**
   ```javascript
   document.querySelectorAll('a[rel="next"]')
   // En PDP (página de producto) retornará 0
   // En listados retornará 1 (link a siguiente página)
   ```

### Notas Importantes (Sodimac)
- **Modal de región:** Sodimac muestra modal al entrar. Cerrar antes de scrapear.
- **Stock dinámico:** Varía por sucursal seleccionada. Puede cambiar frecuentemente.
- **Precio local:** Cambia según tienda elegida. Importante para datos precisos.
- **Paginación JS:** En listados usa clicks de JS. Requiere Playwright para automatizar.

---

## 🏪 EASY.CL

### Instrucciones paso a paso (Chrome DevTools)

1. **Abrir URL de producto:**
   ```
   https://www.easy.cl/cemento-especial-25-kg-polpaico-1195183/p
   ```

2. **Abrir DevTools:** `F12` → Pestaña "Console"

3. **Seleccionar ubicación (si es necesario):**
   - Easy puede pedir seleccionar ubicación
   - Haz click en "Ingresa tu ubicación" y selecciona comuna/región
   - O usa DevTools para ejecutar sin ubicación (verás N/A en stock/precio)

4. **Verificar cada selector:**

   **a) NAME — `#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > h1`**
   ```javascript
   document.querySelectorAll('#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > h1')
   // Debe retornar 1 elemento
   // Texto esperado: "Cemento especial 25 kg Polpaico" o similar
   ```

   **b) PRICE — `#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo > div.sc-1f784e80-0.bZLqYQ > div`**
   ```javascript
   document.querySelectorAll('#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo > div.sc-1f784e80-0.bZLqYQ > div')
   // Debe retornar 1 elemento
   // Texto esperado: "$ 5.510" o similar (solo si ubicación seleccionada)
   ```

   **c) PRICE_DISCOUNT — `#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo`**
   ```javascript
   document.querySelectorAll('#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo')
   // Puede retornar 0-N elementos
   ```

   **d) STOCK — `#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > div:nth-child(8) > dialog > div > div.sc-b9a1d677-3.kxmjzI > div > div > div > p`**
   ```javascript
   document.querySelectorAll('#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > div:nth-child(8) > dialog > div > div.sc-b9a1d677-3.kxmjzI > div > div > div > p')
   // Retornará valores si ubicación está seleccionada
   // Texto esperado: "Stock disponible" o modal de ubicación
   ```

   **e) CATEGORY — `#__next > main > main > div:nth-child(3) > div > div.sc-eb8d352a-0.dTMHsi > div > div:nth-child(4) > a > span`**
   ```javascript
   document.querySelectorAll('#__next > main > main > div:nth-child(3) > div > div.sc-eb8d352a-0.dTMHsi > div > div:nth-child(4) > a > span')
   // Debe retornar 1 elemento
   // Texto esperado: "Cementos Especiales" o categoría del producto
   ```

   **f) PAGINATION — `#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > div.sc-1f784e80-0.bZLqYQ > div > a`**
   ```javascript
   document.querySelectorAll('#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > div.sc-1f784e80-0.bZLqYQ > div > a')
   // En PDP retornará 0-1 (sin paginación)
   // En listados retornará N (links a otras páginas)
   ```

### Notas Importantes (Easy)
- **Ubicación obligatoria:** Easy oculta precios y stock hasta seleccionar ubicación.
- **Selectores generados:** Clases (sc-...) son generadas por framework CSS-in-JS. Pueden cambiar.
- **Modal de ubicación:** Aparece en startup si no hay ubicación guardada en localStorage.
- **Precio dinámico:** Varía por tienda/región elegida. Cada búsqueda puede mostrar valores distintos.

---

## 🏪 CONSTRUMART.CL

### Instrucciones paso a paso (Chrome DevTools)

1. **Abrir URL de producto:**
   ```
   https://www.construmart.cl/cemento-especial-saco-25-kg-san-juan-245005
   ```

2. **Abrir DevTools:** `F12` → Pestaña "Console"

3. **Seleccionar tienda/región (si es necesario):**
   - Construmart puede pedir seleccionar sucursal
   - Haz click en selector de tienda (normalmente arriba a la derecha)
   - Selecciona una en Valparaíso si aplica

4. **Verificar cada selector:**

   **a) NAME — `.product-name, h1`**
   ```javascript
   document.querySelectorAll('.product-name, h1')
   // Debe retornar 1+ elementos (busca .product-name primero, h1 fallback)
   // Texto esperado: "Cemento Especial Saco 25 kg San Juan" o similar
   ```

   **b) PRICE — `.price-container .price, .product-price`**
   ```javascript
   document.querySelectorAll('.price-container .price, .product-price')
   // Retornará 0-1 según si tienda está seleccionada
   // Texto esperado: "$X.XXX" o "Consultar precio"
   ```

   **c) PRICE_DISCOUNT — `.special-price .price`**
   ```javascript
   document.querySelectorAll('.special-price .price')
   // Puede retornar 0 (sin descuento) o 1 (con oferta)
   ```

   **d) STOCK — `.stock-info, .availability`**
   ```javascript
   document.querySelectorAll('.stock-info, .availability')
   // Debe retornar 1+ elementos
   // Texto esperado: "Sin Stock" o "X unidades disponibles"
   ```

   **e) CATEGORY — `.breadcrumb-item, .breadcrumbs li`**
   ```javascript
   document.querySelectorAll('.breadcrumb-item, .breadcrumbs li')
   // Retornará N elementos (path de categorías)
   // Ejemplo: ["Inicio", "Construcción", "Cementos"]
   ```

   **f) PAGINATION — `.pagination .next, a[rel="next"]`**
   ```javascript
   document.querySelectorAll('.pagination .next, a[rel="next"]')
   // En PDP retornará 0
   // En listados retornará 1 (botón siguiente)
   ```

### Notas Importantes (Construmart)
- **Selección de tienda:** Precio y stock varían por tienda. Requiere seleccionar sucursal.
- **Infinite scroll:** Algunos listados cargan infinitamente sin botón "Siguiente" tradicional.
- **Selectores genéricos:** Usa clases estándar (.product-name, .price-container). Más estables.
- **Breadcrumbs:** Cambia dinámicamente según categoría. Último item es la categoría actual.

---

## 📋 RESUMEN DE INTERACCIONES PREVIAS REQUERIDAS

| Tienda | Modal | Ubicación | Tienda/Sucursal | Efecto en Datos |
|--------|-------|-----------|-----------------|-----------------|
| **Sodimac** | ✅ Sí | ✅ Sí | ✅ Sí | Precio y stock varían |
| **Easy** | ❌ No | ✅ Sí | ❌ No | Stock y precio ocultos |
| **Construmart** | ❌ No | ❌ No | ✅ Sí | Precio y stock varían |

---

## ⚠️ ADVERTENCIAS IMPORTANTES

1. **Selectores frágiles:** Easy usa clases generadas (sc-...). Pueden cambiar con actualizaciones.
2. **Datos dinámicos:** Todos los sitios actualizan precios/stock en tiempo real.
3. **CAPTCHA:** Si aparece CAPTCHA, usar playwright-stealth en automatización.
4. **Rate limiting:** Sodimac puede bloquear tras múltiples requests. Agregar delays entre requests.

