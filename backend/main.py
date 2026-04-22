from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import unicodedata
from fastapi.middleware.cors import CORSMiddleware

# Importar configuración de BD y Modelos
from database import engine, get_db, SessionLocal
import models
from regulatory_validator import regulatory_validator, RegulatoryValidationResult

# Crear tablas
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SIEC API", version="1.0.0")

# Habilitar CORS para que el frontend pueda hacer requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seeding de datos iniciales
@app.on_event("startup")
def startup_event():
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
        
        # Verificar si ya existen materiales estructurales
        if db.query(models.MaterialEstructural).count() == 0:
            print("Poblando Base de Datos con Materiales Estructurales...")
            materiales_iniciales = [
                models.MaterialEstructural(nombre="Madera"),
                models.MaterialEstructural(nombre="Metalcom"),
                models.MaterialEstructural(nombre="Albañilería"),
                models.MaterialEstructural(nombre="Hormigón Armado"),
            ]
            db.add_all(materiales_iniciales)
            db.commit()
    finally:
        db.close()

def get_allowed_materials(db: Session) -> List[str]:
    """Consulta la tabla material_estructural para obtener materiales permitidos."""
    return [m.nombre for m in db.query(models.MaterialEstructural).all()]

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

class RendimientoConstructivoResponse(BaseModel):
    id: int
    material_estructural_id: int
    factor_rendimiento: float
    insumo_base: str
    unidad: str
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True

class EstimacionResponse(BaseModel):
    m2_ingresados: int
    material_estructural_id: int
    factor_rendimiento: float
    insumo_base: str
    cantidad_insumos: float
    unidad: str
    descripcion: str

    class Config:
        from_attributes = True

@app.get("/")
def read_root():
    return {"message": "SIEC API is running", "stack": "FastAPI + PostgreSQL"}

@app.get("/materials")
def get_materials(db: Session = Depends(get_db)):
    """Retorna la lista oficial de materiales estructurales desde la base de datos."""
    materials = get_allowed_materials(db)
    return {"materials": materials}

@app.get("/api/tipos-recinto", response_model=List[TipoRecintoResponse])
def get_tipos_recinto(db: Session = Depends(get_db)):
    """Retorna los tipos de recinto y su costo en tokens (Catálogo para motor de estimación)."""
    return db.query(models.TipoRecinto).all()

@app.get("/api/rendimientos", response_model=List[RendimientoConstructivoResponse])
def get_rendimientos(db: Session = Depends(get_db)):
    """Retorna la matriz de rendimientos constructivos con los factores dinámicos para cada material."""
    return db.query(models.RendimientoConstructivo).all()

@app.get("/api/rendimientos/{material_id}", response_model=RendimientoConstructivoResponse)
def get_rendimiento_por_material(material_id: int, db: Session = Depends(get_db)):
    """Retorna el factor de rendimiento para un material específico."""
    rendimiento = db.query(models.RendimientoConstructivo).filter(
        models.RendimientoConstructivo.material_estructural_id == material_id
    ).first()
    
    if not rendimiento:
        raise HTTPException(status_code=404, detail=f"No se encontró rendimiento para el material ID {material_id}.")
    
    return rendimiento

@app.post("/api/simulacion/parametros", status_code=status.HTTP_201_CREATED)
def crear_simulacion(sim: SimulacionCreate, db: Session = Depends(get_db)):
    """Guarda los parámetros de configuración de la vivienda y crea una nueva simulación.
    
    También calcula la estimación de insumos usando el factor de rendimiento dinámico
    consultado de la base de datos.
    """
    
    # Validaciones obligatorias
    if sim.m2Totales < 15 or sim.m2Totales > 200:
        raise HTTPException(status_code=400, detail="Superficie total debe estar entre 15 y 200 m².")
    
    if sim.habitaciones < 0 or sim.banios < 0 or sim.areasComunes < 0:
        raise HTTPException(status_code=400, detail="La cantidad de recintos no puede ser negativa.")
    
    # Validar que el material existe en la tabla
    material = db.query(models.MaterialEstructural).filter(
        models.MaterialEstructural.id == sim.materialEstructuralId
    ).first()
    
    if not material:
        raise HTTPException(status_code=400, detail="Material estructural ID no válido.")
    
    # Consultar el factor de rendimiento desde la BD
    rendimiento = db.query(models.RendimientoConstructivo).filter(
        models.RendimientoConstructivo.material_estructural_id == sim.materialEstructuralId
    ).first()
    
    if not rendimiento:
        raise HTTPException(
            status_code=404, 
            detail=f"No se encontró factor de rendimiento para el material ID {sim.materialEstructuralId}."
        )
    
    # Calcular cantidad de insumos = m² * factor de rendimiento
    cantidad_insumos = float(sim.m2Totales) * float(rendimiento.factor_rendimiento)
    
    # Crear modelo de simulación
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
    
    # Retornar respuesta con estimación de insumos
    return {
        "idSimulacion": db_simulacion.id,
        "message": "Simulación guardada correctamente",
        "estimacion_insumos": {
            "m2_ingresados": sim.m2Totales,
            "material_estructural_id": sim.materialEstructuralId,
            "factor_rendimiento": float(rendimiento.factor_rendimiento),
            "insumo_base": rendimiento.insumo_base,
            "cantidad_insumos": round(cantidad_insumos, 4),
            "unidad": rendimiento.unidad,
            "descripcion": rendimiento.descripcion
        }
    }

