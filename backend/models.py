from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime

class TipoRecinto(Base):
    __tablename__ = 'TipoRecinto'
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, nullable=False)
    costo_tokens = Column(Integer, nullable=False, default=0)

class MaterialEstructural(Base):
    __tablename__ = 'MaterialEstructural'
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)

class ConfiguracionSimulacion(Base):
    __tablename__ = 'ConfiguracionSimulacion'
    id = Column(Integer, primary_key=True, index=True)
    m2_totales = Column(Integer, nullable=False)
    material_estructural_id = Column(Integer, ForeignKey('MaterialEstructural.id'))
    habitaciones = Column(Integer, default=0)
    banios = Column(Integer, default=0)
    areas_comunes = Column(Integer, default=0)

class Insumo(Base):
    __tablename__ = 'Insumo'
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    unidad_medida = Column(String, nullable=True)
    categoria = Column(String, nullable=True)
    activo = Column(Boolean, default=True)

class MatrizRendimiento(Base):
    __tablename__ = 'Matriz_Rendimiento'
    id = Column(Integer, primary_key=True, index=True)
    insumo_id = Column(Integer, ForeignKey('Insumo.id'))
    material_estructural_id = Column(Integer, ForeignKey('MaterialEstructural.id'))
    factor_multiplicador = Column(Float, nullable=False, default=0.0)
    unidad_factor = Column(String, nullable=True)
    activo = Column(Boolean, default=True)
    insumo = relationship('Insumo')

class PrecioMercado(Base):
    __tablename__ = 'PrecioMercado'
    id = Column(Integer, primary_key=True, index=True)
    insumo_id = Column(Integer, ForeignKey('Insumo.id'))
    tienda = Column(String, nullable=True)
    precio = Column(Float, nullable=True)
    precio_descuento = Column(Float, nullable=True)
    nombre_producto = Column(String, nullable=True)
    exitoso = Column(Boolean, default=True)
    fecha_scraping = Column(DateTime, default=datetime.utcnow)

class InsumoRole(Base):
    __tablename__ = 'Insumo_Role'
    id = Column(Integer, primary_key=True, index=True)
    insumo_id = Column(Integer, ForeignKey('Insumo.id'))
    role = Column(String, nullable=True)
