from backend.apu import compute_tarifa_pura_local


def test_tarifa_pura_local_basic():
    insumos = [
        {'id':1, 'nombre':'Maestro albañil', 'unidad_medida':'DIA', 'precio':800.0, 'precio_nombre':'por jornada', 'role':'maestro'},
        {'id':2, 'nombre':'Ayudante alba','unidad_medida':'DIA', 'precio':200.0, 'precio_nombre':'por jornada', 'role':'ayudante'},
    ]
    rendimiento = 0.05
    tarifa = compute_tarifa_pura_local(insumos, rendimiento, hours_per_day=8)
    assert tarifa == (800.0 + 200.0) * rendimiento
