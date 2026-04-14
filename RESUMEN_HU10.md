# 🏗️ HU10 - Matriz de Rendimientos Constructivos
## Resumen Ejecutivo de Implementación

---

## 📌 ¿Qué se implementó?

Se desarrolló la **Matriz de Rendimientos Constructivos** que permite al sistema consultar dinámicamente cuánto insumo (cemento) se requiere por cada metro cuadrado según el material estructural elegido.

**ANTES (Sin HU10):**
```
Multiplicadores HARDCODEADOS en el código:
Madera = 0.5
Metalcom = 0.7
Albañilería = 1.2
Hormigón = 1.5
```

**AHORA (Con HU10):**
```
Multiplicadores DINÁMICOS en Base de Datos:
Se consultan al momento del cálculo
Se pueden actualizar sin modificar código
Se registran cambios automáticamente
```

---

## 📊 Tabla de Rendimientos Creada

| Material | Factor/m² | Insumo | Unidad | Ejemplo (100 m²) |
|----------|-----------|--------|--------|------------------|
| 🪵 Madera | 0.5 | Cemento | sacos | 100 × 0.5 = **50 sacos** |
| 🔧 Metalcom | 0.7 | Cemento | sacos | 100 × 0.7 = **70 sacos** |
| 🧱 Albañilería | 1.2 | Cemento | sacos | 100 × 1.2 = **120 sacos** |
| 🏢 Hormigón Armado | 1.5 | Cemento | sacos | 100 × 1.5 = **150 sacos** |

---

## 🔌 Nuevos Endpoints de la API

### 1. Obtener Todos los Rendimientos
```bash
GET /api/rendimientos
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "material_estructural_id": 1,
    "factor_rendimiento": 0.5,
    "insumo_base": "Sacos de Cemento",
    "unidad": "sacos",
    "descripcion": "Madera: Factor constructivo de 0.5..."
  },
  {...},
  {...}
]
```

### 2. Obtener Rendimiento de un Material Específico
```bash
GET /api/rendimientos/1
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

### 3. Crear Simulación (MEJORADO)
```bash
POST /api/simulacion/parametros
```

**Request:**
```json
{
  "m2Totales": 100,
  "materialEstructuralId": 1,
  "habitaciones": 3,
  "banios": 2,
  "areasComunes": 1
}
```

**Response (AHORA CON ESTIMACIÓN):**
```json
{
  "idSimulacion": 5,
  "message": "Simulación guardada correctamente",
  "estimacion_insumos": {
    "m2_ingresados": 100,
    "material_estructural_id": 1,
    "factor_rendimiento": 0.5,
    "insumo_base": "Sacos de Cemento",
    "cantidad_insumos": 50.0,
    "unidad": "sacos",
    "descripcion": "Madera: Factor constructivo de 0.5 sacos..."
  }
}
```

---

## 🗄️ Cambios en Base de Datos

### Nueva Tabla: `Rendimiento_Constructivo`

```sql
CREATE TABLE Rendimiento_Constructivo (
  ID SERIAL PRIMARY KEY,
  Material_Estructural_ID INTEGER UNIQUE (FK),
  Factor_Rendimiento DECIMAL(8, 4),
  Insumo_Base VARCHAR(100),
  Unidad VARCHAR(50),
  Descripcion TEXT,
  Fecha_Creacion TIMESTAMP,
  Fecha_Actualizacion TIMESTAMP
);
```

**Características:**
- ✅ Relación 1:1 con Material_Estructural
- ✅ Precisión DECIMAL(8,4) para cálculos exactos
- ✅ Auditoría de cambios (timestamps)
- ✅ Descripción de cada rendimiento
- ✅ Índices para optimización

---

## 🐍 Cambios en Backend

### Nuevo Modelo ORM
```python
class RendimientoConstructivo(Base):
    __tablename__ = "rendimiento_constructivo"
    
    id = Column(Integer, primary_key=True, index=True)
    material_estructural_id = Column(Integer, ForeignKey("material_estructural.id"), unique=True)
    factor_rendimiento = Column(Numeric(8, 4), nullable=False)
    insumo_base = Column(String, nullable=False)
    unidad = Column(String, nullable=False, default="m²")
    descripcion = Column(String, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow)
```

### Lógica de Cálculo
```python
# En POST /api/simulacion/parametros

# 1. Consultar factor de BD
rendimiento = db.query(models.RendimientoConstructivo).filter(
    models.RendimientoConstructivo.material_estructural_id == material_id
).first()

