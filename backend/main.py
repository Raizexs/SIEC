from fastapi import FastAPI, Depends
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

@app.post("/config")
def save_config(config: ProjectConfig):
    """Guarda la configuración del proyecto (Simulación)."""
    if config.material_estructural not in ALLOWED_MATERIALS:
        return {"error": "Material no permitido", "status": 400}
    
    # Aquí iría el guardado en PostgreSQL en el futuro
    return {
        "message": "Configuración guardada correctamente",
        "saved_value": config.material_estructural,
        "status": 200
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
