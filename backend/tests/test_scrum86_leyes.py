from backend import apu


def test_social_ley_factor_range_and_percentage():
    assert 1.28 <= apu.SOCIAL_LEY_FACTOR <= 1.29
    porcentaje = (apu.SOCIAL_LEY_FACTOR - 1.0) * 100.0
    assert 28.0 <= porcentaje <= 29.0
