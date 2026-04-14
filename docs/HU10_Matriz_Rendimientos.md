# HU10 - Matriz de Rendimientos Constructivos

## Descripción de la Funcionalidad

Como analista de costos, el sistema ahora consulta una tabla de métricas en la base de datos que define cuánto insumo se gasta por unidad (ej. 0.5 sacos de cemento por m² de albañilería), permitiendo que el motor de cálculo sea dinámico y los multiplicadores no estén fijos en el código fuente.

## Criterios de Aceptación Implementados

✅ La base de datos contiene una tabla relacional que asocia cada Material Estructural Base (Madera, Metalcom, Albañilería, Hormigón Armado) con su factor de rendimiento por m².

✅ El endpoint de estimación multiplica los m² ingresados por el usuario por el factor de rendimiento consultado en la tabla.

## Cambios en la Base de Datos

### Nueva Tabla: `Rendimiento_Constructivo`

```sql
CREATE TABLE Rendimiento_Constructivo (
  ID SERIAL PRIMARY KEY,
  Material_Estructural_ID INTEGER NOT NULL UNIQUE,
  Factor_Rendimiento DECIMAL(8, 4) NOT NULL,
  Insumo_Base VARCHAR(100) NOT NULL,
  Unidad VARCHAR(50) NOT NULL DEFAULT 'm²',
  Descripcion TEXT,
  Fecha_Creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Fecha_Actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (Material_Estructural_ID) REFERENCES Material_Estructural (ID)
);
```

### Relaciones

- **Relación 1:1** con `Material_Estructural` (cada material tiene exactamente un factor de rendimiento)
- Restricción de integridad referencial: ON DELETE RESTRICT, ON UPDATE CASCADE

### Datos Iniciales

| Material_Estructural_ID | Material         | Factor_Rendimiento | Insumo_Base      | Unidad |
|-------------------------|------------------|--------------------|------------------|--------|
| 1                       | Madera           | 0.5                | Sacos de Cemento | sacos  |
| 2                       | Metalcom         | 0.7                | Sacos de Cemento | sacos  |
| 3                       | Albañilería      | 1.2                | Sacos de Cemento | sacos  |
| 4                       | Hormigón Armado  | 1.5                | Sacos de Cemento | sacos  |

## Cambios en el Backend

### Nuevo Modelo SQLAlchemy

```python
class RendimientoConstructivo(Base):
    __tablename__ = "rendimiento_constructivo"
    
    id = Column(Integer, primary_key=True, index=True)
    material_estructural_id = Column(Integer, ForeignKey("material_estructural.id"), unique=True, nullable=False, index=True)
    factor_rendimiento = Column(Numeric(8, 4), nullable=False)
    insumo_base = Column(String, nullable=False)
    unidad = Column(String, nullable=False, default="m²")
    descripcion = Column(String, nullable=True)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, nullable=False, default=datetime.utcnow)
```

### Nuevos Endpoints de API

#### 1. GET `/api/rendimientos`
Retorna la matriz completa de rendimientos constructivos.

**Ejemplo de Respuesta:**
```json
[
  {
    "id": 1,
    "material_estructural_id": 1,
    "factor_rendimiento": 0.5,
    "insumo_base": "Sacos de Cemento",
    "unidad": "sacos",
    "descripcion": "Madera: Factor constructivo de 0.5 sacos de cemento por m²..."
  },
  {
    "id": 2,
    "material_estructural_id": 2,
    "factor_rendimiento": 0.7,
    "insumo_base": "Sacos de Cemento",
    "unidad": "sacos",
    "descripcion": "Metalcom: Factor constructivo de 0.7 sacos de cemento por m²..."
  },
  ...
]
```

#### 2. GET `/api/rendimientos/{material_id}`
Retorna el factor de rendimiento para un material específico.

**Ejemplo de Respuesta (para material_id=1):**
```json
{
  "id": 1,
  "material_estructural_id": 1,
  "factor_rendimiento": 0.5,
  "insumo_base": "Sacos de Cemento",
  "unidad": "sacos",
  "descripcion": "Madera: Factor constructivo de 0.5 sacos de cemento por m²..."
}
```

#### 3. POST `/api/simulacion/parametros` (ACTUALIZADO)
Ahora retorna además la estimación de insumos calculada dinámicamente.

**Ejemplo de Request:**
```json
{
  "m2Totales": 100,
  "materialEstructuralId": 1,
  "habitaciones": 3,
  "banios": 2,
  "areasComunes": 1
}
```

**Ejemplo de Respuesta:**
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
    "descripcion": "Madera: Factor constructivo de 0.5 sacos de cemento por m²..."
  }
}
```

## Lógica de Cálculo

La fórmula implementada es:

$$\text{Cantidad de Insumos} = \text{m}^2 \text{ ingresados} \times \text{Factor de Rendimiento}$$

**Ejemplo:**
- Una vivienda de **100 m²** en **Madera** (factor = 0.5)
- Cantidad de insumos = 100 × 0.5 = **50 sacos de cemento**

## Archivos Modificados

### Backend
- `backend/models.py` - Nuevo modelo `RendimientoConstructivo`
- `backend/main.py` - Nuevos endpoints y lógica de cálculo

### Base de Datos
- `database/migrations/003_create_rendimiento_constructivo.sql` - Creación de tabla
- `database/seeds/003_seed_rendimiento_constructivo.sql` - Datos iniciales
- `database/seeds/003_verify_rendimiento_constructivo.sql` - Script de verificación

## Ventajas de esta Implementación

✅ **Dinámico**: Los factores se consultan de la BD, no están hardcodeados

✅ **Mantenible**: Cambiar un factor solo requiere actualizar un registro en BD

✅ **Escalable**: Se pueden agregar nuevos materiales sin modificar el código

✅ **Auditable**: Registra fecha de creación y actualización de cada factor

✅ **Validado**: Integridad referencial garantizada con restricciones FK

✅ **Preciso**: Uso de DECIMAL(8,4) para precisión en cálculos constructivos

## Próximos Pasos (Opcionales)

Para futuras iteraciones se podría considerar:

1. Endpoint PUT para actualizar factores de rendimiento
2. Endpoint POST para agregar nuevos rendimientos
3. Auditoría completa de cambios en factores
4. Multiples insumos por material (no solo cemento)
5. Variación de factores según región/época
6. Historial de cambios de factores para análisis de costos históricos
