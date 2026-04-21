SIEC - Infraestructura y APU

Este repo contiene el motor de estimación (APU) y utilidades relacionadas.

Principales scripts añadidos para SCRUM-74/SCRUM-85:
- backend/apu.py: lógica de normalización y cálculo de tarifa_pura_local y recargo por leyes sociales.
- backend/scripts/normalize_unidad_mano_obra.py: script de normalización de unidades.
- database/migrations/001_create_insumo_role.sql: migración para tabla Insumo_Role.
- database/seeds/004_seed_matriz_rendimiento_fixed.sql y 005_seed_insumo_roles.sql: seeds compatibles con SQLite.
- database/apply_seeds.py: aplica migraciones y seeds localmente.
- .github/workflows/ci.yml: CI que aplica seeds y ejecuta pytest.

Cómo ejecutar localmente (dev):
- python -m venv .venv
- .venv\Scripts\activate
- pip install -r requirements.txt  # create one or install pytest sqlalchemy fastapi
- python database/apply_seeds.py test_siec.db
- pytest -q backend/tests

Notas: Se recomienda integrar migraciones formales (Alembic) y revisar seeds para producción DB.

