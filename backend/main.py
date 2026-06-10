from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import math
import unicodedata
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv
load_dotenv()
from collections import defaultdict
from schemas import (
    DesgloseResponse,
    CategoriaDesglose,
    InsumoCalculado,
    DeduccionMermasPayload,
)
try:
    from mermas import (
        calcular_area_vanos,
        calcular_area_neta,
        inferir_factor_perdida,
        optimizar_compra_por_nesting,
    )
except ModuleNotFoundError:
    from backend.mermas import (
        calcular_area_vanos,
        calcular_area_neta,
        inferir_factor_perdida,
        optimizar_compra_por_nesting,
    )
try:
    from dimensiones_comerciales import (
        obtener_dimensiones,
        area_por_pieza,
        largo_por_pieza,
        DIMENSIONES_COMERCIALES,
    )
except ModuleNotFoundError:
    from backend.dimensiones_comerciales import (
        obtener_dimensiones,
        area_por_pieza,
        largo_por_pieza,
        DIMENSIONES_COMERCIALES,
    )
try:
    from techumbre import (
        calcular_partida_techumbre,
        cantidad_insumo_metalcon,
        es_metalcon_material,
        nombre_insumo_metalcon,
    )
except ModuleNotFoundError:
    from backend.techumbre import (
        calcular_partida_techumbre,
        cantidad_insumo_metalcon,
        es_metalcon_material,
        nombre_insumo_metalcon,
    )

# Importar configuración de BD y Modelos
from database import engine, get_db, SessionLocal
import models
try:
    from techumbre import (
        cantidad_insumo_metalcon,
        es_metalcon_material,
        nombre_insumo_metalcon,
    )
except ModuleNotFoundError:
    from backend.techumbre import (  # type: ignore
        cantidad_insumo_metalcon,
        es_metalcon_material,
        nombre_insumo_metalcon,
    )

# Crear tablas
# Crear tablas (movido a startup)

app = FastAPI(
    title="SIEC API",
    version="1.0.0",
    description="""
SIEC backend — Sistema Inteligente de Estimación de Costos.

Provides:
  * Cost estimation engine for residential construction projects.
  * Project management with versioning, comments, and collaboration.
  * AI assistant with tool-calling (price history, optimization).
  * Real-time price ingestion from Sodimac/Easy/Construmart scraper.

Authentication: Bearer JWT issued by Supabase Auth (HS256 default; RS256 via JWKS).
""",
    contact={"name": "SIEC Team", "email": "team@siec.app"},
    openapi_tags=[
        {"name": "auth", "description": "Identity (Supabase JWT validation)."},
        {"name": "projects", "description": "Multi-tenant project CRUD + collaboration."},
        {"name": "ai", "description": "AI assistant + price intelligence."},
        {"name": "meta", "description": "Health checks and metadata."},
    ],
)

try:
    from observability import log, install as install_observability
    install_observability(app)
except Exception as _obs_exc:
    import logging
    log = logging.getLogger("siec")
    log.error("observability_install_failed", error=str(_obs_exc))

# CORS — origins are configurable via env to support staging/production.
# In dev, defaults cover localhost + LAN IP from previous setup.
_default_origins = "http://localhost:5173,http://127.0.0.1:5173,http://10.51.0.26:5173,https://proyectsiec.vercel.app,https://siec.app,https://www.siec.app"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth dependencies
try:
    from auth import get_current_user, get_optional_user, require_role, CurrentUser
except ModuleNotFoundError:
    from backend.auth import get_current_user, get_optional_user, require_role, CurrentUser  # type: ignore


@app.get("/me", tags=["auth"])
def get_me(user: CurrentUser = Depends(get_current_user)):
    """Return the authenticated user's profile, derived from the Supabase JWT."""
    metadata = user.raw_claims.get("user_metadata", {}) or {}
    app_metadata = user.raw_claims.get("app_metadata", {}) or {}
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "aal": user.aal,
        "full_name": metadata.get("full_name"),
        "company": metadata.get("company"),
        "avatar_url": metadata.get("avatar_url"),
        "preferences": {
            "units": metadata.get("units", "metric"),
            "currency": metadata.get("currency", "CLP"),
        },
        "providers": app_metadata.get("providers", []),
        "onboarded": metadata.get("onboarded", False),
    }


@app.get("/health", tags=["meta"])
def healthcheck():
    from database import check_database_connection

    db = check_database_connection()
    return {
        "status": "ok" if db.get("ok") else "degraded",
        "service": "siec-api",
        "auth": {
            "supabase_url_configured": bool(os.getenv("SUPABASE_URL", "").strip()),
            "jwt_secret_configured": bool(os.getenv("SUPABASE_JWT_SECRET", "").strip()),
            "jwt_algorithm_default": os.getenv("SUPABASE_JWT_ALGORITHM", "HS256"),
        },
        "database": db,
    }


# Mount Phase 3 routers (projects, versions, collaboration, comments)
try:
    from routers.projects import router as projects_router
    app.include_router(projects_router)
except Exception as exc:  # pragma: no cover
    log.error("router_mount_failed", router="projects", error=str(exc))

# Mount Phase 5 routers (AI assistant + price intelligence)
try:
    from routers.ai import router as ai_router
    app.include_router(ai_router)
except Exception as exc:  # pragma: no cover
    log.error("router_mount_failed", router="ai", error=str(exc))

# Mount Phase 7 routers (marketplace of presets)
try:
    from routers.marketplace import router as marketplace_router
    app.include_router(marketplace_router)
except Exception as exc:  # pragma: no cover
    log.error("router_mount_failed", router="marketplace", error=str(exc))

# Mount Phase 8 routers (settings/integrations/billing/site-profile)
try:
    from routers.settings import router as settings_router
    app.include_router(settings_router)
except Exception as exc:  # pragma: no cover
    log.error("router_mount_failed", router="settings", error=str(exc))

try:
    from routers.billing import router as billing_router
    app.include_router(billing_router)
except Exception as exc:  # pragma: no cover
    log.error("router_mount_failed", router="billing", error=str(exc))

try:
    from routers.siecplace import router as siecplace_router
    app.include_router(siecplace_router)
except Exception as exc:  # pragma: no cover
    log.error("router_mount_failed", router="siecplace", error=str(exc))

# PDF vectorial (Playwright / Chromium print)
try:
    from routers.export import router as export_router
    app.include_router(export_router)
except Exception as exc:  # pragma: no cover
    print(f"[main] Could not mount /export router: {exc}")


# Seeding de datos iniciales
@app.on_event("startup")
def startup_event():
    """DB init is best-effort so Railway /health can pass even if Postgres is slow."""
    try:
        models.Base.metadata.create_all(bind=engine)
    except Exception as exc:
        log.error("startup_create_tables_failed", error=str(exc))

    try:
        from scripts.normalize_unidad_mano_obra import normalize_unidad_mano_obra

        updated = normalize_unidad_mano_obra(os.getenv("DATABASE_URL", None))
        log.info("normalization_completed", updated_rows=updated)
    except Exception as exc:
        log.error("normalization_script_failed", error=str(exc))

    try:
        db = SessionLocal()
        try:
            if db.query(models.TipoRecinto).count() == 0:
                log.info("seeding_initial_recintos")
                tipos_iniciales = [
                    models.TipoRecinto(nombre="Habitación", costo_tokens=9),
                    models.TipoRecinto(nombre="Baño", costo_tokens=4),
                    models.TipoRecinto(nombre="Área Común", costo_tokens=12),
                ]
                db.add_all(tipos_iniciales)
                db.commit()

            if db.query(models.MaterialEstructural).count() == 0:
                log.info("seeding_initial_materials")
                materiales = [
                    models.MaterialEstructural(id=1, nombre="Madera", descripcion="", activo=True),
                    models.MaterialEstructural(id=2, nombre="Metalcom", descripcion="", activo=True),
                    models.MaterialEstructural(id=3, nombre="Albañilería", descripcion="", activo=True),
                    models.MaterialEstructural(id=4, nombre="Hormigón Armado", descripcion="", activo=True),
                    models.MaterialEstructural(id=5, nombre="Híbrido", descripcion="Sistema mixto madera y metalcon", activo=True),
                ]
                db.add_all(materiales)
                db.commit()
        finally:
            db.close()
    except Exception as exc:
        log.error("startup_seed_failed", error=str(exc))

