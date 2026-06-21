import os
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from scripts.seed_matrices_rendimiento import load_rows_from_csv, run_seed


def test_load_rows_from_csv_parses_required_fields():
    rows = load_rows_from_csv(str(REPO_ROOT / "docs" / "matrices_rendimiento.csv"))
    assert len(rows) >= 15
    first = rows[0]
    assert first["categoria"]
    assert first["partida_constructiva"]
    assert first["insumo_tecnico"]
    assert first["unidad_medida"]
    assert first["rendimiento_neto_x_unidad"] > 0


def test_run_seed_is_idempotent_on_sqlite():
    db_path = REPO_ROOT / "seed_matrices_test.db"
    if db_path.exists():
        db_path.unlink()

    database_url = f"sqlite:///{db_path.as_posix()}"
    csv_path = str(REPO_ROOT / "docs" / "matrices_rendimiento.csv")

    first = run_seed(csv_path=csv_path, database_url=database_url, create_tables=True)
    second = run_seed(csv_path=csv_path, database_url=database_url, create_tables=True)

    assert first["csv_rows_processed"] > 0
    assert first["total_after"] == first["active_after"]
    assert second["total_before"] == second["total_after"]
    assert second["active_before"] == second["active_after"]

    if db_path.exists():
        db_path.unlink()
