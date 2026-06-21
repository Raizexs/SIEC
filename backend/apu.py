import os

# Configuration constants
try:
    SOCIAL_LEY_FACTOR = float(os.getenv("SOCIAL_LEY_FACTOR", "1.28"))
except Exception:
    SOCIAL_LEY_FACTOR = 1.28
if SOCIAL_LEY_FACTOR < 1.28 or SOCIAL_LEY_FACTOR > 1.29:
    SOCIAL_LEY_FACTOR = 1.28

try:
    HOURS_PER_DAY = float(os.getenv("HOURS_PER_DAY", "8"))
except Exception:
    HOURS_PER_DAY = 8.0
if HOURS_PER_DAY <= 0 or HOURS_PER_DAY > 24:
    HOURS_PER_DAY = 8.0


def normalize_precio_unit(precio_unit: float, unidad_esperada: str, nombre_producto: str, hours_per_day: float = None) -> float:
    """
    Normaliza un precio que puede estar expresado "por jornada" a precio por HH si la unidad esperada es HH.
    """
    if hours_per_day is None:
        hours_per_day = HOURS_PER_DAY
    try:
        unidad = (unidad_esperada or "").strip().upper()
        nombre = (nombre_producto or "").lower()
    except Exception:
        return precio_unit
    if unidad in ("HH", "H") and any(k in nombre for k in ("jornada", "por jornada", "por día", "por dia", "día", "dia")):
        try:
            return float(precio_unit) / float(hours_per_day)
        except Exception:
            return float(precio_unit)
    return float(precio_unit)


def apply_social_ley_factor(subtotal: float, categoria: str) -> float:
    """
    Aplica el factor obligatorio por leyes sociales sólo a la categoría 'Mano de Obra'.
    """
    try:
        cat = (categoria or "").strip().lower()
    except Exception:
        return subtotal
    if cat == 'mano de obra':
        return float(subtotal) * float(SOCIAL_LEY_FACTOR)
    return float(subtotal)


def compute_tarifa_pura_local(labor_insumos: list, rendimiento_jornadas_total: float, hours_per_day: float = None) -> float:
    """
    Calcula la tarifa pura local (salarios diarios * jornadas totales).
    labor_insumos: list of dicts with keys: precio (number), precio_nombre (opt), role (opt), nombre (opt), unidad_medida (opt)
    Si no hay insumos de mano de obra o rendimientos, devuelve None.
    """
    if hours_per_day is None:
        hours_per_day = HOURS_PER_DAY

    salario_diario_maestro = 0.0
    salario_diario_ayudante = 0.0
    found = False

    maestro_keys = ('maestro', 'albañil', 'albañil', 'oficial')
    ayudante_keys = ('ayudante', 'ayuda', 'help', 'assistant')

    for ins in labor_insumos or []:
        precio = ins.get('precio')
        if precio is None:
            continue
        nombre_prod = (ins.get('precio_nombre') or '')
        unidad_med = (ins.get('unidad_medida') or '')
        role_val = (ins.get('role') or '')
        try:
            name_low = str(nombre_prod).lower()
        except Exception:
            name_low = ''
        # detect if precio is per jornada
        is_por_jornada = any(k in name_low for k in ('jornada', 'por jornada', 'por día', 'por dia', 'día', 'dia'))
        unidad_med = (unidad_med or '').strip().upper()
        try:
            if unidad_med in ('HH', 'H') and not is_por_jornada:
                salario_diario = float(precio) * float(hours_per_day)
            elif is_por_jornada:
                salario_diario = float(precio)
            else:
                salario_diario = float(precio)
        except Exception:
            continue

        # Prefer explicit role
        r = (role_val or '').strip().lower()
        if r == 'maestro':
            salario_diario_maestro += salario_diario
            found = True
            continue
        if r == 'ayudante':
            salario_diario_ayudante += salario_diario
            found = True
            continue

        # Fallback name matching
        nombre_insumo = (ins.get('nombre') or '').lower()
        if any(k in nombre_insumo for k in maestro_keys) or any(k in name_low for k in maestro_keys):
            salario_diario_maestro += salario_diario
            found = True
            continue
        if any(k in nombre_insumo for k in ayudante_keys) or any(k in name_low for k in ayudante_keys):
            salario_diario_ayudante += salario_diario
            found = True
            continue

    if not found or rendimiento_jornadas_total is None or rendimiento_jornadas_total <= 0:
        return None

    try:
        tarifa = (salario_diario_maestro + salario_diario_ayudante) * float(rendimiento_jornadas_total)
        return float(tarifa)
    except Exception:
        return None