# Materiales permitidos según requerimientos
ALLOWED_MATERIALS = ["Madera", "Metalcom", "Albañilería", "Hormigón Armado", "Híbrido"]

# Recargo obligatorio por leyes sociales (28% - 29%). Ajustable vía variable de entorno SOCIAL_LEY_FACTOR.
try:
    SOCIAL_LEY_FACTOR = float(os.getenv("SOCIAL_LEY_FACTOR", "1.28"))
except Exception:
    SOCIAL_LEY_FACTOR = 1.28
# Validar rango permitido: 1.28 <= factor <= 1.29
if SOCIAL_LEY_FACTOR < 1.28 or SOCIAL_LEY_FACTOR > 1.29:
    SOCIAL_LEY_FACTOR = 1.28  # Valor por defecto si la variable de entorno está fuera de rango

# Horas por jornada usada para normalizar precios por día a precio por HH (configurable via env HOURS_PER_DAY)
try:
    HOURS_PER_DAY = float(os.getenv("HOURS_PER_DAY", "8"))
except Exception:
    HOURS_PER_DAY = 8.0
if HOURS_PER_DAY <= 0 or HOURS_PER_DAY > 24:
    HOURS_PER_DAY = 8.0

# Espesores estándar por material estructural (metros)
# Se usan en cálculo de volúmenes y se inyectan en la respuesta al frontend.
ESPESORES_POR_DEFECTO = {
    1: 0.09,  # Madera - 9 cm
    2: 0.09,  # Metalcom - 9 cm
    3: 0.14,  # Albañilería - 14 cm (muro)
    4: 0.18,  # Hormigón Armado - 18 cm (muro)
    5: 0.10,  # Híbrido - 10 cm (muro mixto)
}
ESPESOR_LOSA_HA = 0.10  # Losa hormigón armado: 10 cm

class ProjectConfig(BaseModel):
    material_estructural: str

class TipoRecintoResponse(BaseModel):
    id: int
    nombre: str
    costo_tokens: int

    class Config:
        from_attributes = True

class SimulacionCreate(BaseModel):
    m2Totales: int
    materialEstructuralId: int
    perimetro_ml: float = Field(..., gt=0, description="Perímetro de envolvente en metros lineales")
    altura_muro_m: float = Field(..., gt=0, le=6.0, description="Altura promedio de muro en metros")
    incluir_techumbre: bool = Field(False, description="Incluye cálculo de techumbre (cubierta + cielo)")

@app.get("/")
def read_root():
    return {"message": "SIEC API is running", "stack": "FastAPI + PostgreSQL"}

@app.get("/materials")
def get_materials():
    """Retorna la lista oficial de materiales estructurales."""
    return {"materials": ALLOWED_MATERIALS}

@app.get("/api/tipos-recinto", response_model=List[TipoRecintoResponse])
def get_tipos_recinto(db: Session = Depends(get_db)):
    """Retorna los tipos de recinto y su costo en tokens (Catálogo para motor de estimación)."""
    return db.query(models.TipoRecinto).all()

@app.post("/api/simulacion/parametros", status_code=status.HTTP_201_CREATED)
def crear_simulacion(
    sim: SimulacionCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_optional_user),
):
    """Guarda los parámetros de configuración de la vivienda y crea una nueva simulación."""

    # Validaciones obligatorias (alineadas con CHECK en Postgres: 1–1000 m²)
    if sim.m2Totales < 1 or sim.m2Totales > 1000:
        raise HTTPException(
            status_code=400,
            detail="Superficie total debe estar entre 1 y 1000 m².",
        )

    if sim.materialEstructuralId not in [1, 2, 3, 4, 5]:
        raise HTTPException(status_code=400, detail="Material estructural ID no válido.")

    try:
        from billing.service import enforce_simulation_material
    except ModuleNotFoundError:
        from backend.billing.service import enforce_simulation_material  # type: ignore
    enforce_simulation_material(db, user, sim.materialEstructuralId)
    
    if sim.perimetro_ml <= 0:
        raise HTTPException(status_code=400, detail="El perímetro debe ser mayor a 0 metros lineales.")
    
    if sim.altura_muro_m <= 0 or sim.altura_muro_m > 6.0:
        raise HTTPException(status_code=400, detail="La altura del muro debe estar entre 0 y 6 metros.")
        
    # Crear modelo
    db_simulacion = models.ConfiguracionSimulacion(
        m2_totales=sim.m2Totales,
        material_estructural_id=sim.materialEstructuralId,
        perimetro_ml=sim.perimetro_ml,
        altura_muro_m=sim.altura_muro_m,
        incluir_techumbre=sim.incluir_techumbre
    )
    
    try:
        db.add(db_simulacion)
        db.commit()
        db.refresh(db_simulacion)
    except IntegrityError as exc:
        db.rollback()
        raw = str(getattr(exc, "orig", exc)).lower()
        if "foreign key" in raw or "material_estructural" in raw:
            detail = (
                "Material estructural no registrado en la base de datos. "
                "Reinicia el backend o ejecuta las migraciones en Supabase."
            )
        elif "check" in raw or "m2_totales" in raw:
            detail = "Superficie total debe estar entre 1 y 1000 m²."
        else:
            detail = "No se pudo guardar la simulación (restricción de base de datos)."
        log.error("simulacion_insert_failed", error=str(exc))
        raise HTTPException(status_code=400, detail=detail) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        log.error("simulacion_db_error", error=str(exc))
        raise HTTPException(
            status_code=400,
            detail="Error de conexión o esquema en la base de datos. Revisa DATABASE_URL y migraciones.",
        ) from exc
        
    return {"idSimulacion": db_simulacion.id, "message": "Simulación guardada correctamente"}

def normalize_string(s: str) -> str:
    """Remueve acentos y pasa a minúsculas para comparaciones robustas."""
    return "".join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')


def _es_material_metalcon(material_id: int) -> bool:
    return es_metalcon_material(material_id)


def _nombre_insumo_para_material(material_id: int, nombre_insumo: str) -> str:
    if not _es_material_metalcon(material_id):
        return nombre_insumo
    return nombre_insumo_metalcon(nombre_insumo)


def _cantidad_base_metalcon(
    material_id: int,
    nombre_insumo: str,
    area_bruta_m2: float,
    recintos: list[dict],
) -> Optional[float]:
    if not _es_material_metalcon(material_id):
        return None
    return cantidad_insumo_metalcon(nombre_insumo, area_bruta_m2, recintos)


class RecintoGeometrico(BaseModel):
    tipo: str = Field(..., description="Nombre del tipo de recinto (ej. 'Habitación', 'Baño')")
    ancho: float = Field(..., description="Ancho geométrico del recinto en metros")
    largo: float = Field(..., description="Largo geométrico del recinto en metros")

