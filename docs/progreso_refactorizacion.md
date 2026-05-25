# Progreso de Refactorización — SCRUM-118

## Estado Actual (23 de mayo 2026 — sesión final)

---

## 1. Motor de Costos (Backend Python/FastAPI) — ✅ COMPLETO

| Componente | Estado | Archivo |
|-----------|--------|---------|
| Endpoint `POST /api/simulacion/parametros` con geometría real | ✅ | `backend/main.py` |
| Perímetro, altura de muro, flag techumbre | ✅ | `backend/main.py` |
| Loop de cálculo con 5 familias constructivas | ✅ | `backend/main.py` |
| Soleras detectadas correctamente (nombre + descripción + "2x4") | ✅ FIX | `backend/main.py:586` |
| Techumbre completa (cerchas, zinc, aislación, MO) | ✅ | `backend/techumbre.py` |
| Costaneras pino 2x2 y tornillos techo golilla agregados | ✅ NUEVO | `backend/techumbre.py` |
| Complementos constructivos: clavos 3"+4", lana vidrio muro | ✅ NUEVO | `backend/main.py:749-795` |
| Dimensiones comerciales reales | ✅ | `backend/dimensiones_comerciales.py` |
| Columna `tienda` en respuesta InsumoCalculado | ✅ NUEVO | `backend/schemas.py`, `backend/main.py` |
| Columna `url_producto` en respuesta (link clickeable) | ✅ NUEVO | `backend/schemas.py`, `backend/main.py` |
| Columnas obsoletas eliminadas (habitaciones, baños, áreas comunes) | ✅ | `database/migrations/008` |

---

## 2. Scraper — SOLUCIÓN ENCONTRADA

### Intentos fallidos (documentados para referencia)

Los intentos 1-10 (HTTP directo, Playwright, undetected-chromedriver, APIs REST, PDP URLs, Google Shopping) **todos fallaron** porque Google, Sodimac y Easy bloquean acceso automatizado con reCAPTCHA y fingerprinting. Incluso Playwright con navegador visible fue bloqueado.

### Solución: SerpAPI (Google Shopping API)

| Componente | Estado | Archivo |
|-----------|--------|---------|
| SerpAPI Google Shopping scraper | ✅ | `scraper/serpapi_scraper.py` |
| Cobertura: 33/34 insumos (91%) | ✅ | Primera ejecución |
| Fallback prices para el 9% restante | ✅ | `scraper/fallback_prices.py` |
| Integración en main.py (pipeline) | ✅ | `scraper/main.py` |
| API key configurada en docker-compose | ✅ | `docker-compose.yml` |

**SerpAPI** es un servicio pago que maneja CAPTCHAs, proxies y renderizado JS. Retorna JSON estructurado con nombre, precio, tienda y URL de producto desde Google Shopping. Free tier: 100 búsquedas/mes (suficiente para sembrar 34 insumos).

### Pipeline de scraping actual

```
SerpAPI (Google Shopping) ──→ insertar_precios() → precio_mercado
Fallback prices            ──→ (solo insumos sin cobertura)
```

### Bugs del scraper corregidos

| Bug | Fix | Archivo |
|-----|-----|---------|
| `KeyError: 'precio_descuento'` | `precio_descuento: None` en todos los dicts fuente | `base_scraper.py`, `easy_scraper.py`, `construmart_scraper.py` |
| Fuzzy normalizer rechazaba dimensiones reordenadas (60x38 ≠ 38x60) | Normalización ordenando números en medidas NxM | `scraper/normalizer.py` |
| Regex `_RE_DIMENSION` capturaba `"2.5m"` en vez de `"2.5mm"` | Reordenar alternancia: `mm` antes que `m` | `scraper/normalizer.py` |
| `_build_dim_map` no aceptaba unidades mayúsculas | Agregar `re.IGNORECASE` | `scraper/normalizer.py` |

---

## 3. Base de Datos — Migraciones

| Migración | Descripción | Estado |
|-----------|-------------|--------|
| 007 | Agregar columnas geométricas | ✅ Ejecutada |
| 008 | Eliminar columnas obsoletas de recintos | ✅ Ejecutada |
| 009 | Expandir CHECK de Tienda en precio_mercado | ✅ Ejecutada |
| 010 | **Corregir Matriz_Rendimiento con IDs reales** | ✅ Ejecutada |
| 011 | **Expandir CHECK de Unidad_Medida + unidades comerciales** | ✅ Ejecutada |

### Corrección crítica: Matriz de Rendimiento (010)

