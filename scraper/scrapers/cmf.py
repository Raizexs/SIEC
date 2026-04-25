# scraper/scrapers/cmf.py
"""
Conector para la API de la Comisión para el Mercado Financiero (CMF).
Obtiene el valor de la UF (Unidad de Fomento) del día actual.
"""

import os
import logging
import requests
from datetime import datetime

logger = logging.getLogger("scraper.cmf")

def scrape_uf_cmf():
    """
    Consulta la API de CMF para obtener el valor de la UF del día actual.
    Retorna un diccionario con los datos o None si hay error.
    """
    api_key = os.environ.get("CMF_API_KEY")
    if not api_key:
        logger.error("[CMF] CMF_API_KEY no configurada en las variables de entorno.")
        return None

    url = f"https://api.cmfchile.cl/api-sbifv3/recursos_api/uf?apikey={api_key}&formato=json"
    
    try:
        logger.info("[CMF] Consultando valor UF del día...")
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()

        # Estructura esperada: {"UFs": [{"Valor": "37.500,00", "Fecha": "2024-04-21"}]}
        if "UFs" in data and len(data["UFs"]) > 0:
            uf_data = data["UFs"][0]
            valor_str = uf_data["Valor"].replace(".", "").replace(",", ".")
            valor = float(valor_str)
            fecha_str = uf_data["Fecha"]
            
            logger.info(f"[CMF] Valor UF obtenido: {valor} para la fecha {fecha_str}")
            return {
                "nombre": "UF",
                "valor": valor,
                "fecha": fecha_str,
                "fuente": "CMF"
            }
        else:
            logger.warning(f"[CMF] No se encontraron datos de UF en la respuesta: {data}")
            return None

    except requests.exceptions.RequestException as e:
        logger.error(f"[CMF] Error al consultar la API de CMF: {e}")
        return None
    except (KeyError, ValueError, IndexError) as e:
        logger.error(f"[CMF] Error al procesar la respuesta de la API: {e}")
        return None
