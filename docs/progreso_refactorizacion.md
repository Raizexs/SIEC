# Progreso de Refactorización — SCRUM-118

## Estado Actual (23 de mayo 2026)

---

## 1. Motor de Costos (Backend Python/FastAPI) — ✅ COMPLETO

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

---

## 2. Scraper — HISTORIAL DE INTENTOS FALLIDOS

Cada intento está probado, documentado, y el resultado fue negativo.

### Intento 1: HTTP directo + JSON-LD (urllib)
- **Qué:** Fetch con headers realistas, extraer JSON-LD del HTML
- **Resultado:** ❌ Solo Construmart respondió al inicio. Luego también dejó de funcionar.
- **Causa:** Los sitios requieren JavaScript para renderizar datos. El HTML inicial es un shell vacío.

### Intento 2: Playwright Chromium + playwright-stealth
- **Qué:** Browser headless con librería de evasión de detección
- **Resultado:** ❌ Sodimac devuelve homepage en vez de resultados
- **Causa:** playwright-stealth desactualizado (2023). Sitios detectan el fingerprint.

### Intento 3: Playwright Firefox
- **Qué:** Firefox en vez de Chromium (diferente fingerprint)
- **Resultado:** ❌ Mismo resultado — homepage siempre
- **Causa:** Firefox también detectable.

### Intento 4: Stealth manual inyectado
- **Qué:** Script JS que sobreescribe navigator.webdriver, chrome.runtime, WebGL, etc.
- **Resultado:** ❌ Sin mejora
- **Causa:** La detección va más allá de JS — usa comportamiento, timing, headers de red.

### Intento 5: undetected-chromedriver
- **Qué:** Chrome real con parches en runtime. El estándar de la industria para scrapers.
- **Resultado:** ❌ Docker build falló (wget no instalado, apt-key deprecado)
- **Causa:** Nunca se pudo probar porque no se pudo construir la imagen.

### Intento 6: API REST directa de Sodimac
- **Qué:** Endpoints `/rest/search/products`, `/api/search`, `/rest/model/sodimac/search`
- **Resultado:** ❌ Todos 404 o bloqueados
- **Causa:** Las APIs requieren autenticación o headers específicos.

### Intento 7: PDP URLs directas (con Playwright)
- **Qué:** Navegar directamente a páginas de producto (no búsqueda)
- **Resultado:** ⚠️ Parcial. 3 de 33 URLs funcionaron. El resto dieron 404.
- **Causa:** Los SKUs proporcionados no son válidos para la mayoría de productos. Las 3 URLs que funcionan: Cemento Polpaico, Terciado Estructural.

### Intento 8: PDP URLs con HTTP directo (sin browser)
- **Qué:** Fetch con urllib directamente a las PDP URLs
- **Resultado:** ⚠️ Mismo resultado. 3 de 33 funcionan. El resto 404.
- **Causa:** Los SKUs están mal. Sin browser no es el problema — las URLs son incorrectas.

### Intento 9: Google Shopping
- **Qué:** `https://www.google.com/search?tbm=shop&q=...`
- **Resultado:** ❌ Google devuelve página que requiere JavaScript
- **Causa:** Google Shopping también es SPA. Bloquea HTTP plano.

### Intento 10: Búsqueda Google para encontrar URLs correctas
- **Qué:** `site:sodimac.cl` query para descubrir URLs válidas
- **Resultado:** ❌ Google Search también bloquea HTTP plano
- **Causa:** Todos los servicios de Google requieren JS.

---

## 3. Lo que SÍ funciona (aunque sea parcial)

| Fuente | Método | Estado |
|--------|--------|--------|
| Construmart búsqueda | Playwright Firefox | ✅ Encuentra productos (threshold 75). 6/34 matches en última ejecución |
| Sodimac PDP Cemento | HTTP directo | ✅ $5.180 — insumo_id=2 (Cemento Especial) |
| Sodimac PDP Terciado | HTTP directo | ✅ $19.990 — insumo_id=35 |
| Easy búsqueda | Playwright | ❌ 0/34 siempre |
| Fuzzy matching | normalizer.py | ✅ Threshold 75 captura más matches que 85 |
| DB insert | db.py | ❌ Error `KeyError: 'precio_descuento'` — falta campo en el dict del scraper |

---

## 4. Problemas Técnicos Restantes (bugs, no arquitectura)

| Bug | Síntoma | Causa | Fix |
|-----|---------|-------|-----|
| `KeyError: 'precio_descuento'` | Falla al insertar en DB | `insertar_precios()` espera campo `precio_descuento` pero los scrapers no lo incluyen | Agregar `precio_descuento: None` a todos los resultados |
| `SodimacScraper` sin `scrape_by_keywords` | Error en main.py | Al hacer el scraper standalone, eliminé el método que main.py espera | Agregar método `scrape_by_keywords` al SodimacScraper standalone |
| Solo 3 de 33 SKUs de Sodimac válidos | 404 en el resto | Los SKUs proporcionados no corresponden a productos existentes | Encontrar SKUs correctos manualmente desde el navegador |
| Easy nunca encuentra productos | 0/34 siempre | Playwright es bloqueado igual que en Sodimac | Misma solución: PDP URLs o darlo por perdido |

---

## 5. Frontend (Vue.js) — ✅ COMPLETO

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

## 6. Base de Datos — Migraciones Pendientes

```bash
docker compose exec db psql -U postgres -d siec -f /migrations/007_add_geometria_simulacion.sql
docker compose exec db psql -U postgres -d siec -f /migrations/008_drop_recinto_counts.sql
```

---

## 7. Resumen Final

| Área | Estado | Próximo paso |
|------|--------|-------------|
| Backend (motor costos) | ✅ Listo. Commiteado. | Migrar BD y probar endpoint |
| Frontend (Vue) | ✅ Listo. Commiteado. | Ninguno |
| Scraper Sodimac | ❌ Bloqueado. 3/33 URLs funcionan | Buscar SKUs correctos o alternativa paga |
| Scraper Easy | ❌ Bloqueado. 0/34 siempre | Idem |
| Scraper Construmart | ⚠️ 6/34 matches. Error DB insert | Fix KeyError `precio_descuento` |
| Base de datos | ⚠️ Migraciones sin ejecutar | Ejecutar los dos .sql |

### Conclusión

El motor de costos y el frontend están completos. El scraper es el cuello de botella. **Ningún método gratuito logró extraer precios de Sodimac o Easy de forma confiable.** Construmart funciona parcialmente con Playwright.

Para el MVP, se puede:
1. Usar Construmart como fuente principal (6 productos con precio real)
2. Los 3 SKUs de Sodimap que funcionan
3. El resto con precios de referencia del backend (tabla de costos internos)
4. Migrar BD para que el frontend pueda enviar el payload nuevo
