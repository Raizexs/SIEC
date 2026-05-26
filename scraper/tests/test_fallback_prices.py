import os
import sys

scraper_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if scraper_dir not in sys.path:
    sys.path.insert(0, scraper_dir)

from fallback_prices import lookup_reference_offer


def test_lookup_reference_offer_returns_metalcon_profile_reference():
    offer = lookup_reference_offer("perfil metalcon C", "sodimac", 25)

    assert offer is not None
    assert offer["nombre_producto"] == "Perfil C 60x38mm 3m"
    assert offer["precio"] > 0
    assert offer["insumo_id"] == 25
