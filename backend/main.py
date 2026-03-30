from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="SIEC API", version="1.0.0")

# Materiales permitidos según requerimientos
ALLOWED_MATERIALS = ["Madera", "Metalcom", "Albañilería", "Hormigón Armado"]

class ProjectConfig(BaseModel):
    material_estructural: str

@app.get("/")
def read_root():
    return {"message": "SIEC API is running", "stack": "FastAPI + PostgreSQL"}

@app.get("/materials")
def get_materials():
    """Retorna la lista oficial de materiales estructurales."""
    return {"materials": ALLOWED_MATERIALS}

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
