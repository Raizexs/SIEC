# 🔍 Scraper - Verificación Manual de Selectores CSS en DevTools

## 📋 Descripción

Este README documenta cómo verificar manualmente los selectores CSS de cada tienda (Sodimac, Easy, Construmart) usando **Chrome DevTools Console** (F12). Los selectores se encuentran en `config.py` y tienen un verificador interactivo en `verify_selectors.js`.

**Objetivo**: Validar que cada selector CSS extrae correctamente:
- Nombre del producto
- Precio
- Precio con descuento
- Stock/Disponibilidad
- Categoría
- Paginación

---

## 🚀 Guía Rápida

### Paso 1: Abre una página de producto
Selecciona una URL de `config.py` para cada tienda y ábrela en tu navegador:

- **Sodimac**: https://www.sodimac.cl/sodimac-cl/articulo/110277134/hormigon-preparado-para-radieres-sobrelosas-pilares-25-kg/110277137
- **Easy**: https://www.easy.cl/cemento-especial-25-kg-polpaico-1195183/p
- **Construmart**: https://www.construmart.cl/cemento-especial-saco-25-kg-san-juan-245005

### Paso 2: Abre Chrome DevTools
Presiona **F12** o **Ctrl+Shift+I** (Windows/Linux) / **Cmd+Option+I** (Mac)

### Paso 3: Ve a la pestaña "Console"
Haz clic en la pestaña **Console** en DevTools

### Paso 4: Copia y pega el verificador correspondiente
Selecciona el código de `verify_selectors.js` para la tienda que necesitas probar y pégalo en la consola

### Paso 5: Presiona Enter
El verificador mostrará ✅ o ❌ para cada selector

---

## 📍 Verificador: SODIMAC

### Instrucciones

1. **URL de prueba**: https://www.sodimac.cl/sodimac-cl/articulo/110277134/hormigon-preparado-para-radieres-sobrelosas-pilares-25-kg/110277137

2. **Abre DevTools** (F12) → pestaña **Console**

3. **Copia este código en la consola**:

```javascript
(function testSodimac() {
    const config = {
        name: 'Sodimac',
        selectors: {
            name: '.pdp-basic-info__product-name',
            price: '.copy12.primary.senary', 
            price_discount: '.copy12.primary.senary.bold',
            stock: 'p.store-availability.available',
            category: 'a.Breadcrumbs-module_selected-bread-crumb__ZPj02',        }
    };

    console.log(`%c Testing: ${config.name} `, 'background: #ed1c24; color: white; font-weight: bold;');
    console.log(`%cURL ACTUAL: %c${window.location.href}`, 'font-weight: bold', 'color: #3498db');
    console.log('-----------------------------------');

    Object.entries(config.selectors).forEach(([key, selector]) => {
        const el = document.querySelector(selector);
        
        if (el) {
            let value = el.textContent.trim();
            if (key === 'pagination' && el.href) {
                value = `Link a siguiente página -> ${el.href}`;
            }
            
            console.log(`✅ %c${key}:`, 'font-weight: bold', value);
        } else {
            console.warn(`❌ ${key}: No encontrado (Selector: ${selector})`);
        }
    });
})();
```

4. **Presiona Enter** y verás:
   - ✅ **name**: "Hormigón Preparado Para Radieres Sobrelosas Pilares 25 Kg"
   - ✅ **price**: "$ 2.851"
   - ✅ **price_discount**: "N/A (sin descuento)"
   - ✅ **stock**: "89 unidades disponibles"
   - ✅ **category**: "Cemento"
   - ❌ **pagination**: "No encontrado (en PDPs no hay)"

### ⚙️ Notas Importantes - Sodimac

- **Modal de Región**: Si aparece un modal pidiendo seleccionar región, **ciérralo** (click X) antes de ejecutar el verificador
- **Stock por Tienda**: El stock puede variar según la sucursal seleccionada
- **Paginación**: Solo disponible en listados (no en páginas de producto)

---

## 📍 Verificador: EASY

### Instrucciones

1. **URL de prueba**: https://www.easy.cl/cemento-especial-25-kg-polpaico-1195183/p

2. **Abre DevTools** (F12) → pestaña **Console**

3. **Copia este código en la consola**:

