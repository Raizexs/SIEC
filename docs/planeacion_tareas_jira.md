# Tareas Sprint 2 — Jira (SIEC)

**Alcance:** HU04, HU06, HU07, HU08, HU10
| **Duración estimada:** 1/2 semanas | **Story Points Total:** 53

---

## ÉPICA 2: MOTOR DE ESTIMACIÓN Y COSTOS

### 📄 SCRUM-12: HU10 — Matriz de Rendimientos Constructivos

---

#### Investigación de Rendimientos Constructivos (Data Mining RSMeans)

**Etiquetas:** `SPIKE`
**Story Points:** 5
**Dependencias:** Ninguna
**Bloquea a:** Seeder de Producción para Matriz de Rendimientos

**Descripción:**

Realizar una investigación exploratoria en la plataforma RSMeans de Gordian (utilizando el free trial de 10 días) para extraer coeficientes de rendimiento de materiales de construcción residencial. Los precios de RSMeans están calibrados para EE.UU. y deben descartarse; únicamente se extraerán los factores de rendimiento por unidad de superficie (cantidad de material por m²), que son universales e independientes de la geografía.

El entregable es un archivo CSV/JSON estructurado con los coeficientes de al menos los siguientes insumos por cada material estructural base (Madera, Metalcom, Albañilería, Hormigón Armado):

- Cemento (sacos/m²)
- Fierro/Acero (kg/m²)
- Agua (litros/m²)
- Cableado eléctrico (metros/m²)
- Tuberías (metros/m²)
- Volcanita/Revestimiento (planchas/m²)
- Horas-Hombre (HH/m² por especialidad: albañil, electricista, gasfíter)

**Criterios de Validación:**

1. Se entrega un archivo `rendimientos_rsmeans.csv` o `.json` en `database/seeds/data/` con al menos 28 registros (7 insumos × 4 materiales base).
2. Cada registro contiene exactamente los campos: `material_estructural`, `insumo`, `unidad_medida`, `factor_multiplicador`, `fuente`.
3. Los factores están expresados en unidades métricas (m², kg, litros) — NO en sqft, lbs, galones.
4. Se adjunta un documento `docs/spike_rsmeans.md` con: URL de la fuente, fecha de acceso, capturas de pantalla de los datos originales, y la fórmula de conversión sqft→m² aplicada.
5. El archivo NO contiene precios en USD/CLP, solamente factores de rendimiento.

---

#### Búsqueda en Datasets Abiertos y Manual Ondac (Rendimientos Chile)

**Etiquetas:** `SPIKE`
**Story Points:** 5
**Dependencias:** Ninguna
**Bloquea a:** Seeder de Producción para Matriz de Rendimientos

**Descripción:**

Investigar fuentes alternativas de datos de rendimiento constructivo localizados para Chile. Se deben explorar tres canales en orden de prioridad:

1. **Manual Ondac:** Verificar si existe una versión digital accesible (PDF, base de datos, o API). Documentar la viabilidad de uso académico y el costo si es de pago.
2. **Repositorios Académicos:** Buscar en Mendeley Data, Zenodo, y Google Scholar usando los términos: `"Bill of Quantities" residential building`, `"BIM 5D cost estimation" dataset`, `"rendimiento materiales construcción"`.
3. **Plataformas Open Data:** Kaggle y GitHub buscando datasets CSV/JSON de estimación de costos de construcción residencial.

**Criterios de Validación:**

1. Se entrega un documento `docs/spike_datasets_chile.md` con una tabla comparativa de al menos 5 fuentes evaluadas, con columnas: Nombre, URL, Tipo (API/CSV/PDF), Cobertura (materiales incluidos), Localización (Chile/Internacional), Accesibilidad (Free/Pago/Trial), y Veredicto (Usar/Descartar + justificación).
2. Si se encontró un dataset utilizable, se incluye el archivo procesado en `database/seeds/data/` con el mismo formato de la tarea de Investigación RSMeans.
3. Si el Manual Ondac no es accesible digitalmente, se documenta explícitamente: "El Manual Ondac no está disponible en formato digital/API. Alternativa: [X]".
4. El documento incluye una recomendación final de cuál fuente será la fuente primaria para poblar la `Matriz_Rendimiento`.

---

#### Migración de Esquema DB: Tablas de Insumos, Rendimientos y Precios

