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


# Mapeo de palabras clave por insumo para búsqueda via SerpAPI.
# Cubre los 34 insumos activos (IDs 1-34) para evitar depender del fuzzy matcher puro.
# Formato: "Nombre canónico en DB": ["keyword1", "keyword2", ...]
KEYWORD_INSUMO_MAP: dict[str, list[str]] = {
    # === Obra Gruesa (IDs 1-15) ===
    "Cemento Portland": [
        "cemento portland", "cemento gris portland",
    ],
    "Cemento Especial": [
        "cemento especial", "cemento polpaico", "cemento bío-bío",
        "cemento melón", "cemento san juan",
    ],
    "Fierro A63-42H": [
        "fierro", "barra acero", "varilla acero", "fierro estriado",
        "acero corrugado", "barra cuadrada laminada",
    ],
    "Arena Gruesa": [
        "arena gruesa", "arena construccion", "arena fina saco",
        "arena hormigon",
    ],
    "Ripio": [
        "ripio saco", "gravilla saco", "grava saco",
        "piedra chancada",
    ],
    "Perfil C 60x38x0.85": [
        "perfil c 60", "perfil metalcon c", "perfil estructural c",
        "montante metalcon", "perfil c metalcon",
    ],
    "Perfil U 62x25x0.85": [
        "perfil u 62", "perfil metalcon u", "canal u metalcon",
        "solera metalcon", "perfil canal u",
    ],
    "Perfil Omega": [
        "perfil omega", "perfil metalcon omega", "omega cielo",
        "perfil cielo omega",
    ],
    "Pino Dimensionado 2x3": [
        "pino dimensionado 2x3", "pino 2x3", "madera pino 2x3",
        "pino cepillado 2x3",
    ],
    "Pino Dimensionado 2x4": [
        "pino dimensionado 2x4", "pino 2x4", "madera pino 2x4",
        "pino cepillado 2x4",
    ],
    "Terciado Estructural 12mm": [
        "terciado estructural 12mm", "terciado estructural pino",
        "placa terciado 12", "madera contrachapada 12mm",
    ],
    "Tornillo Volcanita": [
        "tornillo volcanita", "tornillo yeso carton",
        "tornillo punta fina volcanita",
    ],
    "Tornillo Madera": [
        "tornillo madera", "tornillo aglomerado", "tornillo cabeza plana madera",
    ],
    "Tornillo Autoperforante": [
        "tornillo autoperforante", "tornillo metalcon",
        "tornillo punta broca", "tornillo hexagonal autoperforante",
    ],
    # === Terminaciones (IDs 16-24) ===
    "Volcanita RH Standard": [
        "volcanita rh standard", "yeso carton rh", "placa yeso rh",
        "yeso carton resistente humedad 12.5mm",
    ],
    "Volcanita RH Reforzado": [
        "volcanita rh reforzado", "yeso carton rh 15mm",
        "placa yeso reforzado",
    ],
    "Pintura Acrílica Blanca": [
        "pintura acrilica blanca", "esmalte agua blanco",
        "latex blanco interior", "pintura latex blanca",
    ],
    "Pintura Esmalte": [
        "pintura esmalte", "esmalte sintetico", "esmalte alkidico",
        "esmalte exterior",
    ],
    "Cerámica Piso": [
        "ceramica piso", "ceramica de piso", "porcelanato piso",
        "ceramico piso",
    ],
    "Cerámica Muro": [
        "ceramica muro", "ceramica de muro", "azulejo muro",
        "ceramico pared",
    ],
    "Piso Flotante": [
        "piso flotante", "piso laminado", "piso vinilico",
        "piso flotante 8mm",
    ],
    "Adhesivo Cerámico": [
        "adhesivo ceramico", "pegamento ceramico", "mortero ceramico",
        "adhesivo porcelanato",
    ],
    "Lechada Cerámica": [
        "lechada ceramica", "frague ceramica", "fragua ceramica",
        "lechada junta",
    ],
    # === Instalaciones (IDs 25-34) ===
    "Cable H07Z1-K 1x2.5mm": [
        "cable 2.5mm", "cable 2,5mm", "h07z1-k 1x2.5",
        "h07z1-k c5 2,5", "cable libre halogenos 2.5",
    ],
    "Cable H07Z1-K 1x4mm": [
        "cable 4mm", "cable 1x4mm", "h07z1-k 1x4",
        "cable libre halogenos 4mm",
    ],
    "Cable H07Z1-K 1x6mm": [
        "cable 6mm", "cable 1x6mm", "h07z1-k 1x6",
        "cable libre halogenos 6mm",
    ],
    "Tubo PVC Agua 110mm": [
        "tubo pvc 110", "pvc 110mm", "tuberia pvc 110",
        "tubo sanitario 110",
    ],
    "Tubo PVC Agua 75mm": [
        "tubo pvc 75", "pvc 75mm", "tuberia pvc 75",
        "tubo sanitario 75",
    ],
    "Tubo PVC Agua 50mm": [
        "tubo pvc 50", "pvc 50mm", "tuberia pvc 50",
        "tubo sanitario 50",
    ],
    "Tubo Cobre 15mm": [
        "tubo cobre 15mm", "cobre tipo l 15", "tuberia cobre 15",
        "tubo cobre 1/2 pulgada",
    ],
    "Tubo Cobre 22mm": [
        "tubo cobre 22mm", "cobre tipo l 22", "tuberia cobre 22",
        "tubo cobre 3/4 pulgada",
    ],
    "Caja Eléctrica Embutida": [
        "caja electrica embutida", "caja distribucion embutida",
        "caja rectangular embutida", "caja enchufes embutida",
    ],
    "Disyuntor Termomagnético": [
        "disyuntor", "automatico monofasico", "interruptor termomagnetico",
        "disyuntor 16a", "disyuntor 20a",
    ],
}
