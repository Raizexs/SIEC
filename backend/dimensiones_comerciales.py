"""
Dimensiones comerciales estáticas para el mercado chileno de la construcción.

Mapea materiales a sus formatos de venta reales en retail (Sodimac, Easy, Construmart)
para que el motor de cubicación pueda calcular piezas enteras en vez de cantidades
abstractas por metro cuadrado.
"""

from typing import Optional, TypedDict


class DimensionFormat(TypedDict, total=False):
    """Formato comercial de un material."""

    tipo: str  # "placa" | "lineal" | "rollo" | "saco" | "unidad"
    ancho_m: float
    largo_m: float
    area_m2: float
    espesor_mm: Optional[float]
    largo_lineal_m: float


# ── Registro maestro de formatos comerciales ──────────────────────────────────
# Las claves son palabras clave normalizadas (lowercase, sin acentos).
# La función obtiene_dimensiones() hace coincidencia parcial contra el nombre
# del insumo y la categoria.

DIMENSIONES_COMERCIALES: dict[str, DimensionFormat] = {

    # ── Placas de revestimiento y estructura ─────────────────────────────────
    "yeso carton": {
        "tipo": "placa",
        "ancho_m": 1.22,
        "largo_m": 2.44,
        "area_m2": 2.9768,
        "espesor_mm": 15,
    },
    "yeso-cartón": {
        "tipo": "placa",
        "ancho_m": 1.22,
        "largo_m": 2.44,
        "area_m2": 2.9768,
        "espesor_mm": 15,
    },
    "osb": {
        "tipo": "placa",
        "ancho_m": 1.22,
        "largo_m": 2.44,
        "area_m2": 2.9768,
        "espesor_mm": 11,
    },
    "terciado": {
        "tipo": "placa",
        "ancho_m": 1.22,
        "largo_m": 2.44,
        "area_m2": 2.9768,
        "espesor_mm": 15,
    },
    "plywood": {
        "tipo": "placa",
        "ancho_m": 1.22,
        "largo_m": 2.44,
        "area_m2": 2.9768,
        "espesor_mm": 18,
    },
    "fibrocemento": {
        "tipo": "placa",
        "ancho_m": 1.22,
        "largo_m": 2.44,
        "area_m2": 2.9768,
        "espesor_mm": 8,
    },
    "siding fibrocemento": {
        "tipo": "lineal",
        "largo_lineal_m": 3.6,
        "ancho_m": 0.20,
        "area_m2": 0.72,
    },
    "siding pvc": {
        "tipo": "lineal",
        "largo_lineal_m": 3.6,
        "ancho_m": 0.25,
        "area_m2": 0.90,
    },
    "siding": {
        "tipo": "lineal",
        "largo_lineal_m": 3.6,
        "ancho_m": 0.20,
        "area_m2": 0.72,
    },

    # ── Planchas de cubierta ─────────────────────────────────────────────────
    "zincalum": {
        "tipo": "placa",
        "ancho_m": 1.0,
        "largo_m": 3.0,
        "area_m2": 3.0,
        "espesor_mm": 0.35,
    },
    "plancha zinc": {
        "tipo": "placa",
        "ancho_m": 1.0,
        "largo_m": 3.0,
        "area_m2": 3.0,
        "espesor_mm": 0.35,
    },
    "plancha zincalum": {
        "tipo": "placa",
        "ancho_m": 1.0,
        "largo_m": 3.0,
        "area_m2": 3.0,
        "espesor_mm": 0.35,
    },
    "cubierta zinc": {
        "tipo": "placa",
        "ancho_m": 1.0,
        "largo_m": 3.0,
        "area_m2": 3.0,
        "espesor_mm": 0.35,
    },
    "policarbonato": {
        "tipo": "placa",
        "ancho_m": 1.05,
        "largo_m": 6.0,
        "area_m2": 6.3,
        "espesor_mm": 6,
    },

    # ── Maderas estructurales (pino radiata) ─────────────────────────────────
    "2x3": {
        "tipo": "lineal",
        "largo_lineal_m": 3.2,
        "ancho_m": 0.038,
        "espesor_mm": 38,
    },
    "2x4": {
        "tipo": "lineal",
        "largo_lineal_m": 3.2,
        "ancho_m": 0.038,
        "espesor_mm": 38,
    },
    "2x6": {
        "tipo": "lineal",
        "largo_lineal_m": 3.2,
        "ancho_m": 0.038,
        "espesor_mm": 38,
    },
    "pino 2x3": {
        "tipo": "lineal",
        "largo_lineal_m": 3.2,
        "ancho_m": 0.038,
        "espesor_mm": 38,
    },
    "pino 2x4": {
        "tipo": "lineal",
        "largo_lineal_m": 3.2,
        "ancho_m": 0.038,
        "espesor_mm": 38,
    },
    "pino 2x6": {
        "tipo": "lineal",
        "largo_lineal_m": 3.2,
        "ancho_m": 0.038,
        "espesor_mm": 38,
    },
    "pino": {
        "tipo": "lineal",
        "largo_lineal_m": 3.2,
        "ancho_m": 0.038,
        "espesor_mm": 38,
    },
    "listón": {
        "tipo": "lineal",
        "largo_lineal_m": 3.2,
        "ancho_m": 0.025,
    },
    "cuarton": {
        "tipo": "lineal",
        "largo_lineal_m": 3.2,
        "ancho_m": 0.050,
    },

    # ── Aislación ────────────────────────────────────────────────────────────
    "lana vidrio": {
        "tipo": "rollo",
        "ancho_m": 0.60,
        "largo_m": 8.0,
        "area_m2": 4.8,
        "espesor_mm": 50,
    },
    "lana mineral": {
        "tipo": "rollo",
        "ancho_m": 0.60,
        "largo_m": 8.0,
        "area_m2": 4.8,
        "espesor_mm": 50,
    },
    "polietileno": {
        "tipo": "rollo",
        "ancho_m": 2.0,
        "largo_m": 50.0,
        "area_m2": 100.0,
        "espesor_mm": 0.2,
    },

    # ── Cielo falso ──────────────────────────────────────────────────────────
    "cielo falso": {
        "tipo": "placa",
        "ancho_m": 0.60,
        "largo_m": 0.60,
        "area_m2": 0.36,
    },
    "cielo": {
        "tipo": "placa",
        "ancho_m": 0.60,
        "largo_m": 0.60,
        "area_m2": 0.36,
    },

    # ── Pisos ─────────────────────────────────────────────────────────────────
    "cerámica": {
        "tipo": "placa",
        "ancho_m": 0.30,
        "largo_m": 0.30,
        "area_m2": 0.09,
    },
    "ceramica": {
        "tipo": "placa",
        "ancho_m": 0.30,
        "largo_m": 0.30,
        "area_m2": 0.09,
    },
    "piso flotante": {
        "tipo": "placa",
        "ancho_m": 0.20,
        "largo_m": 1.20,
        "area_m2": 0.24,
    },
    "piso vinílico": {
        "tipo": "rollo",
        "ancho_m": 2.0,
        "largo_m": 30.0,
        "area_m2": 60.0,
    },
    "piso vinilico": {
        "tipo": "rollo",
        "ancho_m": 2.0,
        "largo_m": 30.0,
        "area_m2": 60.0,
    },

    # ── Molduras y perfiles Metalcon ─────────────────────────────────────────
    "metalcon": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "perfil metalcon": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "perfil": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "montante": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "canal": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "solera": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },

    # ── Tuberías ──────────────────────────────────────────────────────────────
    "tubo pvc": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "tubería pvc": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "tuberia pvc": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "cañería": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "canería": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "pvc": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },

    # ── Fierro y acero ───────────────────────────────────────────────────────
    "fierro": {
        "tipo": "lineal",
        "largo_lineal_m": 6.0,
    },
    "barra acero": {
        "tipo": "lineal",
        "largo_lineal_m": 6.0,
    },
    "malla acero": {
        "tipo": "placa",
        "ancho_m": 2.0,
        "largo_m": 3.0,
        "area_m2": 6.0,
    },
}

