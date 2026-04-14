# 🚀 HU10 - Frontend Testing con Docker

## ¿Qué es HU10?

**HU10 - Matriz de Rendimientos Constructivos** es una historia de usuario que implementa un sistema dinámico para consultar y calcular factores de consumo de insumos por unidad de área (m²) según el material estructural.

### ✅ Características Implementadas

- **Matriz Dinámmica**: Los factores se consultan de la base de datos (no están hardcodeados)
- **4 Materiales**: Madera (0.5), Metalcom (0.7), Albañilería (1.2), Hormigón Armado (1.5) sacos/m²
- **Cálculo Automático**: Formula: m² × factor_rendimiento con precisión DECIMAL(8,4)
- **API REST**: 
  - GET `/api/rendimientos` - Obtiene todos los rendimientos
  - GET `/api/rendimientos/{material_id}` - Obtiene rendimiento específico
  - POST `/api/simulacion/parametros` - Crea simulación con cálculo automático
- **Interfaz Web**: Panel interactivo para visualizar matriz y calcular estimaciones

---

## 🎯 Empezando Rápidamente

### Opción A: Docker Compose (Recomendado - 🏆)

```bash
# 1. Desde la carpeta raíz (c:\Users\fesal\SIEC)
docker-compose up -d

# 2. Esperar 10-15 segundos para que los servicios se inicien

# 3. Acceder al frontend
# http://localhost:5173
```

**¡Eso es todo!** Docker levantará:
- ✅ PostgreSQL 15 (Base de datos con tablas + datos)
- ✅ FastAPI Backend (API REST con endpoints HU10)
- ✅ Vue.js Frontend (Interfaz web interactiva)

### Opción B: Ejecución Local

```bash
# Terminal 1: Backend Python
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py

# Terminal 2: Frontend Node.js
cd frontend
npm install
npm run dev

# Acceder a http://localhost:5173
```

---

## 🎨 Interfaz Frontend HU10

### Captura de Pantalla Conceptual

```
┌─────────────────────────────────────────────────────────────────┐
│  🏗️  Matriz de Rendimientos Constructivos (HU10)                │
│      Estimador dinámico de insumos por material                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐  ┌─────────────────────────────┐
│ 📋 Configurar Simulación     │  │ 📊 Matriz de Rendimientos   │
├──────────────────────────────┤  ├─────────────────────────────┤
│ Material:                    │  │ 🪵 Madera                   │
│ [dropdown: Seleccionar]      │  │ Factor: 0.5 sacos/m²        │
│                              │  │                              │
│ Área Total: [100] m²         │  │ 🔧 Metalcom                 │
│                              │  │ Factor: 0.7 sacos/m²        │
│ 🚪 Recintos:                 │  │                              │
│   Habitaciones: [3]          │  │ 🧱 Albañilería              │
│   Baños: [2]                 │  │ Factor: 1.2 sacos/m²        │
│   Áreas Comunes: [1]         │  │                              │
│                              │  │ 🏢 Hormigón Armado          │
│ [💾 Guardar Simulación]      │  │ Factor: 1.5 sacos/m²        │
└──────────────────────────────┘  └─────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 💰 Estimación de Insumos                                         │
├──────────────────────────────────────────────────────────────────┤
│ Madera                                         100 m²             │
│                                                                   │
│ Área: 100 m²                                                     │
│ Factor: 0.5 sacos/m²                                             │
│ ─────────────────────────────────                                │
│ Fórmula: 100 × 0.5 = ?                                          │
│                                                                   │
│ 📦 Cantidad Estimada: 50 sacos de Cemento                        │
│                                                                   │
│ ✅ Simulación #1 guardada correctamente                          │
└──────────────────────────────────────────────────────────────────┘
```

### Cómo Usar el Panel HU10

1. **Seleccionar Material**: Elige entre 4 opciones (Madera, Metalcom, Albañilería, Hormigón)
2. **Ingresar Área**: Especifica m² totales (15-200 rango válido)
3. **Configurar Recintos** (Opcional): Ingresa cantidad de habitaciones, baños, áreas comunes
4. **Ver Matriz**: Los factores dinámicos se cargan automáticamente de la BD
5. **Calcular**: La estimación se actualiza en tiempo real
6. **Guardar**: Presiona "Guardar Simulación" para almacenar en BD

---

## 🧪 Testing Manual