class PayloadLayout3D(BaseModel):
    recintos: List[RecintoGeometrico]

@app.post("/api/simulacion/{simulacion_id}/layout", status_code=status.HTTP_201_CREATED)
def asociar_y_validar_layout_estricto(simulacion_id: int, payload: PayloadLayout3D, db: Session = Depends(get_db)):
    """
    Validación estricta de la disposición 3D:
    - Asegura que los m2 totales combinados <= m2 totales de la simulación.
    - Asegura que el área de CADA recinto individual sea >= el costo nativo en tokens del mismo.
    """
    # 1. Recuperar simulación de la base de datos
    simulacion = db.query(models.ConfiguracionSimulacion).filter(models.ConfiguracionSimulacion.id == simulacion_id).first()
    if not simulacion:
        raise HTTPException(status_code=404, detail="La simulación especificada no existe.")
        
    # 2. Precargar costos de tokens base para validación
    cat_tipos = db.query(models.TipoRecinto).all()
    # Mapeo relajado de strings (ej: 'Baño' -> 'bano')
    costo_por_tipo = { normalize_string(t.nombre): t.costo_tokens for t in cat_tipos }

    area_total_acumulada = 0.0    # 3. Iterar cada recinto recibido
    for recinto in payload.recintos:
        area_recinto = recinto.ancho * recinto.largo
        area_total_acumulada += area_recinto

        # Validación estricta mínima: Todo recinto debe tener un mínimo razonable (ej. 1m2),
        # prescindiendo de tipos legacy rígidos
        if area_recinto < 1.0:
            raise HTTPException(
                status_code=400,
                detail=f"Validación matemática falló: El cuarto tipo '{recinto.tipo}' tiene un área geométrica de {area_recinto:.2f} m², lo cual es inferior al mínimo seguro de 1 m²."
            )

    # 4. Validación de Capacidad Máxima (Tope Superior)
    if area_total_acumulada > float(simulacion.m2_totales):
        raise HTTPException(
            status_code=400, 
            detail=f"Validación estricta falló: La suma total de áreas ingresadas ({area_total_acumulada:.2f} m²) excede los metros cuadrados disponibles en la simulación base ({simulacion.m2_totales} m²)."
        )

    # Si pasa todas las validaciones asocia el modelo de forma íntegra a DB
    # Nota: Acá expandiríamos lógica de DB.commit() con los Recintos 3D hacia el modelo
    return {
        "status": "success",
        "message": "Validaciones estrictas pasadas. Configuración del plano íntegro.",
        "area_total_calculada": area_total_acumulada,
        "limite_m2_disponibles": simulacion.m2_totales
    }


def _merge_insumo_item(a: InsumoCalculado, b: InsumoCalculado) -> InsumoCalculado:
    sub_a = a.subtotal or 0.0
    sub_b = b.subtotal or 0.0
    subtotal = None
    if a.subtotal is not None or b.subtotal is not None:
        subtotal = sub_a + sub_b
    cant_obj = None
    if a.cantidad_objetivo is not None or b.cantidad_objetivo is not None:
        cant_obj = (a.cantidad_objetivo or 0.0) + (b.cantidad_objetivo or 0.0)
    cant_comp = None
    if a.cantidad_compra is not None or b.cantidad_compra is not None:
        cant_comp = (a.cantidad_compra or 0.0) + (b.cantidad_compra or 0.0)
    return InsumoCalculado(
        insumo=a.insumo,
        cantidad=(a.cantidad or 0.0) + (b.cantidad or 0.0),
        unidad=a.unidad or b.unidad,
        precio_unitario=a.precio_unitario or b.precio_unitario,
        subtotal=subtotal,
        tienda=a.tienda or b.tienda,
        url_producto=a.url_producto or b.url_producto,
        cantidad_objetivo=cant_obj,
        cantidad_compra=cant_comp,
        perdida_porcentual=a.perdida_porcentual if a.perdida_porcentual is not None else b.perdida_porcentual,
        metodo_optimizacion=a.metodo_optimizacion or b.metodo_optimizacion,
        formato_comercial=a.formato_comercial or b.formato_comercial,
    )


def _fusionar_desglose_responses(
    partials: List[DesgloseResponse],
    simulacion_id: int,
    m2_totales: int,
) -> DesgloseResponse:
    if not partials:
        raise HTTPException(status_code=422, detail="No hay resultados para fusionar.")
    if len(partials) == 1:
        return partials[0]

    items_por_categoria: dict[str, dict[str, InsumoCalculado]] = defaultdict(dict)
    orden_categorias: List[str] = []
    for partial in partials:
        for categoria in partial.desglose:
            if categoria.categoria not in orden_categorias:
                orden_categorias.append(categoria.categoria)
            bucket = items_por_categoria[categoria.categoria]
            for item in categoria.items:
                if item.insumo not in bucket:
                    bucket[item.insumo] = item
                else:
                    bucket[item.insumo] = _merge_insumo_item(bucket[item.insumo], item)

    desglose_list = []
    for cat_name in orden_categorias:
        items = list(items_por_categoria[cat_name].values())
        has_subt = any(i.subtotal is not None for i in items)
        subcat = sum((i.subtotal for i in items if i.subtotal is not None)) if has_subt else None
        desglose_list.append(CategoriaDesglose(categoria=cat_name, items=items, subtotal_categoria=subcat))

    materiales = sorted({p.material for p in partials if p.material})
    costo_total = sum((p.costo_total or 0.0) for p in partials) or None
    area_bruta = sum((p.area_bruta_m2 or 0.0) for p in partials) or None
    area_vanos = sum((p.area_vanos_m2 or 0.0) for p in partials) or None
    area_neta = sum((p.area_neta_m2 or 0.0) for p in partials) or None
    perimetro = sum((p.perimetro_ml or 0.0) for p in partials) or None
    area_muro = sum((p.area_muro_neta_m2 or 0.0) for p in partials) or None
    vol_neto = sum((p.volumen_neto_previo or 0.0) for p in partials) or None
    vol_comp = sum((p.volumen_compensado_pre_cotizacion or 0.0) for p in partials) or None
    items_opt = sum((p.items_optimizados or 0) for p in partials) or None
    perdidas = [p.perdida_promedio_porcentual for p in partials if p.perdida_promedio_porcentual is not None]
    perdida_prom = (sum(perdidas) / len(perdidas)) if perdidas else None
    tarifas = [p.tarifa_pura_local for p in partials if p.tarifa_pura_local is not None]
    tarifa = (sum(tarifas) / len(tarifas)) if tarifas else None
    fechas = [p.fecha_precios for p in partials if p.fecha_precios]
    alturas = [p.altura_muro_m for p in partials if p.altura_muro_m is not None]
    espesores = [p.espesor_muro_m for p in partials if p.espesor_muro_m is not None]

    return DesgloseResponse(
        simulacion_id=simulacion_id,
        m2_totales=m2_totales,
        material=" + ".join(materiales) if materiales else "Mixto",
        desglose=desglose_list,
        costo_total=costo_total,
        fecha_precios=min(fechas) if fechas else None,
        tarifa_pura_local=tarifa,
        area_bruta_m2=area_bruta,
        area_vanos_m2=area_vanos,
        area_neta_m2=area_neta,
        volumen_neto_previo=vol_neto,
        volumen_compensado_pre_cotizacion=vol_comp,
        items_optimizados=items_opt,
        perdida_promedio_porcentual=perdida_prom,
        perimetro_ml=perimetro if perimetro and perimetro > 0 else None,
        altura_muro_m=alturas[0] if alturas else None,
        area_muro_neta_m2=area_muro if area_muro and area_muro > 0 else None,
        incluir_techumbre=any(p.incluir_techumbre for p in partials),
        espesor_muro_m=espesores[0] if espesores else None,
    )


