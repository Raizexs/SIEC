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

from logger import setup_logging          # ← configuración centralizada de formato
from sodimac_scraper import scrape_sodimac
from easy_scraper import scrape_easy
from construmart_scraper import scrape_construmart
from scrapers.cmf import scrape_uf_cmf
from db import insertar_precios, insertar_indicador

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

    scrapers = [
        ("Sodimac",     scrape_sodimac),
        ("Easy",        scrape_easy),
        ("Construmart", scrape_construmart),
    ]

    # Contadores para el resumen final (Criterio 4)
    total_exitosos:   int       = 0
    total_errores:    int       = 0
    tiendas_fallidas: list[str] = []

    for nombre, scraper_fn in scrapers:
        logger.info(f"[Scheduler] → Ejecutando scraper: {nombre}")
        try:
            resultados = scraper_fn()

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
                logger.info(f"[Scheduler] ✅ {nombre}: {insertados} registros guardados, {len(fallidos)} fallidos.")
            else:
                logger.warning(f"[Scheduler] ⚠️  {nombre}: Sin datos válidos. Registros previos en precio_mercado se mantienen intactos.")

        except Exception as e:
            # Criterio 2: error aislado por tienda — los demás scrapers continúan
            logger.error(f"[Scheduler] ❌ [{nombre}] Error crítico en scraper: {e}", exc_info=True)
            logger.error(f"[Scheduler] [{nombre}] Fallo aislado — continuando con siguiente tienda.")
            tiendas_fallidas.append(nombre)
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