### Test 1: Ver Matriz de Rendimientos

```bash
curl http://localhost:8000/api/rendimientos
```

**Respuesta esperada:**
```json
[
  {
    "id": 1,
    "material_estructural_id": 1,
    "factor_rendimiento": 0.5,
    "insumo_base": "Sacos de Cemento",
    "unidad": "sacos",
    "descripcion": "Madera - Bajo consumo de insumos..."
  },
  {
    "id": 2,
    "material_estructural_id": 2,
    "factor_rendimiento": 0.7,
    "insumo_base": "Sacos de Cemento",
    "unidad": "sacos",
    "descripcion": "Metalcom - Consumo moderado..."
  },
  // ... más materiales
]
```

### Test 2: Consultar Rendimiento Específico

```bash
curl http://localhost:8000/api/rendimientos/1
```

**Respuesta:**
```json
{
  "id": 1,
  "material_estructural_id": 1,
  "factor_rendimiento": 0.5,
  "insumo_base": "Sacos de Cemento",
  "unidad": "sacos",
  "descripcion": "Madera..."
}
```

### Test 3: Crear Simulación con Cálculo

```bash
curl -X POST http://localhost:8000/api/simulacion/parametros \
  -H "Content-Type: application/json" \
  -d '{
    "m2Totales": 100,
    "materialEstructuralId": 1,
    "habitaciones": 3,
    "banios": 2,
    "areasComunes": 1
  }'
```

**Respuesta esperada:**
```json
{
  "idSimulacion": 1,
  "message": "Simulación creada exitosamente",
  "estimacion_insumos": {
    "m2_ingresados": 100,
    "factor_rendimiento": 0.5,
    "cantidad_insumos": 50.0,
    "insumo_base": "Sacos de Cemento",
    "unidad": "sacos"
  }
}
```

### Test 4: Casos Reales

```bash
# Casa pequeña de Madera: 75m² × 0.5 = 37.5 sacos
curl -X POST http://localhost:8000/api/simulacion/parametros \
  -H "Content-Type: application/json" \
  -d '{
    "m2Totales": 75,
    "materialEstructuralId": 1,
    "habitaciones": 2,
    "banios": 1,
    "areasComunes": 1
  }'

# Casa mediana de Hormigón: 150m² × 1.5 = 225 sacos
curl -X POST http://localhost:8000/api/simulacion/parametros \
  -H "Content-Type: application/json" \
  -d '{
    "m2Totales": 150,
    "materialEstructuralId": 4,
    "habitaciones": 4,
    "banios": 2,
    "areasComunes": 2
  }'
```

---

## 🐳 Comandos Docker Útiles

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs específico del backend
docker-compose logs -f backend

# Ver logs específico del frontend
docker-compose logs -f frontend

# Ver logs específico de BD
docker-compose logs -f db

# Parar servicios
docker-compose down

# Reiniciar un servicio
docker-compose restart backend

# Acceder a la BD directamente
docker-compose exec db psql -U siec_user -d siec_db

# Ejecutar comando en backend
docker-compose exec backend python main.py

# Ver estado de servicios
docker-compose ps
```

---

## 📊 Verificación de BD

Una vez en `psql`:

```sql
-- Ver tabla de materiales
SELECT * FROM Material_Estructural;

-- Ver tabla de rendimientos (HU10)
SELECT * FROM Rendimiento_Constructivo;

-- Ver tabla de simulaciones
SELECT * FROM Configuracion_Simulacion;

-- Ver cálculo de prueba: 100m² de Madera
SELECT 100 * factor_rendimiento as cantidad_estimada
FROM Rendimiento_Constructivo
WHERE material_estructural_id = 1;
-- Resultado esperado: 50