**Etiquetas:** `DB`, `BACKEND`
**Story Points:** 3
**Dependencias:** Ninguna
**Bloquea a:** Seed del Catálogo de Insumos, Seeder de Producción para Matriz de Rendimientos, Endpoint de Cálculo y Desglose de Insumos, Microservicio Scraper con Playwright

**Descripción:**

Crear las migraciones SQL y los modelos SQLAlchemy para las tablas del modelo relacional que soportará el motor de costos y el scraping de precios. Este trabajo extiende el esquema existente (que ya contiene `tipo_recinto` y `configuracion_simulacion`) con las siguientes 4 tablas nuevas:

```sql
CREATE TABLE material_estructural (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE insumo (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('Obra Gruesa', 'Terminaciones', 'Instalaciones', 'Mano de Obra')),
  unidad_medida VARCHAR(30) NOT NULL
);

CREATE TABLE matriz_rendimiento (
  id SERIAL PRIMARY KEY,
  material_id INT NOT NULL REFERENCES material_estructural(id),
  insumo_id INT NOT NULL REFERENCES insumo(id),
  factor_multiplicador NUMERIC(10,4) NOT NULL CHECK (factor_multiplicador > 0),
  UNIQUE(material_id, insumo_id)
);

CREATE TABLE precio_mercado (
  id SERIAL PRIMARY KEY,
  insumo_id INT NOT NULL REFERENCES insumo(id),
  precio_clp INT NOT NULL CHECK (precio_clp > 0),
  tienda_origen VARCHAR(50) NOT NULL CHECK (tienda_origen IN ('Sodimac', 'Easy', 'Construmart')),
  fecha_scraping TIMESTAMP NOT NULL DEFAULT NOW(),
  region VARCHAR(50) NOT NULL DEFAULT 'Valparaíso'
);
```

Además, crear los modelos SQLAlchemy correspondientes en `backend/models.py` y actualizar el `startup_event` para no duplicar datos.

**Criterios de Validación:**

1. Existe un archivo `database/migrations/003_create_motor_costos.sql` con las 4 sentencias `CREATE TABLE` incluyendo `CHECK` constraints y `REFERENCES`.
2. El archivo `backend/models.py` contiene las clases `MaterialEstructural`, `Insumo`, `MatrizRendimiento`, y `PrecioMercado` con relaciones SQLAlchemy (`ForeignKey`, `relationship`).
3. Al ejecutar `docker-compose up --build`, las 4 tablas se crean correctamente sin errores.
4. La tabla `material_estructural` tiene un seed con los 4 materiales base: Madera, Metalcom, Albañilería, Hormigón Armado.
5. La lista hardcodeada `ALLOWED_MATERIALS` en `main.py` se reemplaza por una consulta a la tabla `material_estructural`.

---

#### Seed del Catálogo de Insumos en la DB

**Etiquetas:** `DB`, `BACKEND`
**Story Points:** 3
**Dependencias:** Migración de Esquema DB
**Bloquea a:** Seeder de Producción para Matriz de Rendimientos, Microservicio Scraper con Playwright

**Descripción:**

Poblar la tabla `insumo` con el catálogo completo de materiales de construcción que serán rastreados por el scraper y utilizados en el motor de cálculo. El catálogo debe incluir insumos de las 4 categorías definidas en el modelo.

Insumos mínimos requeridos:

| Categoría | Insumos |
|---|---|
| Obra Gruesa | Cemento, Fierro/Acero, Arena, Ripio, Agua |
| Terminaciones | Volcanita, Pintura, Cerámica, Piso Flotante |
| Instalaciones | Cableado Eléctrico, Tuberías PVC, Tuberías Cobre |
| Mano de Obra | Albañil (HH), Electricista (HH), Gasfíter (HH), Ayudante (HH) |

**Criterios de Validación:**

1. Existe un archivo `database/seeds/003_seed_insumos.sql` con sentencias `INSERT INTO insumo` para al menos 15 insumos cubriendo las 4 categorías.
2. Cada registro incluye `nombre`, `categoria` (que pase el `CHECK` constraint), y `unidad_medida` (ej: "saco 25kg", "kg", "litro", "m", "plancha", "HH").
3. El seed es idempotente: ejecutar `docker-compose up` dos veces no genera duplicados (usar `ON CONFLICT DO NOTHING`).
4. Al consultar `SELECT * FROM insumo;` se obtienen los registros con categorías y unidades coherentes.

---

#### Seeder de Producción para Matriz de Rendimientos

