from pydantic import BaseModel, Field
from typing import List, Optional

class InsumoCalculado(BaseModel):
    insumo: str
    cantidad: float
    unidad: str
    precio_unitario: Optional[float] = None
    subtotal: Optional[float] = None
    cantidad_objetivo: Optional[float] = None
    cantidad_compra: Optional[float] = None
    perdida_porcentual: Optional[float] = None
    metodo_optimizacion: Optional[str] = None
    formato_comercial: Optional[str] = None

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
    items_optimizados: Optional[int] = None
    perdida_promedio_porcentual: Optional[float] = None
    # Geometría inyectada para cubicación por superficie de muro
    perimetro_ml: Optional[float] = None
    altura_muro_m: Optional[float] = None
    area_muro_neta_m2: Optional[float] = None
    incluir_techumbre: Optional[bool] = None


class VanoInput(BaseModel):
    ancho: float = Field(..., gt=0)
    alto: float = Field(..., gt=0)


class Pieza2DInput(BaseModel):
    ancho: float = Field(..., gt=0)
    alto: float = Field(..., gt=0)
    cantidad: int = Field(1, ge=1)


class Corte1DInput(BaseModel):
    largo: float = Field(..., gt=0)
    cantidad: int = Field(1, ge=1)


class DeduccionMermasPayload(BaseModel):
    area_bruta_m2: Optional[float] = Field(None, gt=0)
    vanos: List[VanoInput] = Field(default_factory=list)
    cortes_acero: int = Field(0, ge=0)
    cruces_acero: int = Field(0, ge=0)
    piezas_2d: List[Pieza2DInput] = Field(default_factory=list)
    cortes_1d: List[Corte1DInput] = Field(default_factory=list)
