from pydantic import BaseModel
from typing import List, Optional

class InsumoCalculado(BaseModel):
    insumo: str
    cantidad: float
    unidad: str
    precio_unitario: Optional[float] = None
    subtotal: Optional[float] = None

class CategoriaDesglose(BaseModel):
    categoria: str
    items: List[InsumoCalculado]
    subtotal_categoria: Optional[float] = None

class DesgloseResponse(BaseModel):
    simulacion_id: int
    m2_totales: int
    material: str
    desglose: List[CategoriaDesglose]
    costo_total: Optional[float] = None
    fecha_precios: Optional[str] = None
    # Tarifa pura local calculada para Mano de Obra: (salario_diario_maestro + salario_diario_ayudante) * rendimiento_jornadas_por_m2
    tarifa_pura_local: Optional[float] = None
