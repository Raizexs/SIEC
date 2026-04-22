import argparse
import csv
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List


def _bootstrap_paths() -> Path:
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    repo_root = backend_dir.parent
    for path in (str(repo_root), str(backend_dir)):
        if path not in sys.path:
            sys.path.insert(0, path)
    return repo_root


REPO_ROOT = _bootstrap_paths()
DEFAULT_CSV_PATH = REPO_ROOT / "docs" / "matrices_rendimiento.csv"
DEFAULT_SQLITE_DB_PATH = REPO_ROOT / "seed_matrices.db"


def _safe_float(value: Any) -> float:
    if value is None:
        raise ValueError("Value is None")
    if isinstance(value, (int, float)):
        return float(value)
    numeric_match = re.search(r"\d+(?:\.\d+)?", str(value))
    if not numeric_match:
        raise ValueError(f"Could not parse float from: {value}")
    return float(numeric_match.group(0))


def _resolve_database_url(cli_database_url: str | None) -> str:
    if cli_database_url:
        return cli_database_url
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    return f"sqlite:///{DEFAULT_SQLITE_DB_PATH.as_posix()}"


def load_rows_from_csv(csv_path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"No existe el CSV de catálogo: {csv_path}")

    rows: List[Dict[str, Any]] = []
    with open(csv_path, mode="r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for raw_row in reader:
            try:
                rendimiento = _safe_float(raw_row.get("Rendimiento_Neto_x_Unidad"))
            except ValueError:
                continue

            categoria = (raw_row.get("Categoria") or "").strip()
            partida = (raw_row.get("Partida_Constructiva") or "").strip()
            termino = (raw_row.get("Termino_Busqueda_Retail_Scraping") or "").strip()
            insumo = (raw_row.get("Insumo_Tecnico") or "").strip()
            unidad = (raw_row.get("Unidad_Medida") or "").strip()
            referencia = (raw_row.get("Referencia") or "").strip() or None

            if not categoria or not partida or not insumo or not unidad:
                continue

            rows.append(
                {
                    "categoria": categoria,
                    "partida_constructiva": partida,
                    "termino_busqueda_retail": termino,
                    "insumo_tecnico": insumo,
                    "unidad_medida": unidad,
                    "rendimiento_neto_x_unidad": rendimiento,
                    "referencia": referencia,
                }
            )

    return rows


def seed_rows(db, rows: List[Dict[str, Any]]) -> int:
    try:
        import models
    except ModuleNotFoundError:
        from backend import models

    existing_rows = db.query(models.CatalogoRendimiento).all()
    existing_by_key = {
        (
            (item.categoria or "").strip(),
            (item.partida_constructiva or "").strip(),
            (item.insumo_tecnico or "").strip(),
            (item.unidad_medida or "").strip(),
        ): item
        for item in existing_rows
    }

    csv_keys = set()
    for row in rows:
        key = (
            row["categoria"],
            row["partida_constructiva"],
            row["insumo_tecnico"],
            row["unidad_medida"],
        )
        csv_keys.add(key)
        existing = existing_by_key.get(key)
        if existing is None:
            db.add(
                models.CatalogoRendimiento(
                    categoria=row["categoria"],
                    partida_constructiva=row["partida_constructiva"],
                    termino_busqueda_retail=row["termino_busqueda_retail"],
                    insumo_tecnico=row["insumo_tecnico"],
                    unidad_medida=row["unidad_medida"],
                    rendimiento_neto_x_unidad=row["rendimiento_neto_x_unidad"],
                    referencia=row["referencia"],
                    activo=True,
                )
            )
            continue

        existing.termino_busqueda_retail = row["termino_busqueda_retail"]
        existing.rendimiento_neto_x_unidad = row["rendimiento_neto_x_unidad"]
        existing.referencia = row["referencia"]
        existing.activo = True

    for item in existing_rows:
        key = (
            (item.categoria or "").strip(),
            (item.partida_constructiva or "").strip(),
            (item.insumo_tecnico or "").strip(),
            (item.unidad_medida or "").strip(),
        )
        if key not in csv_keys:
            item.activo = False

    db.commit()
    return len(rows)


def run_seed(csv_path: str, database_url: str, create_tables: bool = True) -> dict:
    os.environ["DATABASE_URL"] = database_url

    from database import engine, SessionLocal  # noqa: E402
    import models  # noqa: E402

    if create_tables:
        models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        before_total = db.query(models.CatalogoRendimiento).count()
        before_active = db.query(models.CatalogoRendimiento).filter(models.CatalogoRendimiento.activo == True).count()

        rows = load_rows_from_csv(csv_path)
        processed_rows = seed_rows(db, rows)

        after_total = db.query(models.CatalogoRendimiento).count()
        after_active = db.query(models.CatalogoRendimiento).filter(models.CatalogoRendimiento.activo == True).count()

        return {
            "csv_rows_processed": int(processed_rows),
            "total_before": int(before_total),
            "active_before": int(before_active),
            "total_after": int(after_total),
            "active_after": int(after_active),
            "database_url": database_url,
        }
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Seeder de Matriz de Rendimiento: carga docs/matrices_rendimiento.csv "
            "en la tabla Catalogo_Rendimiento."
        )
    )
    parser.add_argument(
        "--csv",
        default=str(DEFAULT_CSV_PATH),
        help="Ruta al archivo CSV de matrices de rendimiento.",
    )
    parser.add_argument(
        "--no-create-tables",
        action="store_true",
        help="No ejecutar create_all antes del seed.",
    )
    parser.add_argument(
        "--database-url",
        default=None,
        help=(
            "URL de base de datos para el seeding. Si no se indica, usa DATABASE_URL "
            "y como fallback SQLite local."
        ),
    )
    args = parser.parse_args()

    csv_path = os.path.abspath(args.csv)
    database_url = _resolve_database_url(args.database_url)
    try:
        result = run_seed(
            csv_path=csv_path,
            database_url=database_url,
            create_tables=not args.no_create_tables,
        )
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}")
        return 1
    except ModuleNotFoundError as exc:
        print(
            "ERROR: dependencia de base de datos no disponible. "
            f"Define --database-url con una URL válida o instala el driver requerido. Detalle: {exc}"
        )
        return 1
    except Exception as exc:
        print(f"ERROR: fallo en seeding de matrices: {exc}")
        return 1

    print("Seeder Matrices CSV ejecutado correctamente.")
    print(f"CSV procesado: {csv_path}")
    print(f"DB usada: {result['database_url']}")
    print(f"Filas CSV procesadas: {result['csv_rows_processed']}")
    print(f"Catálogo total: {result['total_before']} -> {result['total_after']}")
    print(f"Catálogo activo: {result['active_before']} -> {result['active_after']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
