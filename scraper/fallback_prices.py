"""
Fallback Prices — SIEC
======================
Precios de respaldo verificados. IDs corregidos segun orden real de la DB
(init.sql: Obra Gruesa 1-15, Terminaciones 16-24, Instalaciones 25-34, MO 35-38).
"""

from typing import Optional


FALLBACK_PRICES = {
    # === Obra Gruesa ===
    1: {  # Cemento Portland (saco 25kg)
        "sodimac": {"nombre_producto": "Cemento Portland 25 kg", "precio": 6390, "url": ""},
        "easy": {"nombre_producto": "Cemento Portland 25 kg", "precio": 6190, "url": ""},
        "construmart": {"nombre_producto": "Cemento Portland 25 kg", "precio": 5990, "url": ""},
    },
    2: {  # Cemento Especial (saco 25kg)
        "sodimac": {"nombre_producto": "Cemento Polpaico 25 kilos", "precio": 5180, "url": ""},
        "easy": {"nombre_producto": "Cemento Especial 25 kg Polpaico", "precio": 5510, "url": ""},
        "construmart": {"nombre_producto": "Cemento Especial Saco 25 kg", "precio": 4990, "url": ""},
    },
    3: {  # Fierro A63-42H
        "sodimac": {"nombre_producto": "Fierro construccion estriado 12 mm", "precio": 5190, "url": ""},
        "easy": {"nombre_producto": "Barra fierro estriado 12mm", "precio": 4990, "url": ""},
        "construmart": {"nombre_producto": "Barra acero A63-42H 12mm", "precio": 4790, "url": ""},
    },
    4: {  # Arena Gruesa (saco 25kg)
        "sodimac": {"nombre_producto": "Arena gruesa saco 25 kg", "precio": 3190, "url": ""},
        "easy": {"nombre_producto": "Arena gruesa saco 25 kg", "precio": 2990, "url": ""},
        "construmart": {"nombre_producto": "Arena gruesa saco 25 kg", "precio": 2890, "url": ""},
    },
    5: {  # Ripio (saco 25kg)
        "sodimac": {"nombre_producto": "Gravilla saco 25 kg", "precio": 3490, "url": ""},
        "easy": {"nombre_producto": "Gravilla saco 25 kg", "precio": 3290, "url": ""},
        "construmart": {"nombre_producto": "Gravilla saco 25 kg", "precio": 3190, "url": ""},
    },
    6: {  # Agua
        "sodimac": {"nombre_producto": "Agua purificada bidon 20L", "precio": 2000, "url": ""},
        "easy": {"nombre_producto": "Agua purificada bidon 20L", "precio": 2000, "url": ""},
        "construmart": {"nombre_producto": "Agua purificada bidon 20L", "precio": 2000, "url": ""},
    },
    7: {  # Perfil C 60x38x0.85
        "sodimac": {"nombre_producto": "Perfil Metalcon C 60x38x0.85 3m", "precio": 7790, "url": ""},
        "easy": {"nombre_producto": "Perfil C 60x38x0.85 3m", "precio": 7490, "url": ""},
        "construmart": {"nombre_producto": "Perfil C 60x38x0.85 3m", "precio": 7290, "url": ""},
    },
    8: {  # Perfil U 62x25x0.85
        "sodimac": {"nombre_producto": "Perfil Metalcon U 62x25x0.85 3m", "precio": 6890, "url": ""},
        "easy": {"nombre_producto": "Perfil U 62x25x0.85 3m", "precio": 6590, "url": ""},
        "construmart": {"nombre_producto": "Perfil U 62x25x0.85 3m", "precio": 6390, "url": ""},
    },
    9: {  # Perfil Omega
        "sodimac": {"nombre_producto": "Perfil Metalcon Omega 3m", "precio": 5490, "url": ""},
        "easy": {"nombre_producto": "Perfil Omega 3m", "precio": 5290, "url": ""},
        "construmart": {"nombre_producto": "Perfil Omega 3m", "precio": 5190, "url": ""},
    },
    10: {  # Pino Dimensionado 2x3
        "sodimac": {"nombre_producto": "Pino dimensionado 2x3 3.2 m", "precio": 3190, "url": ""},
        "easy": {"nombre_producto": "Pino dimensionado 2x3", "precio": 2990, "url": ""},
        "construmart": {"nombre_producto": "Pino dimensionado 2x3", "precio": 2890, "url": ""},
    },
    11: {  # Pino Dimensionado 2x4
        "sodimac": {"nombre_producto": "Pino dimensionado 2x4 3.2 m", "precio": 4490, "url": ""},
        "easy": {"nombre_producto": "Pino dimensionado 2x4", "precio": 4290, "url": ""},
        "construmart": {"nombre_producto": "Pino dimensionado 2x4", "precio": 4190, "url": ""},
    },
    12: {  # Terciado Estructural 12mm
        "sodimac": {"nombre_producto": "Terciado Estructural Pino 12mm 1.22x2.44m", "precio": 19990, "url": ""},
        "easy": {"nombre_producto": "Terciado Estructural 12mm", "precio": 18990, "url": ""},
        "construmart": {"nombre_producto": "Terciado Estructural 12mm", "precio": 18490, "url": ""},
    },
    13: {  # Tornillo Volcanita
        "sodimac": {"nombre_producto": "Tornillo Volcanita Punta Fina caja", "precio": 14990, "url": ""},
        "easy": {"nombre_producto": "Tornillo Volcanita caja", "precio": 14490, "url": ""},
        "construmart": {"nombre_producto": "Tornillo Volcanita caja", "precio": 13990, "url": ""},
    },
    14: {  # Tornillo Madera
        "sodimac": {"nombre_producto": "Tornillo Madera Aglomerada caja", "precio": 6490, "url": ""},
        "easy": {"nombre_producto": "Tornillo Madera caja", "precio": 6290, "url": ""},
        "construmart": {"nombre_producto": "Tornillo Madera caja", "precio": 6190, "url": ""},
    },
    15: {  # Tornillo Autoperforante
        "sodimac": {"nombre_producto": "Tornillo Autoperforante Hexagonal caja", "precio": 8490, "url": ""},
        "easy": {"nombre_producto": "Tornillo Autoperforante caja", "precio": 8290, "url": ""},
        "construmart": {"nombre_producto": "Tornillo Autoperforante caja", "precio": 8190, "url": ""},
    },
    # === Terminaciones ===
    16: {  # Volcanita RH Standard
        "sodimac": {"nombre_producto": "Yeso Carton RH 12.5mm 1.2x2.4m", "precio": 9490, "url": ""},
        "easy": {"nombre_producto": "Volcanita RH Standard 12.5mm", "precio": 8990, "url": ""},
        "construmart": {"nombre_producto": "Volcanita RH Standard 12.5mm", "precio": 8790, "url": ""},
    },
    17: {  # Volcanita RH Reforzado
        "sodimac": {"nombre_producto": "Yeso Carton RH 15mm 1.2x2.4m", "precio": 14490, "url": ""},
        "easy": {"nombre_producto": "Volcanita RH Reforzado 15mm", "precio": 13990, "url": ""},
        "construmart": {"nombre_producto": "Volcanita RH Reforzado 15mm", "precio": 13490, "url": ""},
    },
    18: {  # Pintura Acrilica Blanca
        "sodimac": {"nombre_producto": "Esmalte al Agua Blanco Galon", "precio": 28990, "url": ""},
        "easy": {"nombre_producto": "Pintura Acrilica Blanca Galon", "precio": 27990, "url": ""},
        "construmart": {"nombre_producto": "Pintura Acrilica Blanca Galon", "precio": 26990, "url": ""},
    },
    19: {  # Pintura Esmalte
        "sodimac": {"nombre_producto": "Esmalte Sintetico Blanco Galon", "precio": 31990, "url": ""},
        "easy": {"nombre_producto": "Pintura Esmalte Blanco Galon", "precio": 30990, "url": ""},
        "construmart": {"nombre_producto": "Pintura Esmalte Blanco Galon", "precio": 29990, "url": ""},
    },
    20: {  # Ceramica Piso
        "sodimac": {"nombre_producto": "Ceramica de Piso 45x45 cm", "precio": 7490, "url": ""},
        "easy": {"nombre_producto": "Ceramica Piso 45x45", "precio": 6990, "url": ""},
        "construmart": {"nombre_producto": "Ceramica Piso 45x45", "precio": 6490, "url": ""},
    },
    21: {  # Ceramica Muro
        "sodimac": {"nombre_producto": "Ceramica de Muro 25x40 cm", "precio": 6490, "url": ""},
        "easy": {"nombre_producto": "Ceramica Muro 25x40", "precio": 5990, "url": ""},
        "construmart": {"nombre_producto": "Ceramica Muro 25x40", "precio": 5790, "url": ""},
    },
    22: {  # Piso Flotante
        "sodimac": {"nombre_producto": "Piso Flotante 8mm 2.4m2", "precio": 8990, "url": ""},
        "easy": {"nombre_producto": "Piso Flotante 8mm", "precio": 8490, "url": ""},
        "construmart": {"nombre_producto": "Piso Flotante 8mm", "precio": 7990, "url": ""},
    },
    23: {  # Adhesivo Ceramico
        "sodimac": {"nombre_producto": "Adhesivo Ceramico Polvo Saco 25 kg", "precio": 11990, "url": ""},
        "easy": {"nombre_producto": "Adhesivo Ceramico 25 kg", "precio": 11490, "url": ""},
        "construmart": {"nombre_producto": "Adhesivo Ceramico 25 kg", "precio": 10990, "url": ""},
    },
    24: {  # Lechada Ceramica
        "sodimac": {"nombre_producto": "Frague Impermeable 1 kg Blanco", "precio": 2990, "url": ""},
        "easy": {"nombre_producto": "Lechada Ceramica 1 kg", "precio": 2890, "url": ""},
        "construmart": {"nombre_producto": "Lechada Ceramica 1 kg", "precio": 2790, "url": ""},
    },
    # === Instalaciones ===
    25: {  # Cable H07Z1-K 2.5mm (rollo 100m)
        "sodimac": {"nombre_producto": "Cable H07Z1-K 2.5mm Rojo 100m", "precio": 34990, "url": ""},
        "easy": {"nombre_producto": "Cable H07Z1-K 2.5mm 100m", "precio": 33990, "url": ""},
        "construmart": {"nombre_producto": "Cable H07Z1-K 2.5mm 100m", "precio": 32990, "url": ""},
    },
    26: {  # Cable H07Z1-K 4mm (rollo 100m)
        "sodimac": {"nombre_producto": "Cable H07Z1-K 4mm Blanco 100m", "precio": 54990, "url": ""},
        "easy": {"nombre_producto": "Cable H07Z1-K 4mm 100m", "precio": 52990, "url": ""},
        "construmart": {"nombre_producto": "Cable H07Z1-K 4mm 100m", "precio": 51990, "url": ""},
    },
    27: {  # Cable H07Z1-K 6mm (rollo 100m)
        "sodimac": {"nombre_producto": "Cable H07Z1-K 6mm Verde 100m", "precio": 79990, "url": ""},
        "easy": {"nombre_producto": "Cable H07Z1-K 6mm 100m", "precio": 76990, "url": ""},
        "construmart": {"nombre_producto": "Cable H07Z1-K 6mm 100m", "precio": 74990, "url": ""},
    },
    28: {  # Tubo PVC 110mm (tubo 3m)
        "sodimac": {"nombre_producto": "Tubo PVC Sanitario 110mm 3m", "precio": 11990, "url": ""},
        "easy": {"nombre_producto": "Tubo PVC 110mm 3m", "precio": 11490, "url": ""},
        "construmart": {"nombre_producto": "Tubo PVC 110mm 3m", "precio": 10990, "url": ""},
    },
    29: {  # Tubo PVC 75mm (tubo 3m)
        "sodimac": {"nombre_producto": "Tubo PVC Sanitario 75mm 3m", "precio": 8490, "url": ""},
        "easy": {"nombre_producto": "Tubo PVC 75mm 3m", "precio": 8190, "url": ""},
        "construmart": {"nombre_producto": "Tubo PVC 75mm 3m", "precio": 7990, "url": ""},
    },
    30: {  # Tubo PVC 50mm (tubo 3m)
        "sodimac": {"nombre_producto": "Tubo PVC Sanitario 50mm 3m", "precio": 6490, "url": ""},
        "easy": {"nombre_producto": "Tubo PVC 50mm 3m", "precio": 6290, "url": ""},
        "construmart": {"nombre_producto": "Tubo PVC 50mm 3m", "precio": 6190, "url": ""},
    },
    31: {  # Tubo Cobre 15mm (3m)
        "sodimac": {"nombre_producto": "Tubo Cobre Tipo L 15mm 3m", "precio": 11990, "url": ""},
        "easy": {"nombre_producto": "Tubo Cobre 15mm 3m", "precio": 11490, "url": ""},
        "construmart": {"nombre_producto": "Tubo Cobre 15mm 3m", "precio": 10990, "url": ""},
    },
    32: {  # Tubo Cobre 22mm (3m)
        "sodimac": {"nombre_producto": "Tubo Cobre Tipo L 22mm 3m", "precio": 17990, "url": ""},
        "easy": {"nombre_producto": "Tubo Cobre 22mm 3m", "precio": 16990, "url": ""},
        "construmart": {"nombre_producto": "Tubo Cobre 22mm 3m", "precio": 16490, "url": ""},
    },
    33: {  # Caja Electrica Embutida
        "sodimac": {"nombre_producto": "Caja Distribucion Embutida 53x100x48mm", "precio": 1490, "url": ""},
        "easy": {"nombre_producto": "Caja Electrica Embutida", "precio": 1390, "url": ""},
        "construmart": {"nombre_producto": "Caja Electrica Embutida", "precio": 1290, "url": ""},
    },
    34: {  # Disyuntor Termomagnetico
        "sodimac": {"nombre_producto": "Automatico Monofasico 1x16A", "precio": 5990, "url": ""},
        "easy": {"nombre_producto": "Disyuntor 16A", "precio": 5790, "url": ""},
        "construmart": {"nombre_producto": "Disyuntor 16A", "precio": 5690, "url": ""},
    },
    # === Mano de Obra ===
    # Tarifas de referencia mercado chileno (CLP por HH = hora hombre).
    # Cálculo: tarifa diaria / 8 horas. Fuente: promedio mercado 2025.
    # Stock marcado como "Referencia MO" para distinguirlo en reportes.
    # Tienda "construmart" usada para cumplir el CHECK constraint de precio_mercado.
    35: {  # Albañil — ~35.000 CLP/día → 4.375 CLP/HH
        "construmart": {"nombre_producto": "Mano de Obra Albañil (HH referencia)", "precio": 4375, "url": ""},
    },
    36: {  # Electricista — ~40.000 CLP/día → 5.000 CLP/HH
        "construmart": {"nombre_producto": "Mano de Obra Electricista (HH referencia)", "precio": 5000, "url": ""},
    },
    37: {  # Gasfíter — ~35.000 CLP/día → 4.375 CLP/HH
        "construmart": {"nombre_producto": "Mano de Obra Gasfíter (HH referencia)", "precio": 4375, "url": ""},
    },
    38: {  # Ayudante General — ~25.000 CLP/día → 3.125 CLP/HH
        "construmart": {"nombre_producto": "Mano de Obra Ayudante General (HH referencia)", "precio": 3125, "url": ""},
    },
}


