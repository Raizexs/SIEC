"""SCRUM-123: agregar columna unidad_precio a precio_mercado

Revision ID: 001_scrum123
Revises:
Create Date: 2026-06-12

Descripción:
    Agrega la columna Unidad_Precio (VARCHAR, nullable) a la tabla precio_mercado.
    Esta columna declara explícitamente la unidad en que está expresado el precio
    almacenado en cada registro, eliminando la necesidad de inferir la unidad por
    regex sobre el nombre del producto.

    Valores válidos:
        "saco 25kg", "unidad", "m²", "m³", "barra 6m",
        "plancha 1.22x2.44m", "caja 100un", "galón 4L", "rollo 100m", "tubo 3m"

    NULL indica que el registro aún no tiene unidad declarada; el motor usará
    como fallback la columna Unidad_Medida del Insumo asociado.

    No se requiere downtime: la columna es nullable y no afecta rows existentes.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "001_scrum123"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "precio_mercado",
        sa.Column(
            "Unidad_Precio",
            sa.String(),
            nullable=True,
            comment=(
                "SCRUM-123: unidad en que está expresado el precio almacenado. "
                "Ej: 'saco 25kg', 'unidad', 'm²', 'm³', 'caja 100un'. "
                "NULL = sin declarar; el motor usa unidad_medida del Insumo como fallback."
            ),
        ),
    )


def downgrade() -> None:
    op.drop_column("precio_mercado", "Unidad_Precio")
