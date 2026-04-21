from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import unicodedata
import os
from collections import defaultdict
from schemas import DesgloseResponse, CategoriaDesglose, InsumoCalculado

# Importar configuración de BD y Modelos
from database import engine, get_db, SessionLocal
import models

# Crear tablas
# Crear tablas (movido a startup)

app = FastAPI(title="SIEC API", version="1.0.0")

# CORS — permite que el frontend en localhost:5173 llame a la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "http://10.51.0.26:5173"  # IP del Frontend en el servidor de despliegue
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Seeding de datos iniciales
@app.on_event("startup")
def startup_event():
    # Inicializar tablas aquí para evitar crash sin DB al importar (Testing)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Verificar si ya existen tipos de recinto
        if db.query(models.TipoRecinto).count() == 0:
            print("Poblando Base de Datos con Tipos de Recinto...")
            tipos_iniciales = [
                models.TipoRecinto(nombre="Habitación", costo_tokens=9),
                models.TipoRecinto(nombre="Baño", costo_tokens=4),
                models.TipoRecinto(nombre="Área Común", costo_tokens=12),
            ]
            db.add_all(tipos_iniciales)
            db.commit()
    finally:
        db.close()

# Materiales permitidos según requerimientos
ALLOWED_MATERIALS = ["Madera", "Metalcom", "Albañilería", "Hormigón Armado"]

# Recargo obligatorio por leyes sociales (28% - 29%). Ajustable vía variable de entorno SOCIAL_LEY_FACTOR.
try:
    SOCIAL_LEY_FACTOR = float(os.getenv("SOCIAL_LEY_FACTOR", "1.28"))
except Exception:
    SOCIAL_LEY_FACTOR = 1.28
# Validar rango permitido: 1.28 <= factor <= 1.29
if SOCIAL_LEY_FACTOR < 1.28 or SOCIAL_LEY_FACTOR > 1.29:
    SOCIAL_LEY_FACTOR = 1.28  # Valor por defecto si la variable de entorno está fuera de rango

class ProjectConfig(BaseModel):
    material_estructural: str

class TipoRecintoResponse(BaseModel):
    id: int
    nombre: str
    costo_tokens: int

    class Config:
        from_attributes = True

class SimulacionCreate(BaseModel):
    m2Totales: int
    materialEstructuralId: int
    habitaciones: int
    banios: int
    areasComunes: int

@app.get("/")
def read_root():
    return {"message": "SIEC API is running", "stack": "FastAPI + PostgreSQL"}

@app.get("/materials")
def get_materials():
    """Retorna la lista oficial de materiales estructurales."""
    return {"materials": ALLOWED_MATERIALS}

@app.get("/api/tipos-recinto", response_model=List[TipoRecintoResponse])
def get_tipos_recinto(db: Session = Depends(get_db)):
    """Retorna los tipos de recinto y su costo en tokens (Catálogo para motor de estimación)."""
    return db.query(models.TipoRecinto).all()

@app.post("/api/simulacion/parametros", status_code=status.HTTP_201_CREATED)
def crear_simulacion(sim: SimulacionCreate, db: Session = Depends(get_db)):
    """Guarda los parámetros de configuración de la vivienda y crea una nueva simulación."""
    
    # Validaciones obligatorias
    if sim.m2Totales < 15 or sim.m2Totales > 200:
        raise HTTPException(status_code=400, detail="Superficie total debe estar entre 15 y 200 m².")
    
    if sim.habitaciones < 0 or sim.banios < 0 or sim.areasComunes < 0:
        raise HTTPException(status_code=400, detail="La cantidad de recintos no puede ser negativa.")
        
    if sim.materialEstructuralId not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="Material estructural ID no válido.")
        
    # Crear modelo
    db_simulacion = models.ConfiguracionSimulacion(
        m2_totales=sim.m2Totales,
        material_estructural_id=sim.materialEstructuralId,
        habitaciones=sim.habitaciones,
        banios=sim.banios,
        areas_comunes=sim.areasComunes
    )
    
    try:
        db.add(db_simulacion)
        db.commit()
        db.refresh(db_simulacion)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al guardar en la base de datos.")
        
    return {"idSimulacion": db_simulacion.id, "message": "Simulación guardada correctamente"}

