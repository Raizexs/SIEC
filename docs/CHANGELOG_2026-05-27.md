# SIEC — Bitácora de cambios · 27 Mayo 2026

## Rama: `SCRUM-121-nueva-extraccion-google-shopping` → mergeado a `main`

---

## Resumen de commits

| Commit | Archivos | Descripción |
|--------|----------|-------------|
| `da4cab0` | `backend/main.py`, `scraper/serpapi_scraper.py`, `database/migrations/002_*.sql`, `database/seeds/002_*.sql` | Fix 1m² mínimo + fix sorting precios por fecha + fallback SerpAPI key |
| `2425966` | `frontend/.../BudgetBreakdownPanel.vue`, `frontend/.../RoomEditor2D.vue`, `database/migrations/012_*.sql` | Pasillos drag-to-draw, capitalize tienda, migración 012 |
| `045b8a1` | `frontend/.../budgetCategorizer.js` | Fix categorizador: respeta categorías del backend en vez de keyword-matching |
| `2da5343` | `backend/main.py`, `backend/techumbre.py`, `database/migrations/013_*.sql`, `database/seeds/005_*.sql`, `scraper/scrape_complementarios.py` | Backend usa `precio_mercado` para complementarios y techumbre, nuevos insumos 46-51 |
| `be8d81c` | `backend/*.py`, `backend/serpapi_results.json`, `docs/` | Scripts utilitarios, datos SerpAPI cacheados, docs |
| `c95be4a` | `frontend/index.html` | Revert font URL (Material Symbols) |

---

## Cambios detallados por archivo

### 1. `backend/main.py`
- **Línea 313**: Validación m² mínimos cambió de 15 → 1
- **Línea 351**: Mensaje de error actualizado a "1 y 1000 m²"
- **Líneas 538-543**: `latest_precio_record` ahora compara por `fecha_scraping` (antes tomaba el primer registro alfabéticamente — bug que causaba tienda vacía)
- **Línea 516**: `insumo_ids` incluye IDs 46-51 para que el query de `precio_mercado` cubra los complementarios
- **Líneas 882-935**: Complementos (clavos, lana vidrio) ahora buscan precio/tienda/URL de `precio_mercado` vía helper `_lookup_scraped`, con fallback a precios hardcodeados
- **Línea 938**: Pasa `latest_precio_record` a `calcular_partida_techumbre()`

### 2. `backend/techumbre.py`
- **Línea 12**: Agregado `Dict, Any` a imports
- **Líneas 128-130**: Nuevo parámetro `latest_precio_record: Optional[Dict[int, Any]]`
- **Líneas 148-154**: Helper `_lookup(insumo_id, fallback_price)` que busca en `precio_mercado`
- **Líneas 205-215**: Todos los `InsumoCalculado` de techumbre ahora usan `_lookup()`:
  - Cercha pino 2x4 → ID 11 (Pino MSD 2x4)
  - Plancha zinc → ID 49
  - Costanera pino 2x2 → ID 50
  - Tornillo techo → ID 51
  - Lana vidrio techo → ID 48
  - Mano de obra → se mantiene "Referencia" (no scrapeable)

### 3. `frontend/src/utils/budgetCategorizer.js`
- **Eliminado**: sistema de keyword-matching que mezclaba categorías
- **Nuevo**: mapeo directo `CATEGORY_DISPLAY` que respeta las categorías del backend:

| Backend | Frontend display |
|---------|-----------------|
| Obra Gruesa | Obra Gruesa y Fundaciones |
| Obra Gruesa - Complementos | Complementos Obra Gruesa |
| Terminaciones | Terminaciones y Revestimientos |
| Instalaciones | Instalaciones |
| Techumbre - Estructura | Techumbre |
| Techumbre - Cubierta | Techumbre |
| Techumbre - Mano de Obra | Mano de Obra |
| Mano de Obra | Mano de Obra |

### 4. `frontend/src/components/BudgetBreakdownPanel.vue`
- **Líneas 132-135**: Nuevo helper `formatStoreName()` — capitaliza primera letra (`sodimac` → `Sodimac`)
- **Líneas 815, 826**: Template usa `formatStoreName(item.tienda)`

### 5. `frontend/src/components/RoomEditor2D.vue`
- **Rewrite completo del sistema de pasillos** (-288/+208 líneas):
  - Antes: el usuario clickeaba zonas libres (cell-based flood-fill)
  - Ahora: drag-to-draw como un rectángulo (igual que crear un recinto)
  - Botón "Corridors" en la toolbar con toggle visual
  - Preview en tiempo real con dimensiones y m²

