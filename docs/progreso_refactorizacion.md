# Progreso de Refactorización — SCRUM-118

## Estado Actual (22 de mayo 2026)

---

## 1. Motor de Costos (Backend Python/FastAPI)

### ✅ Logrado

| Componente | Estado | Archivo |
|-----------|--------|---------|
| Endpoint `POST /api/simulacion/parametros` con geometría real | ✅ | `backend/main.py:241` |
| Perímetro (`perimetro_ml`) y altura de muro (`altura_muro_m`) como campos obligatorios | ✅ | `backend/main.py:228-229` |
| Flag `incluir_techumbre` para activar techumbre en cotización | ✅ | `backend/main.py:230` |
| Refactor del loop de cálculo con 5 familias constructivas | ✅ | `backend/main.py:568-654` |
| Techumbre completa generada dinámicamente (cerchas, zinc, aislación, MO) | ✅ | `backend/techumbre.py` |
| Dimensiones comerciales reales (OSB 1.22×2.44m, pino 3.2m, zinc 1×3m, etc.) | ✅ | `backend/dimensiones_comerciales.py` |
| Roles "architect" eliminados de toda la lógica | ✅ | `backend/auth.py`, `backend/models.py` |
| Columnas obsoletas (habitaciones, baños, áreas comunes) eliminadas | ✅ | `database/migrations/008_drop_recinto_counts.sql` |
| Columnas geométricas agregadas a la DB | ✅ | `database/migrations/007_add_geometria_simulacion.sql` |
| Filtro dimensional post-match en fuzzy normalizer | ✅ | `scraper/normalizer.py:50-100` |
| Umbral de fuzzy matching calibrado a 75 | ✅ | `scraper/normalizer.py:21` |

### Familias Constructivas (cálculo geométrico real)

| Familia | Detecta | Cálculo |
|---------|---------|---------|
| `estructura_muro` | solera, montante, pie derecho, 2x3/2x4/2x6, perfiles metalcon | Soleras: `ceil(perim × 2 / largo)` × 2. Pie derechos: `ceil(perim / 0.40) + 4`. Ambos × 1.15 merma |
| `revestimiento_muro` | siding, OSB, yeso cartón, fibrocemento, terciado, tabiquería | `ceil(area_muro / area_placa) × 1.10` |
| `techumbre` | zincalum, cubierta, cielo, aislación | `factor_DB × (m2_totales × 1.15)` + nesting |
| `losa_hormigon` | gravilla, arena, cemento (Obra Gruesa) | `factor × 0.1(losa 10cm) [/1600 si áridos] [/25 si cemento]` |
| `generico` | todo lo demás | Cálculo original: `factor_DB × area_neta` + nesting |

---

## 2. Scraper (Python/Playwright)

### ❌ Problema Principal

Sodimac y Easy **bloquean activamente cualquier automatización**. El servidor siempre devuelve el homepage en vez de resultados de búsqueda, independientemente del método usado:

| Método Probado | Resultado |
|----------------|-----------|
| HTTP directo + JSON-LD | ❌ Sin productos |
| Playwright Chromium + stealth | ❌ Homepage |
| Playwright Firefox + stealth manual | ❌ Homepage |
| undetected-chromedriver | ❌ Homepage |
| API directa REST | ❌ Sin respuesta |

### ✅ Lo que SÍ funciona

- **Construmart**: búsqueda HTTP + JSON-LD funciona perfectamente (sirven datos server-side)
- **Sodimac PDP URLs**: Las URLs directas de producto (PDP) tienen JSON-LD con precios. El scraper actualizado usa `scrape()` con 33 PDP URLs hardcodeadas.
- **Mapeo de insumo_id**: Tabla de 64 entradas en `base_scraper.py` con sinónimos para cada producto.

### Pendiente: Verificar PDP URLs

El cambio a PDP URLs está commiteado pero **no probado**. Se necesita:

```bash
docker compose down scraper
docker compose build --no-cache scraper
docker compose run --rm -v "C:\Users\andre\Documents\VSC Projects\SIECres\scraper:/app" scraper python test_search.py sodimac
```

Esto probará la primera PDP URL de la lista y dirá si extrajo nombre + precio correctamente.

---

## 3. Frontend (Vue.js)

### ✅ Logrado

| Componente | Estado |
|-----------|--------|
| BudgetBreakdownPanel envía geometría real en POST | ✅ |
| Techumbre siempre activa (sin toggle) | ✅ |
| Sin conteos de habitaciones/baños/áreas comunes | ✅ |
| Sin selector de snap en 2D y 3D | ✅ |
| Sin botón pasillos en 2D y 3D | ✅ |
| Sin plantillas en sidebar | ✅ |
| Sin botón compartir ni exportar en topbar | ✅ |
| i18n expandido con +50 claves | ✅ |
| PDF exportado reducido a 2 páginas | ✅ |
| Excel/CSV con fila de TOTAL GENERAL | ✅ |
| Keyboard shortcuts cierran con Esc | ✅ |

---

## 4. Base de Datos

### Migraciones Pendientes

Ambas migraciones están listas pero **no ejecutadas** en la DB actual:

```bash
docker compose exec db psql -U postgres -d siec -f /migrations/007_add_geometria_simulacion.sql
docker compose exec db psql -U postgres -d siec -f /migrations/008_drop_recinto_counts.sql
```

---

## 5. Próximos Pasos (Misión Final)

### Critico para el MVP del 27 de mayo

```
1. ⚡ Probar PDP URLs de Sodimac (test_search.py)
   → Si funciona: el scraper ya queda listo
   → Si no funciona: diagnosticar por qué falla la PDP

2. ⚡ Probar si Google Shopping da resultados
   → Alternativa gratuita a scraping directo
   
3. ⚡ Ejecutar migraciones de BD
   → 007_add_geometria_simulacion.sql
   → 008_drop_recinto_counts.sql

4. ⚡ Reconstruir backend y verificar que responde 200
   → Confirmar que /api/simulacion/parametros acepta el payload nuevo

5. ⚡ Probar flujo completo: frontend → backend → scraper → presupuesto
```

### Si las PDP URLs fallan (alternativas)

| Alternativa | Costo | Esfuerzo |
|------------|-------|----------|
| Google Shopping scraping | Gratis | Medio — probar si Google bloquea |
| Agregar más PDP URLs manualmente | Gratis | Alto — tedioso pero seguro |
| ScrapingAnt/ScrapingBee | $20-49/mes | Bajo — ellos manejan anti-bot |
| BrightData datasets | ~$300/mes | Mínimo — datos prefabricados |

---

## 6. Comandos Útiles

```bash
# Reconstruir todo
docker compose down backend scraper
docker compose build --no-cache backend scraper
docker compose up -d backend

# Migrar DB
docker compose exec db psql -U postgres -d siec -f /migrations/007_add_geometria_simulacion.sql
docker compose exec db psql -U postgres -d siec -f /migrations/008_drop_recinto_counts.sql

# Test scraper Sodimac (PDP URLs)
docker compose run --rm -v "C:\Users\andre\Documents\VSC Projects\SIECres\scraper:/app" scraper python test_search.py sodimac

# Test scraper Construmart
docker compose run --rm -v "C:\Users\andre\Documents\VSC Projects\SIECres\scraper:/app" scraper python test_search.py construmart

# Ejecutar scraper completo
docker compose run --rm -e RUN_NOW=true -v "C:\Users\andre\Documents\VSC Projects\SIECres\scraper:/app" scraper python main.py

# Ver logs del backend
docker compose logs --tail=50 backend
```
