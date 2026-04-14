from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from datetime import datetime
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

class RendimientoConstructivo(Base):
    __tablename__ = "rendimiento_constructivo"

    id = Column(Integer, primary_key=True, index=True)
    material_estructural_id = Column(Integer, ForeignKey("material_estructural.id"), unique=True, nullable=False, index=True)
    factor_rendimiento = Column(Numeric(8, 4), nullable=False)
    insumo_base = Column(String, nullable=False)
    unidad = Column(String, nullable=False, default="m²")
    descripcion = Column(String, nullable=True)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, nullable=False, default=datetime.utcnow)
