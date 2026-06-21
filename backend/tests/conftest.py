"""Fixtures compartidos para pytest (CI Postgres)."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest


def _seed_materiality_matrix() -> None:
    """Matriz mínima para materials 1–4 (smoke de calcular-insumos)."""
    try:
        from database import SessionLocal, engine
        import models
    except ModuleNotFoundError:
        from backend.database import SessionLocal, engine  # type: ignore
        from backend import models  # type: ignore

    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        materials = [
            (1, "Madera"),
            (2, "Metalcom"),
            (3, "Albañilería"),
            (4, "Hormigón Armado"),
            (5, "Híbrido"),
        ]
        for mid, nombre in materials:
            db.query(models.MaterialEstructural).filter(
                (models.MaterialEstructural.id == mid) | 
                (models.MaterialEstructural.nombre == nombre)
            ).delete(synchronize_session=False)
            db.add(
                models.MaterialEstructural(
                    id=mid,
                    nombre=nombre,
                    descripcion="",
                    activo=True,
                )
            )

        insumos = [
            (1, "Cemento Portland CI", "Obra Gruesa", "saco"),
            (2, "Fierro A63 CI", "Obra Gruesa", "kg"),
            (3, "Perfil Metalcon CI", "Obra Gruesa", "ml"),
        ]
        for iid, nombre, categoria, unidad in insumos:
            db.query(models.Insumo).filter(
                (models.Insumo.id == iid) |
                (models.Insumo.nombre == nombre)
            ).delete(synchronize_session=False)
            db.add(
                models.Insumo(
                    id=iid,
                    nombre=nombre,
                    categoria=categoria,
                    unidad_medida=unidad,
                    descripcion="",
                    activo=True,
                )
            )
        db.commit()

        factors = {
            1: [0.51, 0.18, 0.15],
            2: [0.15, 0.12, 0.20],
            3: [0.50, 0.04, 0.15],
            4: [0.35, 0.08, 0.12],
            5: [0.25, 0.10, 0.18],
        }
        for mid, values in factors.items():
            for iid, factor in zip([1, 2, 3], values, strict=True):
                db.query(models.MatrizRendimiento).filter_by(
                    material_estructural_id=mid, insumo_id=iid
                ).delete(synchronize_session=False)
                db.add(
                    models.MatrizRendimiento(
                        material_estructural_id=mid,
                        insumo_id=iid,
                        factor_multiplicador=factor,
                        activo=True,
                    )
                )

            for iid in (1, 2, 3):
                db.query(models.PrecioMercado).filter_by(
                    insumo_id=iid, tienda="CI-Test"
                ).delete(synchronize_session=False)
                db.add(
                    models.PrecioMercado(
                        insumo_id=iid,
                        tienda="CI-Test",
                        nombre_producto=f"Insumo {iid} test",
                        precio=1000.0 + iid,
                        precio_descuento=None,
                        stock="OK",
                        categoria="Obra Gruesa",
                        url="https://example.com/ci-test",
                        fecha_scraping=datetime.now(timezone.utc),
                        exitoso=True,
                    )
                )
        db.commit()
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def seed_ci_materiality_data():
    """Asegura rendimientos para las 4 materialidades en la DB de CI."""
    try:
        _seed_materiality_matrix()
    except Exception:
        pass  # Postgres no disponible (desarrollo local sin DB)


@pytest.fixture(autouse=True)
def bypass_material_plan_gate_for_unit_tests(monkeypatch):
    """
    Los tests de cálculo llaman calcular_insumos sin JWT; el gate de plan
    se valida en tests de billing/API, no en fixtures de costing.
    """
    try:
        import billing.service as billing_service
    except ModuleNotFoundError:
        import backend.billing.service as billing_service  # type: ignore

    monkeypatch.setattr(
        billing_service,
        "enforce_simulation_material",
        lambda *_args, **_kwargs: None,
    )
