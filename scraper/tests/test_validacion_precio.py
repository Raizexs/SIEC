# scraper/tests/test_validacion_precio.py
"""
Tests unitarios para scraper/validators.py — validar_variacion_precio()

Cobertura requerida:
  1. Aumento aceptable      → ACEPTAR   (ej. $5.000 → $5.800, +16%)
  2. Aumento rechazado      → DESCARTAR (ej. $5.000 → $16.000, +220%)
  3. Disminución aceptable  → ACEPTAR   (ej. $5.000 → $3.000, −40%)
  4. Disminución rechazada  → DESCARTAR (ej. $5.000 → $2.000, −60%)
  5. Primer registro        → ACEPTAR   (sin historial previo)

Estrategia de aislamiento:
  - Se usa unittest.mock para sustituir db.get_ultimo_precio_valido sin
    necesitar una conexión real a PostgreSQL.
  - Los tests son completamente independientes entre sí.
"""

import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Asegurar que el directorio padre (scraper/) esté en el path
# para que "from validators import ..." funcione tanto al ejecutar
# desde scraper/ como desde scraper/tests/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from validators import validar_variacion_precio


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

TIENDA    = "sodimac"
URL       = "https://www.sodimac.cl/product/cemento-test"
INSUMO_ID = 1     # Cemento Portland


def _db_mock(ultimo_precio):
    """Devuelve un stub del módulo db con get_ultimo_precio_valido precargado."""
    db = MagicMock()
    db.get_ultimo_precio_valido.return_value = ultimo_precio
    return db


# ──────────────────────────────────────────────────────────────────────────────
# Casos de prueba
# ──────────────────────────────────────────────────────────────────────────────

class TestValidarVariacionPrecio(unittest.TestCase):

    # ── 1. Aumento aceptable (+16%) ───────────────────────────────────────────
    def test_aumento_aceptable_es_aceptado(self):
        """$5.000 → $5.800 (+16%) debe ser ACEPTADO."""
        db = _db_mock(ultimo_precio=5_000)
        resultado = validar_variacion_precio(
            insumo_id=INSUMO_ID,
            tienda=TIENDA,
            nuevo_precio=5_800,
            db=db,
            nombre_producto="Cemento",
            url=URL,
        )
        self.assertTrue(resultado, "Un aumento del +16% debería ser aceptado.")
        db.get_ultimo_precio_valido.assert_called_once_with(TIENDA, URL)

    # ── 2. Aumento rechazado (+220%) ─────────────────────────────────────────
    def test_aumento_irracional_es_descartado(self):
        """$5.000 → $16.000 (+220%) debe ser DESCARTADO."""
        db = _db_mock(ultimo_precio=5_000)
        with self.assertLogs("validators", level="WARNING") as log_ctx:
            resultado = validar_variacion_precio(
                insumo_id=INSUMO_ID,
                tienda=TIENDA,
                nuevo_precio=16_000,
                db=db,
                nombre_producto="Cemento",
                url=URL,
            )
        self.assertFalse(resultado, "Un aumento del +220% debería ser descartado.")
        # Verificar que el mensaje de log incluye los datos esperados
        mensaje = "\n".join(log_ctx.output)
        self.assertIn("Cemento",  mensaje)
        self.assertIn("Sodimac",  mensaje)
        self.assertIn("5.000",    mensaje)
        self.assertIn("16.000",   mensaje)
        self.assertIn("+200%",    mensaje)

    # ── 3. Disminución aceptable (−40%) ──────────────────────────────────────
    def test_disminucion_aceptable_es_aceptada(self):
        """$5.000 → $3.000 (−40%) debe ser ACEPTADA."""
        db = _db_mock(ultimo_precio=5_000)
        resultado = validar_variacion_precio(
            insumo_id=INSUMO_ID,
            tienda=TIENDA,
            nuevo_precio=3_000,
            db=db,
            nombre_producto="Cemento",
            url=URL,
        )
        self.assertTrue(resultado, "Una disminución del −40% debería ser aceptada.")

    # ── 4. Disminución rechazada (−60%) ──────────────────────────────────────
    def test_disminucion_irracional_es_descartada(self):
        """$5.000 → $2.000 (−60%) debe ser DESCARTADA."""
        db = _db_mock(ultimo_precio=5_000)
        with self.assertLogs("validators", level="WARNING") as log_ctx:
            resultado = validar_variacion_precio(
                insumo_id=INSUMO_ID,
                tienda=TIENDA,
                nuevo_precio=2_000,
                db=db,
                nombre_producto="Cemento",
                url=URL,
            )
        self.assertFalse(resultado, "Una disminución del −60% debería ser descartada.")
        mensaje = "\n".join(log_ctx.output)
        self.assertIn("Cemento", mensaje)
        self.assertIn("-50%",    mensaje)

    # ── 5. Primer registro (sin historial) ───────────────────────────────────
    def test_primer_registro_es_aceptado(self):
        """Sin historial previo (None) → ACEPTAR siempre."""
        db = _db_mock(ultimo_precio=None)
        resultado = validar_variacion_precio(
            insumo_id=INSUMO_ID,
            tienda=TIENDA,
            nuevo_precio=5_000,
            db=db,
            nombre_producto="Cemento",
            url=URL,
        )
        self.assertTrue(resultado, "El primer registro siempre debe ser aceptado.")

    # ── Extras: límites exactos de umbral ─────────────────────────────────────

    def test_exactamente_triple_es_aceptado(self):
        """$5.000 → $15.000 (exactamente 3×) está en el límite → ACEPTADO."""
        db = _db_mock(ultimo_precio=5_000)
        resultado = validar_variacion_precio(
            insumo_id=INSUMO_ID,
            tienda=TIENDA,
            nuevo_precio=15_000,
            db=db,
            nombre_producto="Cemento",
            url=URL,
        )
        self.assertTrue(resultado, "Exactamente 3× el precio base no supera el umbral (>).")

    def test_exactamente_mitad_es_aceptado(self):
        """$5.000 → $2.500 (exactamente 0.5×) está en el límite → ACEPTADO."""
        db = _db_mock(ultimo_precio=5_000)
        resultado = validar_variacion_precio(
            insumo_id=INSUMO_ID,
            tienda=TIENDA,
            nuevo_precio=2_500,
            db=db,
            nombre_producto="Cemento",
            url=URL,
        )
        self.assertTrue(resultado, "Exactamente 0.5× el precio base no cruza el umbral (<).")

    def test_insumo_id_none_con_primer_registro(self):
        """insumo_id=None (sin mapeo) en primer registro → ACEPTAR."""
        db = _db_mock(ultimo_precio=None)
        resultado = validar_variacion_precio(
            insumo_id=None,
            tienda="easy",
            nuevo_precio=8_500,
            db=db,
            nombre_producto="Fierro",
            url="https://easy.cl/product/fierro-test",
        )
        self.assertTrue(resultado)


# ──────────────────────────────────────────────────────────────────────────────
# Entry-point para ejecución directa (python -m pytest o python test_*.py)
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    unittest.main(verbosity=2)
