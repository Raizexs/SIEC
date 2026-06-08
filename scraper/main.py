# scraper/main.py
"""
Microservicio Scraper — SIEC
================================
Ejecuta los scrapers de Sodimac, Easy y Construmart automáticamente
cada día a las 03:00 AM (zona horaria Chile/Continental) usando APScheduler.

Variables de entorno:
  DATABASE_URL  → URL de conexión a PostgreSQL
                  Default: postgresql://postgres:postgres@db:5432/siec
  RUN_NOW       → Si es "true", ejecuta el scraping inmediatamente al iniciar
                  (útil para testing/demo sin esperar las 03:00 AM)
  TZ            → Zona horaria del contenedor (recomendado: America/Santiago)
"""

import os
import logging
import sys
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from logger import setup_logging
from construmart_scraper import ConstrumartScraper
from serpapi_scraper import SerpAPIScraper
from scrapers.cmf import scrape_uf_cmf
from db import insertar_precios, insertar_indicador, get_insumos_activos
from fallback_prices import get_fallback_results

# ──────────────────────────────────────────────────────────────────────────────
# Logging — formato: "2026-04-07 03:00:15 [NIVEL  ] [TIENDA] Mensaje"
# Setup centralizado: todos los módulos heredan esta configuración.
# ──────────────────────────────────────────────────────────────────────────────

setup_logging()
logger = logging.getLogger("scraper.main")


# ──────────────────────────────────────────────────────────────────────────────
# Job principal
# ──────────────────────────────────────────────────────────────────────────────

