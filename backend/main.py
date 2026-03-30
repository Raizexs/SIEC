from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text

# Importar configuración de BD y Modelos
from database import engine, get_db, SessionLocal
import models

# Crear tablas
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SIEC API", version="1.0.0")

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
    finally:
        db.close()

# Materiales permitidos según requerimientos
ALLOWED_MATERIALS = ["Madera", "Metalcom", "Albañilería", "Hormigón Armado"]

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
