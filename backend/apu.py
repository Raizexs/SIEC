"""CORE APU MODULE - minimal implementation for SCRUM-74 and SCRUM-85 tests and audits"""
import os


def _get_env_float(name, default):
    try:
        return float(os.getenv(name, str(default)))
    except Exception:
        return default

SOCIAL_LEY_FACTOR = _get_env_float("SOCIAL_LEY_FACTOR", 1.28)
if SOCIAL_LEY_FACTOR < 1.28 or SOCIAL_LEY_FACTOR > 1.29:
    SOCIAL_LEY_FACTOR = 1.28

HOURS_PER_DAY = _get_env_float("HOURS_PER_DAY", 8.0)
if HOURS_PER_DAY <= 0 or HOURS_PER_DAY > 24:
    HOURS_PER_DAY = 8.0

POR_JORNADA_KEYWORDS = ('jornada', 'por jornada', 'por día', 'por dia', 'día', 'dia')


def is_por_jornada(nombre_producto: str) -> bool:
    if not nombre_producto:
        return False
    s = nombre_producto.lower()
    return any(k in s for k in POR_JORNADA_KEYWORDS)


def normalize_precio_unit(precio_unit, unidad_esperada, precio_record_name, hours_per_day=HOURS_PER_DAY):
    """
    Normaliza un precio de mercado según la unidad esperada del insumo.
    - Si la unidad esperada es HH y el producto sugiere precio por jornada, divide por hours_per_day.
    - En cualquier otro caso devuelve el precio tal cual convertido a float.
    """
    try:
        precio_val = float(precio_unit)
    except Exception:
        raise ValueError("precio_unit debe ser numérico")

    unidad = (unidad_esperada or '').strip().upper()
    nombre = (precio_record_name or '')
    if unidad in ('HH', 'H') and is_por_jornada(nombre):
        try:
            return precio_val / float(hours_per_day)
        except Exception:
            return precio_val
    return precio_val


def compute_tarifa_pura_local(insumos, rendimiento_jornadas_total, hours_per_day=HOURS_PER_DAY):
    """
    Calcula tarifa_pura_local = (salario_diario_maestro + salario_diario_ayudante) * rendimiento_jornadas_total
    insumos: lista de dicts con keys: id, nombre, unidad_medida, precio, precio_nombre, role(optional)
    """
    maestro_keywords = ('maestro', 'albañil', 'oficial')
    ayudante_keywords = ('ayudante', 'ayuda')

    salario_diario_maestro = 0.0
    salario_diario_ayudante = 0.0
    found_maestro = False
    found_ayudante = False

    for ins in insumos:
        precio_val = ins.get('precio')
        if precio_val is None:
            continue
        try:
            precio_val = float(precio_val)
        except Exception:
            continue

        unidad_medida_insumo = (ins.get('unidad_medida') or '').strip().upper()
        nombre_prod = (ins.get('precio_nombre') or '')
        is_j = is_por_jornada(nombre_prod)

        if unidad_medida_insumo in ('HH', 'H') and not is_j:
            salario_diario = precio_val * float(hours_per_day)
        else:
            salario_diario = precio_val

        role = None
        if ins.get('role'):
            role = str(ins.get('role')).strip().lower()

        if role == 'maestro':
            salario_diario_maestro += salario_diario
            found_maestro = True
        elif role == 'ayudante' or role == 'help' or role == 'assistant':
            salario_diario_ayudante += salario_diario
            found_ayudante = True
        else:
            name_l = (ins.get('nombre') or '').lower()
            if any(k in name_l for k in maestro_keywords):
                salario_diario_maestro += salario_diario
                found_maestro = True
            if any(k in name_l for k in ayudante_keywords):
                salario_diario_ayudante += salario_diario
                found_ayudante = True

    if (found_maestro or found_ayudante) and rendimiento_jornadas_total > 0:
        tarifa = (salario_diario_maestro + salario_diario_ayudante) * float(rendimiento_jornadas_total)
        return tarifa
    return None


def apply_social_ley_factor(subtotal, categoria):
    try:
        categoria_normalizada = (categoria or '').strip().lower()
    except Exception:
        categoria_normalizada = ''
    if categoria_normalizada == 'mano de obra':
        return float(subtotal) * float(SOCIAL_LEY_FACTOR)
    return subtotal

__all__ = ['normalize_precio_unit','compute_tarifa_pura_local','apply_social_ley_factor','SOCIAL_LEY_FACTOR','HOURS_PER_DAY']
