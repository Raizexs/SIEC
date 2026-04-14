from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
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

# ════════════════════════════════════════════════════════════════════════════════
# SCRUM-59: Modelos para Motor de Costos
# ════════════════════════════════════════════════════════════════════════════════

class MaterialEstructural(Base):
    __tablename__ = "material_estructural"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False, index=True)
    
    # Relaciones
    matriz_rendimientos = relationship("MatrizRendimiento", back_populates="material")


class Insumo(Base):
    __tablename__ = "insumo"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False, index=True)
    categoria = Column(String(50), nullable=False)  # CHECK: Obra Gruesa, Terminaciones, Instalaciones, Mano de Obra
    unidad_medida = Column(String(30), nullable=False)
    
    # Relaciones
    matriz_rendimientos = relationship("MatrizRendimiento", back_populates="insumo")
    precios_mercado = relationship("PrecioMercado", back_populates="insumo")


class MatrizRendimiento(Base):
    __tablename__ = "matriz_rendimiento"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("material_estructural.id"), nullable=False, index=True)
    insumo_id = Column(Integer, ForeignKey("insumo.id"), nullable=False, index=True)
    factor_multiplicador = Column(Numeric(10, 4), nullable=False)
    
    # Relaciones
    material = relationship("MaterialEstructural", back_populates="matriz_rendimientos")
    insumo = relationship("Insumo", back_populates="matriz_rendimientos")


class PrecioMercado(Base):
    __tablename__ = "precio_mercado"

    id = Column(Integer, primary_key=True, index=True)
    insumo_id = Column(Integer, ForeignKey("insumo.id"), nullable=False, index=True)
    precio_clp = Column(Integer, nullable=False)  # CHECK: > 0
    tienda_origen = Column(String(50), nullable=False)  # CHECK: Sodimac, Easy, Construmart
    fecha_scraping = Column(DateTime, nullable=False, default=datetime.utcnow)
    region = Column(String(50), nullable=False, default="Valparaíso")
    
    # Relaciones
    insumo = relationship("Insumo", back_populates="precios_mercado")
