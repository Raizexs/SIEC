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

from sodimac_scraper import scrape_sodimac
from easy_scraper import scrape_easy
from construmart_scraper import scrape_construmart
from db import insertar_precios

# ──────────────────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("scraper.main")


# ──────────────────────────────────────────────────────────────────────────────
# Job principal
# ──────────────────────────────────────────────────────────────────────────────

def ejecutar_scrapers() -> None:
    """
    Ejecuta los tres scrapers en secuencia e inserta los resultados
    exitosos en la tabla precio_mercado de PostgreSQL.

    Si ocurre un error en cualquier scraper individual, se registra
    y continúa con el siguiente — el contenedor NO se detiene.
    """
    inicio = datetime.now()
    logger.info("=" * 60)
    logger.info(f"[Scheduler] ▶ Ciclo de scraping iniciado: {inicio.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 60)

    scrapers = [
        ("Sodimac",    scrape_sodimac),
        ("Easy",       scrape_easy),
        ("Construmart",scrape_construmart),
    ]

    total_insertados = 0

    for nombre, scraper_fn in scrapers:
        try:
            logger.info(f"[Scheduler] → Ejecutando scraper: {nombre}")
            resultados = scraper_fn()

            # Solo insertar los que tienen nombre y precio válidos
            exitosos = [
                r for r in resultados
                if r.get("exitoso") and r.get("nombre_producto") and r.get("precio") is not None
            ]

            if exitosos:
                insertados = insertar_precios(exitosos)
                total_insertados += insertados
                logger.info(f"[Scheduler] ✅ {nombre}: {insertados} registros guardados.")
            else:
                logger.warning(f"[Scheduler] ⚠️  {nombre}: No se obtuvieron datos válidos.")

        except Exception as e:
            # Error aislado: logeamos y seguimos con el siguiente scraper
            logger.error(f"[Scheduler] ❌ Error en scraper {nombre}: {e}", exc_info=True)
            logger.error("[Scheduler] El error es aislado — el scheduler continúa activo.")

    duracion = (datetime.now() - inicio).seconds
    logger.info("=" * 60)
    logger.info(
        f"[Scheduler] ■ Ciclo completado en {duracion}s. "
        f"Total insertados: {total_insertados} registros."
    )
    logger.info("=" * 60)


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
        name="Scraping diario Sodimac / Easy / Construmart",
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
