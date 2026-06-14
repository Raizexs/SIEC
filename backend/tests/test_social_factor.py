import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from apu import apply_social_ley_factor
except ModuleNotFoundError:
    from backend.apu import apply_social_ley_factor


def test_social_factor_no_apply_other_category():
    subtotal = 100.0
    res = apply_social_ley_factor(subtotal, 'Obra Gruesa')
    assert res == subtotal
