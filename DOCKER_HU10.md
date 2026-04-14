# 🚀 HU10 - Guía Rápida de Docker

## Opción 1: Docker Compose (Recomendado)

### Requisitos
- Docker Desktop instalado
- 4GB RAM disponible mínimo
- Puertos 5432, 8000, 5173 disponibles

### Pasos

#### 1. Crear archivo `.env` en frontend
```bash
cp frontend/.env.example frontend/.env
```

Asegúrate que contiene:
```env
VITE_API_URL=http://localhost:8000
```

#### 2. Iniciar todos los servicios
```bash
# En la raíz del proyecto (c:\Users\fesal\SIEC)
docker-compose up -d
```

Esto levanta:
- **PostgreSQL 15** (Puerto 5432): Base de datos
- **FastAPI Backend** (Puerto 8000): API con endpoints HU10
- **Vue.js Frontend** (Puerto 5173): Interfaz web

#### 3. Esperar a que la base de datos esté lista
```bash
docker-compose logs db
```

Busca el mensaje: "database system is ready to accept connections"

#### 4. Ejecutar migraciones (SQL)
```bash
docker-compose exec db psql -U siec_user -d siec_db -f /docker-entrypoint-initdb.d/001_create_material_estructural.sql
docker-compose exec db psql -U siec_user -d siec_db -f /docker-entrypoint-initdb.d/002_create_configuracion_simulacion.sql
docker-compose exec db psql -U siec_user -d siec_db -f /docker-entrypoint-initdb.d/003_create_rendimiento_constructivo.sql
```

#### 5. Ejecutar seeds
```bash
docker-compose exec db psql -U siec_user -d siec_db -f /docker-entrypoint-initdb.d/001_seed_material_estructural.sql
docker-compose exec db psql -U siec_user -d siec_db -f /docker-entrypoint-initdb.d/002_seed_configuracion_simulacion.sql
docker-compose exec db psql -U siec_user -d siec_db -f /docker-entrypoint-initdb.d/003_seed_rendimiento_constructivo.sql
```

#### 6. Acceder a la aplicación
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

#### 7. Parar servicios
```bash
docker-compose down
```

## Opción 2: Ejecución Local (Python + PostgreSQL local)

### Requisitos
- Python 3.11+
- PostgreSQL 15 instalado localmente
- Node.js 20+

### Pasos

#### 1. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # En Windows
pip install -r requirements.txt
python main.py
```

#### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

#### 3. Acceder
- Frontend: http://localhost:5173
- API: http://localhost:8000

## Verificación Rápida

### API Endpoints HU10

#### Obtener todos los rendimientos
```bash
curl http://localhost:8000/api/rendimientos
```

Respuesta esperada:
```json
[
  {
    "id": 1,
    "material_estructural_id": 1,
    "factor_rendimiento": 0.5,
    "insumo_base": "Sacos de Cemento",
    "unidad": "sacos",
    "descripcion": "Madera - Bajo consumo..."
  },
  ...
]
```

#### Obtener rendimiento por material
```bash
curl http://localhost:8000/api/rendimientos/1
```

#### Crear simulación
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

Respuesta esperada:
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

## Troubleshooting

### Error: "Port 5432 already in use"
```bash
docker-compose down
# O terminar PostgreSQL en Windows:
# Services → PostgreSQL → Stop
```

### Error: "Connection refused on localhost:8000"
- Esperar 10-15 segundos a que FastAPI se inicie
- Ver logs: `docker-compose logs api`

### Error: "Cannot find module..."
```bash
cd frontend
npm install
```

### Base de datos vacía
Ejecutar las migraciones y seeds en el orden correcto:
1. 001_create_material_estructural.sql
2. 002_create_configuracion_simulacion.sql
3. 003_create_rendimiento_constructivo.sql
4. Seeds en mismo orden

## Características HU10 Implementadas

✅ **Tabla Rendimiento_Constructivo** - Almacena factores dinámicos (BD, no hardcodeado)
✅ **Cálculo Automático** - m² × factor_rendimiento con precisión DECIMAL(8,4)
✅ **4 Materiales** - Madera (0.5), Metalcom (0.7), Albañilería (1.2), Hormigón (1.5)
✅ **API REST** - GET /api/rendimientos, GET /api/rendimientos/{id}, POST /api/simulacion/parametros
✅ **UI Interactiva** - Panel visual con matriz de rendimientos y estimaciones
✅ **Validaciones** - m² (15-200), material_id (1-4), precisión decimal

## Notas Importantes

- Las migraciones SQL deben ejecutarse en **orden** (001, 002, 003)
- Los seeds asumen que las migraciones se ejecutaron primero
- DECIMAL(8,4) permite hasta 9,999.9999 con 4 decimales de precisión
- Los factores se consultan de BD en cada simulación (dinámicos)
- Frontend se comunica con API via http://localhost:8000

¡Listo! Ahora puedes acceder a http://localhost:5173 y probar HU10 😊