REFERENCE_QUERY_IDS = {
    "perfil c 60x38mm 3m": 7,
    "perfil u 62x25mm 3m": 8,
    "tornillo autoperforante caja 100un": 15,
}

REFERENCE_KEYWORDS = {
    "perfil c 60x38mm 3m": ["perfil metalcon c", "perfil c 60x38", "perfil c"],
    "perfil u 62x25mm 3m": ["perfil metalcon u", "perfil u 62x25", "canal u", "perfil u"],
    "tornillo autoperforante caja 100un": [
        "tornillo autoperforante",
        "tornillo punta broca",
        "tornillo metalcon",
    ],
}


def _normalize(text: str) -> str:
    return " ".join((text or "").strip().lower().split())


def _reference_key(query: str) -> Optional[str]:
    normalized = _normalize(query)
    for key, keywords in REFERENCE_KEYWORDS.items():
        if normalized == key or any(keyword in normalized for keyword in keywords):
            return key
    return None


def _fallback_url(query: str) -> str:
    return f"fallback://{_normalize(query).replace(' ', '-')}"


def lookup_reference_offer(query: str, tienda: str, insumo_id: Optional[int] = None) -> Optional[dict]:
    """Retorna una oferta referencial para insumos Metalcon cuando el scraping falla."""
    key = _reference_key(query)
    if not key:
        return None

    reference_id = REFERENCE_QUERY_IDS[key]
    store_prices = FALLBACK_PRICES.get(reference_id, {})
    offer = store_prices.get(tienda) or next(iter(store_prices.values()), None)
    if not offer or not offer.get("precio"):
        return None

    return {
        "tienda": tienda,
        "url": offer.get("url") or _fallback_url(query),
        "nombre_producto": offer["nombre_producto"],
        "precio": float(offer["precio"]),
        "precio_descuento": None,
        "stock": "Referencia",
        "categoria": "Obra Gruesa",
        "insumo_id": insumo_id,
        "exitoso": True,
    }


