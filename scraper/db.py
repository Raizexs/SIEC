# scraper/db.py
"""
Módulo de persistencia: conexión a PostgreSQL e inserción en precio_mercado.
"""

import os
import logging
import psycopg2
from psycopg2.extras import execute_batch
from datetime import datetime
from typing import Optional

from validators import validar_variacion_precio

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

    Protección anti-sobrescritura nula (Criterio 3):
        Los registros sin precio son descartados ANTES de llegar a la DB.
        Esta es una defensa en profundidad: main.py ya filtra por precio != None,
        pero esta función garantiza que ningún path alternativo pueda corromper
        datos historícos con valores nulos.

    Cada dict debe tener las claves:
        tienda, nombre_producto, precio, precio_descuento,
        stock, categoria, url, exitoso

    Retorna el número de filas insertadas.
    """
    if not resultados:
        logger.warning("No hay resultados para insertar.")
        return 0

    # ── Guard anti-nulo: protección contra sobrescritura de datos históricos ──
    validos = [r for r in resultados if r.get("precio") is not None]
    descartados = len(resultados) - len(validos)
    if descartados:
        logger.warning(
            f"[DB] {descartados} registro(s) descartados por precio nulo. "
            "Los datos anteriores en precio_mercado se mantienen intactos."
        )
    if not validos:
        logger.warning("[DB] Sin registros con precio válido. Inserción abortada — precio_mercado intacto.")
        return 0

    # ── Filtro de variación de precios (SCRUM-64): descarta variaciones irracionales ──
    # Criterio: nuevo > 3× anterior (+200%) o nuevo < 0.5× anterior (−50%)
    import db as _db_self  # referencia al propio módulo para inyección en el validador
    aprobados = []
    rechazados_variacion = 0
    for r in validos:
        if validar_variacion_precio(
            insumo_id=r.get("insumo_id"),
            tienda=r.get("tienda", ""),
            nuevo_precio=float(r["precio"]),
            db=_db_self,
            nombre_producto=r.get("nombre_producto", ""),
            url=r.get("url", ""),
        ):
            aprobados.append(r)
        else:
            rechazados_variacion += 1

    if rechazados_variacion:
        logger.warning(
            f"[DB] {rechazados_variacion} registro(s) descartados por variación irracional de precio. "
            "Los datos anteriores en precio_mercado se mantienen intactos."
        )
    if not aprobados:
        logger.warning("[DB] Sin registros aprobados tras filtro de variación. Inserción abortada — precio_mercado intacto.")
        return 0

    validos = aprobados

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
    for r in validos:
        r.setdefault("fecha_scraping", ahora)
        r.setdefault("exitoso", True)
        r.setdefault("insumo_id", None)  # NULL si no se puede mapear al insumo


    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cur:
                execute_batch(cur, sql, validos)
        conn.close()
        logger.info(f"[DB] {len(validos)} registros insertados en precio_mercado.")
        return len(validos)
    except Exception as e:
        logger.error(f"[DB] Error al insertar en precio_mercado: {e}")
        raise


# ──────────────────────────────────────────────────────────────────────────────
# Consulta de último precio válido
# ──────────────────────────────────────────────────────────────────────────────

def get_ultimo_precio_valido(tienda: str, url: str) -> Optional[float]:
    """
    Consulta el último precio válido registrado para un par (tienda, URL).

    Útil para enriquecer el mensaje de timeout con el precio histórico,
    confirmando que el dato previo se mantiene intacto en precio_mercado.

    Ejemplo de uso en un scraper:
        ultimo = get_ultimo_precio_valido("sodimac", url)
        if ultimo:
            logger.info(f"[Sodimac] Último precio válido registrado: ${ultimo:,.0f} CLP")

    Retorna:
        float si existe registro previo, None si no hay historial o hay error de conexión.
    """
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT "Precio"
                    FROM   precio_mercado
                    WHERE  "Tienda" = %s
                      AND  "URL"    = %s
                      AND  "Precio" IS NOT NULL
                    ORDER  BY "Fecha_Scraping" DESC
                    LIMIT  1
                    """,
                    (tienda, url),
                )
                row = cur.fetchone()
                return float(row[0]) if row else None
        finally:
            conn.close()
    except Exception as e:
        logger.debug(f"[DB] No se pudo recuperar último precio ({tienda}): {e}")
        return None
