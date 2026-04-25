from backend.apu import apply_social_ley_factor


def test_social_factor_no_apply_other_category():
    subtotal = 100.0
    res = apply_social_ley_factor(subtotal, 'Obra Gruesa')
    assert res == subtotal