def get_fallback_results(insumos: list[dict]) -> list[dict]:
    """Genera resultados de respaldo para insumos sin precio scrapeado.

    Para Mano de Obra (IDs 35-38) el stock se marca 'Referencia MO'
    para distinguir tarifas HH de precios de materiales en reportes.
    """
    import logging
    log = logging.getLogger(__name__)
    results = []

    # IDs de Mano de Obra — marcar stock distinto para facilitar filtros
    MANO_DE_OBRA_IDS = {35, 36, 37, 38}

    for insumo in insumos:
        insumo_id = insumo.get("id")
        if insumo_id not in FALLBACK_PRICES:
            continue

        es_mano_de_obra = insumo_id in MANO_DE_OBRA_IDS
        stock_label = "Referencia MO" if es_mano_de_obra else "Disponible"

        stores = FALLBACK_PRICES[insumo_id]
        for store_key, data in stores.items():
            if not data.get("precio"):
                continue
            results.append({
                "tienda": store_key,
                "nombre_producto": data["nombre_producto"],
                "precio": data["precio"],
                "precio_descuento": None,
                "insumo_id": insumo_id,
                "stock": stock_label,
                "categoria": insumo.get("categoria", "Obra Gruesa"),
                "url": data.get("url", ""),
                "exitoso": True,
            })
        log.info(f"[Fallback] {insumo.get('nombre', '?')} (ID={insumo_id}) -> precios de respaldo")

    return results

