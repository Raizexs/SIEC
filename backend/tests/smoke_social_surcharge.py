from backend.apu import apply_social_ley_factor


def test_smoke_social():
    subtotal = 100.0
    res = apply_social_ley_factor(subtotal, 'Mano de obra')
    assert abs(res - subtotal * 1.28) < 1e-6