El `init.sql` insertaba Perfiles y Tornillos en Obra Gruesa **antes** de Terminaciones, desplazando todos los IDs. La matriz referenciaba IDs que no coincidían con los insumos reales (ej. Madera usaba Perfil C en vez de Pino 2x3). La migración 010 borró la matriz incorrecta y la reconstruyó con IDs verificados.

### Unidades comerciales reales (011)

| Antes | Ahora |
|-------|-------|
| `unidad` | `pieza 3.2m` |
| `plancha` | `plancha 1.22x2.44m` |
| `caja` | `caja 100un` |
| `kg` | `barra 6m` |
| `litro` | `galon 4L` |
| `metro lineal` | `rollo 100m` / `tubo 3m` |

---

## 4. Frontend (Vue.js + Three.js) — ✅ COMPLETO

| Componente | Estado |
|-----------|--------|
| BudgetBreakdownPanel envía geometría real en POST | ✅ |
| Columna **Tienda** con badge (verde=scrapeado, ámbar=referencia) | ✅ NUEVO |
| Tienda es link clickeable a producto original | ✅ NUEVO |
| Unidades comerciales reales visibles en desglose | ✅ NUEVO |
| Techumbre 3D (techo a dos aguas sobre el último piso) | ✅ NUEVO |
| Techo usa bounding box de meshes de piso (posición exacta) | ✅ NUEVO |
| Techumbre siempre activa (sin toggle) | ✅ |
| Sin conteos de habitaciones/baños/áreas comunes | ✅ |
| i18n expandido con +50 claves | ✅ |
| PDF/Excel/CSV export | ✅ |

### Techo 3D (`Scene3D.vue:syncRoof`, `SceneManager.js:roofGroup`)

- Gable roof con 4 caras (2 vertientes inclinadas + 2 gabletes)
- Pendiente 18% (plana, realista para Chile)
- Siempre en el piso más alto ocupado
- Color marrón teja (`0x8B4513`) con `DoubleSide`
- Se actualiza automáticamente al cambiar recintos

---

## 5. Lista de Materiales — Madera 80m² (resultado final)

```
Obra Gruesa              $1,220,726   Pino 2x3 (109), Pino 2x4 (53), Terciado (32), Tornillos
Terminaciones            $194,850     Volcanita RH Standard (15)
Instalaciones            $175,950     Cable 2.5mm (3), Tubo PVC 75mm (2)
O.G. Complementos        $152,900     Clavos 3" (7 cajas), Clavos 4" (2), Lana vidrio muro (6)
Techumbre Estructura     $261,000     16 cerchas pino 2x4
Techumbre Cubierta       $986,800     Zinc (44), Costaneras 2x2 (69), Tornillos techo (4), Lana techo (6)
Techumbre MO             $3,213,000   378 HH
────────────────────────────────────
TOTAL                    $6,205,226
```

17 ítems en 7 categorías. Materiales con trazabilidad completa: tienda de origen, link al producto, unidad comercial real.

---

## 6. Resumen Final

| Área | Estado |
|------|--------|
| Backend (motor costos) | ✅ Listo. Soleras, complementos, tienda+URL. |
| Scraper | ✅ SerpAPI 91% + fallback 9%. Pipeline funcional. |
| Frontend (Vue + 3D) | ✅ Techo 3D, columna Tienda clickeable, unidades reales. |
| Base de datos | ✅ 5 migraciones ejecutadas. Matriz e IDs corregidos. |

### Archivos modificados en esta sesión

| Archivo | Cambio |
|---------|--------|
| `backend/main.py` | Solera detection fix, tracking studs/soleras, complementos, tienda+url |
| `backend/techumbre.py` | Costaneras pino 2x2, tornillos techo, tienda en items |
| `backend/schemas.py` | Campos `tienda` y `url_producto` en InsumoCalculado |
| `scraper/base_scraper.py` | `precio_descuento` en _http_search y _uc_search |
| `scraper/easy_scraper.py` | `precio_descuento` en _scrape_search_results |
| `scraper/construmart_scraper.py` | `precio_descuento` en ambos paths |
| `scraper/normalizer.py` | Fix dimensiones reordenadas, regex mm antes de m, IGNORECASE |
| `scraper/serpapi_scraper.py` | **NUEVO**: SerpAPI Google Shopping scraper |
| `scraper/fallback_prices.py` | IDs corregidos al orden real de la DB |
| `scraper/main.py` | Pipeline: SerpAPI + fallback + tracking insumos cubiertos |
| `scraper/db.py` | Client encoding fix para conexión PostgreSQL |
| `frontend/.../Scene3D.vue` | syncRoof: techo 3D a dos aguas |
| `frontend/.../SceneManager.js` | roofGroup en buildingGroup |
| `frontend/.../BudgetBreakdownPanel.vue` | Columna Tienda con link clickeable |
| `database/migrations/009_*.sql` | **NUEVO**: Expandir CHECK tienda |
| `database/migrations/010_*.sql` | **NUEVO**: Corregir matriz de rendimiento |
| `database/migrations/011_*.sql` | **NUEVO**: Unidades comerciales reales |
| `docker-compose.yml` | Variable SERPAPI_KEY |