def normalize_string(s: str) -> str:
    """Remueve acentos y pasa a minúsculas para comparaciones robustas."""
    return "".join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')

class RecintoGeometrico(BaseModel):
    tipo: str = Field(..., description="Nombre del tipo de recinto (ej. 'Habitación', 'Baño')")
    ancho: float = Field(..., description="Ancho geométrico del recinto en metros")
    largo: float = Field(..., description="Largo geométrico del recinto en metros")

class PayloadLayout3D(BaseModel):
    recintos: List[RecintoGeometrico]

@app.post("/api/simulacion/{simulacion_id}/layout", status_code=status.HTTP_201_CREATED)
def asociar_y_validar_layout_estricto(simulacion_id: int, payload: PayloadLayout3D, db: Session = Depends(get_db)):
    """
    Validación estricta de la disposición 3D:
    - Asegura que los m2 totales combinados <= m2 totales de la simulación.
    - Asegura que el área de CADA recinto individual sea >= el costo nativo en tokens del mismo.
    """
    # 1. Recuperar simulación de la base de datos
    simulacion = db.query(models.ConfiguracionSimulacion).filter(models.ConfiguracionSimulacion.id == simulacion_id).first()
    if not simulacion:
        raise HTTPException(status_code=404, detail="La simulación especificada no existe.")
        
    # 2. Precargar costos de tokens base para validación
    cat_tipos = db.query(models.TipoRecinto).all()
    # Mapeo relajado de strings (ej: 'Baño' -> 'bano')
    costo_por_tipo = { normalize_string(t.nombre): t.costo_tokens for t in cat_tipos }
    
    # Agregamos alias por si el frontend usa sufijos
    costo_por_tipo["habitacion simple"] = costo_por_tipo.get("habitacion", 9)
    costo_por_tipo["habitacion doble"] = costo_por_tipo.get("habitacion", 9)
    costo_por_tipo["habitacion triple"] = costo_por_tipo.get("habitacion", 9)
    costo_por_tipo["area comun"] = costo_por_tipo.get("area comun", 12)

    area_total_acumulada = 0.0
    
    # 3. Iterar cada recinto recibido
    for recinto in payload.recintos:
        area_recinto = recinto.ancho * recinto.largo
        area_total_acumulada += area_recinto
        
        tipo_normalizado = normalize_string(recinto.tipo)
        if tipo_normalizado in costo_por_tipo:
            min_legal_area = float(costo_por_tipo[tipo_normalizado])
            # Validación de Tamaño Mínimo (Tope Inferior Normativo)
            if area_recinto < min_legal_area:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Validación estricta falló: El cuarto tipo '{recinto.tipo}' tiene un área geométrica de {area_recinto:.2f} m², lo cual es inferior al requerimiento mínimo por token de {min_legal_area} m²."
                )

    # 4. Validación de Capacidad Máxima (Tope Superior)
    if area_total_acumulada > float(simulacion.m2_totales):
        raise HTTPException(
            status_code=400, 
            detail=f"Validación estricta falló: La suma total de áreas ingresadas ({area_total_acumulada:.2f} m²) excede los metros cuadrados disponibles en la simulación base ({simulacion.m2_totales} m²)."
        )

    # Si pasa todas las validaciones asocia el modelo de forma íntegra a DB
    # Nota: Acá expandiríamos lógica de DB.commit() con los Recintos 3D hacia el modelo
    return {
        "status": "success",
        "message": "Validaciones estrictas pasadas. Configuración del plano íntegro.",
        "area_total_calculada": area_total_acumulada,
        "limite_m2_disponibles": simulacion.m2_totales
    }

