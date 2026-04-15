# scraper/db.py
"""
Módulo de persistencia: conexión a PostgreSQL e inserción en precio_mercado.
"""

import os
import logging
import psycopg2
from psycopg2.extras import execute_batch
from datetime import datetime

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Conexión
# ──────────────────────────────────────────────────────────────────────────────

def get_connection():
    """Retorna una conexión a PostgreSQL usando DATABASE_URL del entorno."""
    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@db:5432/siec"
    )
    return psycopg2.connect(database_url)


# ──────────────────────────────────────────────────────────────────────────────
# Inserción de resultados
# ──────────────────────────────────────────────────────────────────────────────

def insertar_precios(resultados: list[dict]) -> int:
    """
    Inserta una lista de resultados scrapeados en la tabla precio_mercado.

    Cada dict debe tener las claves:
        tienda, nombre_producto, precio, precio_descuento,
        stock, categoria, url, exitoso

    Retorna el número de filas insertadas.
    """
    if not resultados:
        logger.warning("No hay resultados para insertar.")
        return 0

    sql = """
        INSERT INTO precio_mercado (
            "Insumo_ID", "Tienda", "Nombre_Producto", "Precio", "Precio_Descuento",
            "Stock", "Categoria", "URL", "Fecha_Scraping", "Exitoso"
        ) VALUES (
            %(insumo_id)s, %(tienda)s, %(nombre_producto)s, %(precio)s, %(precio_descuento)s,
            %(stock)s, %(categoria)s, %(url)s, %(fecha_scraping)s, %(exitoso)s
        )
    """

    # Aseguramos que todos los registros tengan Fecha_Scraping e Insumo_ID
    ahora = datetime.utcnow()
    for r in resultados:
        r.setdefault("fecha_scraping", ahora)
        r.setdefault("exitoso", True)
        r.setdefault("insumo_id", None)  # NULL si no se puede mapear al insumo


    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cur:
                execute_batch(cur, sql, resultados)
        conn.close()
        logger.info(f"[DB] {len(resultados)} registros insertados en precio_mercado.")
        return len(resultados)
    except Exception as e:
        logger.error(f"[DB] Error al insertar en precio_mercado: {e}")
        raise
