# SCRUM-37: Tabla de Configuración de Simulación

## 📋 Descripción

Crear la tabla `Configuracion_Simulacion` que persista los parámetros completos de cada simulación creada por el usuario. Debe almacenar: m² totales, ID del material estructural seleccionado, cantidad de cada tipo de recinto (habitaciones, baños, áreas comunes), y la fecha de creación del registro.

## 🎯 Criterios de Aceptación

- ✅ La tabla existe con todos los campos requeridos
- ✅ Claves foráneas hacia `Material_Estructural` mantienen integridad referencial
- ✅ Un registro insertado directamente en BD es legible y contiene todos los campos sin nulos donde no corresponde
- ✅ Restricciones CHECK validan rangos correctos
- ✅ Índices optimizan consultas frecuentes
- ✅ Scripts de migración y verificación funcionan correctamente

## 📊 Estructura de la Tabla

```sql
CREATE TABLE Configuracion_Simulacion (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  M2_Totales INTEGER NOT NULL CHECK (M2_Totales >= 15 AND M2_Totales <= 1000),
  Material_Estructural_ID INTEGER NOT NULL,
  Habitaciones INTEGER NOT NULL DEFAULT 0 CHECK (Habitaciones >= 0),
  Banios INTEGER NOT NULL DEFAULT 0 CHECK (Banios >= 0),
  Areas_Comunes INTEGER NOT NULL DEFAULT 0 CHECK (Areas_Comunes >= 0),
  Fecha_Creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (Material_Estructural_ID) REFERENCES Material_Estructural (ID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);
```

### Campos Detallados

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `ID` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Identificador único de simulación |
| `M2_Totales` | INTEGER | NOT NULL, CHECK (15-1000) | Metros cuadrados totales |
| `Material_Estructural_ID` | INTEGER | NOT NULL, FK | Referencia a tipo de material |
| `Habitaciones` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>=0) | Cantidad de habitaciones |
| `Banios` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>=0) | Cantidad de baños |
| `Areas_Comunes` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>=0) | Cantidad de áreas comunes |
| `Fecha_Creacion` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Fecha/hora de creación automática |

## 🔐 Integridad Referencial

### Clave Foránea a Material_Estructural

```sql
FOREIGN KEY (Material_Estructural_ID) REFERENCES Material_Estructural (ID)
  ON DELETE RESTRICT        -- No permite eliminar material si hay simulaciones
  ON UPDATE CASCADE         -- Si cambia ID del material, se actualiza aquí
```

**Validaciones:**
- No se puede insertar una simulación con `Material_Estructural_ID` que no exista
- No se puede eliminar un material si hay simulaciones que lo usan
- Si el ID de un material cambia, se actualiza automáticamente

## 📈 Índices para Optimización

```sql
-- Búsquedas por fecha (queries ordenadas)
CREATE INDEX idx_configuracion_fecha 
  ON Configuracion_Simulacion (Fecha_Creacion DESC);

-- Joins rápidos con Material_Estructural
CREATE INDEX idx_configuracion_material 
  ON Configuracion_Simulacion (Material_Estructural_ID);
```

## ✅ Restricciones CHECK

1. **M2_Totales:** `15 <= valor <= 1000`
   - Mínimo: 15 m² (vivienda mínima)
   - Máximo: 1000 m² (límite del sistema)

2. **Habitaciones:** `valor >= 0`
   - No puede ser negativo
   - Valor por defecto: 0

3. **Banios:** `valor >= 0`
   - No puede ser negativo
   - Valor por defecto: 0

4. **Areas_Comunes:** `valor >= 0`
   - No puede ser negativo
   - Valor por defecto: 0

## 📝 Ejemplos de Uso

### Insertar una simulación

```sql
INSERT INTO Configuracion_Simulacion 
  (M2_Totales, Material_Estructural_ID, Habitaciones, Banios, Areas_Comunes)
VALUES 
  (100, 4, 3, 2, 1);
-- Resultado: ID 1, Fecha_Creacion = ahora automáticamente
```