-- Salir
\q
```

---

## ❌ Troubleshooting

### "Connection refused on port 5173"
- Esperar 15-20 segundos a que Node.js instale dependencias
- Ver logs: `docker-compose logs frontend`

### "PostgreSQL connection refused"
- BD tarda en inicializar, esperar 10s
- Ver estado: `docker-compose ps`
- Debe estar "healthy": `docker-compose logs db`

### "VITE_API_URL is undefined"
- Asegurar que `.env` existe en `frontend/` con:
  ```
  VITE_API_URL=http://localhost:8000
  ```

### "Cannot GET /api/rendimientos"
- Backend no está inicializado
- Ver: `docker-compose logs backend`
- Esperar 10s más y reintentar

### "Tables don't exist"
- Migraciones no ejecutadas
- Acceder a BD y ejecutar manualmente:
  ```sql
  \i '/docker-entrypoint-initdb.d/001_create_material_estructural.sql'
  \i '/docker-entrypoint-initdb.d/002_create_configuracion_simulacion.sql'
  \i '/docker-entrypoint-initdb.d/003_create_rendimiento_constructivo.sql'
  \i '/docker-entrypoint-initdb.d/001_seed_material_estructural.sql'
  \i '/docker-entrypoint-initdb.d/002_seed_configuracion_simulacion.sql'
  \i '/docker-entrypoint-initdb.d/003_seed_rendimiento_constructivo.sql'
  ```

---

## 📚 Documentación Relacionada

- [DOCKER_HU10.md](./DOCKER_HU10.md) - Guía detallada de Docker
- [docs/HU10_Matriz_Rendimientos.md](./docs/HU10_Matriz_Rendimientos.md) - Especificación técnica
- [backend/models.py](./backend/models.py) - Modelos de datos
- [backend/main.py](./backend/main.py) - Endpoints API

---

## 🎓 Estructura del Código

### Frontend Vue.js
```
frontend/src/
├── components/
│   └── HU10Panel.vue          ← Panel interactivo HU10 (NUEVO)
└── HU10.vue                   ← Página principal HU10 (NUEVO)
```

### Backend FastAPI
```
backend/
├── models.py                  ← RendimientoConstructivo ORM model
├── main.py                    ← Endpoints GET/POST HU10
└── requirements.txt           ← FastAPI, SQLAlchemy, psycopg2...
```

### Base de Datos PostgreSQL
```
database/
├── migrations/
│   └── 003_create_rendimiento_constructivo.sql  ← Tabla HU10
├── seeds/
│   └── 003_seed_rendimiento_constructivo.sql    ← Datos iniciales
└── init-db.sh                ← Script de inicialización
```

---

## 🔍 API Endpoints

### GET /api/rendimientos
- **Descripción**: Obtiene todos los factores de rendimiento
- **Respuesta**: Array de objetos `RendimientoConstructivo`
- **Ejemplo**: `curl http://localhost:8000/api/rendimientos`

### GET /api/rendimientos/{material_id}
- **Descripción**: Obtiene factor específico para un material
- **Parámetros**: `material_id` (1-4)
- **Respuesta**: Objeto `RendimientoConstructivo`
- **Ejemplo**: `curl http://localhost:8000/api/rendimientos/1`

### POST /api/simulacion/parametros
- **Descripción**: Crea simulación con cálculo automático
- **Body**:
  ```json
  {
    "m2Totales": 100,
    "materialEstructuralId": 1,
    "habitaciones": 3,
    "banios": 2,
    "areasComunes": 1
  }
  ```
- **Respuesta**:
  ```json
  {
    "idSimulacion": 1,
    "message": "Simulación creada exitosamente",
    "estimacion_insumos": {
      "m2_ingresados": 100,
      "factor_rendimiento": 0.5,
      "cantidad_insumos": 50.0,
      "insumo_base": "Sacos de Cemento",
      "unidad": "sacos"
    }
  }
  ```

---

## ✅ Checklist de Testing

- [ ] Docker Compose levantó sin errores
- [ ] http://localhost:5173 carga la interfaz HU10
- [ ] La matriz de rendimientos muestra 4 materiales
- [ ] Ingresé 100 m² y Madera, veo estimación de 50 sacos
- [ ] Guardé simulación, aparece mensaje de éxito
- [ ] GET /api/rendimientos devuelve 4 factores
- [ ] POST simulación calcula correctamente (100 × 0.5 = 50)
- [ ] Otros materiales calculan correctamente (75 × 1.2 = 90, etc.)
- [ ] La BD contiene tabla `Rendimiento_Constructivo`
- [ ] Validaciones funcionan (rechaza m² < 15 o > 200)

---

## 🎉 ¡Felicidades!

Si completaste todos los tests, HU10 está funcionando correctamente:
- ✅ Backend API operacional
- ✅ Frontend web funcional
- ✅ Base de datos con datos iniciales
- ✅ Cálculos dinámicos desde BD
- ✅ UI interactivo y responsivo

¡Listo para producción! 🚀

