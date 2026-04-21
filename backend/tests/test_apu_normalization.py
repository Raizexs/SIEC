from backend.apu import normalize_precio_unit


def test_convert_jornada_to_hh():
    precio_unit = 800.0
    unidad_esperada = 'HH'
    precio_record_name = 'Pago por jornada'
    assert normalize_precio_unit(precio_unit, unidad_esperada, precio_record_name, hours_per_day=8) == 100.0


def test_no_conversion_if_not_jornada():
    precio_unit = 100.0
    unidad_esperada = 'HH'
    precio_record_name = 'Precio por hora'
    assert normalize_precio_unit(precio_unit, unidad_esperada, precio_record_name, hours_per_day=8) == 100.0