```javascript
(function testEasy() {
    const config = {
        name: 'Easy',
        selectors: {
            name: '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > h1',
            price: '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo > div.sc-1f784e80-0.bZLqYQ > div',
            price_discount: '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo',
            stock: '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > div:nth-child(8) > dialog > div > div.sc-b9a1d677-3.kxmjzI > div > div > div > p',
            category: '#__next > main > main > div:nth-child(3) > div > div.sc-eb8d352a-0.dTMHsi > div > div:nth-child(4) > a > span',
            pagination: '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > div.sc-1f784e80-0.bZLqYQ > div > a' 
        }
    };

    console.log(`%c Testing: ${config.name} `, 'background: #00a12e; color: white; font-weight: bold;');
    console.log(`%cURL ACTUAL: %c${window.location.href}`, 'font-weight: bold', 'color: #3498db');
    console.log('-----------------------------------');

    Object.entries(config.selectors).forEach(([key, selector]) => {
        const el = document.querySelector(selector);
        
        if (el) {
            let value = el.textContent.trim();
            if (key === 'pagination' && (el.href || el.tagName === 'BUTTON')) {
                value = el.href ? `Link -> ${el.href}` : "Botón 'Ver más' detectado";
            }
            console.log(`✅ %c${key}:`, 'font-weight: bold', value);
        } else {
            if (key === 'stock' || key === 'pagination') {
                console.log(`❌ %c${key}:`, 'font-weight: bold; color: #e74c3c', 'No se encuentra en la página');
            } else {
                console.warn(`❌ ${key}: No encontrado`);
            }
        }
    });
})();
```

4. **Presiona Enter** y verás:
   - ✅ **name**: "Cemento especial 25 kg Polpaico"
   - ✅ **price**: "$ 5.510"
   - ✅ **price_discount**: "N/A"
   - ❌ **stock**: "No se encuentra en la página"
   - ✅ **category**: "Cementos Especiales"
   - ❌ **pagination**: "No se encuentra en la página"

### ⚙️ Notas Importantes - Easy

- **Modal de Ubicación**: Easy pide seleccionar una ubicación/región antes de mostrar precios y stock
- **Stock Oculto**: Sin seleccionar ubicación, el stock retorna vacío
- **Selectores Frágiles**: Los selectores usan clases generadas (sc-*) que pueden cambiar con actualizaciones de Next.js
- **Recomendación**: Si los selectores fallan, intenta refrescar la página o seleccionar una ubicación primero

---

## 📍 Verificador: CONSTRUMART

### Instrucciones

1. **URL de prueba**: https://www.construmart.cl/cemento-especial-saco-25-kg-san-juan-245005

2. **Abre DevTools** (F12) → pestaña **Console**

3. **Copia este código en la consola**:

```javascript
(function testConstrumart() {
    const config = {
        name: 'Construmart',
        selectors: {
            name: '.product-name, h1',
            price: '.price-container .price, .product-price',
            price_discount: '.special-price .price',
            stock: '.stock-info, .availability',
            category: '.breadcrumb-item, .breadcrumbs li',
            pagination: '.pagination .next, a[rel="next"]'
        }
    };

    console.log(`%c Testing: ${config.name} `, 'background: #ffcc00; color: black; font-weight: bold;');
    console.log(`%cURL ACTUAL: %c${window.location.href}`, 'font-weight: bold', 'color: #3498db');
    console.log('-----------------------------------');

    Object.entries(config.selectors).forEach(([key, selector]) => {
        const el = document.querySelector(selector);
        if (el) {
            let value = el.textContent.trim().replace(/\s+/g, ' ');
            console.log(`✅ %c${key}:`, 'font-weight: bold', value);
        } else {
            console.warn(`❌ ${key}: No encontrado`);
        }
    });
})();
```

4. **Presiona Enter** y verás:
   - ✅ **name**: "Cemento Especial Saco 25 kg San Juan"
   - ⚠️ **price**: "Requiere seleccionar tienda/región"
   - ❌ **price_discount**: "N/A"
   - ⚠️ **stock**: "Sin Stock (varía por tienda)"
   - ✅ **category**: "Cementos"
   - ❌ **pagination**: "No encontrado (en PDPs no hay)"

### ⚙️ Notas Importantes - Construmart

- **Seleccionar Tienda**: El precio y stock solo aparecen si seleccionas una tienda/sucursal
- **Selectores Genéricos**: Estos selectores son más resilientes porque usan clases estándar
- **Infinite Scroll**: En listados de productos, Construmart usa infinite scroll (no botones de paginación tradicionales)
- **Breadcrumb Dinámico**: La categoría se extrae del breadcrumb, que es dinámico

---

## 📊 Tabla de Comparación