def ejecutar_scrapers() -> None:
    """
    Ejecuta los tres scrapers en secuencia e inserta los resultados
    exitosos en la tabla precio_mercado de PostgreSQL.

    Criterios de validación satisfechos:
    - Try/except POR TIENDA: si Sodimac falla, Easy y Construmart siguen.
    - Tracking granular: éxitos por producto, errores por producto, tiendas fallidas.
    - Resumen final: "[INFO] Ejecución finalizada. Éxitos: X, Errores: Y, Tiendas fallidas: [Z]"
    - Protección anti-nulo: solo se insertan resultados con precio válido.
    """
    inicio = datetime.now()
    sep = "-" * 60
    logger.info(sep)
    logger.info(f"[Scheduler] ▶ Ciclo de scraping iniciado: {inicio.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(sep)

    logger.info(sep)

    # 1. Obtener insumos activos de la DB
    insumos = get_insumos_activos()
    if not insumos:
        logger.error("[Scheduler] No se encontraron insumos activos en la DB. Abortando ciclo.")
        return

    logger.info(f"[Scheduler] Insumos a cotizar: {[i['nombre'] for i in insumos]}")

    scrapers = [
        ("Construmart", ConstrumartScraper()),
        ("SerpAPI",     SerpAPIScraper()),
    ]

    total_exitosos:   int       = 0
    total_errores:    int       = 0
    tiendas_fallidas: list[str] = []
    insumos_cubiertos: set[int] = set()

    for nombre, scraper_inst in scrapers:
        logger.info(f"[Scheduler] → Ejecutando descubrimiento por keywords: {nombre}")
        try:
            # 2. Ejecutar búsqueda y matching difuso
            resultados = scraper_inst.scrape_by_keywords(insumos)

            # Productos con precio válido → se insertan
            exitosos = [
                r for r in resultados
                if r.get("exitoso") and r.get("nombre_producto") and r.get("precio") is not None
            ]
            # Productos que fallaron (timeout, error, precio nulo)
            fallidos = [r for r in resultados if not r.get("exitoso")]

            total_errores += len(fallidos)

            if exitosos:
                insertados = insertar_precios(exitosos)
                total_exitosos += insertados
                for r in exitosos:
                    if r.get("insumo_id"):
                        insumos_cubiertos.add(r["insumo_id"])
                logger.info(f"[Scheduler] ✅ {nombre}: {insertados} registros guardados, {len(fallidos)} fallidos.")
            else:
                logger.warning(f"[Scheduler] ⚠️  {nombre}: Sin datos válidos. Registros previos en precio_mercado se mantienen intactos.")

        except Exception as e:
            # Criterio 2: error aislado por tienda — los demás scrapers continúan
            logger.error(f"[Scheduler] ❌ [{nombre}] Error crítico en scraper: {e}", exc_info=True)
            logger.error(f"[Scheduler] [{nombre}] Fallo aislado — continuando con siguiente tienda.")
            tiendas_fallidas.append(nombre)
            total_errores += 1

    # ── Fallback: precios de respaldo para insumos sin cobertura ──
    logger.info(f"[Scheduler] → Aplicando precios de respaldo ({len(insumos_cubiertos)}/{len(insumos)} insumos ya cubiertos)...")
    try:
        insumos_pendientes = [i for i in insumos if i.get("id") not in insumos_cubiertos]
        if insumos_pendientes:
            fallback_results = get_fallback_results(insumos_pendientes)
            if fallback_results:
                insertados_fb = insertar_precios(fallback_results)
                total_exitosos += insertados_fb
                logger.info(f"[Scheduler] ✅ Fallback: {insertados_fb} registros de respaldo guardados.")
            else:
                logger.info("[Scheduler] Fallback: sin precios de respaldo disponibles.")
        else:
            logger.info("[Scheduler] Fallback: todos los insumos ya tienen cobertura. Omitiendo.")
    except Exception as e:
        logger.error(f"[Scheduler] ❌ Error en fallback: {e}", exc_info=True)
        total_errores += 1

    # ── Ejecución de indicadores financieros (UF) ──
    logger.info("[Scheduler] → Ejecutando refresco de UF (CMF)...")
    try:
        datos_uf = scrape_uf_cmf()
        if datos_uf:
            insertado = insertar_indicador(datos_uf)
            if insertado:
                logger.info(f"[Scheduler] ✅ UF actualizada: {datos_uf['valor']} ({datos_uf['fecha']})")
            else:
                logger.warning("[Scheduler] ⚠️ UF no insertada (posible duplicado para la fecha).")
        else:
            logger.error("[Scheduler] ❌ Fallo al obtener UF desde CMF.")
            total_errores += 1
    except Exception as e:
        logger.error(f"[Scheduler] ❌ Error crítico en refresco de UF: {e}", exc_info=True)
        total_errores += 1

    duracion = round((datetime.now() - inicio).total_seconds(), 1)
    cobertura_pct = round((len(insumos_cubiertos) / len(insumos)) * 100, 1) if insumos else 0.0
    if cobertura_pct < 85:
        logger.error(
            f"[Health] Cobertura insufos {cobertura_pct}% (< 85%). "
            f"Pendientes: {[i['nombre'] for i in insumos if i.get('id') not in insumos_cubiertos]}"
        )
    else:
        logger.info(f"[Health] Cobertura insumos: {cobertura_pct}% ({len(insumos_cubiertos)}/{len(insumos)})")

    # Criterio 4: resumen final con formato exacto requerido
    logger.info(sep)
    logger.info(
        f"Ejecución finalizada. "
        f"Éxitos: {total_exitosos}, "
        f"Errores: {total_errores}, "
        f"Tiendas fallidas: {tiendas_fallidas}"
    )
    logger.info(f"[Scheduler] Duración total del ciclo: {duracion}s.")
    logger.info(sep)


# ──────────────────────────────────────────────────────────────────────────────
# Entrypoint
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    run_now = os.environ.get("RUN_NOW", "false").strip().lower() == "true"

    # ── Configuración del BackgroundScheduler ────────────────────────────────
    scheduler = BackgroundScheduler(timezone="America/Santiago")

    # Job cron: todos los días a las 03:00 AM (hora Chile continental)
    trigger = CronTrigger(hour=3, minute=0, timezone="America/Santiago")
    scheduler.add_job(
        func=ejecutar_scrapers,
        trigger=trigger,
        id="scraping_diario",
        name="Scraping diario Precios y UF (CMF)",
        misfire_grace_time=3600,   # Tolera hasta 1h de retraso si el contenedor estuvo caído
        coalesce=True,             # Si perdió varios disparos, ejecuta solo uno al volver
    )

    scheduler.start()

    # Calcular próxima ejecución
    job = scheduler.get_job("scraping_diario")
    proxima = job.next_run_time.strftime("%Y-%m-%d %H:%M:%S %Z") if job and job.next_run_time else "desconocida"
    logger.info(f"[INFO] Scheduler iniciado. Próxima ejecución: 03:00 AM (Chile) — {proxima}")

    # ── Ejecución inmediata si RUN_NOW=true ──────────────────────────────────
    if run_now:
        logger.info("[INFO] RUN_NOW=true detectado — ejecutando scrapers ahora mismo…")
        try:
            ejecutar_scrapers()
        except Exception as e:
            logger.error(f"[INFO] Error en ejecución inmediata RUN_NOW: {e}", exc_info=True)

    # ── Mantener el proceso vivo ─────────────────────────────────────────────
    logger.info("[INFO] Scraper en espera. El scheduler mantendrá el proceso activo.")
    try:
        import time
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        logger.info("[INFO] Señal de parada recibida. Apagando scheduler…")
        scheduler.shutdown(wait=False)
        logger.info("[INFO] Scheduler detenido. Adiós.")


if __name__ == "__main__":
    main()
