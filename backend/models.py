from sqlalchemy import Column, Integer, String
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