**Etiquetas:** `BACKEND`, `DB`
**Story Points:** 3
**Dependencias:** Investigación RSMeans o Búsqueda en Datasets/Ondac (datos del SPIKE), Seed del Catálogo de Insumos, Migración de Esquema DB
**Bloquea a:** Endpoint de Cálculo y Desglose de Insumos

**Descripción:**

Transformar los datos de rendimiento obtenidos en la investigación (SPIKEs de RSMeans y/o Datasets/Ondac) en un script de seed que pueble la tabla `matriz_rendimiento` cruzando cada `material_estructural` con cada `insumo` y su `factor_multiplicador`.

El script puede ser un archivo SQL (`database/seeds/004_seed_matriz_rendimiento.sql`) o un script Python (`backend/scripts/seed_rendimientos.py`) que lea el CSV/JSON y use SQLAlchemy.

**Criterios de Validación:**

1. Al ejecutar el seed, la tabla `matriz_rendimiento` contiene al menos 44 registros (11 insumos de materiales × 4 materiales base).
2. Cada registro tiene un `factor_multiplicador > 0` y las foreign keys apuntan a registros existentes.
3. Se puede validar con:
   ```sql
   SELECT me.nombre AS material, i.nombre AS insumo, mr.factor_multiplicador, i.unidad_medida
   FROM matriz_rendimiento mr
   JOIN material_estructural me ON mr.material_id = me.id
   JOIN insumo i ON mr.insumo_id = i.id
   ORDER BY me.nombre, i.categoria;
   ```
4. El seed es idempotente (`ON CONFLICT (material_id, insumo_id) DO UPDATE`).
5. El archivo fuente (CSV/JSON) del SPIKE se mantiene en `database/seeds/data/` como respaldo.

---

### 📄 SCRUM-10: HU04 — Cálculo y Desglose Total de Insumos

---

#### Endpoint de Cálculo y Desglose de Insumos

**Etiquetas:** `BACKEND`
**Story Points:** 5
**Dependencias:** Seeder de Producción para Matriz de Rendimientos (matriz poblada), Migración de Esquema DB
**Bloquea a:** Panel de Desglose de Presupuestos en Vue, Algoritmo Promediador de Precios

**Descripción:**

Programar un endpoint en FastAPI que reciba los metros cuadrados totales y el ID del material estructural de una simulación, consulte la tabla `matriz_rendimiento`, y retorne el desglose completo de insumos agrupado por categoría con las cantidades calculadas.

El endpoint debe:
1. Recibir `POST /api/simulacion/{id}/calcular-insumos` con el `id` de una simulación existente.
2. Leer los `m2_totales` y `material_estructural_id` de la simulación.
3. Consultar todos los registros de `matriz_rendimiento` para ese material.
4. Multiplicar `m2_totales × factor_multiplicador` para cada insumo.
5. Retornar un JSON agrupado por categoría.

Modelos Pydantic requeridos (en `backend/schemas.py`):

```python
class InsumoCalculado(BaseModel):
    insumo: str
    cantidad: float
    unidad: str
    precio_unitario: Optional[float] = None
    subtotal: Optional[float] = None

class CategoriaDesglose(BaseModel):
    categoria: str
    items: List[InsumoCalculado]
    subtotal_categoria: Optional[float] = None

class DesgloseResponse(BaseModel):
    simulacion_id: int
    m2_totales: int
    material: str
    desglose: List[CategoriaDesglose]
    costo_total: Optional[float] = None
    fecha_precios: Optional[str] = None
```

**Criterios de Validación:**

1. El endpoint `POST /api/simulacion/{id}/calcular-insumos` existe y se documenta en Swagger (`/docs`).
2. Para una simulación de 100 m² con material "Albañilería" cuyo cemento tiene factor 0.5, la respuesta incluye `"insumo": "Cemento", "cantidad": 50.0, "unidad": "saco 25kg"`.
3. Si el `simulacion_id` no existe, retorna HTTP 404.
4. Si el material no tiene rendimientos, retorna HTTP 422 con `"No existen rendimientos para el material seleccionado"`.
5. Los campos `precio_unitario`, `subtotal`, `costo_total` y `fecha_precios` son `null` hasta que el Algoritmo Promediador de Precios los conecte con datos del scraper.

---

#### Panel de Desglose de Presupuestos y Costo Final en Vue

**Etiquetas:** `FRONTEND`
**Story Points:** 5
**Dependencias:** Endpoint de Cálculo y Desglose de Insumos, Algoritmo Promediador de Precios
**Bloquea a:** Ninguna

