from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os

from backend.database import engine, SessionLocal
import backend.models as models
from backend.apu import normalize_precio_unit, compute_tarifa_pura_local, apply_social_ley_factor, HOURS_PER_DAY, SOCIAL_LEY_FACTOR

from backend.schemas import DesgloseResponse, CategoriaDesglose, InsumoCalculado

app = FastAPI(title='SIEC API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Create tables if not exist
    models.Base.metadata.create_all(bind=engine)
    # Try to run normalization script if available
    try:
        from backend.scripts.normalize_unidad_mano_obra import normalize_unidad_mano_obra
        normalize_unidad_mano_obra(os.getenv('DATABASE_URL', None))
    except Exception:
        pass

@app.post("/api/simulacion/{simulacion_id}/calcular-insumos", response_model=DesgloseResponse)
def calcular_insumos(simulacion_id: int, db: Session = Depends(lambda: next(SessionLocal()))):
    simulacion = db.query(models.ConfiguracionSimulacion).filter(models.ConfiguracionSimulacion.id == simulacion_id).first()
    if not simulacion:
        raise HTTPException(status_code=404, detail='Simulación no encontrada')
    m2_totales = simulacion.m2_totales
    material_id = simulacion.material_estructural_id

    datos = db.query(models.MatrizRendimiento, models.Insumo).join(models.Insumo, models.MatrizRendimiento.insumo_id == models.Insumo.id).filter(
        models.MatrizRendimiento.material_estructural_id == material_id,
        models.MatrizRendimiento.activo == True,
        models.Insumo.activo == True
    ).all()
    if not datos:
        raise HTTPException(status_code=422, detail='No existen rendimientos para el material seleccionado')

    # build price maps
    insumo_ids = [insumo.id for r, insumo in datos]
    precios_records = db.query(models.PrecioMercado).filter(models.PrecioMercado.exitoso == True, models.PrecioMercado.insumo_id.in_(insumo_ids)).order_by(models.PrecioMercado.insumo_id, models.PrecioMercado.fecha_scraping.desc()).all()
    precios_x_insumo = {}
    latest_precio = {}
    for pm in precios_records:
        p = pm.precio_descuento if pm.precio_descuento is not None else pm.precio
        if p is None:
            continue
        precios_x_insumo.setdefault(pm.insumo_id, []).append(float(p))
        if pm.insumo_id not in latest_precio:
            latest_precio[pm.insumo_id] = pm

    precio_promedio_map = {i: (sum(vals)/len(vals)) for i, vals in precios_x_insumo.items() if vals}

    # compute rendimiento jornadas total
    rendimiento_jornadas_total = 0.0
    for r, insumo in datos:
        unidad_factor = (r.unidad_factor or '').lower()
        try:
            if 'jornada' in unidad_factor or 'jornad' in unidad_factor:
                jornadas = float(r.factor_multiplicador)
            else:
                jornadas = float(r.factor_multiplicador) / float(HOURS_PER_DAY)
        except Exception:
            try:
                jornadas = float(r.factor_multiplicador) / float(HOURS_PER_DAY)
            except Exception:
                jornadas = 0.0
        rendimiento_jornadas_total += jornadas

    # collect labor insumos for tarifa_pura_local
    labor_insumos = []
    for r, insumo in datos:
        if (insumo.categoria or '').strip().lower() == 'mano de obra':
            # get latest price record
            pm = latest_precio.get(insumo.id)
            precio = None
            nombre_prod = None
            if pm:
                precio = pm.precio_descuento if pm.precio_descuento is not None else pm.precio
                nombre_prod = pm.nombre_producto
            else:
                precio = precio_promedio_map.get(insumo.id)
            role_entry = db.query(models.InsumoRole).filter(models.InsumoRole.insumo_id == insumo.id).first()
            role_val = role_entry.role if role_entry else None
            labor_insumos.append({
                'id': insumo.id,
                'nombre': insumo.nombre,
                'unidad_medida': insumo.unidad_medida,
                'precio': precio,
                'precio_nombre': nombre_prod,
                'role': role_val
            })

    tarifa_pura_local = compute_tarifa_pura_local(labor_insumos, rendimiento_jornadas_total)

    categorias = {}
    costo_total_sim = 0.0
    fecha_precios = None
    for r, insumo in datos:
        cantidad_calc = float(r.factor_multiplicador) * m2_totales
        precio_unit = precio_promedio_map.get(insumo.id)
        precio_record = latest_precio.get(insumo.id)
        precio_unit_normalized = None
        subt = None
        if precio_unit is not None:
            precio_unit_normalized = float(precio_unit)
            unidad_esperada = (insumo.unidad_medida or '').strip().upper()
            if unidad_esperada in ('HH', 'H') and precio_record is not None and ('jornada' in (precio_record.nombre_producto or '').lower()):
                try:
                    precio_unit_normalized = precio_unit_normalized / float(HOURS_PER_DAY)
                except Exception:
                    pass
            subt = precio_unit_normalized * cantidad_calc
            if (insumo.categoria or '').strip().lower() == 'mano de obra':
                subt = apply_social_ley_factor(subt, insumo.categoria)
            costo_total_sim = (costo_total_sim or 0.0) + subt
        item = InsumoCalculado(
            insumo=insumo.nombre,
            cantidad=cantidad_calc,
            unidad=insumo.unidad_medida,
            precio_unitario=precio_unit,
            subtotal=subt
        )
        categorias.setdefault(insumo.categoria, []).append(item)

    desglose_list = []
    for cat, items in categorias.items():
        subcat = sum(i.subtotal for i in items if i.subtotal is not None) if any(i.subtotal is not None for i in items) else None
        desglose_list.append(CategoriaDesglose(categoria=cat, items=items, subtotal_categoria=subcat))

    porcentaje_retenido = round((SOCIAL_LEY_FACTOR - 1.0) * 100.0, 2)
    return DesgloseResponse(simulacion_id=simulacion_id, m2_totales=m2_totales, material='', desglose=desglose_list, costo_total=costo_total_sim, fecha_precios=fecha_precios, tarifa_pura_local=tarifa_pura_local, porcentaje_retenido_leyes_sociales=porcentaje_retenido)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