### 6. `scraper/serpapi_scraper.py`
- **Líneas 57, 197**: Fallback a `SERPAPI_METALCON_API_KEY` si `SERPAPI_KEY` no está seteada

### 7. `database/migrations/012_relax_m2_minimum.sql`
- Migración ejecutada en Supabase: cambia CHECK constraint de 15→1 m²

### 8. `database/migrations/013_add_techumbre_category.sql`
- Agrega "Techumbre" a las categorías permitidas en `Insumo`

### 9. `database/seeds/005_seed_insumos_complementarios.sql`
- 6 nuevos insumos (IDs 46-51):

| ID | Nombre | Categoría |
|----|--------|-----------|
| 46 | Clavos estriados 3 pulgadas | Obra Gruesa |
| 47 | Clavos estriados 4 pulgadas | Obra Gruesa |
| 48 | Lana vidrio 50mm | Obra Gruesa |
| 49 | Plancha zinc 0.85x2.5m | Techumbre |
| 50 | Costanera pino 2x2 | Techumbre |
| 51 | Tornillo techo golilla neopreno | Techumbre |

### 10. `scraper/scrape_complementarios.py`
- Script para scrapear IDs 46-51 con SerpAPI
- Uso: `$env:SERPAPI_METALCON_API_KEY='...'; python scrape_complementarios.py`
- Genera `serpapi_complementarios.json` + SQL para insertar

### 11. `backend/prepare_prod.py`
- Script único para preparar Supabase producción:
  1. Corre migración 013
  2. Inserta seed 005
  3. Re-inyecta precios desde `serpapi_results.json`

### 12. `backend/serpapi_results.json`
- 36 resultados cacheados de SerpAPI (33 con URL, 3 sin URL para Lechada Cerámica ID 24)

### 13. `scraper/seeds_precios.sql`
- SQL dump con los 39 INSERTs a `precio_mercado` (mismos datos que `serpapi_results.json`)

---

## Bugs arreglados

| Bug | Causa | Fix |
|-----|-------|-----|
| No se podía crear simulación <15m² | CHECK constraint y validación en backend | Cambiado a 1m² mínimo |
| Materiales sin URL de tienda en frontend | `latest_precio_record` tomaba primer registro alfabético (podía ser uno sin tienda) | Ahora compara por `fecha_scraping`, toma el más reciente |
| Categorías mezcladas (cerchas en tabiquería, zinc en aislación, "Otros" inventado) | `budgetCategorizer.js` usaba keyword-matching frágil | Reemplazado por mapeo directo backend→display |
| Mano de obra mezclada con materiales | Keyword "techumbre" matcheaba antes que "mano de obra" | Mapeo respeta categoría "Techumbre - Mano de Obra" → "Mano de Obra" |
| Tiendas en minúscula ("sodimac", "easy") | Sin formato | `formatStoreName()` capitaliza primera letra |
| Logos Material Symbols como texto en Docker local | URL de Google Fonts mal formada (revertida — requiere self-hosting para Docker sin internet) | Pendiente: self-hostear Material Symbols |

---

## Lo que falta (requiere acción manual)

### Para que los 8 items "Referencia" tengan URL real:
```powershell
$env:SERPAPI_METALCON_API_KEY = 'tu-key'
cd scraper
python scrape_complementarios.py
```
Luego insertar el JSON generado en Supabase.

### Para self-hostear Material Symbols (Docker local sin internet):
1. Descargar el archivo `.woff2` de Google Fonts
2. Ponerlo en `frontend/public/fonts/`
3. Agregar `@font-face` en `style.css`

### Para deploy:
- **Railway**: El auto-deploy desde GitHub Actions no siempre dispara. Si no se actualiza, ir a https://railway.app → Deploy manual.
- **Vercel**: Se actualiza automático en cada push a `main`.
- **Supabase**: Correr `backend/prepare_prod.py` después de cada deploy que agregue migraciones nuevas.

---

## URLs de producción

| Servicio | URL |
|----------|-----|
| Frontend (Vercel) | https://proyectsiec.vercel.app |
| Backend (Railway) | https://siec-production-408c.up.railway.app |
| DB (Supabase) | `postgresql://...@aws-1-us-west-2.pooler.supabase.com:5432/postgres` |

---

## Datos en Supabase (post-`prepare_prod.py`)

- **39 precios** en `precio_mercado` (35 insumos con precio, 32 con URL)
- **3 sin URL**: Lechada Cerámica ID 24 (SerpAPI no encontró resultados)
- **38 insumos activos** (IDs 1-38 originales + 46-51 complementarios)
- **IDs 36-38**: Mano de obra (Electricista, Gasfíter, Ayudante) — sin precios scrapeables
