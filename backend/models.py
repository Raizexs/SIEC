from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey, DateTime, Date, Text, JSON, Index, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base
import uuid

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
    perimetro_ml = Column(Numeric(10, 2), nullable=True)
    altura_muro_m = Column(Numeric(5, 2), nullable=True)
    incluir_techumbre = Column(Boolean, nullable=True, default=False)
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


class CatalogoRendimiento(Base):
    __tablename__ = "Catalogo_Rendimiento"
    __table_args__ = (
        UniqueConstraint(
            "Categoria",
            "Partida_Constructiva",
            "Insumo_Tecnico",
            "Unidad_Medida",
            name="uq_catalogo_rendimiento_item",
        ),
    )

    id = Column("ID", Integer, primary_key=True, index=True)
    categoria = Column("Categoria", String, nullable=False)
    partida_constructiva = Column("Partida_Constructiva", String, nullable=False)
    termino_busqueda_retail = Column("Termino_Busqueda_Retail_Scraping", String, nullable=True)
    insumo_tecnico = Column("Insumo_Tecnico", String, nullable=False)
    unidad_medida = Column("Unidad_Medida", String, nullable=False)
    rendimiento_neto_x_unidad = Column("Rendimiento_Neto_x_Unidad", Numeric(12, 4), nullable=False)
    referencia = Column("Referencia", String, nullable=True)
    activo = Column("Activo", Boolean, default=True)


# ─────────────────────────────────────────────────────────────────────────────
# Multi-tenant: users, projects, collaboration, audit (Phases 1.5 + 3.x)
# ─────────────────────────────────────────────────────────────────────────────

class AppUser(Base):
    __tablename__ = "app_user"

    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(Text, unique=True, nullable=False)
    full_name = Column(Text)
    company = Column(Text)
    avatar_url = Column(Text)
    role = Column(Text, nullable=False, default="user")
    preferences = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Proyecto(Base):
    __tablename__ = "proyecto"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(Text, nullable=False)
    description = Column(Text)
    cliente = Column(Text)
    ubicacion = Column(Text)
    tags = Column(JSON, default=list)
    payload = Column(JSON, nullable=False, default=dict)
    thumbnail_url = Column(Text)
    estimated_cost = Column(Numeric(14, 2))
    m2_totales = Column(Integer)
    material_id = Column(Integer)
    archived = Column(Boolean, nullable=False, default=False)
    is_public = Column(Boolean, nullable=False, default=False)
    public_token = Column(Text, unique=True)
    public_expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProyectoColaborador(Base):
    __tablename__ = "proyecto_colaborador"

    proyecto_id = Column(UUID(as_uuid=True), ForeignKey("proyecto.id", ondelete="CASCADE"), primary_key=True)
    usuario_id = Column(UUID(as_uuid=True), primary_key=True)
    rol = Column(Text, nullable=False, default="viewer")
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True))


class ProyectoVersion(Base):
    __tablename__ = "proyecto_version"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proyecto_id = Column(UUID(as_uuid=True), ForeignKey("proyecto.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    author_id = Column(UUID(as_uuid=True), nullable=False)
    payload = Column(JSON, nullable=False)
    summary = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProyectoComentario(Base):
    __tablename__ = "proyecto_comentario"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proyecto_id = Column(UUID(as_uuid=True), ForeignKey("proyecto.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("proyecto_comentario.id", ondelete="CASCADE"))
    author_id = Column(UUID(as_uuid=True), nullable=False)
    body = Column(Text, nullable=False)
    anchor = Column(JSON)
    resolved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Auditoria(Base):
    __tablename__ = "auditoria"

    id = Column(BigInteger, primary_key=True)
    actor_id = Column(UUID(as_uuid=True))
    action = Column(Text, nullable=False)
    entity_type = Column(Text)
    entity_id = Column(Text)
    extra = Column("metadata", JSON, default=dict)
    ip_address = Column(Text)
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notificacion(Base):
    __tablename__ = "notificacion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    type = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    body = Column(Text)
    payload = Column(JSON, default=dict)
    read_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserSubscription(Base):
    __tablename__ = "user_subscription"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    plan = Column(Text, nullable=False, default="free")
    status = Column(Text, nullable=False, default="active")
    provider = Column(Text)
    provider_subscription_id = Column(Text)
    current_period_start = Column(DateTime(timezone=True))
    current_period_end = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserUsage(Base):
    __tablename__ = "user_usage"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    exports_this_month = Column(Integer, nullable=False, default=0)
    usage_month = Column(Date, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SiecplaceListing(Base):
    __tablename__ = "siecplace_listing"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True))
    title = Column(Text, nullable=False)
    region = Column(Text)
    m2 = Column(Integer)
    material_id = Column(Integer)
    estimated_total_clp = Column(Numeric(14, 2))
    pdf_url = Column(Text)
    status = Column(Text, nullable=False, default="draft")
    commitment_fee_paid = Column(Boolean, nullable=False, default=False)
    budget_metadata = Column(JSON, nullable=False, default=dict)
    published_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SiecplaceLeadUnlock(Base):
    __tablename__ = "siecplace_lead_unlock"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("siecplace_listing.id", ondelete="CASCADE"), nullable=False)
    contractor_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    fee_paid = Column(Boolean, nullable=False, default=False)
    compensation_status = Column(Text, nullable=False, default="pending")
    unlocked_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SiecplacePayment(Base):
    __tablename__ = "siecplace_payment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    stripe_session_id = Column(Text, unique=True)
    amount_clp = Column(Integer, nullable=False)
    payment_type = Column(Text, nullable=False)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("siecplace_listing.id", ondelete="SET NULL"))
    status = Column(Text, nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