**Descripción:**

Crear un nuevo componente Vue `BudgetBreakdownPanel.vue` que consuma el endpoint `POST /api/simulacion/{id}/calcular-insumos` y renderice visualmente el desglose completo de insumos y costos. Cubre los requisitos de visualización de HU04 y HU08 simultáneamente.

El componente debe:
1. Llamar al endpoint cuando cambian los parámetros de la simulación (reactivo vía `watch`).
2. Mostrar una tabla agrupada por categoría (Obra Gruesa, Terminaciones, Instalaciones, Mano de Obra).
3. Cada fila: Insumo, Cantidad, Unidad, Precio Unitario, Subtotal.
4. Card destacado con el costo total estimado en formato chileno (`$XX.XXX.XXX CLP`).
5. Badge visible con la fecha de última actualización de precios: `"Precios de mercado al: DD/MM/YYYY"` (requisito explícito de HU08).
6. Estados de fallback cuando no hay datos: `"Precios de mercado no disponibles aún"`.

**Criterios de Validación:**

1. Existe el componente `frontend/src/components/BudgetBreakdownPanel.vue`.
2. El componente se renderiza correctamente dentro de `App.vue`.
3. Al cambiar los m² o el material en el formulario, la tabla se re-calcula sin recarga de página (reactivo vía `watch` o `computed`).
4. La tabla muestra las 4 categorías con insumos agrupados visualmente.
5. El costo total se formatea con `Intl.NumberFormat('es-CL')`.
6. La fecha se muestra en formato chileno `DD/MM/YYYY`.
7. Si `costo_total` es `null`, la UI muestra: `"Precios de mercado no disponibles aún"` en lugar de `$0`.
8. El componente muestra estados de loading y error.

---

## ÉPICA 3: INTEGRACIÓN DE DATOS DE MERCADO

### 📄 SCRUM-13: HU06 — Motor de Web Scraping Automatizado

---

#### Extracción y Mapeo de Selectores CSS del DOM (Sodimac, Easy, Construmart)

**Etiquetas:** `SCRAPING`, `SPIKE`
**Story Points:** 5
**Dependencias:** Ninguna
**Bloquea a:** Microservicio Scraper con Playwright

**Descripción:**

Inspeccionar manualmente el DOM de los sitios web de Sodimac, Easy y Construmart (usando Chrome DevTools) para identificar y documentar los selectores CSS que permiten extraer datos de productos de materiales de construcción. Esta tarea es prerequisito para codificar el scraper porque los selectores son la base de toda la extracción.

Se deben identificar selectores para:
- Nombre del producto
- Precio principal (CLP)
- Precio con/sin descuento (si aplica)
- Disponibilidad/Stock
- Categoría/Breadcrumb
- Paginación

Documentar las URLs de entrada filtradas por la Región de Valparaíso.

**Criterios de Validación:**

1. Existe un archivo `scraper/config.py` con las URLs base y selectores CSS para cada tienda.
2. Cada tienda tiene al menos 4 selectores documentados (nombre, precio, stock, paginación) con ejemplo del valor extraído.
3. Los selectores se verificaron ejecutando `document.querySelectorAll('selector')` en la consola del navegador con resultados no vacíos.
4. Se documenta si algún sitio requiere interacción previa (cerrar modal, seleccionar región).
5. Se identifican al menos 5 productos (Cemento, Fierro, Volcanita, Cableado, Tuberías) con URLs directas en cada tienda.

---

#### Microservicio Scraper con Playwright (Sodimac, Easy, Construmart)

**Etiquetas:** `SCRAPING`, `INFRA`, `BACKEND`
**Story Points:** 8
**Dependencias:** Migración de Esquema DB (tabla `precio_mercado`), Seed del Catálogo de Insumos, Extracción y Mapeo de Selectores CSS
**Bloquea a:** Job Scheduler con APScheduler, Sistema de Alertas y Timeouts, Filtro de Validación de Variación de Precios, Algoritmo Promediador de Precios

**Descripción:**

Desarrollar un microservicio independiente de web scraping que funcione como un cuarto contenedor Docker en el proyecto. El scraper usará **Playwright** (`playwright` + `playwright-stealth`) para extraer precios de materiales de construcción desde Sodimac, Easy y Construmart, filtrados para la Región de Valparaíso, y persistirlos en la tabla compartida `precio_mercado` de PostgreSQL.