# ── Fallback por categoría ────────────────────────────────────────────────────
# Cuando el nombre del insumo no hace match con ninguna clave, se consulta
# la categoría constructiva para obtener una dimensión genérica razonable.

DIMENSIONES_POR_CATEGORIA: dict[str, DimensionFormat] = {
    "obra gruesa": {
        "tipo": "unidad",
        "largo_lineal_m": 3.2,
    },
    "terminaciones": {
        "tipo": "placa",
        "ancho_m": 1.22,
        "largo_m": 2.44,
        "area_m2": 2.9768,
    },
    "instalaciones": {
        "tipo": "lineal",
        "largo_lineal_m": 3.0,
    },
    "mano de obra": {
        "tipo": "unidad",
        "largo_lineal_m": 0,
    },
}

# ── Valor de fallback universal ───────────────────────────────────────────────
FALLBACK: DimensionFormat = {
    "tipo": "unidad",
    "largo_lineal_m": 1.0,
    "area_m2": 1.0,
}


def _normalizar(texto: str) -> str:
    """Remueve acentos, espacios múltiples y pasa a minúsculas."""
    import unicodedata
    texto = texto.lower().strip()
    texto = "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )
    texto = " ".join(texto.split())
    return texto


def obtener_dimensiones(
    nombre_insumo: str,
    categoria: str,
) -> DimensionFormat:
    """
    Busca las dimensiones comerciales de un insumo por coincidencia parcial
    contra el registro maestro.

    La función recorre DIMENSIONES_COMERCIALES en busca de claves que estén
    contenidas en el nombre normalizado del insumo.  Si no hay match, prueba
    con la categoría constructiva.  Si tampoco, retorna FALLBACK.

    Args:
        nombre_insumo: Nombre del insumo desde la tabla Insumo (ej.
            "Plancha OSB 11mm")
        categoria: Categoría constructiva (ej. "Obra Gruesa", "Terminaciones")

    Returns:
        DimensionFormat con ancho_m, largo_m, area_m2 y/o largo_lineal_m
        según el tipo de material.
    """
    nombre_norm = _normalizar(nombre_insumo)
    cat_norm = _normalizar(categoria)

    # 1. Coincidencia exacta de clave completa
    for clave, dim in DIMENSIONES_COMERCIALES.items():
        if clave == nombre_norm:
            return dim

    # 2. Coincidencia parcial: la clave está contenida en el nombre
    coincidencias: list[tuple[int, DimensionFormat]] = []
    for clave, dim in DIMENSIONES_COMERCIALES.items():
        clave_norm = _normalizar(clave)
        if clave_norm in nombre_norm:
            # Priorizar claves más largas (match más específico)
            coincidencias.append((len(clave_norm), dim))

    if coincidencias:
        coincidencias.sort(key=lambda x: x[0], reverse=True)
        return coincidencias[0][1]

    # 3. Fallback por categoría
    for clave, dim in DIMENSIONES_POR_CATEGORIA.items():
        if clave in cat_norm:
            return dim

    # 4. Fallback universal
    return dict(FALLBACK)


def area_por_pieza(nombre_insumo: str, categoria: str) -> float:
    """
    Retorna el área (m²) que cubre una pieza comercial del insumo.

    Para placas retorna ancho × largo, para lineales retorna el área
    superficial si tiene ancho, o 0.0 si es solo largo (ej. perfiles).
    """
    dim = obtener_dimensiones(nombre_insumo, categoria)
    if dim.get("area_m2"):
        return dim["area_m2"]
    if dim.get("ancho_m") and dim.get("largo_m"):
        return dim["ancho_m"] * dim["largo_m"]
    if dim.get("ancho_m") and dim.get("largo_lineal_m"):
        return dim["ancho_m"] * dim["largo_lineal_m"]
    return 1.0


def largo_por_pieza(nombre_insumo: str, categoria: str) -> float:
    """
    Retorna el largo lineal (m) de una pieza comercial del insumo.

    Para perfiles, maderas y tuberías retorna el largo comercial.
    Para placas retorna la dimensión mayor (útil para fiejes/cortes).
    """
    dim = obtener_dimensiones(nombre_insumo, categoria)
    if dim.get("largo_lineal_m"):
        return dim["largo_lineal_m"]
    if dim.get("largo_m"):
        return dim["largo_m"]
    return 1.0
