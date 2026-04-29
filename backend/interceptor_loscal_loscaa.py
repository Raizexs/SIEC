"""
interceptor_loscal_loscaa.py
Interceptor Normativo LOSCAL/LOSCAA — Validación de Aislamientos Acústicos y Cortafuegos
SCRUM-96

Reglas de negocio:
  - Si la ampliación perimetral NO es de SIP:
    * Inyectar obligatoriamente insumos LOSCAT (aislantes térmicos interiores, barreras de vapor)
    * Inyectar obligatoriamente insumos LOSCAA (aislamientos acústicos F-60, cortafuegos F-60)
  
  - Validación de fundación:
    * Forzar hormigón grado H20 mínimo en cadenas estructurales y radicaciones
  
  - Restricción de fundación:
    * Si el terreno no es H20, se debe especificar profundidad mínima de cimentación

Criterios de Aceptación:
  - Si material estructural es SIP → NO se aplican restricciones LOSCAT/LOSCAA
  - Si material NO es SIP → Se inyectan insumos obligatorios
  - La validación debe bloquear la cotización si no se cumplen los mínimos
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

# ──────────────────────────────────────────────────────────────────────────────
# Constantes normativas (LOSCAT/LOSCAA / DS 18 MINVU)
# ──────────────────────────────────────────────────────────────────────────────

class TipoMaterial(str, Enum):
    """Materiales estructurales del sistema"""
    SIP = "SIP"
    METALCON = "Metalcon"
    HORMIGON = "Hormigón Armado"
    ALBAÑILERIA = "Albañilería"
    MADERA = "Madera"


# Insumos obligatorios LOSCAT (aislamiento térmico)
INSUMOS_LOSCAT_OBLIGATORIOS = [
    {
        "nombre": "Aislante térmico interior (lana mineral)",
        "unidad": "m²",
        "espesor_mm": 50,
        "descripcion": "Lana mineral 50mm para barrera térmica interior",
    },
    {
        "nombre": "Barrera de vapor (polietileno 200 micrones)",
        "unidad": "m²",
        "descripcion": "Film de polietileno 200 micrones como barrera de vapor",
    },
]

# Insumos obligatorios LOSCAA (aislamiento acústico)
INSUMOS_LOSCAA_OBLIGATORIOS = [
    {
        "nombre": "Placa yeso cartón doble (Volcanita F-60)",
        "unidad": "placa",
        "espesor_mm": 15,
        "resistencia_fuego": "F-60",
        "descripcion": "Placa de yeso cartón resistente al fuego F-60 (2 placas por muro)",
    },
    {
        "nombre": "Lana mineral acústica (100 kg/m³)",
        "unidad": "m²",
        "espesor_mm": 50,
        "indice_reduccion": "RA = 50 dB",
        "descripcion": "Lana mineral de alta densidad para aislamiento acústico",
    },
    {
        "nombre": "Cortafuegos F-60 (banda aislante)",
        "unidad": "m",
        "descripcion": "Banda cortafuegos F-60 para juntas de construcción",
    },
]

# Hormigón mínimo requerido en fundación
HORMIGON_MINIMO_FUNDACION = "H20"
PROFUNDIDAD_MINIMA_CIMENTACION_CM = 80  # 80 cm mínimo recomendado


# ──────────────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────────────

class ValidacionInterceptorRequest(BaseModel):
    """Solicitud de validación LOSCAL/LOSCAA"""
    material_estructural: str = Field(
        ...,
        description="Material estructural de la ampliación (SIP, Metalcon, Hormigón Armado, etc.)",
    )
    es_sip: bool = Field(
        ...,
        description="True si la ampliación perimetral es de SIP",
    )
    area_muros_perimetrales_m2: float = Field(
        ...,
        gt=0,
        description="Área total de muros perimetrales (m²)",
    )
    tipo_terreno: Optional[str] = Field(
        None,
        description="Tipo de terreno (arcilla, arena, roca, etc.)",
    )
    profundidad_cimentacion_cm: Optional[float] = Field(
        None,
        ge=0,
        description="Profundidad especificada de cimentación en cm",
    )


class InsumoLOSCAT(BaseModel):
    """Insumo obligatorio LOSCAT (aislamiento térmico)"""
    nombre: str
    unidad: str
    cantidad: float
    factor_aplicable_m2: float  # Cantidad por m² de muro


class InsumoLOSCAA(BaseModel):
    """Insumo obligatorio LOSCAA (aislamiento acústico)"""
    nombre: str
    unidad: str
    cantidad: float
    factor_aplicable_m2: float  # Cantidad por m² de muro
    resistencia_fuego: Optional[str] = None


class ValidacionInterceptorResponse(BaseModel):
    """Respuesta de validación del interceptor"""
    cumple_normativa: bool
    bloqueante: bool
    codigo_excepcion: Optional[str] = None
    mensaje: str
    detalle: str
    
    # Insumos inyectados obligatoriamente
    insumos_loscat_inyectados: List[InsumoLOSCAT] = []
    insumos_loscaa_inyectados: List[InsumoLOSCAA] = []
    
    # Validaciones de fundación
    hormigon_fundacion_requerido: str = HORMIGON_MINIMO_FUNDACION
    profundidad_minima_recomendada_cm: int = PROFUNDIDAD_MINIMA_CIMENTACION_CM
    profundidad_especificada_cm: Optional[float] = None
    fundacion_conforme: Optional[bool] = None
    
    # Metadata
    area_muros_m2: float
    material_estructural: str


# ──────────────────────────────────────────────────────────────────────────────
# Lógica pura (testeable sin FastAPI)
# ──────────────────────────────────────────────────────────────────────────────

def validar_interceptor_loscal_loscaa(
    material_estructural: str,
    es_sip: bool,
    area_muros_perimetrales_m2: float,
    tipo_terreno: Optional[str] = None,
    profundidad_cimentacion_cm: Optional[float] = None,
) -> ValidacionInterceptorResponse:
    """
    Valida la aplicación de normativas LOSCAL/LOSCAA y calcula insumos obligatorios.
    
    Returns:
        ValidacionInterceptorResponse con lista de insumos inyectados si aplica.
    """
    
    insumos_loscat = []
    insumos_loscaa = []
    fundacion_conforme = None
    
    # ── Caso 1: Material es SIP → Exención de LOSCAT/LOSCAA ──────────────────
    if es_sip:
        return ValidacionInterceptorResponse(
            cumple_normativa=True,
            bloqueante=False,
            codigo_excepcion=None,
            mensaje="Material SIP — Exención normativa",
            detalle=(
                f"La ampliación perimetral es de SIP. No aplican restricciones LOSCAT/LOSCAA. "
                f"Los paneles SIP cumplen intrínsecamente con aislamiento térmico y acústico."
            ),
            insumos_loscat_inyectados=[],
            insumos_loscaa_inyectados=[],
            area_muros_m2=area_muros_perimetrales_m2,
            material_estructural=material_estructural,
        )
    
    # ── Caso 2: Material NO es SIP → Inyectar insumos LOSCAT y LOSCAA ────────
    # Calcular cantidades obligatorias basadas en área de muros
    
    # LOSCAT: 1 capa de lana mineral 50mm + 1 barrera vapor por m²
    insumo_loscat_aislante = InsumoLOSCAT(
        nombre=INSUMOS_LOSCAT_OBLIGATORIOS[0]["nombre"],
        unidad=INSUMOS_LOSCAT_OBLIGATORIOS[0]["unidad"],
        cantidad=area_muros_perimetrales_m2,
        factor_aplicable_m2=1.0,
    )
    insumo_loscat_vapor = InsumoLOSCAT(
        nombre=INSUMOS_LOSCAT_OBLIGATORIOS[1]["nombre"],
        unidad=INSUMOS_LOSCAT_OBLIGATORIOS[1]["unidad"],
        cantidad=area_muros_perimetrales_m2,
        factor_aplicable_m2=1.0,
    )
    insumos_loscat = [insumo_loscat_aislante, insumo_loscat_vapor]
    
    # LOSCAA: 2 placas yeso cartón F-60 + lana mineral acústica + cortafuegos
    # Estándar: 2 placas por panel (en m²), factor 2
    insumo_loscaa_placa = InsumoLOSCAA(
        nombre=INSUMOS_LOSCAA_OBLIGATORIOS[0]["nombre"],
        unidad="placa",
        cantidad=area_muros_perimetrales_m2 * 2,  # 2 placas por m²
        factor_aplicable_m2=2.0,
        resistencia_fuego="F-60",
    )
    insumo_loscaa_lana = InsumoLOSCAA(
        nombre=INSUMOS_LOSCAA_OBLIGATORIOS[1]["nombre"],
        unidad=INSUMOS_LOSCAA_OBLIGATORIOS[1]["unidad"],
        cantidad=area_muros_perimetrales_m2,
        factor_aplicable_m2=1.0,
    )
    insumo_loscaa_cortafuego = InsumoLOSCAA(
        nombre=INSUMOS_LOSCAA_OBLIGATORIOS[2]["nombre"],
        unidad=INSUMOS_LOSCAA_OBLIGATORIOS[2]["unidad"],
        cantidad=area_muros_perimetrales_m2 * 4,  # Perímetro estimado: 4 bordes
        factor_aplicable_m2=4.0,
    )
    insumos_loscaa = [
        insumo_loscaa_placa,
        insumo_loscaa_lana,
        insumo_loscaa_cortafuego,
    ]
    
    # ── Validación de fundación ──────────────────────────────────────────────
    if profundidad_cimentacion_cm is not None:
        fundacion_conforme = profundidad_cimentacion_cm >= PROFUNDIDAD_MINIMA_CIMENTACION_CM
    
    return ValidacionInterceptorResponse(
        cumple_normativa=True,
        bloqueante=False,
        codigo_excepcion=None,
        mensaje="Interceptor LOSCAL/LOSCAA — Insumos inyectados",
        detalle=(
            f"Material {material_estructural} (NO SIP) requiere cumplimiento normativo LOSCAT/LOSCAA. "
            f"Se han inyectado {len(insumos_loscat)} insumos LOSCAT (aislamiento térmico) y "
            f"{len(insumos_loscaa)} insumos LOSCAA (aislamiento acústico y cortafuegos). "
            f"Área de muros perimetrales: {area_muros_perimetrales_m2:.2f} m². "
            f"Hormigón fundación mínimo: {HORMIGON_MINIMO_FUNDACION}."
        ),
        insumos_loscat_inyectados=insumos_loscat,
        insumos_loscaa_inyectados=insumos_loscaa,
        profundidad_especificada_cm=profundidad_cimentacion_cm,
        fundacion_conforme=fundacion_conforme,
        area_muros_m2=area_muros_perimetrales_m2,
        material_estructural=material_estructural,
    )