**¿Por qué Playwright?** Sodimac, Easy y Construmart son sitios e-commerce construidos con frameworks JS (React/Next.js) que renderizan precios dinámicamente en el cliente. httpx y BeautifulSoup solo leen HTML estático y NO pueden ver los precios. Scrapy necesitaría Splash/Playwright como middleware igualmente. Playwright ejecuta Chromium headless completo y puede extraer el DOM renderizado.

**¿Por qué microservicio separado?** El scraper tiene un ciclo de vida diferente al backend API: se ejecuta cada 24h en modo batch, requiere Chromium (pesado), y su fallo no debe afectar la disponibilidad de la API REST.

Estructura del microservicio:

```
scraper/
├── Dockerfile
├── requirements.txt
├── main.py
├── config.py
├── base_scraper.py
├── sodimac_scraper.py
├── easy_scraper.py
├── construmart_scraper.py
├── db.py
└── models.py
```

Nuevo servicio en `docker-compose.yml`:

```yaml
scraper:
  build: ./scraper
  container_name: siec_scraper
  environment:
    - DATABASE_URL=postgresql://postgres:postgres@db:5432/siec
  depends_on:
    db:
      condition: service_healthy
```

Cada scraper debe:
1. Abrir el sitio en modo headless con `playwright-stealth`.
2. Navegar a la categoría de materiales de construcción.
3. Filtrar por Región de Valparaíso.
4. Extraer: nombre del producto, precio en CLP, disponibilidad.
5. Mapear el producto al `insumo_id` correspondiente en la DB.
6. Insertar en `precio_mercado`.

**Criterios de Validación:**

1. Existe el directorio `scraper/` en la raíz del proyecto con los archivos listados, incluyendo un `Dockerfile` funcional.
2. Al ejecutar `docker-compose up --build`, el servicio `siec_scraper` se levanta sin errores.
3. Al ejecutar manualmente `python sodimac_scraper.py` dentro del contenedor, se extrae al menos el precio de Cemento, Fierro y Volcanita de Sodimac Chile.
4. El scraper usa `playwright-stealth` y NO recibe CAPTCHA o bloqueo.
5. Cada scraper tiene un timeout de 30 segundos por producto.
6. Los precios se insertan correctamente en `precio_mercado`.
7. El `Dockerfile` ejecuta `playwright install --with-deps chromium` durante el build.

---

#### Job Scheduler con APScheduler

**Etiquetas:** `BACKEND`, `INFRA`
**Story Points:** 3
**Dependencias:** Microservicio Scraper con Playwright
**Bloquea a:** Ninguna

**Descripción:**

Integrar **APScheduler** en el microservicio scraper para que los scripts se ejecuten automáticamente una vez cada 24 horas sin intervención manual.

**¿Por qué APScheduler?** Se ejecuta in-process dentro del contenedor del microservicio scraper. No requiere Redis ni RabbitMQ. Soporta cron nativo. Celery sería sobredimensionado para un job de 3 sitios cada 24h.

La implementación debe:
1. Configurar un `BackgroundScheduler` en el `main.py` del microservicio scraper.
2. Registrar un job tipo `cron` que ejecute los 3 scrapers a las 03:00 AM Chile.
3. Los resultados exitosos se insertan en `precio_mercado`.
4. Se puede forzar una ejecución inmediata con la variable de entorno `RUN_NOW=true` (para testing/demo).

**Criterios de Validación:**

1. `scraper/main.py` contiene un `BackgroundScheduler` con `CronTrigger(hour=3, minute=0)`.
2. Al iniciar el contenedor, el log muestra: `[INFO] Scheduler iniciado. Próxima ejecución: 03:00 AM`.
3. `scraper/requirements.txt` incluye `apscheduler`.
4. Si el scheduler falla, el contenedor no se detiene — logea el error y espera al próximo ciclo.
5. Con `RUN_NOW=true`, el scraping se ejecuta inmediatamente al iniciar el contenedor.

---

### 📄 SCRUM-14: HU07 — Resiliencia y Tolerancia a Fallos del Scraper

---

#### Sistema de Alertas, Timeouts y Logging del Scraper

**Etiquetas:** `SCRAPING`, `BACKEND`
**Story Points:** 3
**Dependencias:** Microservicio Scraper con Playwright
**Bloquea a:** Ninguna

**Descripción:**

Implementar un sistema de manejo de errores robusto en el pipeline de scraping que garantice que ningún fallo de red, timeout o bloqueo anti-bot corrompa la base de datos ni detenga la ejecución del resto de scrapers.

