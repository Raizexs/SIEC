from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey, DateTime
from database import Base

class TipoRecinto(Base):
    __tablename__ = "tipo_recinto"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    costo_tokens = Column(Integer, nullable=False)

class ConfiguracionSimulacion(Base):
    __tablename__ = "configuracion_simulacion"

    id = Column(Integer, primary_key=True, index=True)
    m2_totales = Column(Integer, nullable=False)
    material_estructural_id = Column(Integer, nullable=False)
    habitaciones = Column(Integer, nullable=False)
    banios = Column(Integer, nullable=False)
    areas_comunes = Column(Integer, nullable=False)
    fecha_creacion = Column(String, nullable=True)

class MaterialEstructural(Base):
    __tablename__ = "Material_Estructural"

    id = Column("ID", Integer, primary_key=True, index=True)
    nombre = Column("Nombre", String, unique=True, index=True, nullable=False)
    descripcion = Column("Descripcion", String)
    activo = Column("Activo", Boolean, default=True)

class Insumo(Base):
    __tablename__ = "Insumo"

    id = Column("ID", Integer, primary_key=True, index=True)
    nombre = Column("Nombre", String, unique=True, nullable=False)
    categoria = Column("Categoria", String, nullable=False)
    unidad_medida = Column("Unidad_Medida", String, nullable=False)
    descripcion = Column("Descripcion", String)
    activo = Column("Activo", Boolean, default=True)

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, UniqueConstraint

class MatrizRendimiento(Base):
    __tablename__ = "Matriz_Rendimiento"
    __table_args__ = (UniqueConstraint('Material_Estructural_ID', 'Insumo_ID', name='uq_material_insumo'),)

    id = Column("ID", Integer, primary_key=True, index=True)
    material_estructural_id = Column("Material_Estructural_ID", Integer, ForeignKey("Material_Estructural.ID"), nullable=False)
    insumo_id = Column("Insumo_ID", Integer, ForeignKey("Insumo.ID"), nullable=False)
    factor_multiplicador = Column("Factor_Multiplicador", Numeric(10, 4), nullable=False)
    unidad_factor = Column("Unidad_Factor", String, default='cantidad por m2')
    activo = Column("Activo", Boolean, default=True)

class PrecioMercado(Base):
    __tablename__ = "precio_mercado"

    id = Column("ID", Integer, primary_key=True, index=True)
    insumo_id = Column("Insumo_ID", Integer, ForeignKey("Insumo.ID"))
    tienda = Column("Tienda", String, nullable=False)
    nombre_producto = Column("Nombre_Producto", String, nullable=False)
    precio = Column("Precio", Numeric(12, 2))
    precio_descuento = Column("Precio_Descuento", Numeric(12, 2))
    stock = Column("Stock", String)
    categoria = Column("Categoria", String)
    url = Column("URL", String, nullable=False)
    fecha_scraping = Column("Fecha_Scraping", DateTime, nullable=False)
    exitoso = Column("Exitoso", Boolean, default=True)

class InsumoRole(Base):
    __tablename__ = "Insumo_Role"

    id = Column("ID", Integer, primary_key=True, index=True)
    insumo_id = Column("Insumo_ID", Integer, ForeignKey("Insumo.ID"), nullable=False)
    role = Column("Role", String, nullable=False)  # expected values: 'maestro', 'ayudante', etc.