def _calcular_insumos_material(
    simulacion_id: int,
    payload: Optional[DeduccionMermasPayload],
    db: Session,
    user: CurrentUser,
    simulacion: models.ConfiguracionSimulacion,
    material_id_override: Optional[int] = None,
    m2_totales_override: Optional[int] = None,
    perimetro_ml_override: Optional[float] = None,
) -> DesgloseResponse:
    """
    Calcula el desglose de insumos para una simulación usando la Matriz de Rendimiento.
    """
    material_id = int(material_id_override or simulacion.material_estructural_id)
    try:
        from billing.service import enforce_simulation_material
    except ModuleNotFoundError:
        from backend.billing.service import enforce_simulation_material  # type: ignore
    enforce_simulation_material(db, user, material_id)

    m2_totales = int(m2_totales_override if m2_totales_override is not None else simulacion.m2_totales)
    area_bruta = float(payload.area_bruta_m2) if payload and payload.area_bruta_m2 is not None else float(m2_totales)
    area_vanos = calcular_area_vanos(payload.vanos if payload else [])
    area_neta = calcular_area_neta(area_bruta, area_vanos)
    if area_neta <= 0:
        raise HTTPException(
            status_code=422,
            detail="La deducción de vanos deja un área neta no válida para cotizar.",
        )

    # ── Geometría de muros y techumbre ────────────────────────────────────────
    if perimetro_ml_override is not None:
        perimetro_ml = float(perimetro_ml_override)
    else:
        perimetro_ml = float(simulacion.perimetro_ml) if simulacion.perimetro_ml else 0.0
    altura_muro_m = float(simulacion.altura_muro_m) if simulacion.altura_muro_m else 2.44
    incluir_techumbre = bool(simulacion.incluir_techumbre) if simulacion.incluir_techumbre is not None else False
    area_muro_bruta = perimetro_ml * altura_muro_m if perimetro_ml > 0 else 0.0
    area_muro_neta = max(0.0, area_muro_bruta - area_vanos) if area_muro_bruta > 0 else area_neta
    cortes_acero = int(payload.cortes_acero) if payload else 0
    cruces_acero = int(payload.cruces_acero) if payload else 0
    piezas_2d_payload = [
        (float(piece.ancho), float(piece.alto), int(piece.cantidad))
        for piece in (payload.piezas_2d if payload else [])
    ]
    cortes_1d_payload = [
        (float(cut.largo), int(cut.cantidad))
        for cut in (payload.cortes_1d if payload else [])
    ]
    recintos_payload = [
        {
            "piso": int(getattr(recinto, "piso", 1)),
            "coords_x": float(getattr(recinto, "coords_x", 0.0)),
            "coords_z": float(getattr(recinto, "coords_z", 0.0)),
            "width": float(getattr(recinto, "width", 0.0)),
            "length": float(getattr(recinto, "length", 0.0)),
        }
        for recinto in (payload.recintos if payload else [])
    ]
    # 2. Material nombre
    material = db.query(models.MaterialEstructural).filter(models.MaterialEstructural.id == material_id).first()
    material_nombre = material.nombre if material else "Desconocido"

    # 3. Consultar la matriz cruzada con insumos
    datos_rendimiento = db.query(models.MatrizRendimiento, models.Insumo).join(
        models.Insumo,
        models.MatrizRendimiento.insumo_id == models.Insumo.id
    ).filter(
        models.MatrizRendimiento.material_estructural_id == material_id,
        models.MatrizRendimiento.activo == True,
        models.Insumo.activo == True
    ).all()

    if not datos_rendimiento:
        raise HTTPException(status_code=422, detail="No existen rendimientos para el material seleccionado")

    # Promediador de Precios de Mercado
    insumo_ids = [insumo.id for r, insumo in datos_rendimiento] + [46, 47, 48, 49, 50, 51]
    
    precios_records = db.query(models.PrecioMercado).distinct(
        models.PrecioMercado.insumo_id, 
        models.PrecioMercado.tienda
    ).filter(
        models.PrecioMercado.exitoso == True,
        models.PrecioMercado.insumo_id.in_(insumo_ids)
    ).order_by(
        models.PrecioMercado.insumo_id, 
        models.PrecioMercado.tienda, 
        models.PrecioMercado.fecha_scraping.desc()
    ).all()

    precios_x_insumo = defaultdict(list)
    all_stores_map = {}
    latest_precio_record = {}
    fechas_usadas = []

    for pm in precios_records:
        precio_val = pm.precio_descuento if pm.precio_descuento is not None else pm.precio
        if precio_val is not None:
            precio_float = float(precio_val)
            precios_x_insumo[pm.insumo_id].append(precio_float)

            if pm.insumo_id not in all_stores_map:
                all_stores_map[pm.insumo_id] = []
            tienda_key = pm.tienda.strip().lower() if pm.tienda else ""
            url_val = getattr(pm, 'url', None)
            if url_val is not None and not isinstance(url_val, str):
                url_val = None
            if not any(s.get("tienda", "").lower() == tienda_key for s in all_stores_map[pm.insumo_id]):
                if len(all_stores_map[pm.insumo_id]) < 5:
                    nombre_prod = getattr(pm, 'nombre_producto', '') or ''
                    all_stores_map[pm.insumo_id].append({
                        "tienda": pm.tienda or "",
                        "precio": precio_float,
                        "url": url_val or "",
                        "nombre_producto": nombre_prod,
                    })

            if pm.insumo_id not in latest_precio_record:
                latest_precio_record[pm.insumo_id] = pm
            else:
                if pm.fecha_scraping and latest_precio_record[pm.insumo_id].fecha_scraping:
                    if pm.fecha_scraping > latest_precio_record[pm.insumo_id].fecha_scraping:
                        latest_precio_record[pm.insumo_id] = pm
            if pm.fecha_scraping:
                fechas_usadas.append(pm.fecha_scraping.isoformat() if hasattr(pm.fecha_scraping, 'isoformat') else str(pm.fecha_scraping))

    for stores in all_stores_map.values():
        stores.sort(key=lambda s: s["precio"])
        for s in stores:
            url = s.get("url", "")
            if not url or "google.com/search" in url:
                term = s.get("nombre_producto", "")
                if term:
                    s["url"] = f"https://www.google.com/search?tbm=shop&q={quote_plus(term)}"

    precio_promedio_map = {}
    for i_id, lista_precios in precios_x_insumo.items():
        if lista_precios:
            precio_promedio_map[i_id] = sum(lista_precios) / len(lista_precios)

    fecha_precios = min(fechas_usadas) if fechas_usadas else None

    # 4. Agrupar por categoria y calcular subtotales
    categorias_dict = defaultdict(list)
    costo_total_simulacion = None

    # Prepare for labor parametrization: collect labor insumos and rendimiento factors
    labor_insumos = []
    rendimiento_jornadas_total = 0.0
    labor_factors = {}
    for r, insumo in datos_rendimiento:
        if insumo.categoria and insumo.categoria.strip().lower() == 'mano de obra':
            labor_insumos.append((r, insumo))
            labor_factors[insumo.id] = r

    # Determine total jornadas por m2 from labor factors
    for r, insumo in labor_insumos:
        unidad_factor = (getattr(r, 'unidad_factor', '') or '').lower()
        try:
            if 'jornada' in unidad_factor or 'jornad' in unidad_factor:
                jornadas = float(r.factor_multiplicador)
            else:
                # Default: treat factor as HH per m2 and convert to jornadas
                jornadas = float(r.factor_multiplicador) / float(HOURS_PER_DAY)
        except Exception:
            try:
                jornadas = float(r.factor_multiplicador) / float(HOURS_PER_DAY)
            except Exception:
                jornadas = 0.0
        rendimiento_jornadas_total += jornadas

    # Find maestro and ayudante daily salaries from latest_precio_record
    maestro_keywords = ('maestro', 'albañil', 'oficial')
    ayudante_keywords = ('ayudante', 'ayuda')
    salario_diario_maestro = 0.0
    salario_diario_ayudante = 0.0
    found_maestro = False
    found_ayudante = False

    for r, insumo in labor_insumos:
        pm = latest_precio_record.get(insumo.id)
        if not pm:
            continue
        precio_val = getattr(pm, 'precio_descuento', None) if getattr(pm, 'precio_descuento', None) is not None else getattr(pm, 'precio', None)
        if precio_val is None:
            continue
        precio_val = float(precio_val)
        nombre_prod = (getattr(pm, 'nombre_producto', '') or '').lower()
        # Determine if price is per jornada
        is_por_jornada = any(k in nombre_prod for k in ('jornada', 'por jornada', 'por día', 'por dia', 'día', 'dia'))
        # If insumo unit is HH and price appears to be per HH, convert to diario
        unidad_medida_insumo = (insumo.unidad_medida or '').strip().upper()
        if unidad_medida_insumo in ('HH', 'H') and not is_por_jornada:
            salario_diario = precio_val * float(HOURS_PER_DAY)
        else:
            salario_diario = precio_val

        # Prefer explicit role mapping in Insumo_Role if available
        role_entry = db.query(models.InsumoRole).filter(models.InsumoRole.insumo_id == insumo.id).first()
        role_val = None
        if role_entry and getattr(role_entry, 'role', None):
            role_val = str(role_entry.role).strip().lower()

        if role_val == 'maestro':
            salario_diario_maestro += salario_diario
            found_maestro = True
        elif role_val == 'ayudante' or role_val == 'help' or role_val == 'assistant':
            salario_diario_ayudante += salario_diario
            found_ayudante = True
        else:
            # Fallback to name matching if no explicit role
            name_l = (insumo.nombre or '').lower()
            if any(k in name_l for k in maestro_keywords):
                salario_diario_maestro += salario_diario
                found_maestro = True
            if any(k in name_l for k in ayudante_keywords):
                salario_diario_ayudante += salario_diario
                found_ayudante = True

    tarifa_pura_local = None
    if (found_maestro or found_ayudante) and rendimiento_jornadas_total > 0:
        tarifa_pura_local = (salario_diario_maestro + salario_diario_ayudante) * rendimiento_jornadas_total

    volumen_neto_previo = 0.0
    volumen_compensado_pre_cotizacion = 0.0
    perdidas_optimizadas = []
    items_optimizados = 0

    # ── Área base para techumbre ──────────────────────────────────────────────
    area_techumbre = m2_totales * 1.15 if incluir_techumbre else 0.0

    # ── Geometría específica por material (para Albañilería y H. Armado) ──
    espesor_muro = ESPESORES_POR_DEFECTO.get(material_id, 0.14)
    # area_muro_bruta ya está calculada arriba (linea ~484)
    volumen_muro = area_muro_bruta * espesor_muro
    volumen_losa = m2_totales * ESPESOR_LOSA_HA

    total_studs = 0
    total_soleras = 0

    def _clasificar_insumo(nombre_l: str, cat_l: str, material_id: int = 0) -> str:
        # ── Albañilería ─────────────────────────────────────────────────
        if material_id == 3:
            if any(k in nombre_l for k in ["ladrillo", "bloque"]):
                return "albanileria_mamposteria"
            if any(k in nombre_l for k in ["mortero pega", "mortero estuco"]):
                return "albanileria_mortero"
            if any(k in nombre_l for k in ["enfierradura"]):
                return "albanileria_enfierradura"
            if any(k in nombre_l for k in ["hormigón pilar", "hormigón cadena"]):
                return "albanileria_hormigon"
        # ── Hormigón Armado ──────────────────────────────────────────────
        if material_id == 4:
            if any(k in nombre_l for k in ["hormigón h25", "hormigón h30"]):
                return "ha_hormigon"
            if any(k in nombre_l for k in ["acero", "ø", "ø8", "ø10", "ø12", "ø16"]):
                return "ha_acero"
            if any(k in nombre_l for k in ["moldaje"]):
                return "ha_moldaje"
            if any(k in nombre_l for k in ["alambre negro", "separadores", "desmoldante"]):
                return "ha_complementos"
        # ── Madera / Metalcom ───────────────────────────────────────────
        if any(k in nombre_l for k in ["solera", "montante", "pie derecho", "paral"]):
            return "estructura_muro"
        if any(k in nombre_l for k in ["perfil metalcon", "perfil acero", "perfil galvanizado"]):
            return "estructura_muro"
        if any(k in nombre_l for k in ["2x3", "2x4", "2x6", "pino 2x3", "pino 2x4", "pino 2x6"]):
            return "estructura_muro"
        if any(k in nombre_l for k in [
            "siding", "osb", "yeso cartón", "yeso carton", "yeso-cartón", "yeso-carton",
            "placa fibrocemento", "terciado", "plywood", "panel muro",
            "revestimiento mural", "muro perimetral", "m fm",
            "tabiquería", "tabiqueria", "tabique interior",
            "volcanita rh", "volcanita reforzado",
        ]):
            return "revestimiento_muro"
        if incluir_techumbre and any(k in nombre_l for k in [
            "zincalum", "cubierta", "zinc", "cielo", "aislación", "aislacion",
            "polietileno techo", "térmico techo", "m2 techo", "techumbre",
        ]):
            return "techumbre"
        if cat_l == "obra gruesa" and any(k in nombre_l for k in [
            "gravilla", "arena", "ripio", "cemento", "agua", "hormigón",
        ]):
            return "losa_hormigon"
        return "generico"

    for r, insumo in datos_rendimiento:
        nombre_insumo = _nombre_insumo_para_material(material_id, insumo.nombre)
        cantidad_override = _cantidad_base_metalcon(
            material_id,
            insumo.nombre,
            area_bruta,
            recintos_payload,
        )
        nombre_l = (insumo.nombre or "").lower()
        cat_l = (insumo.categoria or "").lower()
        familia = _clasificar_insumo(nombre_l, cat_l, material_id)
        if familia in ("estructura_muro", "revestimiento_muro") and perimetro_ml <= 0:
            familia = "generico"

        # ── Cálculo por familia ───────────────────────────────────────────────
        if cantidad_override is not None:
            cantidad_neta = cantidad_override
            nesting_result = None

        elif familia == "estructura_muro" and perimetro_ml > 0:
            dim = obtener_dimensiones(insumo.nombre, insumo.categoria or "")
            largo_pieza = dim.get("largo_lineal_m", 3.2)
            desc_l = (getattr(insumo, "descripcion", "") or "").lower()
            es_solera = "solera" in nombre_l or "solera" in desc_l or "2x4" in nombre_l

            if es_solera:
                cantidad_neta = math.ceil((perimetro_ml * 2) / largo_pieza) * 2
                total_soleras = math.ceil(cantidad_neta * 1.15)
            else:
                cantidad_neta = math.ceil(perimetro_ml / 0.40) + 4
                total_studs = math.ceil(cantidad_neta * 1.15)

            cantidad_neta = math.ceil(cantidad_neta * 1.15)  # merma 15%
            nesting_result = None

        elif familia == "revestimiento_muro" and perimetro_ml > 0 and altura_muro_m > 0:
            dim = obtener_dimensiones(insumo.nombre, insumo.categoria or "")
            area_placa = dim.get("area_m2", 2.9768)
            if area_placa <= 0:
                area_placa = 2.9768
            area_cubrir = perimetro_ml * altura_muro_m
            if area_cubrir > 0:
                cantidad_neta = math.ceil(area_cubrir / area_placa * 1.10)
            else:
                cantidad_neta = 0.0
            nesting_result = None

        elif familia == "techumbre" and area_techumbre > 0:
            # Techumbre: usar area_techumbre (m2_totales × 1.15) × factor DB
            factor_ajustado = float(r.factor_multiplicador)
            cantidad_neta = factor_ajustado * area_techumbre
            nesting_result = optimizar_compra_por_nesting(
                insumo=insumo.nombre,
                categoria=insumo.categoria,
                unidad_medida=insumo.unidad_medida,
                unidad_factor=getattr(r, "unidad_factor", "") or "",
                descripcion=getattr(insumo, "descripcion", None),
                cantidad_objetivo=cantidad_neta,
                piezas_2d=piezas_2d_payload,
                cortes_1d=cortes_1d_payload,
            )

        elif familia == "losa_hormigon":
            # Losa de 10 cm: convertir kg/m³ a kg/m² usando espesor
            factor_ajustado = float(r.factor_multiplicador)
            factor_ajustado *= 0.1  # losa 10 cm
            if any(k in nombre_l for k in ["arena", "gravilla", "ripio"]):
                factor_ajustado /= 1600.0  # kg → m³
            if "cemento" in nombre_l:
                factor_ajustado /= 25.0  # kg → sacos de 25 kg
            cantidad_neta = factor_ajustado * area_neta
            nesting_result = optimizar_compra_por_nesting(
                insumo=insumo.nombre,
                categoria=insumo.categoria,
                unidad_medida=insumo.unidad_medida,
                unidad_factor=getattr(r, "unidad_factor", "") or "",
                descripcion=getattr(insumo, "descripcion", None),
                cantidad_objetivo=cantidad_neta,
                piezas_2d=piezas_2d_payload,
                cortes_1d=cortes_1d_payload,
            )

        # ── Albañilería ────────────────────────────────────────────────────
        elif familia == "albanileria_mamposteria" and perimetro_ml > 0:
            # Ladrillos/bloques: área_muro × factor (unidades por m² de muro)
            cantidad_neta = float(r.factor_multiplicador) * area_muro_bruta
            nesting_result = None

        elif familia == "albanileria_mortero" and perimetro_ml > 0:
            # Mortero: factor (m³ por m² de muro) × área de muro
            cantidad_neta = float(r.factor_multiplicador) * area_muro_bruta
            nesting_result = None

        elif familia == "albanileria_enfierradura" and perimetro_ml > 0:
            # Enfierradura: factor × perímetro (horizontal) o × altura×esquinas (vertical)
            desc_l = (getattr(insumo, "descripcion", "") or "").lower()
            if "horizontal" in desc_l or "horizontal" in nombre_l:
                cantidad_neta = float(r.factor_multiplicador) * perimetro_ml
            else:
                # Vertical: kg por metro de altura, cada ~1.2 m → pilares por ml
                pilares_por_ml = math.ceil(perimetro_ml / 1.2)
                cantidad_neta = float(r.factor_multiplicador) * altura_muro_m * pilares_por_ml
            nesting_result = None

        elif familia == "albanileria_hormigon" and perimetro_ml > 0:
            # Hormigón para pilares/cadenas: factor × perímetro o × altura×esquinas
            desc_l = (getattr(insumo, "descripcion", "") or "").lower()
            if "cadena" in desc_l or "cadena" in nombre_l:
                cantidad_neta = float(r.factor_multiplicador) * perimetro_ml
            else:
                pilares_por_ml = math.ceil(perimetro_ml / 1.2)
                cantidad_neta = float(r.factor_multiplicador) * altura_muro_m * pilares_por_ml
            nesting_result = None

        # ── Hormigón Armado ───────────────────────────────────────────────
        elif familia == "ha_hormigon":
            # Hormigón H25/H30: volumen losa + volumen muros (o solo losa si no hay muros)
            vol = volumen_losa
            if perimetro_ml > 0 and altura_muro_m > 0:
                vol += volumen_muro
            cantidad_neta = vol * float(r.factor_multiplicador)
            nesting_result = None

        elif familia == "ha_acero":
            # Acero: volumen total de hormigón × factor (kg/m³)
            vol = volumen_losa
            if perimetro_ml > 0 and altura_muro_m > 0:
                vol += volumen_muro
            cantidad_neta = vol * float(r.factor_multiplicador)
            nesting_result = None

        elif familia == "ha_moldaje" and perimetro_ml > 0:
            # Moldaje: 2 caras × área de muro + borde de losa
            area_muro = perimetro_ml * altura_muro_m
            moldaje_muros = 2.0 * area_muro * float(r.factor_multiplicador)
            borde_losa = perimetro_ml * ESPESOR_LOSA_HA
            cantidad_neta = moldaje_muros + borde_losa
            nesting_result = None

        elif familia == "ha_complementos":
            # Alambre, separadores, desmoldante: dependen de acero o moldaje
            vol = volumen_losa
            if perimetro_ml > 0 and altura_muro_m > 0:
                vol += volumen_muro
            kg_acero_total = vol * 100.0  # estimación 100 kg/m³
            area_moldaje = 0.0
            if perimetro_ml > 0 and altura_muro_m > 0:
                area_moldaje = 2.0 * perimetro_ml * altura_muro_m
            cantidad_neta = 0.0
            if "alambre" in nombre_l:
                # 10 kg por tonelada de acero
                cantidad_neta = float(r.factor_multiplicador) * (kg_acero_total / 1000.0)
            elif "separador" in nombre_l:
                # 4 unidades por m² de moldaje
                cantidad_neta = float(r.factor_multiplicador) * max(area_moldaje, m2_totales)
            elif "desmoldante" in nombre_l:
                # 0.15 L por m² de moldaje
                cantidad_neta = float(r.factor_multiplicador) * max(area_moldaje, m2_totales)
            nesting_result = None

        else:  # ── familia "generico" ─────────────────────────────────────────
            # Cálculo original: factor DB × área base (piso)
            factor_ajustado = float(r.factor_multiplicador)
            cantidad_neta = factor_ajustado * area_neta
            nesting_result = optimizar_compra_por_nesting(
                insumo=insumo.nombre,
                categoria=insumo.categoria,
                unidad_medida=insumo.unidad_medida,
                unidad_factor=getattr(r, "unidad_factor", "") or "",
                descripcion=getattr(insumo, "descripcion", None),
                cantidad_objetivo=cantidad_neta,
                piezas_2d=piezas_2d_payload,
                cortes_1d=cortes_1d_payload,
            )
        if cantidad_override is not None or familia in ("estructura_muro", "revestimiento_muro"):
            # Estas familias ya calcularon piezas enteras con merma incluida
            factor_perdida = 1.0
            cantidad_calc = cantidad_neta
        elif nesting_result is not None:
            factor_perdida = float(nesting_result["factor_perdida_equivalente"])
            cantidad_calc = float(nesting_result["cantidad_compra"])
            perdidas_optimizadas.append(float(nesting_result["perdida_fraccion"]))
            items_optimizados += 1
        else:
            factor_perdida = inferir_factor_perdida(
                insumo=insumo.nombre,
                categoria=insumo.categoria,
                cortes_acero=cortes_acero,
                cruces_acero=cruces_acero,
            )
            cantidad_calc = cantidad_neta * factor_perdida
            unidad_l = (insumo.unidad_medida or "").strip().lower()
            if unidad_l in ("caja", "unidad", "saco", "pack", "kit", "juego"):
                cantidad_calc = math.ceil(cantidad_calc)
            elif any(k in nombre_l for k in ("tornillo", "clavo", "perno", "fijacion")):
                cantidad_calc = math.ceil(cantidad_calc)
        volumen_neto_previo += cantidad_neta
        volumen_compensado_pre_cotizacion += cantidad_calc

        precio_unit = precio_promedio_map.get(insumo.id)
        precio_record = latest_precio_record.get(insumo.id)
        stores_for_insumo = all_stores_map.get(insumo.id, [])
        best_store = stores_for_insumo[0] if stores_for_insumo else None

        if best_store:
            precio_unit = best_store["precio"]
            tienda_insumo = best_store["tienda"]
            url_insumo = best_store["url"] or None
            tiendas_alternativas = stores_for_insumo if len(stores_for_insumo) > 1 else None
        else:
            tienda_insumo = getattr(precio_record, 'tienda', None) if precio_record else None
            url_insumo = getattr(precio_record, 'url', None) if precio_record else None
            tiendas_alternativas = None
        if url_insumo is not None and not isinstance(url_insumo, str):
            url_insumo = None
        precio_unit_normalized = None
        subt = None
        if precio_unit is not None:
            precio_unit_normalized = float(precio_unit)
            # Normalización de unidades de mano de obra: si el insumo espera HH pero el producto sugiere precio por jornada/día,
            # convertir a precio por HH dividiendo por HOURS_PER_DAY.
            try:
                unidad_esperada = (insumo.unidad_medida or '').strip().upper()
            except Exception:
                unidad_esperada = ''
            if unidad_esperada in ('HH', 'H') and precio_record is not None:
                nombre_prod = getattr(precio_record, 'nombre_producto', '') or ''
                nombre_prod_l = nombre_prod.lower()
                if any(k in nombre_prod_l for k in ('jornada', 'por jornada', 'por día', 'por dia', 'día', 'dia')):
                    try:
                        precio_unit_normalized = precio_unit_normalized / float(HOURS_PER_DAY)
                    except Exception:
                        pass
            subt = precio_unit_normalized * cantidad_calc
            # Aplicar recargo obligatorio por leyes sociales solo para Mano de Obra
            try:
                categoria_normalizada = insumo.categoria.strip().lower() if insumo.categoria else ""
            except Exception:
                categoria_normalizada = ""
            if categoria_normalizada == 'mano de obra':
                subt = subt * SOCIAL_LEY_FACTOR
            if costo_total_simulacion is None:
                costo_total_simulacion = 0.0
            costo_total_simulacion += subt

        # ── Inyectar dimensiones comerciales ─────────────────────────────
        dim = obtener_dimensiones(insumo.nombre, insumo.categoria or "")
        if dim.get("tipo") == "placa" and dim.get("area_m2"):
            fmt_comercial = f"{dim['ancho_m']} x {dim['largo_m']} m ({dim['area_m2']:.2f} m²)"
        elif dim.get("tipo") == "lineal" and dim.get("largo_lineal_m"):
            fmt_comercial = f"{dim['largo_lineal_m']} m"
        else:
            fmt_comercial = None

        # Preferir el formato del nesting si existe (es más preciso)
        formato_final = (
            nesting_result["formato_comercial"]
            if nesting_result and nesting_result.get("formato_comercial")
            else fmt_comercial
        )

        item = InsumoCalculado(
            insumo=nombre_insumo,
            cantidad=cantidad_calc,
            unidad=insumo.unidad_medida,
            precio_unitario=precio_unit,
            subtotal=subt,
            tienda=tienda_insumo,
            url_producto=url_insumo,
            tiendas_alternativas=tiendas_alternativas,
            cantidad_objetivo=(
                cantidad_neta
                if cantidad_override is not None
                else (nesting_result.get("cantidad_objetivo") if nesting_result else None)
            ),
            cantidad_compra=(
                cantidad_calc
                if cantidad_override is not None
                else (nesting_result.get("cantidad_compra") if nesting_result else None)
            ),
            perdida_porcentual=(factor_perdida - 1.0) * 100.0,
            metodo_optimizacion=nesting_result.get("metodo") if nesting_result else None,
            formato_comercial=formato_final,
        )
        categorias_dict[insumo.categoria].append(item)

    # 5. Mapear a Schema
    desglose_list = []
    for cat_name, items in categorias_dict.items():
        has_subt = any(i.subtotal is not None for i in items)
        subcat = sum((i.subtotal for i in items if i.subtotal is not None)) if has_subt else None

        desglose_list.append(CategoriaDesglose(
            categoria=cat_name, 
            items=items, 
            subtotal_categoria=subcat
        ))

    # ── Helper: get scraped price/tienda/url/alternativas ──────────
    def _lookup_scraped(insumo_id: int, fallback_price: float):
        stores = all_stores_map.get(insumo_id, [])
        if stores:
            best = stores[0]
            alts = stores if len(stores) > 1 else None
            return (best["precio"], best["tienda"] or "", best["url"] or "", alts)
        pm = latest_precio_record.get(insumo_id)
        if pm and pm.precio:
            return (float(pm.precio), pm.tienda or "", getattr(pm, 'url', '') or "", None)
        return (fallback_price, "Referencia", "", None)

    # ── Helper: construir InsumoCalculado con alternativas ──────────
    def _build_insumo(nombre, cantidad, unidad, precio, tienda, url, alternativas, **kwargs):
        subt_val = kwargs.pop("subtotal", None)
        if subt_val is None and precio is not None and cantidad is not None:
            subt_val = float(cantidad) * float(precio)
        return InsumoCalculado(
            insumo=nombre,
            cantidad=float(cantidad),
            unidad=unidad,
            precio_unitario=float(precio) if precio is not None else None,
            subtotal=float(subt_val) if subt_val is not None else None,
            tienda=tienda if tienda and tienda != "Referencia" else "Referencia",
            url_producto=url if url else None,
            tiendas_alternativas=alternativas,
            **kwargs,
        )

    # ── Complementos constructivos (según material) ───────────────────────────
    complementos_obra_gruesa = []
    if material_id in (1, 2):
        if total_studs > 0 or total_soleras > 0:
            piezas_total = total_studs + total_soleras
            clavos_3_cant = math.ceil(piezas_total * 4 / 100)
            clavos_4_cant = math.ceil(total_soleras * 2 / 100)

            precio_c3, tienda_c3, url_c3, alt_c3 = _lookup_scraped(46, 4500.0)
            precio_c4, tienda_c4, url_c4, alt_c4 = _lookup_scraped(47, 5200.0)

            complementos_obra_gruesa.append(_build_insumo(
                "Clavos estriados 3 pulgadas (caja 100un)", clavos_3_cant, "caja",
                precio_c3, tienda_c3, url_c3, alt_c3,
                perdida_porcentual=10.0, formato_comercial="caja 100 unidades",
            ))
            complementos_obra_gruesa.append(_build_insumo(
                "Clavos estriados 4 pulgadas (caja 100un)", clavos_4_cant, "caja",
                precio_c4, tienda_c4, url_c4, alt_c4,
                perdida_porcentual=10.0, formato_comercial="caja 100 unidades",
            ))

        if area_muro_neta > 0:
            rollos_lana_muro = math.ceil(area_muro_neta / 14.4)
            precio_lana, tienda_lana, url_lana, alt_lana = _lookup_scraped(48, 18500.0)

            complementos_obra_gruesa.append(_build_insumo(
                "Lana vidrio 50mm muro (rollo 14.4m2)", rollos_lana_muro, "rollo",
                precio_lana, tienda_lana, url_lana, alt_lana,
                perdida_porcentual=10.0, formato_comercial="rollo 14.4 m2",
            ))
    elif material_id == 3:
        kg_enfierradura_total = 0.0
        for r, insumo in datos_rendimiento:
            nl = (insumo.nombre or "").lower()
            if "enfierradura" in nl:
                kg_enfierradura_total += float(r.factor_multiplicador) * perimetro_ml
        alambre_amarre = math.ceil(kg_enfierradura_total * 0.02)
        if alambre_amarre > 0:
            precio_alambre, tienda_al, url_al, alt_al = _lookup_scraped(46, 3500.0)
            complementos_obra_gruesa.append(_build_insumo(
                "Alambre de amarre (kg)", alambre_amarre, "kg",
                precio_alambre, tienda_al if tienda_al != "Referencia" else "Referencia", url_al, alt_al,
                perdida_porcentual=5.0,
            ))
    elif material_id == 4:
        pass

    if complementos_obra_gruesa:
        subcat_comp = sum((i.subtotal or 0) for i in complementos_obra_gruesa)
        desglose_list.append(CategoriaDesglose(
            categoria="Obra Gruesa - Complementos",
            items=complementos_obra_gruesa,
            subtotal_categoria=float(subcat_comp),
        ))
        if costo_total_simulacion is None:
            costo_total_simulacion = 0.0
        costo_total_simulacion += subcat_comp

    # ── Techumbre ─────────────────────────────────────────────────────────────
    if incluir_techumbre:
        categorias_techumbre = calcular_partida_techumbre(
            area_m2_planta=m2_totales,
            latest_precio_record=latest_precio_record,
            all_stores_map=all_stores_map,
            material_id=material_id,
        )
        desglose_list.extend(categorias_techumbre)
        for cat in categorias_techumbre:
            if cat.subtotal_categoria:
                if costo_total_simulacion is None:
                    costo_total_simulacion = 0.0
                costo_total_simulacion += cat.subtotal_categoria

    return DesgloseResponse(
        simulacion_id=simulacion_id,
        m2_totales=m2_totales,
        material=material_nombre,
        desglose=desglose_list,
        costo_total=costo_total_simulacion,
        fecha_precios=fecha_precios,
        tarifa_pura_local=tarifa_pura_local,
        area_bruta_m2=area_bruta,
        area_vanos_m2=area_vanos,
        area_neta_m2=area_neta,
        volumen_neto_previo=volumen_neto_previo,
        volumen_compensado_pre_cotizacion=volumen_compensado_pre_cotizacion,
        items_optimizados=items_optimizados if items_optimizados > 0 else None,
        perdida_promedio_porcentual=(
            (sum(perdidas_optimizadas) / len(perdidas_optimizadas)) * 100.0
            if perdidas_optimizadas else None
        ),
        perimetro_ml=perimetro_ml if perimetro_ml > 0 else None,
        altura_muro_m=altura_muro_m,
        area_muro_neta_m2=area_muro_neta if area_muro_neta > 0 else None,
        incluir_techumbre=incluir_techumbre,
        espesor_muro_m=espesor_muro,
    )