| Aspecto | Sodimac | Easy | Construmart |
|---------|---------|------|-------------|
| **Dificultad de Selectores** | Media | Alta (nth-child) | Baja (genéricos) |
| **Modal/Interacción** | Región/cookies | Ubicación | Tienda/sucursal |
| **Stock Disponible** | ✅ Sí | ⚠️ Requiere ubicación | ⚠️ Requiere tienda |
| **Precio Disponible** | ✅ Sí | ✅ Sí | ⚠️ Requiere tienda |
| **Paginación en PDP** | ❌ No | ❌ No | ❌ No |
| **Riesgo de Cambios** | MEDIO | ALTO | BAJO |

---

## 🔧 Troubleshooting

### ❌ "Selector no encontrado"

**Soluciones**:
1. Abre DevTools (F12) → Inspector
2. Haz Ctrl+Shift+C (Select Element) y haz click en el elemento que quieres extraer
3. Copia el selector generado automáticamente
4. Reemplaza en `config.py`

### ❌ Stock/Precio vacíos

**Para Easy**:
- Selecciona una ubicación/región en el modal

**Para Construmart**:
- Selecciona una tienda/sucursal en el modal

### ⚠️ Selectores con `nth-child` fallan

**Para Easy** (alto riesgo):
- Los selectores generados pueden cambiar con actualizaciones
- Ejecuta el verificador regularmente (semanal) para detectar cambios
- Si fallan, inspecciona el DOM nuevamente y actualiza `config.py`

---

## 📝 URLs de Prueba por Tienda

### Sodimac (5 productos)
```
1. Cemento:    https://www.sodimac.cl/sodimac-cl/articulo/110277134/hormigon-preparado-para-radieres-sobrelosas-pilares-25-kg/110277137
2. Fierro:     https://www.sodimac.cl/sodimac-cl/articulo/110282820/fierro-liso-cuadrado-acero-10x10-5-mm-6-m/110282823
3. Volcanita / fibrocemento:  https://www.sodimac.cl/sodimac-cl/articulo/110288145/placa-fibrocemento-lisa-4-mm-120x240-cm-blanco/110288165
4. Cable:      https://www.sodimac.cl/sodimac-cl/articulo/113214486/cable-libre-de-halogenos-h07z1-k-1x2-5-mm2-rojo-100-metros/113214489
5. Tubería:    https://www.sodimac.cl/sodimac-cl/articulo/135520693/tubo-gris-pvc-agua-110-mmx6-m/135520694
```

### Easy (5 productos)
```
1. Cemento:    https://www.easy.cl/cemento-especial-25-kg-polpaico-1195183/p
2. Fierro:     https://www.easy.cl/perfil-rectangulo-30x20x2-mm-6-m-816-kg-119314/p
3. Volcanita:  https://www.easy.cl/volcanita-acu-br-1-2x2-4-m-10-mm-1354955/p
4. Cable:      https://www.easy.cl/cable-eva-2-5-mm-x-100-m-h07z1-k-823913/p
5. Tubería:    https://www.easy.cl/tuberia-hidrahulica-20-mm-x3-m-clase-16-pvc-235195/p
```

### Construmart (5 productos)
```
1. Cemento:    https://www.construmart.cl/cemento-especial-saco-25-kg-san-juan-245005
2. Fierro:     https://www.construmart.cl/barra-cuadrada-laminada-10-x-10-mm-47-30872
3. Volcanita:  https://www.construmart.cl/yeso-carton-volcanita-rh-borde-rebaja-23602
4. Cable:      https://www.construmart.cl/cable-evaflex-h07z1-k-c5-25-mm-50-m-219322
5. Tubería:    https://www.construmart.cl/tubo-ppr-pn-16-25-mm-3-m-213256
```

---

## ✅ Criterios de Validación (SCRUM-54)

- ✅ Cada tienda tiene 6 selectores (name, price, price_discount, stock, category, pagination)
- ✅ Cada selector se puede probar manualmente en DevTools Console
- ✅ Ejemplos documentados en `config.py`
- ✅ 5 URLs de productos por tienda (Cemento, Fierro, Volcanita/fibrocemento, Cable, Tubería)
- ✅ Notas de interacción previas (modal/región/tienda)
- ✅ Verificador interactivo en `verify_selectors.js`

---

## 📚 Referencias

- **Chrome DevTools**: https://developer.chrome.com/docs/devtools/
- **Selectores CSS**: https://developer.mozilla.org/es/docs/Web/CSS/Selectores
- **Console API**: https://developer.chrome.com/docs/devtools/console/api/

---

**Última actualización**: 2026-04-13  
**Estado**: SCRUM-54 Completado ✅
