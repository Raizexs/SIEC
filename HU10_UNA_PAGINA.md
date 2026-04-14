# 📄 HU10 - UNA PÁGINA (TODO LO QUE NECESITAS SABER)

## ¿QUÉ ES?
Sistema que permite consultar dinámicamente cuánto insumo (cemento) se necesita por m², según material. **ANTES**: Valores fijos en código. **AHORA**: Valores en BD, actualizables en 30 segundos.

## TABLA CREADA
```sql
Rendimiento_Constructivo (
  Material_Estructural_ID: FK (Madera, Metalcom, Albañilería, Hormigón)
  Factor_Rendimiento: DECIMAL (0.5, 0.7, 1.2, 1.5)
  Insumo_Base: "Sacos de Cemento"
  Timestamps: fecha_creacion, fecha_actualizacion
)
```

## FÓRMULA
`cantidad_insumos = m² × factor_rendimiento`
- 100 m² Madera (0.5) = 50 sacos
- 100 m² Metalcom (0.7) = 70 sacos  
- 100 m² Albañilería (1.2) = 120 sacos
- 100 m² Hormigón (1.5) = 150 sacos

## ENDPOINTS
```
GET  /api/rendimientos              → Array de 4 rendimientos
GET  /api/rendimientos/{id}         → 1 rendimiento específico
POST /api/simulacion/parametros     → Crea simulación CON estimación
```

## RESPUESTA POST (NUEVO)
```json
{
  "idSimulacion": 5,
  "estimacion_insumos": {
    "m2_ingresados": 100,
    "factor_rendimiento": 0.5,
    "cantidad_insumos": 50.0,      ← NUEVO
    "unidad": "sacos"
  }
}
```

## INSTALACIÓN (5 MIN)
```bash
# 1. Migración
psql -U postgres -d siec -f database/migrations/003_create_rendimiento_constructivo.sql

# 2. Seeds
psql -U postgres -d siec -f database/seeds/003_seed_rendimiento_constructivo.sql

# 3. Backend
cd backend && python main.py

# 4. Tests
python test_hu10.py
```

## ARCHIVOS CREADOS
- `database/migrations/003_create_rendimiento_constructivo.sql`
- `database/seeds/003_seed_rendimiento_constructivo.sql`
- `database/seeds/003_verify_rendimiento_constructivo.sql`
- `backend/test_hu10.py` (7 tests)
- `docs/HU10_Matriz_Rendimientos.md` (especificación)
- `CAMBIOS_HU10.md`, `RESUMEN_HU10.md`, `CHECKLIST_HU10.md`
- `INTEGRACION_FRONTEND_HU10.md` (código Vue)
- `database/DIAGRAMA_HU10.sql` (queries)

## ARCHIVOS MODIFICADOS
- `backend/models.py` - Nuevo modelo RendimientoConstructivo
- `backend/main.py` - 3 endpoints (2 GET, 1 POST mejorado)

## CRITERIOS DE ACEPTACIÓN ✅
✅ Tabla relacional en BD asocia materiales con factores
✅ Endpoint retorna factores dinámicamente
✅ POST multiplica m² × factor automáticamente
✅ Motor de cálculo sin hardcoding

## LEER PRIMERO
1. `docs/RESUMEN_VISUAL_HU10.md` - Vista general gráfica
2. `RESUMEN_HU10.md` - Ejecutivo con ejemplos
3. `INICIO_RAPIDO_HU10.md` - Pasos rápidos

## TESTS INCLUIDOS (7)
- GET /api/rendimientos
- GET /api/rendimientos/1 (Madera)
- GET /api/rendimientos/2 (Metalcom)
- POST Madera 100m² → 50 sacos ✓
- POST Albañilería 80m² → 96 sacos ✓
- POST Hormigón 120m² → 180 sacos ✓
- POST Metalcom 50m² → 35 sacos ✓

## VENTAJAS
| Antes | Ahora |
|-------|-------|
| Hardcodeado | Dinámico |
| Cambio = redeploy | Cambio = 1 UPDATE SQL |
| No auditable | Timestamps automáticos |
| Inflexible | Escalable |

## CAMBIAR FACTOR (EJEMPLO)
```sql
-- Si Madera debe cambiar de 0.5 a 0.6:
UPDATE Rendimiento_Constructivo
SET factor_rendimiento = 0.6
WHERE material_estructural_id = 1;
-- ✅ Listo! Todos los cálculos nuevos usan 0.6 automáticamente
```

## ESTADO
✅ Implementación completada
✅ Tests pasando (7/7)
✅ Documentación exhaustiva
✅ Listo para producción

## PRÓXIMO PASO
Integrar endpoints en frontend usando ejemplos de:
→ `INTEGRACION_FRONTEND_HU10.md` (composables y componentes Vue)

---

**Información técnica completa en**: `docs/HU10_Matriz_Rendimientos.md`
**Ejemplos de código en**: `INTEGRACION_FRONTEND_HU10.md`
**Queries SQL en**: `database/DIAGRAMA_HU10.sql`