@app.post("/api/simulacion/{simulacion_id}/calcular-insumos", response_model=DesgloseResponse)
def calcular_insumos(
    simulacion_id: int,
    payload: Optional[DeduccionMermasPayload] = None,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_optional_user),
):
    simulacion = db.query(models.ConfiguracionSimulacion).filter(
        models.ConfiguracionSimulacion.id == simulacion_id
    ).first()
    if not simulacion:
        raise HTTPException(status_code=404, detail="La simulación especificada no existe.")

    recintos_insumos = list(payload.recintos_insumos) if payload and payload.recintos_insumos else []
    if recintos_insumos:
        groups: dict[int, list] = defaultdict(list)
        for recinto in recintos_insumos:
            groups[int(recinto.material_id)].append(recinto)
        partials: List[DesgloseResponse] = []
        m2_acum = 0.0
        for mat_id, items in groups.items():
            group_m2 = sum(float(i.m2) for i in items)
            m2_acum += group_m2
            group_perim = sum(float(i.perimetro_ml or 0) for i in items)
            partials.append(
                _calcular_insumos_material(
                    simulacion_id=simulacion_id,
                    payload=payload,
                    db=db,
                    user=user,
                    simulacion=simulacion,
                    material_id_override=mat_id,
                    m2_totales_override=max(1, int(round(group_m2))),
                    perimetro_ml_override=group_perim if group_perim > 0 else None,
                )
            )
        return _fusionar_desglose_responses(
            partials,
            simulacion_id,
            max(1, int(round(m2_acum))),
        )

    return _calcular_insumos_material(
        simulacion_id=simulacion_id,
        payload=payload,
        db=db,
        user=user,
        simulacion=simulacion,
    )