La implementación debe incluir:
1. **Timeout por request:** Cada navegación Playwright tiene un timeout de 30 segundos. Si se excede, se logea y se pasa al siguiente producto/tienda.
2. **Try/except por tienda:** Si Sodimac falla, Easy y Construmart siguen ejecutándose.
3. **Logging estructurado:** Formato `[FECHA] [NIVEL] [TIENDA] Mensaje`, visible con `docker logs siec_scraper`.
4. **Protección contra sobrescritura nula:** Si un scraper no obtiene precio, el dato anterior se mantiene intacto.

**Criterios de Validación:**

1. Al simular un timeout, el scraper logea: `[ERROR] [Sodimac] Timeout de 30s excedido para producto Cemento. Manteniendo último precio válido.` y continúa.
2. Si los 3 scrapers fallan, `precio_mercado` NO pierde registros previos.
3. El formato de log es consistente: `2026-04-07 03:00:15 [ERROR] [Sodimac] Mensaje`.
4. Cada ejecución culmina con resumen: `[INFO] Ejecución finalizada. Éxitos: 12, Errores: 3, Tiendas fallidas: [Construmart]`.

---

#### Filtro de Validación de Variación de Precios

**Etiquetas:** `BACKEND`, `SCRAPING`
**Story Points:** 2
**Dependencias:** Microservicio Scraper con Playwright
**Bloquea a:** Ninguna

**Descripción:**

Insertar una regla de validación en el pipeline de persistencia del scraper que descarte automáticamente cualquier precio que represente una variación irracional respecto al último precio registrado.

Regla:
- Si `nuevo_precio > 3 × ultimo_precio` (variación > +200%): DESCARTAR y logear.
- Si `nuevo_precio < 0.5 × ultimo_precio` (variación < -50%): DESCARTAR y logear.
- Si no existe precio previo para ese insumo/tienda: ACEPTAR (primer registro).

**Criterios de Validación:**

1. Existe una función `validar_variacion_precio(insumo_id, tienda, nuevo_precio, db) -> bool` en `scraper/validators.py`.
2. Cemento $5.000 → $16.000 (+220%): se descarta con log `[WARNING] Precio descartado: Cemento en Sodimac pasó de $5.000 a $16.000 (+220%). Supera umbral de +200%.`
3. Cemento $5.000 → $2.000 (-60%): se descarta.
4. Cemento $5.000 → $5.800 (+16%): se acepta.
5. Test unitario en `scraper/tests/test_validacion_precio.py` cubriendo: aumento aceptable, aumento rechazado, disminución aceptable, disminución rechazada, primer registro.

---

### 📄 SCRUM-15: HU08 — Consumo de Precios para el Presupuesto

---

#### Algoritmo Promediador de Precios de Mercado

**Etiquetas:** `BACKEND`
**Story Points:** 3
**Dependencias:** Endpoint de Cálculo y Desglose de Insumos, Microservicio Scraper con Playwright (datos en `precio_mercado`)
**Bloquea a:** Panel de Desglose de Presupuestos en Vue

**Descripción:**

Extender el endpoint de cálculo de insumos para que consulte `precio_mercado` y calcule el precio promedio de cada insumo usando los precios más recientes de todas las tiendas disponibles.

Lógica:
1. Para cada `insumo_id`, obtener el precio más reciente (`ORDER BY fecha_scraping DESC LIMIT 1`) de cada tienda.
2. Si un insumo tiene precio en Sodimac ($5.000), Easy ($5.200) y Construmart ($4.800): promedio = $5.000.
3. Si solo hay precio en 1 tienda, usar ese precio directamente.
4. `subtotal` de cada insumo = `cantidad × precio_promedio`.
5. `costo_total` = suma de todos los subtotales.
6. `fecha_precios` = la fecha del precio más antiguo usado en el cálculo.

**Criterios de Validación:**

1. El endpoint retorna `precio_unitario`, `subtotal`, `costo_total`, y `fecha_precios` con valores reales cuando existen datos en `precio_mercado`.
2. La query SQL usa `DISTINCT ON (insumo_id, tienda_origen) ORDER BY fecha_scraping DESC` para obtener solo el precio más reciente por tienda.
3. Si no hay precios para un insumo, `precio_unitario` y `subtotal` son `null` para ese insumo, pero el resto funciona.
4. Test unitario en `backend/tests/test_promedio_precios.py` validando: promedio con 3 tiendas, una sola tienda, sin precios disponibles.

---