# 2. Aplicar fórmula dinámicamente
cantidad_insumos = m2_totales * float(rendimiento.factor_rendimiento)

# 3. Retornar con estimación
return {
    "idSimulacion": id,
    "estimacion_insumos": {
        "cantidad_insumos": cantidad_insumos,
        ...
    }
}
```

---

## 📁 Archivos Creados/Modificados

### ✅ Creados

- `database/migrations/003_create_rendimiento_constructivo.sql` - Tabla
- `database/seeds/003_seed_rendimiento_constructivo.sql` - Datos iniciales
- `database/seeds/003_verify_rendimiento_constructivo.sql` - Verificación
- `database/DIAGRAMA_HU10.sql` - Diagrama de relaciones
- `backend/test_hu10.py` - Tests automatizados
- `docs/HU10_Matriz_Rendimientos.md` - Documentación técnica
- `CAMBIOS_HU10.md` - Resumen de cambios

### 🔄 Modificados

- `backend/models.py` - Agregado modelo RendimientoConstructivo
- `backend/main.py` - Agregados 2 endpoints GET y mejorado POST

---

## 🧪 Tests Incluidos

Se proporciona script `backend/test_hu10.py` con 7 casos de prueba:

```python
1. GET /api/rendimientos                    # Obtener todos
2. GET /api/rendimientos/1                  # Obtener Madera
3. GET /api/rendimientos/2                  # Obtener Metalcom
4. POST simulacion - Madera 100m²           # 100 × 0.5 = 50
5. POST simulacion - Albañilería 80m²       # 80 × 1.2 = 96
6. POST simulacion - Hormigón 120m²         # 120 × 1.5 = 180
7. POST simulacion - Metalcom 50m²          # 50 × 0.7 = 35
```

Ejecutar:
```bash
python backend/test_hu10.py
```

---

## ⚙️ Instalación y Ejecución

### 1️⃣ Aplicar Migraciones
```bash
psql -U postgres -d siec -f database/migrations/003_create_rendimiento_constructivo.sql
```

### 2️⃣ Aplicar Seeds
```bash
psql -U postgres -d siec -f database/seeds/003_seed_rendimiento_constructivo.sql
```

### 3️⃣ Verificar Integridad
```bash
psql -U postgres -d siec -f database/seeds/003_verify_rendimiento_constructivo.sql
```

### 4️⃣ Iniciar Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 5️⃣ Ejecutar Pruebas
```bash
python test_hu10.py
```

---

## 🎯 Criterios de Aceptación - ✅ COMPLETADOS

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Tabla relacional en BD | ✅ | `Rendimiento_Constructivo` creada |
| Asocia Material con Factor | ✅ | FK a `Material_Estructural` (1:1) |
| Endpoint retorna factores | ✅ | `GET /api/rendimientos/*` implementados |
| Cálculo dinámico | ✅ | `POST /api/simulacion/parametros` actualizado |
| Multiplicación m² × factor | ✅ | Implementado en backend |
| Sin hardcoding | ✅ | Valores en BD, no en código |

---

## 💡 Ventajas Implementadas

| Ventaja | Beneficio |
|---------|-----------|
| **Dinámico** | Cambios sin recompilación de código |
| **Mantenible** | Actualizar un valor = 1 UPDATE SQL |
| **Escalable** | Agregar materiales sin código |
| **Auditable** | Registro de cambios automático |
| **Validado** | Integridad referencial garantizada |
| **Preciso** | DECIMAL(8,4) para exactitud |
| **Desacoplado** | Lógica separada de datos |

---

## 🔮 Extensiones Futuras Opcionales

- [ ] Endpoint PUT para actualizar factores
- [ ] Endpoint POST para agregar rendimientos
- [ ] Múltiples insumos por material
- [ ] Variación por región/clima
- [ ] Historial de cambios de factores
- [ ] Análisis de costos históricos

---

## 📝 Notas Importantes

1. **Precisión**: Se usa `DECIMAL(8,4)` para exactitud constructiva
2. **Validaciones**: Se valida que material exista antes de calcular
3. **Auditoría**: Se registra fecha de creación y actualización
4. **Integridad**: FK con ON DELETE RESTRICT previene inconsistencias
5. **Indices**: Se crean para optimizar búsquedas frecuentes

---

## ✨ Estado Final

```
✅ Implementación Completada
✅ Tests Incluidos
✅ Documentación Completa
✅ Listo para Producción
```

---

**Desarrollo**: Abril 13, 2026  
**Versión**: 1.0  
**Estado**: 🟢 COMPLETADO