## SCRUM-97
## Ley 21.725 - Validación de Cumplimiento Normativo (Ley del Mono)
try:
    from Ley21725 import ValidacionLeyMonoRequest, ValidacionLeyMonoResponse, validar_ley_21725
except ModuleNotFoundError:
    from backend.Ley21725 import ValidacionLeyMonoRequest, ValidacionLeyMonoResponse, validar_ley_21725

@app.post("/api/validar-ley-mono", response_model=ValidacionLeyMonoResponse)
def endpoint_validar_ley_mono(payload: ValidacionLeyMonoRequest):
    return validar_ley_21725(
        area_m2=payload.area_m2,
        costo_total_clp=payload.costo_total_clp,
        valor_uf_actual=payload.valor_uf_actual,
    )


class ValidarNormativaRequest(BaseModel):
    area_m2: Optional[float] = Field(None, gt=0)
    valor_uf_actual: Optional[float] = Field(None, gt=0)
    costo_total_clp: Optional[float] = Field(None, ge=0)
    material_id: Optional[int] = Field(None, ge=1)
    recintos: List[dict] = Field(default_factory=list)
    muros: List[dict] = Field(default_factory=list)
    adyacencias: List[dict] = Field(default_factory=list)


class ValidarNormativaResponse(BaseModel):
    alerts: List[dict]
    injections: List[dict]
    compliant: bool


try:
    from normativa.validator import validar_normativa
except ModuleNotFoundError:
    from backend.normativa.validator import validar_normativa  # type: ignore


@app.post("/api/validar-normativa", response_model=ValidarNormativaResponse)
def endpoint_validar_normativa(payload: ValidarNormativaRequest):
    return validar_normativa(payload.model_dump())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