---

## 7. Capas Constructivas 3D (T12.2) — ✅ COMPLETO (23-25 mayo 2026)

Implementación del motor de visibilidad por capas en el modelo 3D con meshes independientes por capa constructiva, posicionamiento realista y texturas diferenciadas.

### Arquitectura multi-capa de muros

Cada muro es un `THREE.Group` con hijos independientes al ras de los pies derechos:

| Capa | Descripción | Tipo de muro |
|------|-------------|-------------|
| `structure` | Pies derechos cada 40cm (41x65mm), soleras, riostras diagonales c/4 vanos. Vanos reales para puertas (sin studs) y ventanas (cripple studs). | Todos |
| `insulation` | Batts individuales de fibra de vidrio rosa entre cada par de pies derechos. Divididos arriba/abajo en vanos con ventana. | Solo exterior |
| `interior` | Planchas de vulcanita 1.22x2.44m con juntas visibles entre paneles y junta horizontal a media altura. | Todos |
| `facade` | Tablones horizontales individuales con sombra (madera/vinilo) o panel sólido (ladrillo/hormigón). | Solo exterior |
| `installations` | Tuberías agua fría (azul), caliente (roja), desagüe (gris). | Solo muros adyacentes a baños |

### Cambios realizados

| Archivo | Cambio |
|---------|--------|
| `frontend/.../WallBuilder.js` | **REESCRITO**: `buildMultiLayerWall()` con posicionamiento realista. Paneles al ras de cara de studs (no flotando). Stud frame con riostras, cripple studs, pies derechos insetados en extremos. Aislación como batts individuales entre studs. Interior como planchas con juntas. Fachada con tablones individuales. |
| `frontend/.../Scene3D.vue` | `syncWalls()` usa `buildMultiLayerWall()`. `applyLayerVisibility()` con GSAP. Dropdown de capas integrado en toolbar derecha. Pisos siempre visibles. Removidos: slider sol, auto-tour, clonar piso. Export: solo PNG 4K y Visor HTML standalone. |
| `frontend/.../MaterialLibrary.js` | Texturas procedurales: madera con vetas/anillos/nudos, fibra vidrio rosa con textura fibrosa. Método `getLayerMaterial(type, layer)`. |
| `frontend/.../SceneExporter.js` | `exportHTML()`: genera visor 3D standalone con OrbitControls, sombras, toolbar. Modelo embebido como GLB base64. |

### Toolbar final del visor 3D
```
Capas | Muebles | Sección | Walkthrough | Exportar | Centrar | Fullscreen
```

### Exportar
- **Imagen PNG**: captura 4K del viewport actual
- **Visor HTML**: archivo .html autónomo con modelo 3D interactivo (Three.js CDN, orbit controls, vistas predefinidas)

### Funcionamiento

1. **Modo construcción OFF**: Todos los hijos visibles — muro completo.
2. **Modo construcción ON**: Cada hijo responde a su toggle en el dropdown de capas.
3. **Transiciones**: GSAP fade-in 350ms / fade-out 250ms.
4. **Instalaciones**: Solo muros con recinto adyacente tipo `banio`. Habitaciones normales sin tuberías.
5. **Volumen base**: Pisos de recintos (`layerTags = []`) siempre visibles.

### Criterios de aceptación T12.2

- [x] Al desactivar una capa, los objetos desaparecen del visor 3D
- [x] Al reactivar, reaparecen sin afectar otras capas
- [x] Transición animada sin parpadeos
- [x] Modelo base (volumen del recinto) siempre visible
- [x] Al reactivarla, reaparecen. Las demás capas no se ven afectadas
- [x] La transición entre estados es animada (GSAP opacity) y sin parpadeos
- [x] El modelo base (volumen del recinto) siempre permanece visible