### Consultar simulación con material

```sql
SELECT 
  cs.ID,
  cs.M2_Totales,
  me.Nombre as Material,
  cs.Habitaciones,
  cs.Banios,
  cs.Areas_Comunes,
  cs.Fecha_Creacion
FROM Configuracion_Simulacion cs
INNER JOIN Material_Estructural me ON cs.Material_Estructural_ID = me.ID
WHERE cs.ID = 1;
```

### Validar integridad referencial

```sql
-- Verificar que todos los materiales existan
SELECT cs.ID, cs.Material_Estructural_ID 
FROM Configuracion_Simulacion cs
LEFT JOIN Material_Estructural me ON cs.Material_Estructural_ID = me.ID
WHERE me.ID IS NULL;
-- Resultado: 0 filas (todas las referencias son válidas)
```

## 📂 Archivos Entregados

### 1. Migración
- **`database/migrations/002_create_configuracion_simulacion.sql`**
  - Define la tabla con todas las restricciones
  - Crea índices de optimización
  - Incluye comentarios detallados

### 2. Seeds
- **`database/seeds/002_seed_configuracion_simulacion.sql`**
  - 5 simulaciones de prueba con diferentes materiales
  - Datos válidos que respetan todas las restricciones
  - INSERT OR IGNORE para idempotencia

### 3. Verificación
- **`database/seeds/002_verify_configuracion_simulacion.sql`**
  - 9 queries de validación automática
  - Verifica estructura, índices, restricciones, integridad referencial
  - Documentado con resultados esperados

### 4. Especificación
- **`docs/SCRUM-37.md`** (este archivo)
  - Documentación completa de la tabla
  - Explicación de restricciones y validaciones
  - Ejemplos de uso

## 🧪 Validaciones Implementadas

✅ **Validación de Rango (M2_Totales):** 15-1000  
✅ **Validación de No-negatividad:** Recintos >= 0  
✅ **Integridad Referencial:** Material debe existir  
✅ **Restrict Delete:** No permite eliminar materiales en uso  
✅ **Cascade Update:** Actualiza FK si cambia material ID  
✅ **Timestamp Automático:** Fecha creación se asigna al insertar  
✅ **Índices Optimizados:** Búsquedas rápidas por fecha y material  

## 🔄 Relación con Otras Tablas

```
Material_Estructural
    ↓ (1:N)
    └─→ Configuracion_Simulacion
```

- Cada `Material_Estructural` puede tener múltiples simulaciones
- Cada `Configuracion_Simulacion` pertenece a exactamente un material
- No se puede eliminar un material si tiene simulaciones asociadas

## 🚀 Próximos Pasos

1. **SCRUM-38:** Endpoint de Guardado de Parámetros
   - Usar esta tabla para persistir simulaciones
   - `POST /api/simulacion/parametros` inserta aquí

2. **SCRUM-39:** Endpoint de Lectura de Parámetros
   - Leer esta tabla
   - `GET /api/simulacion/:id/parametros` consulta aquí

3. **SCRUM-40:** Conexión Formulario/Backend
   - Frontend usa SCRUM-38 y SCRUM-39

## 📌 Notas Importantes

- La tabla SQLite es muy similar a la que ya estaba en `db.js` de SCRUM-30
- Se adiciona aquí como migración formal para mejor control de versiones
- Restricciones CHECK proporcionan validación a nivel de BD
- Índices mejoran rendimiento de queries frecuentes (por fecha, por material)
- ON DELETE RESTRICT protege integridad referencial (no permite "orfandad" de datos)

---

**Asignado a:** Gonzalo Jara  
**Sprint:** Sprint 1 - Motorización  
**Épica:** SCRUM-17 (HU01 - Configuración de Parámetros Base)  
**Fecha:** 30 de Marzo, 2026