def normalize_string(s: str) -> str:
    """Remueve acentos y pasa a minúsculas para comparaciones robustas."""
    return "".join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')

class RecintoGeometrico(BaseModel):
    tipo: str = Field(..., description="Nombre del tipo de recinto (ej. 'Habitación', 'Baño')")
    ancho: float = Field(..., description="Ancho geométrico del recinto en metros")
    largo: float = Field(..., description="Largo geométrico del recinto en metros")

class PayloadLayout3D(BaseModel):
    recintos: List[RecintoGeometrico]


# ════════════════════════════════════════════════════════════════════════════════
# MODELOS PARA VALIDACIÓN REGULATORIA (HU18)
# ════════════════════════════════════════════════════════════════════════════════

class RegulationViolationResponse(BaseModel):
    """Respuesta de una violación regulatoria"""
    code: str
    name: str
    description: str
    severity: str
    detail: str
    requirement: str
    current_value: Optional[str] = None


class RegulatoryValidationRequest(BaseModel):
    """Solicitud de validación regulatoria"""
    m2_totales: int
    material_estructural: str
    num_stories: int = 1
    zona_climatica: str = "Central"
    is_complex: bool = False
    has_engineer: bool = False


class RegulatoryValidationResponse(BaseModel):
    """Respuesta de validación regulatoria"""
    status: str  # "compliant" | "warning" | "blocked"
    violations: List[RegulationViolationResponse]
    warnings: List[RegulationViolationResponse]
    is_constructible: bool
    is_self_constructible: bool
    requires_loscat: bool
    max_stories_without_engineer: Optional[int]
    
    class Config:
        from_attributes = True

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


# ════════════════════════════════════════════════════════════════════════════════
# ENDPOINTS DE VALIDACIÓN REGULATORIA (HU18)
# ════════════════════════════════════════════════════════════════════════════════

@app.post("/api/validate-regulatory", response_model=RegulatoryValidationResponse)
def validate_regulatory_constraints(request: RegulatoryValidationRequest):
    """
    Valida un proyecto contra restricciones regulatorias MINVU
    
    Criterios de aceptación HU18:
    - Autoconstrucción: m² <= 90 (aislada) o <= 140 (conjunto)
    - LOSCAT: requerido en zonas frías
    - Metalcon: máximo 3 pisos sin ingeniero
    
    Returns:
        RegulatoryValidationResponse con estado y violaciones/advertencias
    """
    result = regulatory_validator.validate_project(
        m2_totales=request.m2_totales,
        material_estructural=request.material_estructural,
        num_stories=request.num_stories,
        zona_climatica=request.zona_climatica,
        is_complex=request.is_complex,
        has_engineer=request.has_engineer,
    )
    
    return RegulatoryValidationResponse(
        status=result.status.value,
        violations=[
            RegulationViolationResponse(
                code=v.code,
                name=v.name,
                description=v.description,
                severity=v.severity,
                detail=v.detail,
                requirement=v.requirement,
                current_value=str(v.current_value),
            )
            for v in result.violations
        ],
        warnings=[
            RegulationViolationResponse(
                code=w.code,
                name=w.name,
                description=w.description,
                severity=w.severity,
                detail=w.detail,
                requirement=w.requirement,
                current_value=str(w.current_value),
            )
            for w in result.warnings
        ],
        is_constructible=result.is_constructible,
        is_self_constructible=result.is_self_constructible,
        requires_loscat=result.requires_loscat,
        max_stories_without_engineer=result.max_stories_without_engineer,
    )


@app.get("/api/regulatory/material-info/{material}")
def get_material_regulatory_info(material: str):
    """
    Retorna información de restricciones regulatorias para un material
    
    Args:
        material: Nombre del material ("Metalcom", "Madera", etc.)
    
    Returns:
        Información de restricciones o error 404
    """
    info = regulatory_validator.get_material_info(material)
    
    if not info:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró información regulatoria para el material: {material}"
        )
    
    return {
        "material": material,
        "constraints": info,
    }


@app.get("/api/regulatory/zones")
def get_regulatory_zones():
    """
    Retorna lista de zonas frías que requieren LOSCAT
    
    Returns:
        Lista de zonas y requisitos LOSCAT
    """
    return {
        "cold_zones": regulatory_validator.COLD_ZONES,
        "requires_loscat": True,
        "requirements": {
            "description": "Cumplir con Ley de Pisos (LOSCAT)",
            "applicable_zones": regulatory_validator.COLD_ZONES,
        }
    }


@app.get("/api/regulatory/limits")
def get_regulatory_limits():
    """
    Retorna límites regulatorios globales
    
    Returns:
        Límites de autoconstrucción, máximo m², etc.
    """
    return {
        "self_build_isolated_max": regulatory_validator.SELF_BUILD_ISOLATED_MAX,
        "self_build_complex_max": regulatory_validator.SELF_BUILD_COMPLEX_MAX,
        "absolute_max_m2": regulatory_validator.ABSOLUTE_MAX_M2,
        "materials": {
            material: info
            for material, info in regulatory_validator.MATERIAL_CONSTRAINTS.items()
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
