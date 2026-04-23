# scraper/logger.py
"""
Configuración centralizada de logging para el microservicio scraper SIEC.

Formato de salida (visible con `docker logs siec_scraper`):
    2026-04-07 03:00:15 [INFO]    [Scheduler] ▶ Ciclo de scraping iniciado…
    2026-04-07 03:00:15 [ERROR]   [Sodimac]   Timeout de 30s excedido para producto Cemento. Manteniendo último precio válido.
    2026-04-07 03:00:15 [INFO]    Ejecución finalizada. Éxitos: 12, Errores: 3, Tiendas fallidas: [Construmart]

Uso:
    # main.py — llamar UNA SOLA VEZ al inicio, antes de importar scrapers
    from logger import setup_logging
    setup_logging()

    # Cualquier otro módulo — sin cambios en la interfaz habitual
    import logging
    logger = logging.getLogger(__name__)
    logger.info("[Sodimac] Mensaje")   # ← ya sale con el formato correcto
"""

import logging
import sys

# ──────────────────────────────────────────────────────────────────────────────
# Constantes de formato
# ──────────────────────────────────────────────────────────────────────────────

# Formato de salida que cumple el criterio: "2026-04-07 03:00:15 [ERROR] [Sodimac] Mensaje"
LOG_FORMAT  = "%(asctime)s [%(levelname)-8s] %(message)s"
LOG_DATEFMT = "%Y-%m-%d %H:%M:%S"


# ──────────────────────────────────────────────────────────────────────────────
# Función de configuración
# ──────────────────────────────────────────────────────────────────────────────

def setup_logging(level: int = logging.INFO) -> None:
    """
    Configura el sistema de logging global del microservicio.

    - Escribe a stdout para que `docker logs siec_scraper` reciba los mensajes.
    - Suprime logs verbosos de librerías externas (playwright, apscheduler, urllib3).
    - Idempotente: si se llama más de una vez, reemplaza el handler existente.

    Args:
        level: Nivel mínimo de logging.
               INFO  → producción (default).
               DEBUG → desarrollo (muestra navegación Playwright, selectores, etc.).

    Ejemplo de salida:
        2026-04-07 03:00:15 [INFO    ] [Scheduler] ▶ Ciclo de scraping iniciado: 2026-04-07 03:00:15
        2026-04-07 03:00:15 [ERROR   ] [Sodimac] Timeout de 30s excedido para producto Cemento. Manteniendo último precio válido.
        2026-04-07 03:00:15 [INFO    ] Ejecución finalizada. Éxitos: 12, Errores: 3, Tiendas fallidas: [Construmart]
    """
    formatter = logging.Formatter(fmt=LOG_FORMAT, datefmt=LOG_DATEFMT)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)

    # Reemplazar handlers previos para evitar duplicados
    root.handlers.clear()
    root.addHandler(handler)

    # ── Suprimir librerías externas verbosas ─────────────────────────────────
    for noisy_lib in ("playwright", "apscheduler", "urllib3", "asyncio"):
        logging.getLogger(noisy_lib).setLevel(logging.WARNING)