@app.post("/api/simulacion/{simulacion_id}/calcular-insumos", response_model=DesgloseResponse)
def calcular_insumos(simulacion_id: int, db: Session = Depends(get_db)):
    """
    Calcula el desglose de insumos para una simulación usando la Matriz de Rendimiento.
    """
    # 1. Recuperar simulacion
    simulacion = db.query(models.ConfiguracionSimulacion).filter(models.ConfiguracionSimulacion.id == simulacion_id).first()
    if not simulacion:
        raise HTTPException(status_code=404, detail="La simulación especificada no existe.")
        
    m2_totales = simulacion.m2_totales
    material_id = simulacion.material_estructural_id

    # 2. Material nombre
    material = db.query(models.MaterialEstructural).filter(models.MaterialEstructural.id == material_id).first()
    material_nombre = material.nombre if material else "Desconocido"

    # 3. Consultar la matriz cruzada con insumos
    datos_rendimiento = db.query(models.MatrizRendimiento, models.Insumo).join(
        models.Insumo, 
        models.MatrizRendimiento.insumo_id == models.Insumo.id
    ).filter(
        models.MatrizRendimiento.material_estructural_id == material_id,
        models.MatrizRendimiento.activo == True,
        models.Insumo.activo == True
    ).all()

    if not datos_rendimiento:
        raise HTTPException(status_code=422, detail="No existen rendimientos para el material seleccionado")

    # Promediador de Precios de Mercado
    insumo_ids = [insumo.id for r, insumo in datos_rendimiento]
    
    precios_records = db.query(models.PrecioMercado).distinct(
        models.PrecioMercado.insumo_id, 
        models.PrecioMercado.tienda
    ).filter(
        models.PrecioMercado.exitoso == True,
        models.PrecioMercado.insumo_id.in_(insumo_ids)
    ).order_by(
        models.PrecioMercado.insumo_id, 
        models.PrecioMercado.tienda, 
        models.PrecioMercado.fecha_scraping.desc()
    ).all()
    
    precios_x_insumo = defaultdict(list)
    fechas_usadas = []
    
    for pm in precios_records:
        precio_val = pm.precio_descuento if pm.precio_descuento is not None else pm.precio
        if precio_val is not None:
            precios_x_insumo[pm.insumo_id].append(float(precio_val))
            if pm.fecha_scraping:
                fechas_usadas.append(pm.fecha_scraping.isoformat() if hasattr(pm.fecha_scraping, 'isoformat') else str(pm.fecha_scraping))
                
    precio_promedio_map = {}
    for i_id, lista_precios in precios_x_insumo.items():
        if lista_precios:
            precio_promedio_map[i_id] = sum(lista_precios) / len(lista_precios)
            
    fecha_precios = min(fechas_usadas) if fechas_usadas else None

    # 4. Agrupar por categoria y calcular subtotales
    categorias_dict = defaultdict(list)
    costo_total_simulacion = None
    
    for r, insumo in datos_rendimiento:
        cantidad_calc = float(r.factor_multiplicador) * m2_totales
        
        precio_unit = precio_promedio_map.get(insumo.id)
        subt = None
        if precio_unit is not None:
            subt = precio_unit * cantidad_calc
            # Aplicar recargo obligatorio por leyes sociales solo para Mano de Obra
            try:
                categoria_normalizada = insumo.categoria.strip().lower() if insumo.categoria else ""
            except Exception:
                categoria_normalizada = ""
            if categoria_normalizada == 'mano de obra':
                subt = subt * SOCIAL_LEY_FACTOR
            if costo_total_simulacion is None:
                costo_total_simulacion = 0.0
            costo_total_simulacion += subt
            
        item = InsumoCalculado(
            insumo=insumo.nombre,
            cantidad=cantidad_calc,
            unidad=insumo.unidad_medida,
            precio_unitario=precio_unit,
            subtotal=subt
        )
        categorias_dict[insumo.categoria].append(item)
        
    # 5. Mapear a Schema
    desglose_list = []
    for cat_name, items in categorias_dict.items():
        has_subt = any(i.subtotal is not None for i in items)
        subcat = sum((i.subtotal for i in items if i.subtotal is not None)) if has_subt else None
        
        desglose_list.append(CategoriaDesglose(
            categoria=cat_name, 
            items=items, 
            subtotal_categoria=subcat
        ))
        
    return DesgloseResponse(
        simulacion_id=simulacion_id,
        m2_totales=m2_totales,
        material=material_nombre,
        desglose=desglose_list,
        costo_total=costo_total_simulacion,
        fecha_precios=fecha_precios
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
