import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from apu import normalize_precio_unit, apply_social_ley_factor, compute_tarifa_pura_local
except ModuleNotFoundError:
    from backend.apu import normalize_precio_unit, apply_social_ley_factor, compute_tarifa_pura_local


def test_normalize_precio_unit_jornada_to_hh():
    precio = 800.0
    unidad_esperada = 'HH'
    nombre = 'Pago por jornada'
    assert normalize_precio_unit(precio, unidad_esperada, nombre, hours_per_day=8) == 100.0


def test_apply_social_ley_factor_applies():
    subtotal = 100.0
    res = apply_social_ley_factor(subtotal, 'Mano de obra')
    assert abs(res - subtotal * 1.28) < 1e-6


def test_compute_tarifa_pura_local():
    insumos = [
        {'id': 1, 'nombre': 'Maestro albañil', 'unidad_medida': 'DIA', 'precio': 800.0, 'precio_nombre': 'por jornada', 'role': 'maestro'},
        {'id': 2, 'nombre': 'Ayudante alba', 'unidad_medida': 'DIA', 'precio': 200.0, 'precio_nombre': 'por jornada', 'role': 'ayudante'},
    ]
    rendimiento = 0.05
    tarifa = compute_tarifa_pura_local(insumos, rendimiento, hours_per_day=8)
    assert abs(tarifa - ((800.0 + 200.0) * rendimiento)) < 1e-6
