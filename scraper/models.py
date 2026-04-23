# scraper/models.py
"""
Modelos de datos para el microservicio scraper SIEC.

Define las estructuras de datos que fluyen entre los scrapers,
el mapeador de insumos y la capa de persistencia (db.py).
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ResultadoScraping:
    """
    Representa el resultado de extraer un producto desde una tienda.
    Esta es la estructura de datos interna del scraper antes de persistir.
    """
    tienda: str               # 'sodimac' | 'easy' | 'construmart'
    url: str                  # URL del producto scrapeado
    nombre_producto: str      # Nombre extraído del sitio
    precio: Optional[float]   # Precio en CLP (sin descuento)
    precio_descuento: Optional[float] = None  # Precio con descuento si existe
    stock: Optional[str] = None              # Texto de disponibilidad
    categoria: Optional[str] = None          # Categoría del producto
    insumo_id: Optional[int] = None          # FK a tabla Insumo (mapeado)
    exitoso: bool = True
    fecha_scraping: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict:
        """Convierte a dict compatible con db.insertar_precios()."""
        return {
            "tienda":            self.tienda,
            "url":               self.url,
            "nombre_producto":   self.nombre_producto,
            "precio":            self.precio,
            "precio_descuento":  self.precio_descuento,
            "stock":             self.stock,
            "categoria":         self.categoria,
            "insumo_id":         self.insumo_id,
            "exitoso":           self.exitoso,
            "fecha_scraping":    self.fecha_scraping,
        }


@dataclass
class Insumo:
    """
    Representa un insumo de la tabla Insumo de PostgreSQL.
    Usado en el proceso de mapeo producto→insumo_id.
    """
    id: int
    nombre: str
    categoria: str
    unidad_medida: str
    descripcion: Optional[str] = None
    activo: bool = True


# Mapeo de palabras clave del nombre del producto al nombre de insumo en la DB.
# Permite identificar qué Insumo_ID corresponde a cada producto scrapeado.
KEYWORD_INSUMO_MAP: dict[str, list[str]] = {
    "Cemento Portland": ["cemento portland", "cemento gris portland"],
    "Cemento Especial": ["cemento especial", "cemento polpaico", "cemento bío-bío", "cemento melón", "hormigón"],
    "Fierro A63-42H":   ["fierro", "barra", "acero", "varilla", "cuadrada laminada"],
    "Volcanita RH Standard":  ["volcanita", "yeso cartón", "fibrocemento", "placa yeso"],
    "Volcanita RH Reforzado": ["volcanita rh", "volcanita reforzado"],
    "Cable H07Z1-K 1x2.5mm": ["cable 2.5mm", "cable 2,5mm", "cable 2.5 mm", "cable 2,5 mm", "h07z1-k 1x2.5", "h07z1-k 1x2,5", "h07z1-k c5 2,5", "c5 2,5 mm", "cable libre halogenos 2.5"],
    "Cable H07Z1-K 1x4mm":   ["cable 4mm", "h07z1-k 1x4"],
    "Cable H07Z1-K 1x6mm":   ["cable 6mm", "h07z1-k 1x6"],
    "Tubo PVC Agua 110mm":   ["tubo pvc 110", "pvc 110mm", "tubería 110", "pvc agua 110"],
    "Tubo PVC Agua 75mm":    ["tubo pvc 75", "pvc 75mm"],
    "Tubo PVC Agua 50mm":    ["tubo pvc 50", "pvc 50mm"],
}
