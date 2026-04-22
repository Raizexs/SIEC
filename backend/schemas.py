from pydantic import BaseModel, Field
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
    area_bruta_m2: Optional[float] = None
    area_vanos_m2: Optional[float] = None
    area_neta_m2: Optional[float] = None
    volumen_neto_previo: Optional[float] = None
    volumen_compensado_pre_cotizacion: Optional[float] = None


class VanoInput(BaseModel):
    ancho: float = Field(..., gt=0)
    alto: float = Field(..., gt=0)


class DeduccionMermasPayload(BaseModel):
    area_bruta_m2: Optional[float] = Field(None, gt=0)
    vanos: List[VanoInput] = Field(default_factory=list)
    cortes_acero: int = Field(0, ge=0)
    cruces_acero: int = Field(0, ge=0)
